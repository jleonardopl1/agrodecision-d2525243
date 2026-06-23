#!/usr/bin/env python3
"""
AgroDecision · Seed das regiões (malha IBGE) — pré-requisito do worker
----------------------------------------------------------------------
Carrega um GeoJSON de regiões (ex.: microrregiões do IBGE) na tabela
`regioes_geo`. Sem dependências geoespaciais: o próprio Postgres/PostGIS
faz o parse via ST_GeomFromGeoJSON.

Onde obter o GeoJSON:
  Baixe a malha de microrregiões do IBGE (FeatureCollection, EPSG:4326).
  Fonte: IBGE — Malhas Territoriais (servicodados.ibge.gov.br) ou os
  downloads de malhas municipais/microrregionais em GeoJSON.

Uso:
  export SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
  python seed_regioes.py caminho/para/microrregioes.geojson

Mapeie os nomes das propriedades do seu GeoJSON via env, se diferirem:
  PROP_CODIGO (default CD_MICRO)  PROP_NOME (default NM_MICRO)  PROP_UF (default SIGLA_UF)
"""

import json
import os
import sys

import psycopg

PROP_CODIGO = os.environ.get("PROP_CODIGO", "CD_MICRO")
PROP_NOME   = os.environ.get("PROP_NOME", "NM_MICRO")
PROP_UF     = os.environ.get("PROP_UF", "SIGLA_UF")


def main():
    if len(sys.argv) != 2:
        print("uso: python seed_regioes.py <arquivo.geojson>", file=sys.stderr)
        sys.exit(2)

    with open(sys.argv[1], encoding="utf-8") as f:
        gj = json.load(f)
    feats = gj.get("features", [])
    if not feats:
        print("[erro] GeoJSON sem features", file=sys.stderr)
        sys.exit(1)

    db_url = os.environ["SUPABASE_DB_URL"]
    inseridos = 0

    with psycopg.connect(db_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("set search_path = public, extensions;")
            for feat in feats:
                props = feat.get("properties", {})
                geom = json.dumps(feat["geometry"])
                cur.execute(
                    """
                    insert into public.regioes_geo (codigo_ibge, nome, uf, nivel, geom)
                    values (%s, %s, %s, 'microrregiao',
                            st_multi(st_setsrid(st_geomfromgeojson(%s), 4326)))
                    on conflict (codigo_ibge) do update set
                        nome = excluded.nome,
                        uf   = excluded.uf,
                        geom = excluded.geom
                    """,
                    (str(props[PROP_CODIGO]), props[PROP_NOME], props[PROP_UF], geom),
                )
                inseridos += 1

            # Área em km² (a partir da geometria geográfica).
            cur.execute(
                "update public.regioes_geo "
                "set area_km2 = st_area(geom::geography) / 1000000.0 "
                "where area_km2 is null"
            )

    print(f"[ok] {inseridos} regiões carregadas/atualizadas")


if __name__ == "__main__":
    main()
