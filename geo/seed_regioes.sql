-- AgroDecision · Seed das regiões (malha IBGE) — variante 100% SQL
-- =================================================================
-- Alternativa ao geo/seed_regioes.py para quando o ambiente NÃO tem
-- acesso de rede ao IBGE, mas o Postgres alcança o GitHub raw. O
-- próprio banco baixa o GeoJSON (extensão `http`) e o PostGIS faz o
-- parse (ST_GeomFromGeoJSON). Pode rodar no SQL Editor do Supabase
-- ou via MCP (execute_sql).
--
-- Fonte: malha de MICRORREGIÕES derivada do IBGE, espelhada em
--   github.com/fititnt/gis-dataset-brasil
--   (propriedades: MICRO = nome, UF = sigla, GEOCODIGO = código).
--   ~554 microrregiões, EPSG:4326 (lon/lat).
--   Observação: é um espelho (não o endpoint vivo do IBGE) e pode estar
--   alguns vintages atrás. Para a malha OFICIAL e mais atual, prefira
--   geo/seed_regioes.py com o download direto do IBGE.
--
-- Segurança: a extensão `http` permite requisições de saída a partir
--   do banco (risco de SSRF). Este script a habilita apenas durante o
--   seed e a remove ao final.
--
-- Idempotente: ON CONFLICT (codigo_ibge) atualiza nome/uf/geom.

set search_path = public, extensions;

create extension if not exists http with schema extensions;

-- staging temporária (some no commit)
create temporary table _seed_geo_raw (payload jsonb) on commit drop;

-- timeout estendido p/ o download (~11 MB)
select http_set_curlopt('CURLOPT_TIMEOUT', '55');
select http_set_curlopt('CURLOPT_CONNECTTIMEOUT', '15');

insert into _seed_geo_raw (payload)
select (http_get(
  'https://raw.githubusercontent.com/fititnt/gis-dataset-brasil/master/microrregiao/geojson/microrregiao.json'
)).content::jsonb;

insert into public.regioes_geo (codigo_ibge, nome, uf, nivel, geom)
select
  elem->'properties'->>'GEOCODIGO',
  elem->'properties'->>'MICRO',
  elem->'properties'->>'UF',
  'microrregiao',
  st_multi(st_setsrid(st_geomfromgeojson((elem->'geometry')::text), 4326))
from _seed_geo_raw,
     jsonb_array_elements(payload->'features') as elem
on conflict (codigo_ibge) do update set
  nome = excluded.nome,
  uf   = excluded.uf,
  geom = excluded.geom;

-- área em km² a partir da geometria geográfica
update public.regioes_geo
set area_km2 = st_area(geom::geography) / 1000000.0
where area_km2 is null;

-- remove a superfície de saída do banco
drop extension if exists http;

-- conferência rápida (descomente para inspecionar)
-- select count(*) regioes, count(distinct uf) ufs,
--        count(*) filter (where not st_isvalid(geom)) invalidas
-- from public.regioes_geo;
