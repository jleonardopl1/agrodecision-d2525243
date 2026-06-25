# Fluxo de Git — regras comuns

## Mensagem de commit (Conventional Commits)

```
<tipo>: <descrição no imperativo, em PT-BR>

<corpo opcional: o porquê, não o o quê>
```

**Tipos permitidos:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

Exemplos:
- `feat: simulador de venda no chat`
- `fix: validar HMAC no whatsapp-webhook`
- `docs: adotar o padrão ECC (rules/, SECURITY, CONTRIBUTING)`

A convenção é checada por `commitlint.config.js` (uso local/opcional).

## Branches

- Sempre a partir de `main`, nome descritivo em minúsculas com hífen:
  `feat/...`, `fix/...`, `docs/...`.
- Branches de sessão de agente seguem o padrão atribuído (ex.: `claude/...`).

## Pull Request (inegociável)

- **PR para `main`. Nunca commit direto na `main`. Nunca force-push.** Preserve o histórico.
- Antes de abrir: analise **todo** o range (`git diff main...HEAD`), não só o último commit.
- O corpo do PR traz: o que muda, **por quê**, e o **plano de teste** (o que rodou e a saída).
- Faça push de branch nova com `git push -u origin <branch>`.
- O PR nasce **pronto para revisão** (não draft).

## Antes do push

Rode e cole o resultado no PR: `npm run typecheck` · `npm run lint` · `npm run build` ·
`npm run test`. Veja `rules/common/testing.md`.
