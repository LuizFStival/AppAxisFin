# AxisFin

AxisFin é um aplicativo web mobile-first para controle financeiro pessoal. O app organiza contas, cartões, receitas, despesas, transferências, categorias, faturas e relatórios mensais com dados reais por usuário.

## Stack

- Vite 6
- React 19
- TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`
- Supabase Auth
- Supabase Postgres com RLS por `user_id`
- Supabase CLI para migrations
- Recharts para gráficos
- Lucide React para ícones
- Vercel Speed Insights
- Vercel para deploy

## Regras De Produto

- Supabase é a fonte de verdade para dados financeiros.
- Contas, cartões, categorias, transações e saldos não podem ser persistidos em `localStorage`.
- Cada usuário vê e altera apenas os próprios dados.
- Conta nova não nasce com contas, cartões ou transações de exemplo.
- Categorias padrão são criadas por usuário apenas como ponto de partida.
- Categorias podem ser criadas, editadas e excluídas pelo usuário.
- Contas, cartões e categorias bloqueiam nomes repetidos por usuário conforme a regra de negócio.
- Valores monetários usam formato brasileiro, como `R$ 0,00`.
- Faturas de cartão respeitam fechamento e vencimento.
- Pagamento de fatura deve escolher data e conta, descontar o saldo da conta e marcar os lançamentos da fatura como pagos.
- Exclusão de dados financeiros críticos deve pedir confirmação antes de executar efeitos destrutivos.

## Funcionalidades Atuais

- Autenticação com Supabase.
- Dashboard com saldo atual, receitas, despesas do mês, recebido, pago, contas e cartões.
- Cards de resumo do dashboard abrem a lista de transações filtrada.
- Contas com visão geral e detalhe por conta, incluindo entradas, saídas e transações do mês.
- Cartões com fatura por ciclo de fechamento, valor atual, status, pagamento de fatura e ações de edição/exclusão.
- Cartões com bandeira e cor personalizáveis, refletidas nos resumos e faturas.
- Lançamentos de receita, despesa, transferência, despesa fixa recorrente e despesa parcelada.
- Despesas fixas recorrentes com projeções pendentes, edição de tipo e exclusão somente da ocorrência ou desta em diante.
- Reembolsos vinculados a pessoas, com estados pendente/recebido e conta de recebimento.
- Reembolsos são um recurso opcional por usuário, habilitado nas configurações do Perfil.
- Transações mensais separadas entre todas, gastos pessoais e gastos de terceiros, com filtros por tipo e balanço auditável.
- Balanço mensal com receitas, reembolsos, gastos pessoais e valores de terceiros discriminados.
- Categorias com ícones, cores, criação, edição, exclusão e separação entre entradas e despesas.
- Relatório detalhado mensal com visão Geral/Apenas meu, totais de entradas e saídas, comparação, balanço, reembolsos, evolução diária e gastos por categoria.
- Perfil com atalhos operacionais, cartões e categorias.
- Exportação mensal ou anual de lançamentos em CSV compatível com Excel.
- Metas financeiras ativas/concluídas com imagem, valor-alvo, categoria/data opcionais e aportes ou retiradas auditáveis.
- Orçamentos mensais por categoria com consumo pessoal, valor disponível, comparação ao mês anterior e alertas em 70%, 90% e 100%.
- Central de notificações persistida para despesas próximas/atrasadas, faturas a vencer/vencidas e reembolsos atrasados, acessível pelo sino com badge no cabeçalho da Home.
- Previsão de caixa dos próximos 30 dias com saldo projetado, receitas pendentes, despesas fixas e reembolsos esperados.

## Arquitetura

```text
src/
  components/
    app/lazyComponents.tsx
    accounts/
    cards/
    categories/
    dashboard/
    goals/
    layout/
    profile/
    reimbursements/
    reports/
    shared/
    transactions/
  features/
    accounts/accountRepository.ts
    auth/useAuthSession.ts
    cards/cardRepository.ts
    cards/useInvoiceOrdering.ts
    categories/categoryRepository.ts
    budgets/budgetRepository.ts
    finance/financeStore.ts
    goals/goalRepository.ts
    notifications/notificationRepository.ts
    profile/profileRepository.ts
    recurring/recurringRepository.ts
    reimbursements/reimbursementRepository.ts
    transactions/transactionRepository.ts
  lib/
    supabase/supabaseClient.ts
    utils/
  data/
    mockData.ts
  types.ts
