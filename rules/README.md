# rules/ — regras "sempre-seguir" do AgroDecision

Esta camada nasceu da adoção do padrão do **ECC** (*Everything Claude Code*,
github.com/affaan-m/ECC) como modelo de organização. São as **regras permanentes** que todo
agente (humano ou IA) segue ao tocar este repositório.

## Regras × Agentes × Estado vivo

| Camada | Arquivo(s) | Responde |
| --- | --- | --- |
| **Regras** (o *quê*) | `rules/**` | Quais padrões e checklists sempre valem |
| **Agentes** (o *quem/como*) | `.claude/agents/**` | Quem executa cada faixa de trabalho |
| **Convenções** (a fonte) | `CLAUDE.md` | Stack, schema, comandos, fase atual |
| **Estado vivo** (o *agora*) | `AGENTS-COLLAB.md` | Decisões ativas, armadilhas, handoff |

> **Regras dizem o que alcançar; os agentes em `.claude/agents/` dizem quem faz e como.**
> Quando uma regra conflita com o `CLAUDE.md`, o `CLAUDE.md` vence (é a fonte da verdade);
> estas regras o detalham, nunca o contradizem.

## Organização (comum + por stack)

```
rules/
  common/    # regras agnósticas de linguagem — valem para tudo
    coding-style.md   git-workflow.md   security.md   testing.md   patterns.md
  stack/     # regras específicas da stack do AgroDecision
    typescript-react.md   deno-edge-functions.md   sql-rls.md   python-geo.md
```

## Precedência

**Regra de stack > regra comum.** Quando uma regra de `stack/` é mais específica que uma de
`common/`, a de stack prevalece (como especificidade de CSS). As regras de `common/` são o piso;
as de `stack/` ajustam ao idioma de cada parte do sistema.

## Regras inegociáveis (resumo — detalhe no `CLAUDE.md`)

- **PT-BR natural** no produto e no bot.
- O bot é **informativo — nunca recomendação** de compra/venda. Quem decide é o produtor.
- **Nunca force-push.** PR para `main`, nunca commit direto. Preservar histórico.
- Preservar **`.lovable/`** e **`.env`**.
- **Inspecionar e CONFIRMAR com o dono** antes de qualquer operação destrutiva, mudança em
  banco remoto ou em autenticação de webhook (Decisão D3).
