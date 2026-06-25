# AgroDecision

Inteligência de mercado para o produtor rural: **preço, câmbio, custo e margem em uma tela**. Em
30 segundos o produtor sabe se deve **VENDER**, **AGUARDAR** ou prestar **ATENÇÃO** — com um sinal
de IA explicado em linguagem do campo. Distribuído via cooperativas (multi-tenant, co-branded).

[![CI](https://github.com/jleonardopl1/agrodecision-d2525243/actions/workflows/ci.yml/badge.svg)](https://github.com/jleonardopl1/agrodecision-d2525243/actions/workflows/ci.yml)

## Stack

- **Frontend:** Vite + React 18 + TypeScript, Tailwind (shadcn/ui), TanStack Query, React Router, Recharts
- **Backend:** Supabase (Postgres + RLS, Auth, Edge Functions)
- **IA:** Claude API no `sinal-ia-worker` (1 sinal por commodity/hora — custo fixo, nunca por usuário)

## Rodando localmente

```bash
npm install
npm run dev          # http://localhost:8080
```

O frontend aponta por padrão para o projeto Supabase de produção (chave publishable é pública;
RLS protege os dados). Para apontar para outro projeto, copie `.env.example` para `.env`.

### Banco local (opcional)

```bash
supabase start       # Postgres + Studio locais
supabase db reset    # aplica migrations + seed (cooperativa "demo")
```

## Estrutura

```
src/
  integrations/supabase/   # client + types gerados (npm run db:types)
  hooks/                   # use-auth (sessão/cooperado), use-market (cotações/sinais/câmbio)
  components/              # AppLayout, SinalCard, PrecoChart, CoopThemeProvider, ui/ (shadcn)
  pages/                   # Landing, /c/:slug, Login, Cadastro, Dashboard, Margem, Alertas,
                           # Relatórios, Perfil, AdminCoop
supabase/
  migrations/              # 0001 tenancy+RLS · 0002 mercado · 0003 dados do usuário
                           # 0004 revenue share 20% · 0005 trigger de signup + branding RPC
  functions/               # cotacao-worker · sinal-ia-worker · alerta-worker · relatorio-worker
geo/                       # pipeline Python Sentinel-2/PostGIS (NDVI) + GitHub Actions
rules/                     # regras "sempre-seguir" (common/ + stack/)
.claude/agents/            # elenco de 14 agentes (metodologia AGENTS-COLLAB)
.github/                   # CI (workflows/ci.yml) + templates de PR/issue
CLAUDE.md · AGENTS.md · AGENTS-COLLAB.md · SECURITY.md · CONTRIBUTING.md
```

## Multi-tenant & co-branding

- Cada **cooperativa** é um tenant (`cooperativas`); o cooperado nasce vinculado a ela via
  trigger de signup (`raw_user_meta_data.cooperativa_slug`, padrão `demo`).
- Portal co-branded em `/c/<slug>` (RPC pública `get_coop_branding`); dentro do app o
  `CoopThemeProvider` sobrescreve `--primary`/`--accent` com as cores da cooperativa.
- Dados de mercado (cotações, sinais, câmbio) são **compartilhados** — leitura para qualquer
  autenticado; escrita apenas pelos workers (service role). Dados do produtor (custos, alertas,
  relatórios) são isolados por `auth.uid()`.

## Workers (Edge Functions)

| Função              | Papel                                              | Agendamento sugerido |
| ------------------- | -------------------------------------------------- | -------------------- |
| `cotacao-worker`    | Atualiza `cotacoes_cache` e `cambio_cache`         | a cada 15 min        |
| `sinal-ia-worker`   | Gera sinal por commodity (Claude API ou heurística)| a cada hora          |
| `alerta-worker`     | Dispara alertas configurados                       | a cada 15 min        |
| `relatorio-worker`  | Gera o PDF semanal                                 | semanal              |

Secrets: `ANTHROPIC_API_KEY` (opcional — sem ela o sinal usa heurística determinística) e
`WORKER_SECRET` (header `x-worker-secret`).

## Scripts

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # Vitest (test:watch · test:coverage)
npm run db:types     # regenera src/integrations/supabase/types.ts
```

## Testes

Harness em **Vitest**. A cobertura inicial mira a lógica pura de `src/lib/simulador.ts`
(carteira e simulação de venda). Rode `npm run test`. O padrão e o que cobrir estão em
`rules/common/testing.md`; expandir a cobertura é faixa do agente `tester`.

## Segurança

Práticas de segredo/RLS/webhook e **divulgação responsável** em [`SECURITY.md`](./SECURITY.md).
Vulnerabilidade **não** vai em issue pública. Checklist pré-commit e defesa de prompt em
`rules/common/security.md`.

## Contribuindo

Leia [`CONTRIBUTING.md`](./CONTRIBUTING.md): ordem de leitura, **Conventional Commits** e o
checklist de PR (PT-BR · bot informativo · `.env`/`.lovable/` intactos · `types.ts` não editado
à mão · testes verdes).

## Colaboração entre agentes (AGENTS-COLLAB)

O projeto usa a metodologia **AGENTS-COLLAB** com um elenco de **14 agentes** especializados —
organização inspirada no padrão do **ECC** (github.com/affaan-m/ECC):

- **Estado vivo** (decisões, armadilhas, handoff): [`AGENTS-COLLAB.md`](./AGENTS-COLLAB.md)
- **Convenções permanentes**: [`CLAUDE.md`](./CLAUDE.md)
- **Regras "sempre-seguir"**: [`rules/`](./rules) (comum + por stack)
- **Catálogo e faixas dos agentes**: [`AGENTS.md`](./AGENTS.md) e `.claude/agents/`
