────────────────────────────────────────────────────────────────────
🌱 AgroDecision · protocolo de colaboração entre agentes (AGENTS-COLLAB)
────────────────────────────────────────────────────────────────────
ANTES de agir, leia nesta ordem:
  1. AGENTS-COLLAB.md  → o ESTADO VIVO (decisões ativas, armadilhas, handoff).
  2. CLAUDE.md         → convenções permanentes (regras inegociáveis).
  3. docs/ e specs     → detalhe da área que você vai tocar.

Regras que ninguém quebra:
  • PT-BR natural no produto e no bot.
  • O bot é INFORMATIVO — nunca recomendação de compra/venda. Quem decide é o produtor.
  • Nunca force-push. PR para a main, nunca commit direto. Preservar .lovable/ e .env.
  • Inspecionar e CONFIRMAR com o dono antes de qualquer operação destrutiva ou
    de mudar banco remoto / auth de webhook.

Quem é quem: .claude/agents/README.md (elenco de 13 agentes e suas faixas).

AO SAIR: atualize o "Handoff mais recente" em AGENTS-COLLAB.md
(template: docs/colaboracao/handoff-template.md). Fail-closed: não deixe o
próximo agente adivinhar.
────────────────────────────────────────────────────────────────────
