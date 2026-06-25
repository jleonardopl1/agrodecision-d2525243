<!-- Ordem de leitura do projeto: AGENTS-COLLAB.md → CLAUDE.md → rules/ → código. -->

## Resumo
<!-- O que muda e, principalmente, POR QUÊ. -->

## Tipo de mudança
- [ ] feat · [ ] fix · [ ] refactor · [ ] docs · [ ] test · [ ] chore · [ ] perf · [ ] ci

## Como testei
<!-- Cole a saída real dos comandos. -->
```
npm run typecheck
npm run lint
npm run build
npm run test
```

## Checklist
- [ ] Segue `rules/` e as convenções do `CLAUDE.md`.
- [ ] **PT-BR** em UI, mensagens, comentários e docs.
- [ ] O bot/produto continua **informativo — nunca recomendação** de compra/venda.
- [ ] Sem segredos no diff; `.env` e `.lovable/` **intactos**.
- [ ] `src/integrations/supabase/types.ts` **não** editado à mão.
- [ ] Lógica pura nova tem teste (`*.test.ts`).
- [ ] Mudança em **banco remoto** ou **auth de webhook**? → tem **aprovação do dono** (Decisão D3).
- [ ] Não é commit direto na `main`; não houve force-push.
