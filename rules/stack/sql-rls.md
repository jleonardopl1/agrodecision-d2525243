# Stack — SQL, RLS & migrations (`supabase/migrations/`)

Precede `common/` no que for específico de banco. Desenho é do `arquiteto-dados`;
implementação é do `supabase-db`.

## Migrations

- Sempre **uma nova** migration `00NN_descricao.sql` (próxima = **0010**).
  **Nunca reescreva** migrations já aplicadas (0001–0009).
- Mudança em **banco remoto** (`apply_migration` / `db push`) ou destrutiva exige **aprovação do
  dono (Decisão D3)**. Mostre o SQL e o impacto antes.

## RLS (toda tabela de dados)

- Toda tabela de dados nasce com **RLS habilitada** e políticas **explícitas**.
- Padrão de performance: use **`(select auth.uid())`** nas políticas (evita reavaliar por linha —
  lint `auth_rls_initplan`). Prefira **uma política permissiva por ação** (lint
  `multiple_permissive_policies`).
- Modelo: dados **compartilhados** (cotações, sinais, câmbio, índices) → leitura para qualquer
  autenticado, escrita só por worker/`service role`; dados **do dono** (custos, alertas,
  relatórios, produções, fixações) → isolados por `auth.uid()`; tenant por `current_cooperativa_id()`.

## Funções e segurança

- `security invoker` quando possível; sempre `set search_path = public, extensions`
  (evita advisor de search_path mutável).
- Funções de **trigger** (`protect_*_cols`) e helpers de RLS expostos via RPC não devem ter
  `EXECUTE` para `anon`/`authenticated` → `REVOKE EXECUTE` (hardening P1 rastreado).
- Indexe **toda FK consultada** (cobertura).

## Depois de qualquer DDL

- `npm run db:types` (regenera `types.ts`) + `npm run typecheck`.
- Rode `get_advisors` (security + performance) e relate os achados; compare com o backlog.
