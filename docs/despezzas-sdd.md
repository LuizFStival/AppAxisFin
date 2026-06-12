# SDD - AxisFin

Versao: 1.0  
Status: oficial para desenvolvimento inicial  
Stack alvo: Next.js, React, TypeScript, Supabase, PostgreSQL, Vercel  

## Status de Atualizacao - 2026-06-11

Este SDD foi criado, mas estava parcialmente defasado em relacao ao codigo atual. O app em execucao hoje esta em Vite + React + TypeScript, com Supabase Auth e persistencia real ja conectados para contas, cartoes, categorias e transacoes. A migracao futura para Next.js/Vercel segue como decisao de produto/infra, nao como realidade atual do repositorio.

Decisoes atuais que passam a valer:

- Toda mudanca de produto, regra financeira, arquitetura, persistencia, navegacao ou schema deve atualizar este SDD no mesmo ciclo de trabalho.
- O nome oficial do produto e aplicativo e `AxisFin`. Nomes antigos, como Despezzas, devem ficar apenas em chaves tecnicas legadas quando a troca puder quebrar dados locais.
- A identidade visual oficial usa fundo `#050608`, superficie `#0F1116`, borda `#1A1C22`, texto primario `#FFFFFF`, texto secundario `#9CA3AF`, acao azul `#3882F6`, suporte roxo `#8B5CF6`, sucesso verde `#10B981`, despesa/alerta `#F43F5E` e atencao amarelo `#F59E0B`.
- Tipografia oficial: Sora para titulos/destaques e Inter para corpo/interface.
- Conta autenticada nao deve nascer com contas, cartoes ou transacoes de exemplo.
- Dados financeiros de usuario nao podem ser persistidos em `localStorage`, session storage ou mock local. Contas, cartoes, lancamentos e saldos devem ser gravados e lidos pelo Supabase.
- Dados mockados ficam restritos a constantes nao sensiveis de interface, como categorias iniciais do sistema, e nao podem criar contas, cartoes ou transacoes para o usuario.
- Supabase e a fonte de verdade para toda informacao financeira do usuario.
- A sessao de autenticacao no navegador deve usar chave propria do AxisFin e preferir `sessionStorage` a `localStorage`, reduzindo persistencia local de tokens em maquinas compartilhadas.
- Toda tabela financeira deve ter RLS por `user_id` e toda referencia entre tabelas deve validar que o registro referenciado pertence ao mesmo usuario.
- Contas e cartoes nao podem repetir nome para o mesmo usuario, ignorando maiusculas/minusculas e espacos extras.
- Campos monetarios devem usar formato brasileiro, como `R$ 0,00`.
- A navegacao principal deve manter apenas quatro itens fixos: Home, Transacoes, Relatorios e Perfil, com o atalho central para novo lancamento. Telas secundarias como Contas devem ser acessadas por atalhos contextuais ou por Mais/Configuracoes.
- Carrosseis horizontais devem rolar por toque/trackpad e arrasto com mouse, sem barra de rolagem visivel na interface.
- Acoes dentro de carrosseis, como `Ver Contas`, devem preservar clique/toque normal e nao podem ser bloqueadas pela logica de arrasto.
- Dashboard e relatorios devem abrir por padrao no mes atual e exibir claramente o mes ativo, permitindo navegar para meses anteriores e futuros mesmo sem lancamentos cadastrados.
- Cadastro de conta deve permitir escolher banco entre uma lista inicial dos principais bancos brasileiros, escolher cor da conta e refletir essa marca no dashboard e na tela de Contas.
- Contas, cartoes e lancamentos devem permitir edicao. Exclusoes devem pedir confirmacao e bloquear remocao de conta/cartao quando existirem lancamentos vinculados.
- Categorias padrao de receita/despesa devem ser criadas por usuario no Supabase apenas como ponto de partida. Cada usuario pode criar, editar e excluir suas categorias, inclusive categorias iniciais; ao excluir categoria usada em lancamento, o lancamento passa a aparecer como `Outros`.
- Categorias nao podem repetir nome para o mesmo usuario e mesmo fluxo (`income`/`expense`), ignorando maiusculas/minusculas e espacos extras.

