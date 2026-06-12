# AxisFin

AxisFin e um aplicativo web mobile-first para controle financeiro pessoal. O objetivo e organizar contas, cartoes, receitas, despesas, transferencias, categorias e relatorios mensais com dados reais por usuario.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Supabase Auth
- Supabase Postgres com RLS por `user_id`
- Supabase CLI para migrations
- Recharts para graficos
- Lucide React para icones
- Vercel Speed Insights para metricas de performance em producao
- Vercel para deploy

## Regras de Produto

- Supabase e a fonte de verdade para dados financeiros.
- Contas, cartoes, categorias, transacoes e saldos nao podem ser persistidos em `localStorage`.
- Cada usuario ve e altera apenas os proprios dados.
- Conta nova nao nasce com contas, cartoes ou transacoes de exemplo.
- Categorias padrao sao criadas por usuario apenas como ponto de partida.
- Categorias podem ser criadas, editadas e excluidas pelo usuario.
- Contas, cartoes e categorias bloqueiam nomes repetidos por usuario conforme a regra de negocio.
- Valores monetarios usam formato brasileiro, como `R$ 0,00`.

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

Os componentes cuidam da interface. Os repositories cuidam de leitura/escrita por feature. `financeStore` centraliza snapshot, usuario atual, bootstrap de categorias e mapeamento dos dados vindos do Supabase.

## Supabase

Variaveis exigidas no ambiente local e na Vercel:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca colocar `service_role` ou secret key no frontend.

Comandos principais:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Migrations importantes:

- `20260609120000_unique_account_card_names_ci.sql`: nomes unicos para contas/cartoes por usuario, ignorando caixa e espacos.
- `20260611195552_enforce_user_owned_finance_refs.sql`: triggers para impedir vinculos financeiros entre usuarios diferentes.
- `20260612022118_unique_category_names_ci.sql`: nomes unicos para categorias por usuario e fluxo.

## Segurança

- RLS deve estar habilitado em todas as tabelas financeiras.
- Policies devem usar `(select auth.uid()) = user_id`.
- Inserts e updates precisam de `WITH CHECK`.
- Referencias entre tabelas financeiras devem validar ownership do mesmo usuario.
- A sessao do Supabase usa `sessionStorage` com chave `axisfin.auth.session`.
- Dados financeiros nao ficam em storage do navegador.

## Desenvolvimento

Instalar dependencias:

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

No Supabase Auth, configurar Site URL e Redirect URLs com o dominio da Vercel.

Speed Insights:

- O pacote `@vercel/speed-insights` esta instalado.
- O componente `<SpeedInsights />` e renderizado no entrypoint React.
- As primeiras metricas aparecem na Vercel depois de acessar o site publicado.

## SDD

O documento vivo do produto fica em:

```text
docs/despezzas-sdd.md
```

Toda mudanca de produto, regra financeira, arquitetura, persistencia, navegacao ou schema deve atualizar o SDD no mesmo ciclo de trabalho.
