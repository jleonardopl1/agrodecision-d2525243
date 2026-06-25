# Estilo de código — regras comuns

## Organização de arquivos

- **Muitos arquivos pequenos** em vez de poucos grandes. ~200–400 linhas é o normal; 800 é teto.
- Organize **por funcionalidade/domínio**, não por tipo. Alta coesão, baixo acoplamento.
- Nomes de arquivo em **minúsculas com hífen** (ex.: `use-carteira.ts`, `security-reviewer.md`).
- Para agentes/docs com frontmatter, o **nome do arquivo casa com o campo `name:`**.

## Funções e legibilidade

- Funções pequenas (< ~50 linhas) e com um propósito. Sem aninhamento profundo (> 4 níveis).
- Identificadores legíveis e bem nomeados. Sem valores mágicos — extraia constantes nomeadas.
- Comente o **porquê**, não o óbvio. Combine densidade e estilo de comentário com o arquivo ao redor.

## Imutabilidade e validação

- Prefira **criar novos objetos** a mutar os existentes (ver `patterns.md`).
- **Valide na fronteira** (entrada de webhook, RPC, formulário); falhe cedo com mensagem clara.

## Idioma

- **PT-BR natural** em UI, mensagens, comentários e docs. Sem jargão financeiro no produto/bot
  ("hedge", "basis", "EBITDA") — fale a língua do campo.

## Tratamento de erro

- Trate erro em todos os níveis. Mensagem amigável na UI; contexto detalhado **só** no log do
  servidor. **Nunca** engula erro em silêncio.
