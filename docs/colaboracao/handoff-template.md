# Template de Handoff Block

Copie o bloco abaixo para o **topo** da seção *Handoff mais recente* do `AGENTS-COLLAB.md`
ao terminar uma sessão com mudanças relevantes. O mais recente fica sempre em cima.

```markdown
### AAAA-MM-DD · `agente(s)-envolvidos`
- **Objetivo da sessão:** (1 frase — o que você se propôs a fazer)
- **O que mudou:** (arquivos/áreas tocados; seja específico)
- **O que foi testado:** (typecheck/lint/build/testes — cole o resultado, não só "passou")
- **Bloqueios / pendências:** (o que ficou no meio do caminho e por quê)
- **Próximo passo sugerido:** (o que o próximo agente deveria fazer)
```

## Regras do handoff (fail-closed)

- **Não invente "ok".** Se um teste falhou, diga que falhou e cole a saída.
- **Registre armadilhas novas** na seção *Armadilhas conhecidas* — toda pegadinha que você
  descobriu economiza horas do próximo.
- **Atualize Decisões Ativas** se você decidiu algo que muda o rumo (com data e seu nome).
- **Promova o que estabilizou:** se uma decisão virou regra, mova-a para o `CLAUDE.md`.

## Bootstrap (cola para iniciar uma sessão/agente externo)

Em ambientes sem o hook `SessionStart`, cole isto no início da conversa:

```
Leia AGENTS-COLLAB.md e depois CLAUDE.md antes de agir. Respeite as Decisões Ativas e as
Armadilhas. Ao terminar, escreva um Handoff Block no AGENTS-COLLAB.md.
```
