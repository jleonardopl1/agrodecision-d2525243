# Metodologia de colaboração entre agentes

Adaptação do **AGENTS-COLLAB.md** (github.com/Rlealbarili/Agents-Collab.md) à stack do
AgroDecision. O problema que ela resolve: **vários agentes de IA trabalham no mesmo projeto em
sessões diferentes, às vezes em paralelo, e cada um chega sem saber das decisões recentes.**

## Os cinco princípios

1. **Vivo, não histórico.** `AGENTS-COLLAB.md` descreve o *agora* — não é um changelog.
2. **Compacto.** Leitura em ≤ 3 minutos. O que cresce demais é promovido ou removido.
3. **Atribuído.** Toda decisão diz *quem* decidiu e *quando*.
4. **Handoff fail-closed.** Quem sai documenta o que mudou, o que testou, o que bloqueou e o
   próximo passo. O próximo agente nunca precisa adivinhar.
5. **Promove para cima.** Decisão que estabilizou sai do estado vivo e vira convenção
   permanente no `CLAUDE.md` (ou uma spec em `docs/`).

## As camadas (e por que separá-las)

| Camada | Arquivo | Muda | Conteúdo |
| --- | --- | --- | --- |
| Estado vivo | `AGENTS-COLLAB.md` | A cada sessão | Decisões ativas, armadilhas, roster, handoff |
| Convenções | `CLAUDE.md` | Raramente | Stack, regras, schema, comandos, fase |
| Ponteiro | `AGENTS.md` | Quase nunca | Aponta para os dois acima |
| Detalhe | `docs/`, specs | Por área | Aprofundamento de um tópico |

Ordem de leitura: **`AGENTS-COLLAB.md` → `CLAUDE.md` → `docs/`/specs → código.**

## Ciclo de vida de uma sessão

1. **Chegada.** Leia `AGENTS-COLLAB.md` (Decisões Ativas + Armadilhas), depois `CLAUDE.md`.
2. **Trabalho.** Use o agente certo para a faixa (ver `.claude/agents/README.md`).
3. **Handoff.** Atualize a seção *Handoff mais recente* com o template
   (`docs/colaboracao/handoff-template.md`). Registre novas armadilhas e decisões.
4. **Promoção.** Decisão estável → mova para o `CLAUDE.md` e remova do estado vivo.

## Como isto vive no Claude Code

- **Agentes** = subagentes em `.claude/agents/*.md` (frontmatter `name`/`description` + corpo).
- **Bootstrap** = hook `SessionStart` em `.claude/settings.json` injeta `bootstrap.md` no
  contexto de toda sessão, garantindo que o agente que chega leia o estado vivo.
- **Promoção** = tarefa recorrente do `gerente-contexto` e do `documentation-writer`.

Detalhes de mapeamento em `docs/colaboracao/integracao-claude-code.md`.