Melhorias prioritarias para a logica de app financeiro:

1. Separar saldo real, previsao e compromissos pendentes em todas as telas.
2. Implementar faturas de cartao por ciclo de fechamento/vencimento antes de parcelamentos.
3. Fazer transferencias atualizarem saldo das duas contas com historico auditavel.
4. Criar edicao/exclusao segura para contas, cartoes e transacoes, com bloqueios quando existirem vinculos financeiros.
5. Manter persistencia separada por feature: `accountRepository`, `cardRepository`, `transactionRepository`, `categoryRepository` e store compartilhado apenas para snapshot/autenticacao.
6. Manter testes automatizados para calculos de saldo, filtro mensal, status pago/pendente, origem de pagamento e agrupamentos por categoria.

Atualizacao tecnica aplicada:

- `src/features/finance/financeStore.ts` centraliza snapshot, autenticacao, bootstrap de categorias e leitura agregada, sem fallback de persistencia local para dados financeiros.
- `accountRepository`, `cardRepository` e `transactionRepository` fazem suas proprias escritas exclusivamente no Supabase e exigem usuario autenticado.
- `categoryRepository` tambem expoe `list`, `create`, `update` e `remove`, com escrita exclusiva no Supabase e isolamento por usuario.
- `src/lib/supabase/supabaseClient.ts` usa `axisfin.auth.session` em `sessionStorage` para a sessao do Supabase; dados financeiros continuam fora do storage do navegador.
- `supabase/migrations/20260611195552_enforce_user_owned_finance_refs.sql` adiciona triggers para impedir que cards, transacoes, faturas, parcelas e orcamentos apontem para registros de outro usuario.
- `supabase/migrations/20260612022118_unique_category_names_ci.sql` adiciona unicidade case-insensitive para categorias por usuario e fluxo.
- `src/lib/utils/finance.test.ts` valida os calculos financeiros puros e deve crescer junto com novas regras.
- `npm.cmd run test` passa a ser verificacao obrigatoria junto com `lint` e `build` quando a mudanca tocar calculos financeiros.
- `src/components/shared/BankLogo.tsx` concentra a lista inicial de bancos e a representacao visual usada nas contas.
- `accountRepository`, `cardRepository`, `categoryRepository` e `transactionRepository` devem expor `create`, `update` e `remove` para manter CRUD por feature.

## 1. Visao Geral do Projeto

O AxisFin e um aplicativo de gestao financeira pessoal, web e mobile-first, criado para acompanhar saldo, receitas, despesas, transferencias, contas, cartoes, faturas, metas e orcamentos.

O projeto nasceu de um prototipo criado no AI Studio em formato de landing page/website com um mockup interativo de aplicativo ao lado. A direcao oficial a partir deste SDD e transformar esse prototipo em uma aplicacao real, preservando a versao website em `/archive/landing-page` para uso institucional futuro.

O produto deve abrir diretamente como app financeiro. A landing nao deve aparecer na experiencia principal.

## 2. Objetivos do Produto

- Dar visao clara do dinheiro disponivel, recebido, pago, previsto e pendente.
- Separar contas bancarias, cartoes, faturas e movimentacoes.
- Permitir lancamentos rapidos de receita, despesa e transferencia.
- Mostrar historico mensal de transacoes com filtros simples.
- Gerar relatorios uteis para decisao pessoal.
- Funcionar muito bem em celular e continuar elegante em desktop.
- Preparar o app para persistencia real com Supabase, autenticacao e deploy na Vercel.

## 3. Escopo do MVP

- Autenticacao basica com Supabase Auth.
- Dashboard/Home com saldo atual, receitas, despesas, recebido, pago, contas e cartoes.
- Cadastro/listagem de transacoes:
  - Receita.
  - Despesa.
  - Transferencia.
- Filtro de transacoes por mes.
- Abas de transacoes:
  - Geral.
  - Cartoes.
  - Contas.
- Relatorios com:
  - Cards financeiros.
  - Grafico simples de fluxo.
  - Gastos por categoria.