```

Os componentes cuidam da interface. Os repositories cuidam de leitura/escrita por feature. `financeStore` centraliza snapshot, bootstrap de categorias e mapeamento dos dados vindos do Supabase. A sessão fica isolada em `useAuthSession`, enquanto `useInvoiceOrdering` encapsula a persistência diferida da ordem da fatura.

As telas e os modais secundários usam carregamento sob demanda com `React.lazy` e `Suspense`. O bundle inicial mantém autenticação, shell e regras centrais; relatórios e demais áreas são baixados apenas quando acessados.

## Supabase

Variáveis exigidas no ambiente local e na Vercel:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca colocar `service_role` ou secret key no frontend.

Em projetos novos do Supabase, use a chave `sb_publishable_...` no `VITE_SUPABASE_ANON_KEY`. Em projetos legados, use a chave `anon public`. Nunca use `sb_secret_...` em variável `VITE_`, porque ela vai para o navegador.

Comandos principais:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Migrations importantes:

- `20260609120000_unique_account_card_names_ci.sql`: nomes únicos para contas/cartões por usuário, ignorando caixa e espaços.
- `20260611195552_enforce_user_owned_finance_refs.sql`: triggers para impedir vínculos financeiros entre usuários diferentes.
- `20260612022118_unique_category_names_ci.sql`: nomes únicos para categorias por usuário e fluxo.
- `20260617000546_reimbursements.sql`: pessoas e estados de reembolso vinculados aos lançamentos.
- `20260617022502_recurring_transactions.sql`: regras persistentes para despesas fixas recorrentes.
- `20260625010452_sync_account_balances_from_transactions.sql`: sincronização segura de saldos a partir dos lançamentos.
- `20260625012331_reimbursement_received_account.sql`: conta que recebeu o reembolso.
- `20260628223048_add_reimbursements_feature_flag.sql`: preferência por usuário para habilitar reembolsos e gastos de terceiros.
- `20260628230300_goals_module.sql`: imagens, categorias e movimentações auditáveis das metas.

## Segurança

- RLS deve estar habilitado em todas as tabelas financeiras.
- Policies devem usar `(select auth.uid()) = user_id`.
- Inserts e updates precisam de `WITH CHECK`.
- Referências entre tabelas financeiras devem validar ownership do mesmo usuário.
- A sessão de autenticação do Supabase usa `localStorage` com chave `axisfin.auth.session`, mantendo o login entre reinicializações do navegador.
- Dados financeiros não ficam em storage do navegador.

## Desenvolvimento

Instalar dependências:

```bash
npm install
```

Rodar localmente:

```bash
npm run dev
```

Validar:

```bash
npm run lint
npm run test
npm run build
npx.cmd supabase db advisors --linked --type security --level warn
```

`npm run test` descobre automaticamente todos os arquivos `*.test.ts` em `src`. A suíte cobre cálculos financeiros, cartões e faturas, reembolsos, filtros, orçamentos, moeda e datas, metadados, parser matemático, mensagens de erro e invariantes do schema/RLS. O último comando executa o Database Advisor no projeto remoto vinculado.

## Deploy Vercel

Configurar o projeto como Vite:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

No Supabase Auth, configurar Site URL e Redirect URLs com o domínio da Vercel.

Speed Insights:

- O pacote `@vercel/speed-insights` está instalado.
- O componente `<SpeedInsights />` é renderizado no entrypoint React.
- As primeiras métricas aparecem na Vercel depois de acessar o site publicado.

## SDD

O documento vivo do produto fica em:

```text
docs/despezzas-sdd.md
```

Toda mudança de produto, regra financeira, arquitetura, persistência, navegação ou schema deve atualizar o SDD no mesmo ciclo de trabalho.
