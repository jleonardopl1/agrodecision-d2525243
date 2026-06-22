# AgroDecision — CLAUDE.md
## Objetivo
SaaS de inteligência comercial para o produtor rural brasileiro: cotações (B3 futuros, CEPEA físico, basis regional por UF), câmbio, carteira/fixações, simulação de venda e alertas de preço.
## Stack
- Frontend: Vite SPA (React 18 + plugin SWC) + TypeScript · roteamento `react-router-dom` · dados `@tanstack/react-query` · UI Tailwind + shadcn/ui (Radix) · gráficos `recharts` · toasts `sonner`
- Backend: Supabase (Postgres + RLS) · Edge Functions em Deno
- Gerenciador: npm
- Integração Lovable ativa — NÃO remover .lovable/ nem .env
## Convenções (inegociáveis)
- Antes de qualquer operação destrutiva: inspecionar o estado e CONFIRMAR a estratégia comigo.
- Nunca force-push. Preservar histórico. PR para main, nunca commit direto.
- Sempre preservar .lovable/ e .env.
- Produto e bot em PT-BR natural.
- O bot entrega análise e simulação informativas — nunca recomendação de compra/venda. Quem decide é o produtor.
- Ao concluir cada sessão com mudanças relevantes: ATUALIZAR este CLAUDE.md (foco/fase, decisões, schema recente, arquivos tocados; resumir o debugging) antes de encerrar — sempre via branch + PR.
## Comandos
- dev: `npm run dev` (Vite dev server)
- build: `npm run build` (produção) · `npm run build:dev` (modo development)
- lint: `npm run lint` (ESLint) · typecheck: `npm run typecheck` (tsc --noEmit -p tsconfig.app.json)
- preview do build: `npm run preview`
- tipos do Supabase: `npm run db:types` (gera src/integrations/supabase/types.ts)
- deploy de função: `supabase functions deploy <nome>` — ex.: `supabase functions deploy cotacao-worker` (via Supabase CLI; não há script npm)
- migrations: aplicar no remoto `supabase db push` · criar `supabase migration new <nome>` · reset local `supabase db reset` (via Supabase CLI; não há script npm)
## Schema (resumo — migrations 0001–0009)
- Tenancy (0001): `cooperativas`, `cooperados`; helpers `current_cooperativa_id()`, `is_coop_admin()`, `touch_updated_at()`.
- Mercado (0002): enum `commodity` (soja/milho/cafe/algodao/boi); `commodities_config`, `cotacoes_cache`, `sinais_ia`, `cambio_cache`.
- Dados do usuário (0003): `custos_producao`, `alertas`, `relatorios`.
- Billing (0004): `revenue_share_events`.
- Signup/branding (0005): `handle_new_user()`, `get_coop_branding()`.
- RLS hardening (0006): triggers `protect_*_cols` (cooperado/cooperativa/relatorio).
- Carteira & chat (0007): `producoes`, `fixacoes`, `chat_vinculos`, `chat_mensagens`.
- RBAC staff (0008): enum `app_permission`; `staff_members`, `access_groups`, `group_permissions`, `staff_group_members`; `is_staff()`, `is_master()`, `staff_has_permission()`.
- Geoespacial (0009): PostGIS; `regioes_geo` (malha IBGE), `indices_vegetacao_regional` (NDVI/NDWI/NDMI + anomalia por região/janela — dado COMPARTILHADO); serving `choropleth_vegetacao()` (GeoJSON) e `mvt_vegetacao(z,x,y)` (vector tiles). Leitura p/ autenticado; escrita só pelo worker (conexão direta).
- RLS por cooperativa/dono em todas as tabelas de dados.
## Edge functions (supabase/functions)
- Workers cron (verify_jwt=false): `cotacao-worker` (cotações B3/CEPEA + câmbio via brapi.dev, basis por UF, fallback random-walk), `sinal-ia-worker`, `alerta-worker`, `relatorio-worker`.
- Canal do bot: `chatbot`, `telegram-webhook`, `whatsapp-webhook`.
## Camada geoespacial (geo/)
- Pipeline Python (fora da infra paga, roda no GitHub Actions): ingestão Sentinel-2 L2A via STAC público → máscara de nuvem (SCL) + composição por mediana → NDVI/NDWI/NDMI + zonal stats por região → upsert em `indices_vegetacao_regional`. Dado livre p/ uso comercial (Copernicus).
- `geo/worker_ndvi.py` (ingestão), `geo/seed_regioes.py` (carga da malha IBGE), `geo/requirements.txt` (deps open-source), `geo/README.md` (ordem de execução + ressalvas).
- Cron semanal: `.github/workflows/ingest-ndvi.yml` (seg 06:00 UTC + dispatch manual; secret `SUPABASE_DB_URL`). Primeiro pipeline em GitHub Actions do repo — os demais workers são Edge Functions Deno.
## Foco atual
Chatbot WhatsApp + Telegram (plano em fases).
- Fase 0 ✅ concluída — `cotacao-worker` em versão única e endurecida (PR #13).
- Em andamento: Fase 1 — chatbot WhatsApp + Telegram (scaffolding em `chatbot`/`telegram-webhook`/`whatsapp-webhook`).
- Paralelo (tier Enterprise): camada geoespacial — schema 0009 + pipeline NDVI em `geo/` (scaffolding; falta consumo no front com MapLibre e backfill histórico p/ anomalia).
## Decisões pendentes
- Canal WhatsApp (Twilio vs Meta Cloud API); motor de IA (modelo/custo); ordem das fases.
## Fora de escopo
- Reescrever a integração Lovable; reescrever histórico; trocar de stack.
## Instruções de compactação
- Ao compactar, preserve: convenções, decisões, schema recente, arquivos tocados e a fase atual. Resuma o debugging.
