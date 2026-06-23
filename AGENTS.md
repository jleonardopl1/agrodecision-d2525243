# AGENTS.md

Este projeto mantém as **convenções permanentes** (stack, regras inegociáveis, schema,
comandos, fase atual) no **`CLAUDE.md`** — ele é a fonte da verdade.

O **estado vivo** do projeto (decisões ativas, armadilhas, elenco de agentes, último handoff)
fica no **`AGENTS-COLLAB.md`**.

## Ordem de leitura para qualquer agente

```
AGENTS-COLLAB.md → CLAUDE.md → docs/ e specs → código
```

## Elenco de agentes

As definições de cada agente especializado estão em **`.claude/agents/`**
(veja `.claude/agents/README.md` para o mapa de faixas).

> Por que dois arquivos? `CLAUDE.md` muda raramente (é estável). `AGENTS-COLLAB.md` muda a cada
> sessão (é vivo). Manter os dois separados é o que evita a "amnésia entre agentes".
> Este `AGENTS.md` existe só como ponteiro, para ferramentas/agentes que procuram por ele.