- Perfil com dados do usuario, configuracoes, notificacoes e ajuda.
- Dados mockados temporarios enquanto Supabase nao estiver conectado.
- Repositorios/services isolando a origem dos dados.
- Layout mobile-first sem aparencia de prototipo.
- Website/landing preservado em `/archive/landing-page`.

## 4. Escopo Futuro

- Faturas completas por cartao.
- Parcelamentos.
- Metas financeiras.
- Orcamentos por categoria.
- Notificacoes de vencimento.
- Anexos em transacoes.
- Importacao de extratos CSV/OFX.
- Conciliacao automatica.
- Contas compartilhadas/familiares.
- Assinaturas recorrentes.
- IA financeira para insights, classificacao automatica e alertas preventivos.

## 5. Arquitetura Tecnica

### Frontend

- Next.js com App Router.
- React com componentes funcionais.
- TypeScript estrito.
- UI mobile-first.
- Dark mode como tema principal.
- Camada de dados desacoplada via repositories/services.

### Backend e Banco

- Supabase Auth para identidade.
- PostgreSQL para dados financeiros.
- Supabase Storage para anexos.
- Supabase RLS para isolamento por usuario.
- Supabase Realtime opcional em V1/V2.

### Deploy

- Desenvolvimento local primeiro.
- Deploy futuro na Vercel.
- Variaveis de ambiente gerenciadas por ambiente.

## 6. Preservacao do Website Atual

A versao website/landing page deve ser preservada em:

```txt
/archive
  /landing-page
    /current-src
    index.html
    package.json
    README.md
    metadata.json
```

Regras:

- Nunca apagar a versao arquivada sem aprovacao explicita.
- Nao importar componentes arquivados diretamente no app real.
- Se algum padrao visual for reaproveitado, copiar conscientemente para `/src`, adaptando para produto real.
- O deploy principal deve apontar para o app, nao para o website.

## 7. Plano de Refatoracao do Projeto Atual

1. Preservar a landing em `/archive/landing-page`.
2. Remover a composicao "website + app preview" da tela principal.
3. Criar app shell mobile-first.
4. Reaproveitar a identidade visual do mockup original como UI real.
5. Separar tipos de dominio.
6. Criar dados mockados em `/src/data`.
7. Criar services/repositories.
8. Implementar telas principais.
9. Adicionar Supabase client.
10. Criar schema SQL.
11. Substituir repositories mockados por Supabase.
12. Adicionar Auth e RLS.
13. Preparar deploy na Vercel.

## 8. Estrutura de Pastas Recomendada

```txt
/src
  /app
    /(auth)
    /(dashboard)
    layout.tsx
    page.tsx
  /components
    /layout
    /dashboard
    /transactions
    /reports
    /profile
    /shared
  /features
    /accounts
    /cards
    /transactions
    /categories
    /invoices
    /installments
    /goals
    /budgets
    /notifications
  /lib
    /supabase
    /utils
  /services
  /repositories
  /styles
  /types
  /data
/docs
  despezzas-sdd.md
/archive
  /landing-page
```

Exemplo de componentes:

```txt
/src/components
  /layout
    AppShell.tsx
    BottomNavigation.tsx
    TopBar.tsx
  /dashboard
    DashboardView.tsx
    BalanceCard.tsx
    AccountCarousel.tsx
    CardSummaryList.tsx
  /transactions
    TransactionsView.tsx
    TransactionList.tsx
    TransactionFilters.tsx
    AddEntryModal.tsx
  /reports
    ReportsView.tsx
    CashflowChart.tsx
    CategoryBreakdown.tsx
  /profile
    ProfileView.tsx
    SettingsList.tsx
  /shared
    StatCard.tsx
    MoneyText.tsx
    EmptyState.tsx
```

## 9. Design System Baseado no GDD

### Principios

- Dark mode nativo.
- Visual moderno de fintech.
- Cards arredondados, mas sem excesso decorativo.
- Mobile-first.
- Informacao financeira clara antes de enfeite.
- Labels verdadeiros: recebido, pago, previsto, pendente.

### Tokens iniciais

