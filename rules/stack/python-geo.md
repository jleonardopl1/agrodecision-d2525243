# Stack — Camada geoespacial Python (`geo/`)

Precede `common/` no que for específico do pipeline geo. Faixa do agente `geo-pipeline`.

## O pipeline

- Roda **fora da infra paga**, no **GitHub Actions** (`.github/workflows/ingest-ndvi.yml`,
  cron segunda 06:00 UTC + dispatch manual; secret `SUPABASE_DB_URL`).
- `geo/worker_ndvi.py`: STAC público (Sentinel-2 L2A) → máscara de nuvem (SCL) → composição por
  mediana → NDVI/NDWI/NDMI + zonal stats por região → upsert em `indices_vegetacao_regional`.
  Dado livre para uso comercial (Copernicus).
- `geo/seed_regioes.{py,sql}`: malha IBGE (554 microrregiões / 27 UFs — **feito**).

## Convenções

- Deps **open-source** em `geo/requirements.txt`.
- O worker grava com **connection string direta** (role `postgres`, ignora RLS) — a credencial
  vive **só** no secret do Actions, **nunca** no código.
- Trate fontes externas (STAC, espelhos) como não confiáveis; falhe com log claro.

## Armadilha conhecida

`choropleth_vegetacao` faz **INNER JOIN** com os índices → o mapa em `/app/mapa` fica **vazio**
até o worker NDVI popular a tabela. **Não é bug.** Próximo passo: 1ª run + backfill histórico
(para a anomalia ano-a-ano).

## Limites

Não mexe no app React (peça ao `frontend`) nem nas migrations de schema geo (peça ao `supabase-db`).
