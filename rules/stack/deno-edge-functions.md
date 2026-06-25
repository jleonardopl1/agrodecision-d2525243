# Stack — Edge Functions Deno (`supabase/functions/`)

Precede `common/` no que for específico de Deno/edge. Faixa do agente `edge-functions`
(o tom do bot é compartilhado com o agente `chatbot`).

## O que existe

- **Workers cron** (`verify_jwt=false`, protegidos por header `x-worker-secret`): `cotacao-worker`,
  `sinal-ia-worker`, `alerta-worker`, `relatorio-worker`.
- **Canais do bot:** `chatbot`, `telegram-webhook`, `whatsapp-webhook` (também `verify_jwt=false`).

## Autenticação de webhook é a fronteira de segurança

- **Falhe fechado:** sem credencial válida, **rejeite** (401/403). Não processe payload não autenticado.
- Telegram: valide `X-Telegram-Bot-Api-Secret-Token`.
- WhatsApp: **deve** validar `X-Hub-Signature-256` (HMAC com `WHATSAPP_APP_SECRET`).
  ⚠️ Hoje **não valida** — é o P0 de segurança rastreado em `AGENTS-COLLAB.md` / `SECURITY.md`.
  Sem HMAC, forjar o campo `from` permite injetar produção/fixação na carteira de um cooperado.
- Workers: exija `x-worker-secret` igual a `WORKER_SECRET`.

## Convenções

- Imports via `jsr:` / `npm:`. Segredos via `Deno.env.get(...)` — **validar no startup**, nunca hardcode.
- CORS com os headers já usados no `chatbot`. Trate todo input do payload como **não confiável**
  (ver defesa de prompt em `common/security.md`).
- `service role` ignora RLS — use só no servidor e valide as entradas antes de escrever
  (cultura no enum `commodity`, valores positivos).

## Produto (inegociável)

O `chatbot` é **informativo, nunca recomendação** de compra/venda. PT-BR, língua do campo,
respostas curtas (tela de celular).

## Deploy

`supabase functions deploy <nome>` (sem script npm). **Deploy/secret em produção e mudança em
auth de webhook exigem aprovação do dono (Decisão D3).**