```txt
background: #050608
surface: #0F1116
surface-hover: #141720
border: #1A1C22
text-primary: #FFFFFF
text-secondary: #9CA3AF
income: #10B981
expense: #F43F5E
support-blue: #3B82F6
support-purple: #8B5CF6
warning: #F59E0B
```

### Componentes base

- App shell.
- Bottom navigation.
- Stat card.
- Balance card.
- Account card.
- Credit card summary.
- Transaction row.
- Segmented control.
- Modal/bottom sheet.
- Select/input/date picker.
- Chart card.

## 10. Telas Principais

### Dashboard/Home

Deve exibir:

- Saudacao e perfil ativo.
- Saldo atual.
- Recebido.
- Pago.
- Receitas totais do mes.
- Despesas totais do mes.
- Minhas contas.
- Meus cartoes.
- Ultimas movimentacoes.

Regras:

- Saldo atual deve refletir dinheiro real em contas.
- Recebido representa receitas confirmadas.
- Pago representa despesas confirmadas.
- Pendente/previsto nao deve ser misturado com caixa real.

### Transacoes

Deve exibir:

- Filtro por mes.
- Busca textual.
- Abas Geral, Cartoes e Contas.
- Lista agrupada por data.
- Status de lancamento.
- Origem: conta ou cartao.

### Adicionar Receita/Despesa/Transferencia

Deve permitir:

- Tipo: receita, despesa ou transferencia.
- Valor.
- Descricao.
- Data.
- Status.
- Categoria.
- Conta.
- Cartao quando aplicavel.
- Conta origem/destino em transferencias.
- Observacoes.
- Futuro: anexos.

### Relatorios

Deve exibir:

- Receita total.
- Despesa total.
- Saldo liquido.
- Quantidade de lancamentos.
- Grafico de fluxo.
- Gastos por categoria.
- Futuro: comparativo entre meses.

### Perfil

Deve exibir:

- Usuario.
- Email.
- Plano/ambiente.
- Configuracoes.
- Notificacoes.
- Ajuda.
- Exportar dados.
- Sair.

## 11. Navegacao Mobile-First

Navegacao inferior obrigatoria:

- Home.
- Transacoes.
- Botao central `+`.
- Relatorios.
- Perfil.

Regras:

- Em mobile, ocupar 100% da tela.
- Em desktop, centralizar app ou usar layout responsivo elegante.
- O botao `+` abre o modal/bottom sheet de novo lancamento.
- A navegacao deve ser persistente.

## 12. Modelagem de Dados para Supabase

Padrao geral:

- Todas as tabelas principais possuem `id uuid`.
- Todas as tabelas financeiras possuem `user_id uuid references auth.users`.
- Usar `created_at` e `updated_at`.
- Valores monetarios em `numeric(14,2)`.
- Datas em `date`.
- Timestamps em `timestamptz`.
- Status por `text check`.

## 13. Tabelas

### profiles

Dados publicos/operacionais do usuario.

### accounts

Contas bancarias, carteiras e investimentos.

### cards

Cartoes vinculados a uma conta.

### categories

Categorias de receita/despesa.

### transactions

Lancamentos financeiros.

### invoices

Faturas de cartao por periodo.

### installments

Parcelas derivadas de compras parceladas.

### goals

Metas financeiras.

### budgets

Orcamentos mensais por categoria.

### notifications

Alertas e lembretes.

## 14. Relacionamentos Entre Tabelas

- `profiles.id` -> `auth.users.id`.
- `accounts.user_id` -> `auth.users.id`.
- `cards.user_id` -> `auth.users.id`.
- `cards.account_id` -> `accounts.id`.
- `categories.user_id` -> `auth.users.id`.
- `transactions.user_id` -> `auth.users.id`.
- `transactions.account_id` -> `accounts.id`.
- `transactions.card_id` -> `cards.id`.
- `transactions.category_id` -> `categories.id`.
- `transactions.from_account_id` -> `accounts.id`.
- `transactions.to_account_id` -> `accounts.id`.
- `invoices.card_id` -> `cards.id`.
- `installments.transaction_id` -> `transactions.id`.
- `installments.invoice_id` -> `invoices.id`.
- `goals.user_id` -> `auth.users.id`.
- `budgets.category_id` -> `categories.id`.
- `notifications.user_id` -> `auth.users.id`.

