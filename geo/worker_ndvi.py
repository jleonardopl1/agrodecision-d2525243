#!/usr/bin/env python3
"""
AgroDecision · Worker de ingestão de índices de vegetação regionais
-------------------------------------------------------------------
Pipeline (assíncrono, roda fora da infra paga):
  1. Lê as regiões de `regioes_geo` (malha IBGE) do Postgres/Supabase.
  2. Busca cenas Sentinel-2 L2A no STAC público (Earth Search / AWS Open Data).
  3. Aplica máscara de nuvem (banda SCL) e faz composição por mediana na janela.
  4. Calcula NDVI, NDWI e NDMI; recorta ao polígono da região (zonal stats).
  5. Calcula anomalia do NDVI vs. mesma janela do ano anterior (se houver dado).
  6. Faz upsert em `indices_vegetacao_regional`.

Dado Sentinel-2 é livre para uso comercial (política Copernicus). Leitura dos
COGs no bucket público `sentinel-cogs` (AWS Open Data) é anônima e gratuita.

Variáveis de ambiente:
  SUPABASE_DB_URL   (obrigatória)  ex.: postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
  TARGET_UFS        (opcional)     ex.: "PR,SP,MS,MT,GO" — vazio = todas as regiões
  CULTURA           (opcional)     default "todas"
  RES_M             (opcional)     resolução em metros, default 20 (use 60 p/ economizar memória)
  JANELA_DIAS       (opcional)     tamanho da janela de composição, default 30
  MAX_CLOUD         (opcional)     filtro % nuvem por cena no STAC, default 60
"""

import os
import sys
import datetime as dt

import numpy as np
import psycopg
from pystac_client import Client
from odc.stac import load as odc_load
import odc.geo.xr  # noqa: F401  -> registra o accessor .odc no xarray
from odc.geo.geom import Geometry
from rasterio.features import rasterize as rio_rasterize

# --- Leitura anônima de COGs públicos na AWS (sem credenciais) ----------
os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF,.tiff")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "5")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "1")

# --- Configuração -------------------------------------------------------
STAC_URL    = "https://earth-search.aws.element84.com/v1"
COLLECTION  = "sentinel-2-l2a"
BANDAS      = ["red", "green", "nir", "swir16", "scl"]
# Classes SCL consideradas válidas: 4=vegetação, 5=solo, 6=água, 7=não-classif.
# Excluídas: 0 sem dado, 1 saturado, 2 escuro, 3 sombra, 8/9 nuvem, 10 cirrus, 11 neve.
SCL_VALIDAS = {4, 5, 6, 7}

DB_URL      = os.environ["SUPABASE_DB_URL"]
CULTURA     = os.environ.get("CULTURA", "todas")
RES_M       = int(os.environ.get("RES_M", "20"))
JANELA_DIAS = int(os.environ.get("JANELA_DIAS", "30"))
MAX_CLOUD   = int(os.environ.get("MAX_CLOUD", "60"))
TARGET_UFS  = [u.strip().upper() for u in os.environ.get("TARGET_UFS", "").split(",") if u.strip()]


def media_segura(arr: np.ndarray):
    """Média ignorando NaN; None se não houver pixel válido."""
    vals = arr[np.isfinite(arr)]
    return float(vals.mean()) if vals.size else None


def aplicar_mascara_cultura(mask_interior: np.ndarray, geobox) -> np.ndarray:
    """
    Hook para refinar a máscara só à área agrícola via MapBiomas.

    TODO (Fase 2): rasterizar a coleção de uso do solo do MapBiomas para o
    `geobox` e manter apenas pixels de classe agrícola (lavoura/pastagem).
    Por ora é no-op: agrega sobre todo o interior da região. Integrar o
    MapBiomas exige citação/atribuição (CC-BY) — ver licença da coleção.
    """
    return mask_interior


def buscar_itens(catalogo, geom_geojson, inicio: dt.date, fim: dt.date):
    busca = catalogo.search(
        collections=[COLLECTION],
        intersects=geom_geojson,
        datetime=f"{inicio.isoformat()}/{fim.isoformat()}",
        query={"eo:cloud_cover": {"lt": MAX_CLOUD}},
        limit=100,
    )
    return list(busca.items())


def composito_indices(itens, gpoly: Geometry):
    """Carrega, mascara nuvem, compõe por mediana e devolve (ndvi, ndwi, ndmi, geobox)."""
    ds = odc_load(
        itens,
        bands=BANDAS,
        crs="EPSG:3857",
        resolution=RES_M,
        groupby="solar_day",
        geopolygon=gpoly,
        chunks={"x": 1024, "y": 1024},  # dask: processa em blocos, poupa memória
    )

    valida = ds["scl"].isin(list(SCL_VALIDAS))
    refl = ds[["red", "green", "nir", "swir16"]].where(valida)
    comp = refl.median(dim="time", skipna=True)

    np.seterr(divide="ignore", invalid="ignore")
    red   = np.asarray(comp["red"].values,   dtype="float32")
    green = np.asarray(comp["green"].values, dtype="float32")
    nir   = np.asarray(comp["nir"].values,   dtype="float32")
    swir  = np.asarray(comp["swir16"].values, dtype="float32")

    ndvi = (nir - red)   / (nir + red)
    ndwi = (green - nir) / (green + nir)
    ndmi = (nir - swir)  / (nir + swir)
    return ndvi, ndwi, ndmi, ds.odc.geobox


