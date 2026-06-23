-- 0010 · choropleth_vegetacao: LEFT JOIN para sempre servir a malha
-- -----------------------------------------------------------------
-- Na 0009 o INNER JOIN partia dos índices, então a função só devolvia
-- regiões COM NDVI — o mapa ficava vazio até o worker rodar. Com LEFT
-- JOIN a partir de `regioes_geo`, a malha inteira (554 microrregiões) é
-- servida; regiões sem índice vêm com ndvi/anomalia = null e o front
-- as pinta de cinza ("sem dado"). Quando o NDVI popular, colorem-se.

create or replace function public.choropleth_vegetacao(
  p_cultura   text             default 'todas',
  p_tolerancia double precision default 0.005
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
  from public.regioes_geo r
  left join ultimo u on u.regiao_id = r.id;
$$;

grant execute on function public.choropleth_vegetacao(text, double precision) to authenticated;
