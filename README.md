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
- Lançamentos de receita, despesa, transferência, despesa fixa e despesa parcelada.
- Categorias com ícones visuais, cores, criação, edição e exclusão.
- Relatórios com gráficos e agrupamentos por categoria.
- Perfil com atalhos operacionais, cartões e categorias.

## Arquitetura

```text
src/
  components/
    accounts/
    cards/
    categories/
    dashboard/
    layout/
    profile/
    reports/
    shared/
    transactions/
  features/
    accounts/accountRepository.ts
    cards/cardRepository.ts
    categories/categoryRepository.ts
    finance/financeStore.ts
    transactions/transactionRepository.ts
  lib/
    supabase/supabaseClient.ts
    utils/
  data/
    mockData.ts
  types.ts
```

Os componentes cuidam da interface. Os repositories cuidam de leitura/escrita por feature. `financeStore` centraliza snapshot, usuário atual, bootstrap de categorias e mapeamento dos dados vindos do Supabase.

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

## Segurança

- RLS deve estar habilitado em todas as tabelas financeiras.
- Policies devem usar `(select auth.uid()) = user_id`.
- Inserts e updates precisam de `WITH CHECK`.
- Referências entre tabelas financeiras devem validar ownership do mesmo usuário.
- A sessão do Supabase usa `sessionStorage` com chave `axisfin.auth.session`.
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
```

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
