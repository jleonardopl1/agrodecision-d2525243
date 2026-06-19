# AgroDecision — CLAUDE.md
## Objetivo
SaaS de inteligência comercial para o produtor rural brasileiro: cotações (B3 futuros, CEPEA físico, basis regional por UF), câmbio, carteira/fixações, simulação de venda e alertas de preço.
## Stack
- Frontend: Vite SPA + TypeScript
- Backend: Supabase (Postgres + Edge Functions em Deno)
- Gerenciador: npm
- Integração Lovable ativa — NÃO remover .lovable/ nem .env
## Convenções (inegociáveis)
- Antes de qualquer operação destrutiva: inspecionar o estado e CONFIRMAR a estratégia comigo.
- Nunca force-push. Preservar histórico. PR para main, nunca commit direto.
- Sempre preservar .lovable/ e .env.
- Produto e bot em PT-BR natural.
- O bot entrega análise e simulação informativas — nunca recomendação de compra/venda. Quem decide é o produtor.
## Comandos
- dev: `npm run dev` (Vite dev server)
- build: `npm run build` (produção) · `npm run build:dev` (modo development)
- lint: `npm run lint` (ESLint) · typecheck: `npm run typecheck` (tsc --noEmit -p tsconfig.app.json)
- preview do build: `npm run preview`
- tipos do Supabase: `npm run db:types` (gera src/integrations/supabase/types.ts)
- deploy de função: `supabase functions deploy <nome>` — ex.: `supabase functions deploy cotacao-worker` (via Supabase CLI; não há script npm)
- migrations: aplicar no remoto `supabase db push` · criar `supabase migration new <nome>` · reset local `supabase db reset` (via Supabase CLI; não há script npm)
## Foco atual
Chatbot WhatsApp + Telegram (plano em fases). Em andamento: Fase 0 — corrigir a edge function de cotações, que tem duas versões sobrepostas e não compila.
## Decisões pendentes
- Canal WhatsApp (Twilio vs Meta Cloud API); motor de IA (modelo/custo); ordem das fases.
## Fora de escopo
- Reescrever a integração Lovable; reescrever histórico; trocar de stack.
## Instruções de compactação
- Ao compactar, preserve: convenções, decisões, schema recente, arquivos tocados e a fase atual. Resuma o debugging.
