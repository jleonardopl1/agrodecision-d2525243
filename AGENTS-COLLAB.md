# AGENTS-COLLAB.md — Estado vivo do AgroDecision

> **O que é isto.** Este arquivo é o *estado atual* do projeto — o **agora**, não o
> histórico. Ele existe para resolver a "amnésia entre agentes": quando vários
> agentes de IA (e o dono do produto) trabalham no mesmo projeto em sessões
> diferentes, às vezes em paralelo, cada um chega sem saber das decisões recentes.
> Aqui ficam as **decisões ativas**, as **armadilhas descobertas**, o **elenco de
> agentes** e o **último handoff**.
>
> **Leia isto em ≤ 3 minutos.** Se ficar mais longo, é hora de *promover* o que
> estabilizou para o `CLAUDE.md` (convenções permanentes) ou para uma spec.
>
> Metodologia inspirada em **AGENTS-COLLAB.md** (github.com/Rlealbarili/Agents-Collab.md),
> adaptada à stack deste repositório. Detalhes em `docs/colaboracao/metodologia.md`.

---

## Como usar (ordem de leitura)

```
AGENTS-COLLAB.md  (este — o agora)
        ↓
CLAUDE.md         (convenções permanentes — a fonte da verdade do projeto)
        ↓
docs/ e specs     (detalhes de uma área)
        ↓
código
```

- **Ao chegar:** leia este arquivo antes do `CLAUDE.md`. Veja Decisões Ativas e Armadilhas.
- **Ao sair (handoff):** atualize a seção *Handoff mais recente* — o que mudou, o que foi
  testado, o que ficou bloqueado, qual o próximo passo. *Fail-closed:* não deixe o próximo
  agente adivinhar.
- **Quando uma decisão estabiliza:** mova-a para o `CLAUDE.md` e remova daqui (princípio
  "promove para cima"). Este arquivo é vivo, não um log que só cresce.

---

## Elenco de agentes (roster)

Definições completas em `.claude/agents/`. Cada agente tem uma faixa (lane) clara.

| Agente | Faixa (o que faz) | Não faz |
| --- | --- | --- |
| `coordenador` | Orquestra: lê o pedido, escolhe o(s) agente(s), sequencia o trabalho, é dono das Decisões Ativas. | Não implementa código. |
| `gerente-contexto` | Mantém **este** arquivo, escreve/valida handoffs, compacta, promove decisões para o `CLAUDE.md`. | Não decide arquitetura. |
| `arquiteto-dados` | Modelagem de schema, multi-tenant, índices, **estratégia** de RLS, performance de dados. | Não aplica migrations. |
| `supabase-db` | **Implementa** migrations e políticas RLS, aplica no remoto (com aprovação), gera `types.ts`. | Não desenha o modelo do zero. |
| `edge-functions` | Functions Deno: workers cron e webhooks, secrets, runtime. | Não mexe no front. |
| `chatbot` | Foco atual: bot WhatsApp/Telegram em PT-BR. **Informativo, nunca recomendação.** | Não cria tabelas. |
| `geo-pipeline` | Pipeline Python Sentinel-2/PostGIS, NDVI, GitHub Actions, seeds. | Não mexe no app React. |
| `frontend` | Componentes React, hooks, rotas, TanStack Query, Recharts. | Não decide design tokens. |
| `designer` | Design system, tokens, theming co-branded, acessibilidade, página `/design-system`. | Não escreve lógica de dados. |
| `tester` | Estratégia e escrita/execução de testes (hoje inexistentes no repo). | Não corrige o bug — reporta e cobre. |
| `reviewer` | Portão de qualidade: `lint`, `typecheck`, `build`, advisors do Supabase. Read-only. | Não edita; reporta. |
| `code-reviewer` | Revisão de diff/PR: bugs de correção, reuso, simplificação, segurança da mudança. Read-only. | Não edita; reporta. |
| `documentation-writer` | README, docs PT-BR, mantém o `CLAUDE.md` preciso (junto do `gerente-contexto`). | Não muda comportamento de código. |

---

## Decisões ativas
<!-- Formato: D# (data, quem decidiu) — decisão. -->

- **D1** (2026-06-23, `coordenador` + dono) — **Camadas de documentação.** O `CLAUDE.md`
  continua sendo a fonte das **convenções permanentes**; `AGENTS.md` é só um ponteiro fino
  para ele; **este** `AGENTS-COLLAB.md` é o **estado vivo**. Ordem de leitura acima.
- **D2** (2026-06-23, `coordenador` + dono) — **Elenco de 13 agentes** adotado (ver roster).
  Faixas não se sobrepõem; revisão é separada em `reviewer` (qualidade/segurança) e
  `code-reviewer` (diff).
