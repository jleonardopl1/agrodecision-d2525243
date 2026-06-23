-- =====================================================================
-- 0009_geo_indices.sql
-- AgroDecision · Camada Geoespacial (tier Enterprise)
-- Migration 0009 — Índices de vegetação regionais (Sentinel-2)
-- Stack: Supabase (Postgres + PostGIS). Rodar no SQL Editor do Supabase.
-- =====================================================================
-- Dados de índice são COMPARTILHADOS (como cotacoes_cache e sinais_ia no
-- PRD): iguais para todas as cooperativas, não são por tenant. RLS libera
-- leitura para usuários autenticados e bloqueia escrita (worker grava via
-- conexão direta/service role, que ignora RLS).
-- =====================================================================

-- 1) Extensão espacial -------------------------------------------------
-- No Supabase a convenção é instalar extensões no schema "extensions".
-- Se o seu projeto já tem PostGIS habilitado, esta linha é no-op.
create extension if not exists postgis with schema extensions;

-- Garante que os tipos/funções PostGIS resolvam durante esta migration.
set search_path = public, extensions;

-- 2) Regiões (malha IBGE) — geometria de referência, compartilhada ------
create table if not exists public.regioes_geo (
  id           bigint generated always as identity primary key,
  codigo_ibge  text not null unique,                     -- ex.: código da microrregião
  nome         text not null,
  uf           text not null,                            -- sigla do estado (PR, SP, ...)
  nivel        text not null default 'microrregiao',     -- microrregiao | mesorregiao | municipio
  geom         geometry(MultiPolygon, 4326) not null,    -- WGS84
  area_km2     double precision,
  criado_em    timestamptz not null default now()
);

create index if not exists regioes_geo_geom_idx on public.regioes_geo using gist (geom);
create index if not exists regioes_geo_uf_idx   on public.regioes_geo (uf);

comment on table public.regioes_geo is
  'Malha territorial (IBGE) usada como unidade de agregação dos índices. Dado compartilhado.';

-- 3) Série temporal de índices de vegetação por região ------------------
create table if not exists public.indices_vegetacao_regional (
  id              bigint generated always as identity primary key,
  regiao_id       bigint not null references public.regioes_geo(id) on delete cascade,
  cultura         text   not null default 'todas',        -- 'todas' | soja | milho | cafe | algodao
  data_inicio     date   not null,                        -- início da janela de composição
  data_fim        date   not null,                        -- fim da janela
  ndvi_medio      double precision,                       -- saúde da vegetação
  ndwi_medio      double precision,                       -- presença de água (McFeeters)
  ndmi_medio      double precision,                       -- umidade (NIR/SWIR)
  ndvi_anomalia   double precision,                       -- vs. mesma janela do ano anterior
  cobertura_nuvem double precision,                       -- fração de pixels mascarados (qualidade)
  n_pixels        integer,                                -- pixels válidos usados
  fonte           text not null default 'sentinel-2-l2a',
  criado_em       timestamptz not null default now(),
  unique (regiao_id, cultura, data_inicio, data_fim)
);

create index if not exists idx_veg_regiao_data on public.indices_vegetacao_regional (regiao_id, data_fim desc);
create index if not exists idx_veg_cultura     on public.indices_vegetacao_regional (cultura, data_fim desc);

comment on table public.indices_vegetacao_regional is
  'Índices de vegetação agregados por região e janela temporal. Indicador antecedente de oferta.';

-- 4) RLS ----------------------------------------------------------------
alter table public.regioes_geo                enable row level security;
alter table public.indices_vegetacao_regional enable row level security;

-- Leitura liberada a qualquer usuário autenticado (dado compartilhado).
drop policy if exists "regioes_leitura_autenticado" on public.regioes_geo;
create policy "regioes_leitura_autenticado"
  on public.regioes_geo for select to authenticated using (true);

drop policy if exists "indices_leitura_autenticado" on public.indices_vegetacao_regional;
create policy "indices_leitura_autenticado"
  on public.indices_vegetacao_regional for select to authenticated using (true);

-- Sem policy de INSERT/UPDATE => escrita bloqueada para 'authenticated'.
-- O worker grava com a connection string direta (role postgres) e ignora RLS.

-- 5) Serving (A): choropleth como GeoJSON -------------------------------
-- Retorna a última leitura por região, geometria simplificada para payload leve.
-- Consumo direto no front com MapLibre GL JS. Ideal para ~centenas de regiões.
create or replace function public.choropleth_vegetacao(
  p_cultura   text             default 'todas',
  p_tolerancia double precision default 0.005  -- ~550 m; ajuste conforme o zoom
)
returns jsonb
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with ultimo as (
    select distinct on (i.regiao_id)
      i.regiao_id, i.ndvi_medio, i.ndvi_anomalia, i.ndmi_medio,
      i.data_fim, i.cobertura_nuvem
    from public.indices_vegetacao_regional i
    where i.cultura = p_cultura
    order by i.regiao_id, i.data_fim desc
  )
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', st_asgeojson(
                      st_simplifypreservetopology(r.geom, p_tolerancia)
                    )::jsonb,
        'properties', jsonb_build_object(
          'regiao_id',       r.id,
          'codigo_ibge',     r.codigo_ibge,
          'nome',            r.nome,
          'uf',              r.uf,
          'ndvi',            u.ndvi_medio,
          'ndvi_anomalia',   u.ndvi_anomalia,
          'ndmi',            u.ndmi_medio,
          'data_fim',        u.data_fim,
          'cobertura_nuvem', u.cobertura_nuvem
        )
      )
    ), '[]'::jsonb)
  )
  from ultimo u
  join public.regioes_geo r on r.id = u.regiao_id;
$$;

grant execute on function public.choropleth_vegetacao(text, double precision) to authenticated;

-- 6) Serving (B, opcional/escalável): vector tiles MVT ------------------
-- Use no lugar do GeoJSON quando houver muitas regiões / zoom interativo.
-- Endpoint típico: /rpc/mvt_vegetacao?z=..&x=..&y=..  (servido via Edge Function).
create or replace function public.mvt_vegetacao(
  z integer, x integer, y integer,
  p_cultura text default 'todas'
)
returns bytea
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  resultado bytea;
begin
  with bounds as (
    select st_tileenvelope(z, x, y) as geom
  ),
  ultimo as (
    select distinct on (i.regiao_id)
      i.regiao_id, i.ndvi_medio, i.ndvi_anomalia, i.data_fim
    from public.indices_vegetacao_regional i
    where i.cultura = p_cultura
    order by i.regiao_id, i.data_fim desc
  ),
  mvtgeom as (
    select
      st_asmvtgeom(st_transform(r.geom, 3857), bounds.geom) as geom,
      r.codigo_ibge, r.nome, r.uf,
      u.ndvi_medio   as ndvi,
      u.ndvi_anomalia as ndvi_anomalia,
      u.data_fim
    from public.regioes_geo r
    join ultimo u on u.regiao_id = r.id
    cross join bounds
    where st_intersects(st_transform(r.geom, 3857), bounds.geom)
  )
  select st_asmvt(mvtgeom.*, 'vegetacao') into resultado from mvtgeom;
  return resultado;
end;
$$;

grant execute on function public.mvt_vegetacao(integer, integer, integer, text) to authenticated;

-- Fim da migration 0009.
