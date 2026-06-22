# AgroDecision · Camada Geoespacial (tier Enterprise)

Indicador antecedente de oferta por região, a partir de índices de vegetação
Sentinel-2 (NDVI/NDWI/NDMI). Dado de satélite livre para uso comercial
(política Copernicus); infraestrutura sobre o que já temos (Supabase) +
minutos gratuitos do GitHub Actions.

## Arquivos
- `../supabase/migrations/0009_geo_indices.sql` — schema PostGIS + RLS + funções de serving (GeoJSON e MVT).
- `seed_regioes.py` — carrega a malha IBGE em `regioes_geo` (pré-requisito).
- `worker_ndvi.py` — ingestão STAC → NDVI com máscara de nuvem → zonal stats → Postgres.
- `requirements.txt` — dependências do worker (tudo open-source).
- `../.github/workflows/ingest-ndvi.yml` — cron semanal de ingestão (roda a partir de `geo/`).

## Ordem de execução
1. **Migration.** Aplique `supabase/migrations/0009_geo_indices.sql` (via
   `supabase db push`, ou cole no SQL Editor do Supabase e rode).
2. **Seed das regiões.** Baixe um GeoJSON de microrregiões do IBGE (EPSG:4326) e:
   ```bash
   cd geo
   export SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"
   pip install "psycopg[binary]"
   python seed_regioes.py microrregioes.geojson
   ```
   Ajuste `PROP_CODIGO`/`PROP_NOME`/`PROP_UF` por env se as propriedades do seu
   GeoJSON tiverem outros nomes.
3. **Worker.** Adicione o secret `SUPABASE_DB_URL` (Settings → Secrets and
   variables → Actions) e habilite o workflow. Teste manual: aba Actions →
   "Ingestão NDVI regional" → Run workflow.
4. **Consumo no front.** Chame a RPC `choropleth_vegetacao('todas')` (GeoJSON)
   e renderize com MapLibre GL JS. Para zoom interativo/muitas regiões, use os
   vector tiles via `mvt_vegetacao(z,x,y)`.

## Ressalvas (assumir desde já)
- **Nuvem.** Óptico não enxerga através de nuvem; usamos composição por mediana
  com máscara SCL. Na estação chuvosa, regiões podem ficar sem cena (campo
  `cobertura_nuvem` indica a qualidade). Robustez extra = Sentinel-1 (radar),
  também grátis, porém mais trabalhoso — fica para Fase 2.
- **Anomalia precisa de histórico.** `ndvi_anomalia` só preenche quando já
  existe a mesma janela do ano anterior. Para ter no ano 1, rode um backfill
  histórico (ajuste a data de referência no worker e processe janelas passadas).
- **Memória.** Microrregião grande a 20m pode pesar; se um runner estourar,
  suba `RES_M=60` (qualidade regional segue ótima e fica bem mais leve).
- **Área agrícola.** O v1 agrega o interior inteiro da região. Refinar só para
  lavoura (máscara MapBiomas) é um TODO marcado em `worker_ndvi.py` — exige
  atribuição CC-BY.
- **Custo.** Zero de infra para a camada de agregados. Servir raster de satélite
  pixel-a-pixel (imagem em tela cheia) tem custo de tile/banda — fora de escopo.