- **D3** (2026-06-23, dono) — **Nada de mudança em banco remoto ou na auth de webhook sem
  aprovação.** Alinha com a regra inegociável do `CLAUDE.md` ("inspecionar e CONFIRMAR antes
  de operação destrutiva"). Hardenings de segurança ficam como **propostas prontas** em
  `docs/colaboracao/revisao-2026-06-23.md`, não aplicadas direto.
- **D4** (herdada do `CLAUDE.md`) — **Fase atual: chatbot WhatsApp + Telegram.** Scaffolding
  em `supabase/functions/{chatbot,telegram-webhook,whatsapp-webhook}`.
- **D5** (pendente — decisão do dono) — **Canal WhatsApp: Twilio vs Meta Cloud API.** O código
  atual já usa **Meta Cloud API** (`whatsapp-webhook`). Confirmar ou trocar antes de evoluir.

---

## Armadilhas conhecidas (traps)
<!-- Coisas que mordem quem não sabe. Curtas e específicas. -->

- ⚠️ **Chatbot pode soar prescritivo.** O `SYSTEM_BASE` do `chatbot` fala em "indicações de
  mercado" e "sugira venda PARCIAL"; o `CLAUDE.md` é inegociável: **"nunca recomendação de
  compra/venda. Quem decide é o produtor."** Tensão a resolver pelo dono — ver P0 no backlog.
- 🔓 **`whatsapp-webhook` não valida HMAC** (`X-Hub-Signature-256`). O Telegram está OK (secret
  token no header). Sem HMAC, forjar o campo `from` permite injetar produção/fixações na
  carteira de um cooperado já vinculado. Fix pronto na revisão (P0).
- 🗺️ **Mapa vazio é esperado, não bug.** `choropleth_vegetacao` faz **INNER JOIN** com
  `indices_vegetacao_regional`; enquanto o worker NDVI não popular a tabela, `/app/mapa` fica
  vazio mesmo com as 554 regiões já carregadas.
- 🛡️ **Helpers `SECURITY DEFINER` expostos via RPC.** `is_master`, `is_staff`,
  `current_cooperativa_id`, `staff_has_permission`, `protect_*_cols` são chamáveis por
  `anon`/`authenticated` em `/rest/v1/rpc/...`. As funções de trigger (`protect_*_cols`) não
  deveriam ter `EXECUTE` para ninguém. Hardening proposto (P1).
- 🐢 **RLS re-avalia `auth.uid()` por linha** (~17 políticas, lint `auth_rls_initplan`). Usar
  `(select auth.uid())` para o planejador avaliar uma vez. Perf (P2).
- 🧪 **Sem testes automatizados** em todo o repo. Primeira missão do `tester`.

---

## Dívida técnica priorizada (backlog)
<!-- Fonte: revisão 2026-06-23 (advisors do Supabase + npm audit + leitura de código). -->
<!-- Detalhes e SQL/código prontos: docs/colaboracao/revisao-2026-06-23.md -->

- **P0 — segurança / produto (precisa do dono):**
  1. Validar HMAC no `whatsapp-webhook`.
  2. Resolver a tensão "chatbot prescritivo × nunca recomendação".
- **P1 — hardening (vira migration 0010 + ajuste de painel):**
  3. `REVOKE EXECUTE` nas funções de trigger e helpers de RLS expostos via RPC.
  4. Ativar *Leaked Password Protection* no Auth (HaveIBeenPwned).
- **P2 — performance de banco (não urgente):**
  5. Trocar `auth.uid()` por `(select auth.uid())` nas políticas (lint `auth_rls_initplan`).
  6. Consolidar políticas permissivas duplicadas (lint `multiple_permissive_policies`, ~46).
  7. Indexar FKs sem cobertura (`revenue_share_events`, `staff_group_members`, ...).
  8. Mover `pg_net` para fora do schema `public`. Rever `unused_index` só após tráfego real.
- **Qualidade / infra:**
  9. Introduzir testes (`tester`): simulador, montar cenário do chatbot, RLS.
  10. Avaliar bump do `vite` (audit dev-only de `esbuild`; fix é breaking → `vite@8`).

---

## Estado atual por área (snapshot)

- **Banco:** migrations 0001–0009 aplicadas no remoto. `regioes_geo` com 554 microrregiões,
  27 UFs, 0 geometrias inválidas. `typecheck` e `lint` passam limpos.
- **Geo:** seed feito; falta a 1ª run do worker NDVI + backfill histórico (anomalia).
- **Chatbot:** scaffolding dos 3 canais pronto (app/telegram/whatsapp); usa Claude
  `claude-sonnet-4-6` com tool use e fallback determinístico sem `ANTHROPIC_API_KEY`.
- **Front:** rotas do app + `/app/mapa` (MapLibre) em lazy-load.

---

## Handoff mais recente
<!-- Sempre o topo = o mais recente. Use o template em docs/colaboracao/handoff-template.md -->

### 2026-06-23 · `coordenador` + `gerente-contexto` + `reviewer`
- **Objetivo da sessão:** adotar a metodologia AGENTS-COLLAB e o elenco de 13 agentes; revisar
  o que já foi implementado e registrar achados.
- **O que mudou:** criados `AGENTS-COLLAB.md`, `AGENTS.md`, `.claude/agents/*` (13 + README),
  `.claude/settings.json` (hook SessionStart de bootstrap), `docs/colaboracao/*` (metodologia,
  bootstrap, template de handoff, integração Claude Code, relatório de revisão). `CLAUDE.md`
  atualizado com a camada de colaboração. **Nenhuma mudança de código de aplicação nem de
  banco remoto.**
- **O que foi testado:** `npm run typecheck` ✅ · `npm run lint` ✅ (3 warnings cosméticos de
  `react-refresh` em componentes shadcn). Advisors do Supabase coletados (ver backlog).
- **Bloqueios / pendências:** itens **P0** e **P1** do backlog aguardam decisão/aprovação do
  dono antes de virar código/migration.
- **Próximo passo sugerido:** dono decide P0 (HMAC do WhatsApp; tom do chatbot). Depois,
  `supabase-db` prepara a migration 0010 (P1) a partir da revisão.
