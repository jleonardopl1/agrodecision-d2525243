# Stack — TypeScript + React (app `src/`)

Precede `common/` no que for específico do front. Faixa do agente `frontend` (visual é do `designer`).

## Convenções

- Vite SPA (React 18 + SWC) + TypeScript. Roteamento `react-router-dom`; dados via
  `@tanstack/react-query`; UI Tailwind + **shadcn/ui** (Radix); gráficos `recharts`; toasts `sonner`.
- **`src/integrations/supabase/types.ts` é gerado — NUNCA editar à mão.** Regenere com
  `npm run db:types` após mudança de schema.
- Reuse `src/components/ui/` (shadcn), o `AppLayout` e os hooks de `src/hooks/`
  (`use-auth`, `use-market`, `use-carteira`, `use-chat`, `use-vegetacao`, `use-staff`).
- Lógica de cálculo mora em `src/lib/` (puro, testável) — ex.: `simulador.ts`. Não reimplemente
  regra de carteira/margem na página; importe de `src/lib/`.

## Multi-tenant & tema

- Cores primárias são **sobrescritas por cooperativa em runtime** (`CoopThemeProvider`).
  **Nunca hardcode cor**; use CSS vars / tokens. Token faltando → peça ao `designer`.

## Performance

- A página `/app/mapa` (MapLibre) é **lazy-load** (chunk próprio) — mantenha assim.
- Estados de loading/erro explícitos; chaves de query estáveis.

## Qualidade

- `npm run typecheck` com **zero erros** e `npm run lint` antes de entregar.
- Cubra lógica pura nova com teste (`*.test.ts`, Vitest) — ver `common/testing.md`.
