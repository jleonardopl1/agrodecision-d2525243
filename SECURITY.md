# Política de Segurança — AgroDecision

A segurança dos dados do produtor rural é prioridade. Este documento descreve como **reportar**
uma vulnerabilidade e quais **práticas** o projeto segue. Padrão de processo inspirado no ECC
(github.com/affaan-m/ECC).

## Como reportar uma vulnerabilidade

- **Não abra uma issue pública** para falhas de segurança.
- Use o **GitHub Private Vulnerability Reporting** (aba *Security* → *Report a vulnerability*)
  ou, na falta dele, e-mail privado para **jleonardopl@gmail.com**.
- Inclua: componente afetado, passos para reproduzir, impacto estimado, pré-requisitos de ataque
  e, se houver, prova de conceito com dados **redigidos** (sem segredos reais).

**Resposta esperada:** reconhecimento em até 48h; correção de itens críticos priorizada.
Pedimos divulgação coordenada — tempo para corrigir antes de tornar público.

## Escopo

| No escopo | Fora do escopo |
| --- | --- |
| App React (`src/`), Edge Functions (`supabase/functions/`), políticas **RLS**, autenticação de **webhooks**, RPCs públicas | Dependências de terceiros sem caminho de exploração no projeto; engenharia social; relatos sem fronteira de confiança real |

## Práticas de segurança do projeto

### Gestão de segredos
- Segredos **só** via env / *secrets* (Supabase Functions, GitHub Actions). **Nunca** no código.
  `.env` **não** é versionado.
- Segredos em uso: `ANTHROPIC_API_KEY`, `WORKER_SECRET`, `WHATSAPP_APP_SECRET`, `TELEGRAM_*`,
  `SUPABASE_DB_URL` (Actions).
- A **publishable key** do Supabase é **pública por design** — a proteção dos dados vem da
  **RLS**, não do sigilo da chave.
- Credencial exposta → **rotacionar imediatamente** e auditar o histórico.

### Modelo de dados
- Dados **compartilhados** (cotações, sinais, câmbio, índices de vegetação): leitura para
  qualquer autenticado; escrita só por worker / `service role`.
- Dados **do produtor** (custos, alertas, relatórios, produções, fixações): isolados por
  `auth.uid()` e por cooperativa (`current_cooperativa_id()`) via RLS.

### Webhooks (fronteira de confiança)
- **Falha fechada:** sem credencial válida, a função rejeita o payload.
- Telegram valida `X-Telegram-Bot-Api-Secret-Token`.

## Hardenings conhecidos (rastreados)

Estes itens estão **mapeados** e priorizados em `AGENTS-COLLAB.md` (backlog) e detalhados em
`docs/colaboracao/revisao-2026-06-23.md`. Aguardam aprovação do dono antes de virar código
(Decisão D3 — nada de mudar auth de webhook ou banco remoto sem confirmação):

- **P0** — Validar **HMAC `X-Hub-Signature-256`** no `whatsapp-webhook` (`WHATSAPP_APP_SECRET`).
  Sem isso, forjar o campo `from` pode injetar produção/fixação na carteira de um cooperado.
- **P1** — `REVOKE EXECUTE` de helpers `SECURITY DEFINER` e funções de trigger expostos via RPC
  (`is_master`, `is_staff`, `current_cooperativa_id`, `protect_*_cols`, …) → migration **0010**.
- **P1** — Ativar **Leaked Password Protection** (HaveIBeenPwned) no Supabase Auth.

## Para quem desenvolve

Antes de cada PR, siga o **checklist pré-commit** e a **defesa de prompt** em
`rules/common/security.md`. Em código sensível, acione o agente **`security-reviewer`**.
