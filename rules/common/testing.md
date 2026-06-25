# Testes — regras comuns

> Estado: o repo passou a ter harness (**Vitest**) na adoção do padrão ECC. A cobertura ainda
> é inicial (lógica pura do simulador). Crescer a cobertura é trabalho do agente `tester`.

## Ferramenta

- **Vitest** (combina com Vite + TS, baixo atrito). Testes co-localizados como `*.test.ts`
  ao lado do código, ou em `tests/` para integração.
- Comandos: `npm run test` (uma vez), `npm run test:watch`, `npm run test:coverage`.

## Fluxo TDD (quando aplicável)

1. **RED** — escreva o teste primeiro; ele deve **falhar**.
2. **GREEN** — implemente o mínimo para passar.
3. **REFACTOR** — limpe mantendo o verde.

Bug encontrado → escreva o teste que o pega **antes** de corrigir.

## O que cobrir (maior valor primeiro)

1. **Lógica pura** — `src/lib/simulador.ts` (carteira, simulação), `src/lib/format.ts`.
   Casos de borda: vazio, zero, negativo, `null`, fixado > produção.
2. **Regras de negócio** do chatbot (carteira = produção − fixado; preço médio fixado).
3. **RLS** (integração) — isolamento por `auth.uid()` e por cooperativa. Use **banco local**
   (`supabase start`), **nunca** o remoto.

## Princípios

- Teste **comportamento e regras**, não detalhe de implementação.
- Sem rede nos testes unitários — mocke o client Supabase.
- Nomes descritivos em **PT-BR**.
- Meta: subir a cobertura da lógica de negócio de forma incremental; priorize o que dá risco
  ao produtor (cálculo de receita/margem) sobre cobertura cosmética.
