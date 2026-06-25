# Padrões — regras comuns

## Imutabilidade (importante)

Sempre crie um novo objeto/array com a mudança aplicada em vez de mutar o original. Facilita
raciocínio, evita efeitos colaterais e combina com React/Query.

## Validação de entrada

- Valide **todo** dado externo na fronteira do sistema (webhook, RPC, formulário).
- Validação por esquema quando der; falhe rápido com mensagem clara.
- Nunca confie em dado externo (ver defesa de prompt em `security.md`).

## Tratamento de erro

- Trate em cada nível. UI mostra mensagem amigável; servidor loga o contexto.
- Estados de carregamento/erro explícitos no front (não deixe a tela "pendurada").

## Camada de dados

- Lógica pura (cálculo) separada de I/O — ver `src/lib/simulador.ts` (funções puras
  reutilizadas pela tela e espelhadas na edge function `chatbot`). **Não duplique a regra**:
  centralize o cálculo e reuse.
- Dados **compartilhados** (cotações, sinais, câmbio, índices) vs. dados **do dono** (custos,
  alertas, relatórios, produções, fixações) — o isolamento é responsabilidade da RLS, não da UI.

## Consistência

- Escreva código que **pareça** o código ao redor: mesmos nomes, idioms e estrutura.
- Reuse o que já existe (`src/components/ui/`, hooks em `src/hooks/`, `src/lib/`) antes de criar.
