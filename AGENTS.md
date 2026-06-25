# AGENTS.md

Catálogo e regras de orquestração dos agentes do AgroDecision. Padrão de organização adotado do
**ECC** (github.com/affaan-m/ECC), adaptado à metodologia **AGENTS-COLLAB** deste repositório.

- **Convenções permanentes** (fonte da verdade): `CLAUDE.md`.
- **Estado vivo** (decisões ativas, armadilhas, handoff): `AGENTS-COLLAB.md`.
- **Regras "sempre-seguir"** (o *quê*): `rules/` (comum + por stack).
- **Definições de cada agente** (o *quem/como*): `.claude/agents/` (+ `README.md` com o mapa de faixas).

## Ordem de leitura para qualquer agente

```
AGENTS-COLLAB.md → CLAUDE.md → rules/ + docs/ e specs → código
```

## Princípios fundamentais

1. **Segurança-primeiro** — `rules/common/security.md` + `SECURITY.md`.
2. **Informativo, nunca recomendação** — quem decide é o produtor.
3. **Teste-orientado** — `rules/common/testing.md`.
4. **Agente-primeiro** — delegue à faixa certa; não atravesse faixas.
5. **Planejar antes de executar.**
6. **Imutabilidade & validação na fronteira** — dado externo é não confiável.

## Catálogo de agentes (14)

| Agente | Faixa | Quando acionar | Edita? |
| --- | --- | --- | --- |
| `coordenador` | orquestra/roteia | tarefa cruza áreas ou precisa sequência | ❌ planeja |
| `gerente-contexto` | estado vivo | encerrar sessão, handoff, compactar/promover | ✍️ docs de estado |
| `arquiteto-dados` | desenho de dados | schema/RLS/índices/multi-tenant | ❌ spec |
| `supabase-db` | implementa banco | migration/RLS/triggers, aplica (com aprovação), types | ✅ |
| `edge-functions` | Deno | workers cron e webhooks (runtime/secrets/CORS/deploy) | ✅ |
| `chatbot` | bot WhatsApp/Telegram | fluxo, tools, tom (foco atual) | ✅ |
| `geo-pipeline` | geoespacial | Sentinel-2/PostGIS, NDVI, Actions | ✅ |
| `frontend` | app React | páginas/hooks/Query/Recharts | ✅ |
| `designer` | design system | tokens/tema/co-branding/a11y | ✅ visual |
| `tester` | testes | estratégia, harness, escrita/execução | ✅ testes |
| `reviewer` | saúde do projeto | lint/typecheck/build/advisors antes do PR | ❌ reporta |
| `code-reviewer` | qualidade do diff | bug/reuso/simplificação em um diff/PR | ❌ reporta |
| `security-reviewer` | segurança | OWASP/segredos/RLS/HMAC/injeção em código sensível | ❌ reporta |
| `documentation-writer` | docs humanos | README/docs/CLAUDE.md | ✍️ só docs |

Detalhe e a defesa de prompt de cada um em `.claude/agents/*.md`.

## Orquestração / delegação

- Pedido cruza áreas ou está ambíguo → comece pelo `coordenador` (planeja e roteia; não implementa).
- Mudança de schema → `arquiteto-dados` desenha → `supabase-db` implementa (aplicar no remoto exige
  aprovação do dono — Decisão D3).
- Código escrito/alterado → `code-reviewer` (diff) e, em código sensível, `security-reviewer`.
- Antes de abrir/mesclar PR → `reviewer` (lint/typecheck/build/advisors).
- Ao encerrar sessão relevante → `gerente-contexto` escreve o handoff em `AGENTS-COLLAB.md`.
- Operações independentes podem rodar **em paralelo** (vários agentes ao mesmo tempo).

> **Por que três arquivos?** `CLAUDE.md` muda raramente (estável); `AGENTS-COLLAB.md` muda a cada
> sessão (vivo); este `AGENTS.md` é o catálogo/ponteiro estável dos agentes. Separá-los é o que
> evita a "amnésia entre agentes". As **decisões e o handoff** ficam só no `AGENTS-COLLAB.md` —
> aqui não se duplica estado vivo.
