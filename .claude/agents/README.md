# Elenco de agentes — AgroDecision

Subagentes especializados (metodologia **AGENTS-COLLAB**, ver `docs/colaboracao/metodologia.md`).
Cada um tem uma **faixa** clara para evitar sobreposição. O estado vivo do projeto fica em
`AGENTS-COLLAB.md`; as convenções permanentes em `CLAUDE.md`.

## Mapa de faixas

| Agente | Aciona quando... | Edita código? |
| --- | --- | --- |
| `coordenador` | a tarefa cruza várias áreas ou precisa ser sequenciada/roteada | ❌ planeja |
| `gerente-contexto` | encerrar sessão, escrever handoff, compactar/promover o estado vivo | ✍️ só docs de estado |
| `arquiteto-dados` | desenhar schema/RLS/índices/multi-tenant | ❌ só spec |
| `supabase-db` | implementar migration/RLS, aplicar no remoto, gerar types | ✅ |
| `edge-functions` | workers Deno e webhooks (runtime/secrets/CORS/deploy) | ✅ |
| `chatbot` | **foco atual**: bot WhatsApp/Telegram (fluxo, tools, tom) | ✅ |
| `geo-pipeline` | pipeline Python Sentinel-2/PostGIS, NDVI, Actions | ✅ |
| `frontend` | páginas/rotas/hooks/Query/Recharts no app React | ✅ |
| `designer` | design system, tokens, tema, co-branding, a11y | ✅ visual |
| `tester` | estratégia e escrita de testes (montar o harness) | ✅ testes |
| `reviewer` | portão de qualidade (lint/typecheck/build/advisors) | ❌ reporta |
| `code-reviewer` | revisão de um diff/PR (correção, reuso, simplificação) | ❌ reporta |
| `security-reviewer` | auditoria de segurança (OWASP, segredos, RLS, HMAC, injeção de prompt) | ❌ reporta |
| `documentation-writer` | README/docs/CLAUDE.md voltados a humanos | ✍️ só docs |

## Como acionar

- **Manual:** "use o agente `chatbot` para ..." ou a ferramenta Task/Agent com `subagent_type`
  igual ao `name` do agente.
- **Automático:** o orquestrador lê o campo `description` de cada agente para delegar. Por isso
  cada `description` começa com "Use este agente quando ...".

## Convenção de revisão (três faixas, de propósito)

- `reviewer` = **saúde do projeto** (passa lint/types/build? respeita convenções? o que dizem os
  advisors?).
- `code-reviewer` = **qualidade do diff** (este conjunto de mudanças tem bug, duplicação,
  complexidade desnecessária?).
- `security-reviewer` = **risco de segurança** (OWASP, segredos, RLS/authz, HMAC de webhook,
  injeção de prompt) — acione em código sensível antes de mesclar.

Detalhes de integração com o Claude Code: `docs/colaboracao/integracao-claude-code.md`.
