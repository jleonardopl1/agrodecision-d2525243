# Contribuindo com o AgroDecision

Obrigado por contribuir. Este guia segue o padrão de organização adotado do ECC
(github.com/affaan-m/ECC), adaptado à nossa stack. **Tudo em PT-BR natural.**

## 1. Antes de tocar no código — ordem de leitura

```
AGENTS-COLLAB.md → CLAUDE.md → rules/ + docs/ → código
```

- `AGENTS-COLLAB.md` — o **agora**: decisões ativas, armadilhas, handoff mais recente.
- `CLAUDE.md` — convenções permanentes (fonte da verdade): stack, schema, comandos, fase.
- `rules/` — regras "sempre-seguir" (o *quê*); `.claude/agents/` — quem faz cada faixa (o *quem*).

## 2. Ambiente

```bash
npm install
npm run dev          # http://localhost:8080
```

## 3. Branch & commits

- Branch a partir de `main`, em minúsculas com hífen: `feat/...`, `fix/...`, `docs/...`.
- **Conventional Commits** (ver `rules/common/git-workflow.md`):
  `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
  Ex.: `feat: alerta de basis por UF no chat`.

## 4. Antes de abrir o PR — verificação local

```bash
npm run typecheck    # zero erros
npm run lint         # sem novos erros
npm run build        # compila
npm run test         # Vitest verde
```

## 5. Pull Request

- **PR para `main`. Nunca commit direto. Nunca force-push.** PR nasce **pronto para revisão**.
- Descreva: o que muda, **por quê**, e o **plano de teste** (cole a saída real dos comandos).
- Use o `.github/PULL_REQUEST_TEMPLATE.md`.

## 6. Checklist de contribuição

- [ ] Segue as regras de `rules/` e as convenções do `CLAUDE.md`.
- [ ] **PT-BR** em UI, mensagens, comentários e docs.
- [ ] O bot/produto continua **informativo — nunca recomendação** de compra/venda.
- [ ] Sem segredos no diff; `.env` e `.lovable/` **intactos**.
- [ ] `src/integrations/supabase/types.ts` **não** editado à mão (use `npm run db:types`).
- [ ] Lógica pura nova tem teste (`*.test.ts`).
- [ ] `typecheck`, `lint`, `build` e `test` passam.
- [ ] Mudança em **banco remoto** ou **auth de webhook**? → tem **aprovação do dono** (Decisão D3).

## 7. Trabalhando com os agentes

O projeto usa a metodologia **AGENTS-COLLAB** com um elenco de agentes especializados
(`.claude/agents/`). Use a faixa certa (ex.: `frontend`, `supabase-db`, `edge-functions`,
`security-reviewer`) e, ao encerrar uma sessão relevante, atualize o **Handoff** em
`AGENTS-COLLAB.md` (template em `docs/colaboracao/handoff-template.md`).

## 8. Reportar segurança

Vulnerabilidade **não** vai em issue pública — siga o `SECURITY.md`.