## 15. Regras de Negocio

- Receita confirmada aumenta caixa.
- Despesa confirmada reduz caixa.
- Receita pendente entra em previsao, nao em caixa real.
- Despesa pendente entra em compromisso, nao em caixa real.
- Transferencia confirmada move saldo entre contas sem alterar patrimonio total.
- Despesa no cartao entra em fatura, nao reduz conta bancaria imediatamente.
- Pagamento de fatura reduz a conta escolhida.
- Cartoes devem respeitar fechamento e vencimento.
- Parcelas devem gerar registros rastreaveis.
- Categorias devem pertencer ao usuario.
- Toda leitura/escrita deve respeitar `user_id`.
- Exclusoes financeiras devem pedir confirmacao.
- Futuramente, acoes financeiras criticas devem registrar auditoria.

## 16. Politicas RLS do Supabase

Principio:

- Usuario so acessa dados onde `user_id = auth.uid()`.
- `profiles.id` deve ser igual a `auth.uid()`.

Exemplo:

```sql
alter table public.accounts enable row level security;

create policy "accounts_select_own"
on public.accounts
for select
using (user_id = auth.uid());

create policy "accounts_insert_own"
on public.accounts
for insert
with check (user_id = auth.uid());

create policy "accounts_update_own"
on public.accounts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "accounts_delete_own"
on public.accounts
for delete
using (user_id = auth.uid());
```

## 17. Supabase Auth

MVP:

- Login por email/senha.
- Sessao persistida.
- Protecao de rotas autenticadas.
- Criacao automatica de profile apos signup.

Futuro:

- OAuth Google.
- Magic link.
- Recuperacao de senha.
- MFA opcional.

## 18. Supabase Storage para Anexos

Bucket recomendado:

```txt
transaction-attachments
```

Regras:

- Arquivos devem ficar em path por usuario:

```txt
{user_id}/{transaction_id}/{filename}
```

- Apenas o dono pode ler/escrever.
- Anexos devem ser referenciados por URL/path na tabela `transactions` ou em tabela futura `transaction_attachments`.

## 19. Services/Repositories

Objetivo:

- Manter UI independente da origem dos dados.
- Manter Supabase como implementacao ativa sem reescrever componentes.

Exemplo:

```ts
export interface TransactionRepository {
  listByMonth(month: string): Promise<Transaction[]>;
  create(input: CreateTransactionInput): Promise<Transaction>;
  updateStatus(id: string, status: EntryStatus): Promise<void>;
  remove(id: string): Promise<void>;
}
```

Repositorios recomendados:

- `accountRepository`.
- `cardRepository`.
- `categoryRepository`.
- `transactionRepository`.
- `invoiceRepository`.
- `installmentRepository`.
- `goalRepository`.
- `budgetRepository`.
- `notificationRepository`.

## 20. Dados Mockados Temporarios

Enquanto Supabase nao estiver conectado:

- Usar `/src/data/mockData.ts` apenas para categorias iniciais do sistema e perfil placeholder antes da sessao.
- Nao persistir dados financeiros localmente, nem para demo.
- Nao considerar localStorage fonte de informacao financeira.
- A arquitetura deve tratar Supabase como fonte atual de verdade.

## 21. Variaveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Observacoes:

- `SUPABASE_SERVICE_ROLE_KEY` nunca deve ir para o client.
- Em Vite temporario, usar equivalentes `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Em Next.js, preferir `NEXT_PUBLIC_*` para o client.

## 22. Estrategia Local Primeiro

1. Rodar UI com dados mockados.
2. Estabilizar tipos e regras de negocio.
3. Criar schema no Supabase.
4. Conectar Auth.
5. Substituir repositories por Supabase.
6. Migrar dados mockados para seeds.
7. Validar RLS com usuario real.

## 23. Estrategia de Deploy na Vercel

1. Criar projeto Vercel.
2. Definir variaveis de ambiente.
3. Configurar build Next.js.
4. Validar preview deploy.
5. Testar auth callback URLs no Supabase.
6. Configurar dominio.
7. Habilitar analytics/logs conforme necessario.

## 24. Seguranca, LGPD e Auditoria

- Dados financeiros sao sensiveis.
- RLS obrigatorio antes de producao.
- Nunca expor service role no frontend.
- Logs nao devem armazenar dados financeiros detalhados sem necessidade.
- Usuario deve poder exportar dados.
- Usuario deve poder solicitar exclusao de dados.
- Futuramente criar tabela `audit_logs` para acoes criticas.
- Backups e retencao devem seguir politica clara.

## 25. Roadmap

### MVP

- App mobile-first.
- Auth.
- Contas.
- Cartoes.
- Transacoes.
- Relatorios basicos.
- Perfil.
- RLS.

### V1

- Faturas.
- Parcelamentos.
- Orcamentos.
- Metas.
- Notificacoes.
- Anexos.

### V2

- Importacao de extratos.
- Recorrencias.
- Conciliacao.
- Dashboard comparativo.
- Exportacao completa.

### IA Financeira Futura

- Classificacao automatica de transacoes.
- Alertas de gasto fora do padrao.
- Previsao de fechamento mensal.
- Sugestoes de economia.
- Resumo mensal em linguagem natural.

## 26. Backlog

| Epic | Feature | User Story | Criterios de aceite |
|---|---|---|---|
| Fundacao | Preservar landing | Como dono do produto, quero manter o website antigo arquivado para uso futuro. | `/archive/landing-page` existe e app principal nao depende dele. |
| Fundacao | App shell | Como usuario, quero abrir direto no app financeiro. | Nao ha landing na rota principal; bottom nav esta visivel. |
| Auth | Login | Como usuario, quero acessar meus dados com conta segura. | Login/logout funcionam com Supabase Auth. |
| Dashboard | Saldo atual | Como usuario, quero ver meu caixa real. | Saldo soma contas e nao mistura previsoes. |
| Dashboard | Recebido/Pago | Como usuario, quero distinguir realizado de previsto. | Cards mostram recebidos e pagos confirmados. |
| Transacoes | Listagem mensal | Como usuario, quero filtrar por mes. | Mes selecionado altera lista corretamente. |
| Transacoes | Novo lancamento | Como usuario, quero adicionar receita, despesa e transferencia. | Modal valida campos e persiste registro. |
| Cartoes | Faturas | Como usuario, quero ver gastos do cartao por fatura. | Compra no cartao aparece na fatura correta. |
| Relatorios | Categorias | Como usuario, quero entender onde gasto mais. | Grafico/lista agrupam despesas por categoria. |
| Perfil | Configuracoes | Como usuario, quero editar preferencias. | Tela lista opcoes e salva preferencias basicas. |
| Storage | Anexos | Como usuario, quero anexar comprovantes. | Upload salva arquivo em bucket protegido. |
| Seguranca | RLS | Como usuario, quero que ninguem veja meus dados. | Queries entre usuarios sao bloqueadas. |

## 27. Riscos Tecnicos

- Migracao Vite -> Next.js pode gerar ajustes de estrutura.
- RLS mal configurado pode bloquear o app ou vazar dados.
- Modelagem de faturas/cartoes pode ficar incorreta se fechamento/vencimento nao forem tratados como regras centrais.
- Misturar caixa real com previsao pode gerar numeros enganosos.
- Graficos podem aumentar bundle; usar lazy loading.
- Dados mockados podem mascarar problemas de persistencia.
- Storage precisa de politicas corretas por usuario.

## 28. Prioridades de Desenvolvimento

1. Preservar landing.
2. Manter app visualmente fiel ao mockup original.
3. Consolidar tipos de dominio.
4. Implementar repositories.
5. Criar schema Supabase.
6. Implementar Auth.
7. Conectar dados reais.
8. Validar RLS.
9. Implementar faturas/cartoes.
10. Preparar Vercel.

## SQL Inicial Supabase

```sql
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'cash', 'investment')),
  institution text,
  balance numeric(14,2) not null default 0,
  color text not null default '#3B82F6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  network text not null default 'other' check (network in ('mastercard', 'visa', 'elo', 'other')),
  credit_limit numeric(14,2) not null default 0,
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  color text not null default '#8B5CF6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  flow text not null check (flow in ('income', 'expense')),
  icon text,
  color text not null default '#64748B',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  flow text not null check (flow in ('income', 'expense', 'transfer')),
  status text not null default 'pending' check (status in ('paid', 'pending', 'cancelled')),
  transaction_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  from_account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_flow_source_check check (
    (flow in ('income', 'expense') and (account_id is not null or card_id is not null))
    or
    (flow = 'transfer' and from_account_id is not null and to_account_id is not null)
  )
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  period text not null,
  start_date date not null,
  end_date date not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'closed', 'paid', 'overdue')),
  total_amount numeric(14,2) not null default 0,
  paid_at timestamptz,
  payment_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id, period)
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  installment_number int not null check (installment_number > 0),
  total_installments int not null check (total_installments > 0),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0,
  target_date date,
  color text not null default '#10B981',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  period text not null,
  limit_amount numeric(14,2) not null check (limit_amount >= 0),
  alert_percent int not null default 80 check (alert_percent between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info', 'warning', 'success', 'danger')),
  read_at timestamptz,
  scheduled_for timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger cards_set_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger installments_set_updated_at
before update on public.installments
for each row execute function public.set_updated_at();

create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();
```

## Exemplos de RLS

```sql
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.cards enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.installments enable row level security;
alter table public.goals enable row level security;
alter table public.budgets enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "transactions_select_own"
on public.transactions for select
using (user_id = auth.uid());

create policy "transactions_insert_own"
on public.transactions for insert
with check (user_id = auth.uid());

create policy "transactions_update_own"
on public.transactions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "transactions_delete_own"
on public.transactions for delete
using (user_id = auth.uid());

create policy "notifications_select_own"
on public.notifications for select
using (user_id = auth.uid());

create policy "notifications_update_own"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

Padrao para demais tabelas com `user_id`:

```sql
create policy "{table}_select_own" on public.{table}
for select using (user_id = auth.uid());

create policy "{table}_insert_own" on public.{table}
for insert with check (user_id = auth.uid());

create policy "{table}_update_own" on public.{table}
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "{table}_delete_own" on public.{table}
for delete using (user_id = auth.uid());
```

## Plano Incremental de Execucao para Codex

### Fase 1 - Fundacao visual e estrutural

1. Confirmar landing preservada em `/archive/landing-page`.
2. Garantir que rota principal abre como app.
3. Ajustar shell mobile-first.
4. Manter visual proximo ao mockup original.
5. Rodar `npm.cmd run lint` e `npm.cmd run build`.

### Fase 2 - Dominio financeiro

1. Revisar `src/types.ts`.
2. Consolidar entidades: accounts, cards, categories, transactions.
3. Adicionar invoices e installments nos tipos.
4. Garantir que dashboard nao mistura caixa real com previsao.
5. Criar testes unitarios para calculos financeiros quando suite existir.

### Fase 3 - Supabase

1. Criar projeto Supabase.
2. Executar SQL inicial.
3. Ativar RLS.
4. Criar buckets de storage.
5. Configurar variaveis de ambiente.
6. Criar client Supabase.
7. Implementar Auth.

### Fase 4 - Repositories reais

1. Manter interface atual de repositories.
2. Criar implementacoes Supabase.
3. Manter todos os repositories financeiros com escrita exclusiva no Supabase.
4. Validar CRUD real por usuario.
5. Remover dependencia de dados mockados da experiencia autenticada.

### Fase 5 - Faturas e parcelamentos

1. Implementar cards reais.
2. Implementar invoices.
3. Implementar regra de fechamento/vencimento.
4. Implementar installments.
5. Validar mes de consumo vs mes de fatura.

### Fase 6 - Vercel

1. Migrar para Next.js se o projeto ainda estiver em Vite.
2. Ajustar App Router.
3. Configurar envs.
4. Publicar preview.
5. Validar Auth callback.
6. Publicar producao.