def mascara_interior(gpoly: Geometry, geobox) -> np.ndarray:
    """Rasteriza o polígono da região sobre o grid do composto."""
    geom_proj = gpoly.to_crs(geobox.crs).geom  # shapely no CRS do geobox
    return rio_rasterize(
        [(geom_proj, 1)],
        out_shape=tuple(geobox.shape),
        transform=geobox.affine,
        fill=0,
        all_touched=False,
        dtype="uint8",
    ).astype(bool)


def anomalia_ndvi(cur, regiao_id: int, fim: dt.date, ndvi_atual):
    """NDVI atual menos NDVI da mesma janela ~1 ano antes (se existir)."""
    if ndvi_atual is None:
        return None
    alvo = fim - dt.timedelta(days=365)
    cur.execute(
        """
        select ndvi_medio
          from public.indices_vegetacao_regional
         where regiao_id = %s and cultura = %s
           and data_fim between %s and %s
         order by abs(data_fim - %s) asc
         limit 1
        """,
        (regiao_id, CULTURA, alvo - dt.timedelta(days=20),
         alvo + dt.timedelta(days=20), alvo),
    )
    row = cur.fetchone()
    if row and row[0] is not None:
        return ndvi_atual - float(row[0])
    return None


def upsert(cur, regiao_id, inicio, fim, ndvi, ndwi, ndmi, anomalia, nuvem, n_px):
    cur.execute(
        """
        insert into public.indices_vegetacao_regional
            (regiao_id, cultura, data_inicio, data_fim,
             ndvi_medio, ndwi_medio, ndmi_medio, ndvi_anomalia,
             cobertura_nuvem, n_pixels, fonte)
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'sentinel-2-l2a')
        on conflict (regiao_id, cultura, data_inicio, data_fim) do update set
            ndvi_medio      = excluded.ndvi_medio,
            ndwi_medio      = excluded.ndwi_medio,
            ndmi_medio      = excluded.ndmi_medio,
            ndvi_anomalia   = excluded.ndvi_anomalia,
            cobertura_nuvem = excluded.cobertura_nuvem,
            n_pixels        = excluded.n_pixels,
            criado_em       = now()
        """,
        (regiao_id, CULTURA, inicio, fim, ndvi, ndwi, ndmi, anomalia, nuvem, n_px),
    )


def carregar_regioes(cur):
    if TARGET_UFS:
        cur.execute(
            "select id, codigo_ibge, nome, uf, st_asgeojson(geom) "
            "from public.regioes_geo where uf = any(%s) order by uf, nome",
            (TARGET_UFS,),
        )
    else:
        cur.execute(
            "select id, codigo_ibge, nome, uf, st_asgeojson(geom) "
            "from public.regioes_geo order by uf, nome"
        )
    return cur.fetchall()


def main():
    import json

    ref = dt.date.today()
    inicio, fim = ref - dt.timedelta(days=JANELA_DIAS), ref
    print(f"[info] janela {inicio} -> {fim} | cultura={CULTURA} | res={RES_M}m | UFs={TARGET_UFS or 'todas'}")

    catalogo = Client.open(STAC_URL)

    with psycopg.connect(DB_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("set search_path = public, extensions;")
            regioes = carregar_regioes(cur)
            print(f"[info] {len(regioes)} regiões a processar")

            ok, falhas, vazias = 0, 0, 0
            for rid, cod, nome, uf, geojson_str in regioes:
                rotulo = f"{nome}/{uf} ({cod})"
                try:
                    geom_geojson = json.loads(geojson_str)
                    gpoly = Geometry(geom_geojson, crs="EPSG:4326")

                    itens = buscar_itens(catalogo, geom_geojson, inicio, fim)
                    if not itens:
                        vazias += 1
                        print(f"[skip] {rotulo}: sem cenas na janela")
                        continue

                    ndvi, ndwi, ndmi, geobox = composito_indices(itens, gpoly)
                    interior = mascara_interior(gpoly, geobox)
                    interior = aplicar_mascara_cultura(interior, geobox)

                    for a in (ndvi, ndwi, ndmi):
                        a[~interior] = np.nan

                    n_interior = int(interior.sum())
                    n_validos  = int(np.isfinite(ndvi).sum())
                    nuvem = (1.0 - n_validos / n_interior) if n_interior else None

                    m_ndvi = media_segura(ndvi)
                    m_ndwi = media_segura(ndwi)
                    m_ndmi = media_segura(ndmi)
                    anom   = anomalia_ndvi(cur, rid, fim, m_ndvi)

                    upsert(cur, rid, inicio, fim, m_ndvi, m_ndwi, m_ndmi,
                           anom, nuvem, n_validos)
                    ok += 1
                    print(f"[ok]   {rotulo}: NDVI={m_ndvi} anomalia={anom} "
                          f"nuvem={None if nuvem is None else round(nuvem, 2)} "
                          f"cenas={len(itens)}")
                except Exception as e:  # noqa: BLE001 — uma falha não derruba o lote
                    falhas += 1
                    print(f"[erro] {rotulo}: {type(e).__name__}: {e}", file=sys.stderr)

            print(f"[fim] ok={ok} vazias={vazias} falhas={falhas}")
            if ok == 0 and regioes:
                sys.exit(1)  # sinaliza falha total ao GitHub Actions


if __name__ == "__main__":
    main()
