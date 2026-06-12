## AgroDecision SaaS — MVP

Construir o app diretamente neste projeto Lovable (já conectado ao Supabase `hacobjcbamavimzdtcki` e ao seu GitHub). Tudo que eu escrever vira commit automático no repo via o sync da Lovable — não há passo manual de PR.

Aproveito as tabelas que já existem: `cooperativas`, `cooperados`, `commodities_config`, `cotacoes_cache`, `cambio_cache`, `sinais_ia`, `alertas`, `relatorios`, `custos_producao`. O trigger `handle_new_user` e as funções `current_cooperativa_id`, `is_coop_admin`, `get_coop_branding` também já estão prontos.

---

### 1. Auth + multi-tenant por cooperativa

- Página pública `/auth` (login + cadastro) usando email/senha do Supabase.
- No cadastro: campos `nome`, `email`, `senha`, `cooperativa_slug`, `culturas` (multi-select). Esses metadados vão em `options.data` para o trigger `handle_new_user` popular `cooperados` automaticamente.
- Layout protegido `src/routes/_authenticated/route.tsx` (gerenciado pela integração) cobre todo o app autenticado.
- Branding por cooperativa: `useCoopBranding(slug)` chama `get_coop_branding` e aplica `cor_primaria` / `cor_secundaria` como CSS vars + mostra `logo_url` no header.
- Header com nome do cooperado, cooperativa, botão de logout (com `cancelQueries` + `clear` + `signOut` + redirect para `/auth`).

### 2. Dashboard de cotações & câmbio (`/`)

- Cards no topo: principais commodities ativas da cooperativa (via `commodities_config` JOIN `cotacoes_cache` — última cotação por commodity), com preço, unidade, variação % colorida.
- Cards de câmbio (USD/BRL, EUR/BRL etc.) lendo as linhas mais recentes de `cambio_cache`.
- Gráfico de linha (Recharts) do histórico de uma commodity selecionada usando `cotacoes_cache` ordenado por `capturado_em`.
- Filtros: commodity, fonte, região, tipo (físico/futuro).

### 3. Sinais de IA + alertas

- `/sinais`: lista os `sinais_ia` mais recentes com badge de `sinal` (compra/venda/manter), `recomendacao` em prosa e nível de confiança.
- `/alertas`: CRUD dos `alertas` do cooperado logado (RLS já filtra por `cooperado_id = auth.uid()`). Form: tipo (preço commodity / par câmbio), commodity OU par_cambio, operador (`>=`, `<=`), valor_alvo, canais (email/push), ativo on/off. Listagem mostra `ultimo_disparo`.

### 4. Relatórios & custos

- `/relatorios`: lista os `relatorios` semanais do cooperado, link para `pdf_url`, marca `aberto=true` ao clicar.
- `/custos`: CRUD de `custos_producao` (commodity, safra, custo_por_saca). Cálculo de margem por commodity comparando `custo_por_saca` com último preço de `cotacoes_cache` — exibido como cards "Margem atual".

---

### Detalhes técnicos

- **Stack já configurada**: TanStack Start + React Query + Tailwind v4 + shadcn/ui + Supabase client/middleware.
- **Leitura de dados**: padrão `createServerFn` + `requireSupabaseAuth` para tudo que depende do cooperado logado (sinais, alertas, relatórios, custos, branding aplicado ao usuário). Cotações e câmbio podem ser lidos direto do client (`supabase` browser) já que RLS permite leitura autenticada. Carregamento via `ensureQueryData` + `useSuspenseQuery`.
- **Mutations**: `createServerFn` + `useMutation` + `invalidateQueries`. Nada de `onClick` chamando server fn direto.
- **Rotas (todas dentro de `_authenticated/` exceto `/auth`)**:
  ```text
  src/routes/
    auth.tsx                       (público)
    _authenticated/
      route.tsx                    (gate, gerenciado)
      index.tsx                    (Dashboard cotações/câmbio)
      sinais.tsx
      alertas.tsx
      relatorios.tsx
      custos.tsx
  ```
- **Server functions** em `src/lib/*.functions.ts`: `branding.functions.ts`, `cotacoes.functions.ts`, `sinais.functions.ts`, `alertas.functions.ts`, `relatorios.functions.ts`, `custos.functions.ts`.
- **UI**: shadcn (Card, Table, Dialog, Form, Select, Switch, Badge) + Recharts para gráficos. Sidebar fixa à esquerda com navegação entre as seções, header com branding da cooperativa.
- **SEO/head**: cada rota define `head()` com title/description específicos.
- **Schema**: NÃO precisa migration agora — tudo o que o MVP usa já existe. Migrations só entram se algum campo faltar durante a implementação.

### Fora do escopo deste MVP

- Job de coleta de cotações reais (continua dependendo do que popular `cotacoes_cache` / `cambio_cache` — hoje os caches existem mas não há scheduler no Lovable; podemos adicionar depois via cron + server route `/api/public/...`).
- Geração real dos PDFs em `relatorios.pdf_url` e geração dos `sinais_ia` por IA (LLM): ficam para iteração seguinte, junto com integração Stripe (campos já existem em `cooperativas`/`cooperados`).
- Painel admin da cooperativa (`is_coop_admin`) — listamos o cooperado padrão; o painel admin vem numa próxima rodada.

### Como o "commit/PR" acontece

Como você já conectou este projeto ao GitHub, cada edição que eu fizer aqui é empurrada automaticamente como commit para `jleonardopl1/AgroDecision`. Você não precisa abrir PR — o sync é direto na branch padrão. Se quiser fluxo de PR, ative branches em **Account Settings → Labs → GitHub Branch Switching** e me avise antes de eu começar, que eu trabalho numa branch.
