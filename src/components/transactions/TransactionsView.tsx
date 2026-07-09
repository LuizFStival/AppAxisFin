import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, CreditCard, Landmark, Pencil, Trash2, UserRound, X } from 'lucide-react';
import { Account, Card, Category, DashboardTransactionFilter, ReimbursementPerson, Transaction, TransactionTab } from '../../types';
import { formatCurrency, getCategoryName, getCurrentMonthKey, getExpenseSignedAmount, getFinancialMonthKey, getPaymentSource, isCardInvoicePaid, isInvoiceCredit, isInvoicePayment, isThirdPartyExpense, shiftMonthKey } from '../../lib/utils/finance';
import { getCardInvoiceInfoForClosingMonth, getCardInvoiceClosingMonth } from '../../lib/utils/cardInvoices';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { summarizeExpenseBreakdown } from '../../lib/utils/expenseBreakdown';
import { ExpenseViewFilter } from '../../lib/utils/expenseFilters';
import { ExpenseFilterChips } from '../shared/ExpenseFilterChips';
import { CollapsibleSearch } from '../shared/CollapsibleSearch';
import { MonthNavigator } from '../shared/MonthNavigator';

interface TransactionsViewProps {
  transactions: Transaction[];
  reimbursementsEnabled: boolean;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  reimbursementPeople: ReimbursementPerson[];
  activeMonth: string;
  dashboardFilter: DashboardTransactionFilter | null;
  onToggleStatus: (transaction: Transaction, paymentAccountId?: string) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const tabs: { id: TransactionTab; label: string }[] = [
  { id: 'general', label: 'Geral' },
  { id: 'cards', label: 'Cartões' },
  { id: 'accounts', label: 'Contas' },
];

const expenseScopeOptions: Array<{ id: ExpenseViewFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'personal', label: 'Meus gastos' },
  { id: 'others', label: 'Dos outros' },
];

const personalExpenseOptions: Array<{ id: ExpenseViewFilter; label: string }> = [
  { id: 'personal', label: 'Todos' },
  { id: 'variable', label: 'Variáveis' },
  { id: 'fixed', label: 'Fixas' },
  { id: 'installment', label: 'Parceladas' },
  { id: 'essential', label: 'Essenciais' },
  { id: 'superfluous', label: 'Supérfluas' },
];

const othersExpenseOptions: Array<{ id: ExpenseViewFilter; label: string }> = [
  { id: 'personal', label: 'Todos' },
  { id: 'variable', label: 'Variáveis' },
  { id: 'fixed', label: 'Fixas' },
  { id: 'installment', label: 'Parceladas' },
];

type ExpenseScope = 'all' | 'personal' | 'others';
type MovementFilter = 'all' | 'income' | 'expenses' | 'pending';

const movementFilters: Array<{ id: MovementFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'income', label: 'Entradas' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'expenses', label: 'Saídas' },
];

function matchesScopedExpenseFilter(transaction: Transaction, filter: ExpenseViewFilter) {
  if (filter === 'personal') return true;
  const meta = readTransactionMeta(transaction.notes);
  if (filter === 'essential' || filter === 'superfluous') return meta.expenseNeed === filter;
  return (meta.entryMode ?? 'variable') === filter;
}

function matchesDashboardFilter(transaction: Transaction, selectedMonth: string, filter: DashboardTransactionFilter) {
  if (getFinancialMonthKey(transaction) !== selectedMonth) return false;
  if (filter === 'income') return transaction.flow === 'income';
  if (filter === 'expenses') return transaction.flow === 'expense' && !isThirdPartyExpense(transaction) && !isInvoicePayment(transaction);
  if (filter === 'reimbursements') return isThirdPartyExpense(transaction);
  if (filter === 'result') return !isInvoicePayment(transaction);
  if (filter === 'received') return transaction.flow === 'income' && transaction.status === 'paid';
  return transaction.flow === 'expense' && transaction.status === 'paid' && !transaction.cardId && !isThirdPartyExpense(transaction);
}

function isPendingExpenseOrInvoice(transaction: Transaction) {
  if (transaction.flow !== 'expense' || isInvoicePayment(transaction) || isInvoiceCredit(transaction)) return false;
  if (transaction.cardId) return false;
  return transaction.status === 'pending';
}

function matchesMovementFilter(transaction: Transaction, selectedMonth: string, filter: MovementFilter) {
  if (getFinancialMonthKey(transaction) !== selectedMonth) return false;
  if (filter === 'all') return true;
  if (filter === 'pending') return isPendingExpenseOrInvoice(transaction);
  return matchesDashboardFilter(transaction, selectedMonth, filter);
}

function getReimbursementPersonName(people: ReimbursementPerson[], personId?: string) {
  return people.find((person) => person.id === personId)?.name ?? 'Pessoa removida';
}

function matchesTransactionSource(transaction: Transaction, tab: TransactionTab) {
  const hasAccount = Boolean(transaction.accountId || transaction.fromAccountId || transaction.toAccountId);
  if (tab === 'cards') return Boolean(transaction.cardId);
  if (tab === 'accounts') return hasAccount;
  return true;
}

function getEntryModeLabel(transaction: Transaction) {
  const meta = readTransactionMeta(transaction.notes);
  if (meta.entryMode === 'fixed') return 'Fixa';
  if (meta.entryMode === 'installment') {
    return meta.installmentNumber && meta.totalInstallments
      ? `Parcela ${meta.installmentNumber}/${meta.totalInstallments}`
      : 'Parcelada';
  }
  return 'Variável';
}

function getEntryModeTagClass(transaction: Transaction) {
  const entryMode = readTransactionMeta(transaction.notes).entryMode ?? 'variable';
  if (entryMode === 'fixed') return 'border-amber-400/20 bg-amber-500/15 text-amber-100';
  if (entryMode === 'installment') return 'border-violet-400/20 bg-violet-500/15 text-violet-100';
  return 'border-sky-400/20 bg-sky-500/15 text-sky-100';
}

export function TransactionsView({
  transactions,
  reimbursementsEnabled,
  accounts,
  cards,
  categories,
  reimbursementPeople,
  activeMonth,
  dashboardFilter,
  onToggleStatus,
  onEdit,
  onDelete,
}: TransactionsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [tab, setTab] = useState<TransactionTab>('general');
  const [search, setSearch] = useState('');
  const [expenseScope, setExpenseScope] = useState<ExpenseScope>('all');
  const [expenseFilter, setExpenseFilter] = useState<ExpenseViewFilter>('personal');
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('all');
  const [dashboardDetailFilter, setDashboardDetailFilter] = useState<DashboardTransactionFilter | null>(null);
  const [showMonthlyDetails, setShowMonthlyDetails] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState<Transaction | null>(null);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentError, setPaymentError] = useState('');

  function openPaymentAccountPicker(transaction: Transaction) {
    setPaymentTransaction(transaction);
    setPaymentAccountId(transaction.accountId || accounts[0]?.id || '');
    setPaymentError(accounts.length === 0 ? 'Cadastre uma conta antes de marcar como pago.' : '');
  }

  function closePaymentAccountPicker() {
    setPaymentTransaction(null);
    setPaymentAccountId('');
    setPaymentError('');
  }

  function confirmPaymentAccount() {
    if (!paymentTransaction) return;
    if (!paymentAccountId) {
      setPaymentError('Selecione de qual conta o saldo vai sair.');
      return;
    }
    onToggleStatus(paymentTransaction, paymentAccountId);
    closePaymentAccountPicker();
  }

  useEffect(() => {
    setMovementFilter(
      dashboardFilter === 'income' || dashboardFilter === 'received'
        ? 'income'
        : dashboardFilter === 'expenses' || dashboardFilter === 'paid'
          ? 'expenses'
          : 'all',
    );
    setDashboardDetailFilter(dashboardFilter);
    if (!dashboardFilter) return;
    setSelectedMonth(activeMonth);
    setTab('general');
    setExpenseScope('all');
    setExpenseFilter('personal');
  }, [activeMonth, dashboardFilter]);

  const pendingInvoiceSummaries = useMemo(() => {
    if (movementFilter !== 'pending' || dashboardDetailFilter) return [];

    return cards
      .map((card) => {
        const hasInvoicePayment = transactions.some((transaction) => {
          const meta = readTransactionMeta(transaction.notes);
          return isInvoicePayment(transaction)
            && meta.invoicePaymentCardId === card.id
            && meta.invoicePaymentPeriod === selectedMonth;
        });
        if (hasInvoicePayment) return null;

        const invoiceTransactions = transactions.filter((transaction) => {
          if (transaction.flow !== 'expense' || transaction.cardId !== card.id) return false;
          return getCardInvoiceClosingMonth(card, transaction.date) === selectedMonth;
        });
        const invoiceItems = invoiceTransactions.filter((transaction) => !isInvoicePayment(transaction));
        if (invoiceItems.length === 0 || isCardInvoicePaid(invoiceItems)) return null;
        const invoice = getCardInvoiceInfoForClosingMonth(card, selectedMonth);
        const total = invoiceItems.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0);
        if (total <= 0) return null;
        return {
          card,
          invoice,
          itemCount: invoiceItems.length,
          total,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [cards, dashboardDetailFilter, movementFilter, selectedMonth, transactions]);

  const sourceTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        const matchesView = dashboardDetailFilter
          ? matchesDashboardFilter(transaction, selectedMonth, dashboardDetailFilter)
          : matchesMovementFilter(transaction, selectedMonth, movementFilter);
        return matchesView && matchesTransactionSource(transaction, tab);
      })
      .filter((transaction) => transaction.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [cards, dashboardDetailFilter, movementFilter, search, selectedMonth, tab, transactions]);
  const filteredTransactions = useMemo(() => {
    if (expenseScope === 'all') return sourceTransactions;
    return sourceTransactions
      .filter((transaction) => transaction.flow === 'expense')
      .filter((transaction) => expenseScope === 'others'
        ? isThirdPartyExpense(transaction)
        : !isThirdPartyExpense(transaction))
      .filter((transaction) => matchesScopedExpenseFilter(transaction, expenseFilter));
  }, [expenseFilter, expenseScope, sourceTransactions]);
  const pendingInvoiceTotal = useMemo(
    () => pendingInvoiceSummaries.reduce((sum, invoice) => sum + invoice.total, 0),
    [pendingInvoiceSummaries],
  );
  const viewTotal = useMemo(() => {
    const transactionTotal = filteredTransactions.reduce((sum, transaction) => {
      if (isInvoicePayment(transaction)) return sum;
      if (transaction.flow === 'income') return sum + transaction.amount;
      if (isInvoiceCredit(transaction)) return sum + transaction.amount;
      if (transaction.flow === 'expense') return sum - transaction.amount;
      return sum;
    }, 0);
    return movementFilter === 'pending' ? transactionTotal - pendingInvoiceTotal : transactionTotal;
  }, [filteredTransactions, movementFilter, pendingInvoiceTotal]);
  const spendingSummary = useMemo(() => {
    return sourceTransactions.reduce((summary, transaction) => {
      if (transaction.flow !== 'expense' || isInvoicePayment(transaction)) return summary;
      const amount = isInvoiceCredit(transaction) ? -transaction.amount : transaction.amount;
      if (isThirdPartyExpense(transaction)) summary.others += amount;
      else summary.personal += amount;
      return summary;
    }, { personal: 0, others: 0 });
  }, [sourceTransactions]);
  const incomeTotal = useMemo(() => {
    return sourceTransactions.reduce((sum, transaction) => {
      if (transaction.flow === 'income') return sum + transaction.amount;
      return sum;
    }, 0);
  }, [sourceTransactions]);
  const reimbursementSummary = useMemo(() => {
    return sourceTransactions.reduce((summary, transaction) => {
      if (!isThirdPartyExpense(transaction)) return summary;
      const amount = isInvoiceCredit(transaction) ? -transaction.amount : transaction.amount;
      if (transaction.reimbursementStatus === 'received') summary.received += amount;
      else summary.pending += amount;
      return summary;
    }, { pending: 0, received: 0 });
  }, [sourceTransactions]);
  const scopedExpenseTransactions = useMemo(() => {
    if (expenseScope === 'others') return sourceTransactions.filter(isThirdPartyExpense);
    return sourceTransactions.filter((transaction) => transaction.flow === 'expense' && !isThirdPartyExpense(transaction) && !isInvoicePayment(transaction));
  }, [expenseScope, sourceTransactions]);
  const expenseBreakdown = useMemo(
    () => summarizeExpenseBreakdown(scopedExpenseTransactions),
    [scopedExpenseTransactions],
  );
  const hasExpenseBreakdown = expenseScope !== 'all' && expenseBreakdown.some((item) => item.count > 0);
  const totalInflows = incomeTotal + spendingSummary.others;
  const totalOutflows = spendingSummary.personal + spendingSummary.others;
  const monthlyBalance = totalInflows - totalOutflows;
  const visibleItemCount = filteredTransactions.length + (movementFilter === 'pending' ? pendingInvoiceSummaries.length : 0);
  const totalLabel = movementFilter === 'income'
    ? 'Total de entradas'
    : movementFilter === 'expenses'
      ? 'Total de saídas'
      : movementFilter === 'pending'
        ? 'Pendências do mês'
      : expenseScope === 'all'
      ? 'Resultado projetado'
    : expenseScope === 'others'
      ? expenseFilter === 'personal' ? 'Dos outros' : 'Dos outros filtrado'
      : expenseFilter === 'personal'
        ? 'Meu gasto'
        : 'Total filtrado';
  const totalHint = movementFilter === 'all' && expenseScope === 'all'
    ? 'Inclui valores recebidos e ainda previstos'
    : movementFilter === 'pending'
      ? 'Despesas em aberto e compras em fatura não paga'
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pt-7 md:px-8 md:pt-8">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Movimentações</p>
          <h1 className="font-display text-2xl font-bold text-white">Transações</h1>
        </div>
      </header>

      <MonthNavigator
        month={selectedMonth}
        onPreviousMonth={() => setSelectedMonth((month) => shiftMonthKey(month, -1))}
        onNextMonth={() => setSelectedMonth((month) => shiftMonthKey(month, 1))}
        onCurrentMonth={() => setSelectedMonth(getCurrentMonthKey())}
        className="mt-4 shrink-0"
      />

      <div className="mt-5 grid shrink-0 grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
        {tabs.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`h-11 rounded-xl text-xs font-bold transition sm:text-sm ${tab === item.id ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Filtro de movimentações</p>
      <div className="mt-1.5 grid shrink-0 grid-cols-4 gap-1 rounded-xl border border-white/8 bg-[#101319] p-1">
        {movementFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => {
              setMovementFilter(filter.id);
              setDashboardDetailFilter(null);
              setExpenseScope('all');
              setExpenseFilter('personal');
            }}
            className={`h-9 rounded-lg text-xs font-bold transition ${
              movementFilter === filter.id ? 'bg-sky-500/20 text-sky-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {movementFilter === 'all' || movementFilter === 'pending' ? (
        <div className="relative mt-3 flex min-h-10 min-w-0 shrink-0 items-start gap-2">
          <div className="w-0 flex-1 space-y-2">
            <ExpenseFilterChips
              value={expenseScope}
              onChange={(scope) => {
                setExpenseScope(scope as ExpenseScope);
                setExpenseFilter('personal');
              }}
              options={reimbursementsEnabled
                ? expenseScopeOptions
                : expenseScopeOptions.filter((option) => option.id !== 'others')}
            />
            {expenseScope !== 'all' ? (
              <ExpenseFilterChips
                value={expenseFilter}
                onChange={setExpenseFilter}
                options={expenseScope === 'personal' ? personalExpenseOptions : othersExpenseOptions}
              />
            ) : null}
          </div>
          <CollapsibleSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar lançamento"
            expandedClassName="absolute inset-0 z-10"
          />
        </div>
      ) : (
        <div className="mt-3 flex shrink-0 justify-end">
          <CollapsibleSearch value={search} onChange={setSearch} placeholder="Buscar lançamento" />
        </div>
      )}

      {movementFilter === 'all' && expenseScope === 'all' ? (
        <section className="mt-4 shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-[#101319]">
          <div className="flex items-end justify-between gap-4 px-4 pb-3 pt-3.5">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Balanço do mês</p>
              <p className="mt-1 text-[10px] text-slate-600">Entradas + reembolsos − todos os gastos</p>
            </div>
            <p className={`whitespace-nowrap font-mono text-lg font-bold tracking-tight ${monthlyBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {monthlyBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyBalance))}
            </p>
          </div>
          <div className="grid grid-cols-2 border-t border-white/8">
            <div className="px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-300">Total de entradas</p>
              <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrency(totalInflows)}</p>
            </div>
            <div className="border-l border-white/8 px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-rose-300">Total de gastos</p>
              <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrency(totalOutflows)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowMonthlyDetails((current) => !current)}
            aria-expanded={showMonthlyDetails}
            className="flex w-full items-center justify-center gap-1.5 border-t border-white/8 px-3 py-2 text-[10px] font-bold text-slate-400 transition hover:bg-white/[0.03] hover:text-white"
          >
            {showMonthlyDetails ? 'Ocultar detalhamento' : 'Ver detalhamento'}
            {showMonthlyDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showMonthlyDetails ? (
            <div className="grid grid-cols-2 border-t border-white/8 bg-black/10">
              <div className="px-3 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-300">Composição das entradas</p>
                <div className="mt-2 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between gap-2 text-slate-500">
                  <span>Receitas</span>
                  <span className="font-mono text-slate-300">{formatCurrency(incomeTotal)}</span>
                </div>
                  <div className="flex items-center justify-between gap-2 text-amber-300/80">
                    <span>Reembolsos</span>
                    <span className="font-mono">{formatCurrency(spendingSummary.others)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pl-2 text-amber-200">
                    <span>Concluídos</span>
                    <span className="font-mono">{formatCurrency(reimbursementSummary.received)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pl-2 text-slate-500">
                    <span>Pendentes</span>
                    <span className="font-mono text-slate-300">{formatCurrency(reimbursementSummary.pending)}</span>
                  </div>
                </div>
              </div>
              <div className="border-l border-white/8 px-3 py-3">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-rose-300">Composição dos gastos</p>
                <div className="mt-2 space-y-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseScope('personal');
                    setExpenseFilter('personal');
                  }}
                  className="flex w-full items-center justify-between gap-2 text-sky-300/80 transition hover:text-sky-200"
                >
                  <span>Meus gastos</span>
                  <span className="font-mono">{formatCurrency(spendingSummary.personal)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseScope('others');
                    setExpenseFilter('personal');
                  }}
                  className="flex w-full items-center justify-between gap-2 text-amber-300/80 transition hover:text-amber-200"
                >
                  <span>Dos outros</span>
                  <span className="font-mono">{formatCurrency(spendingSummary.others)}</span>
                </button>
                  <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-1.5 font-bold text-slate-300">
                    <span>Total</span>
                    <span className="font-mono">{formatCurrency(totalOutflows)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-4 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/8 bg-[#101319] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{totalLabel}</p>
            <p className="mt-0.5 text-xs text-slate-500">{visibleItemCount} item{visibleItemCount === 1 ? '' : 's'}</p>
            {totalHint ? <p className="mt-1 truncate text-[10px] text-slate-600">{totalHint}</p> : null}
          </div>
          <p className={`whitespace-nowrap text-right font-mono text-base font-bold tracking-tight ${viewTotal >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {viewTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(viewTotal))}
          </p>
        </section>
      )}

      {hasExpenseBreakdown ? (
        <section className="mt-3 grid shrink-0 grid-cols-3 gap-2">
          {expenseBreakdown.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setExpenseFilter((current) => current === item.key ? 'personal' : item.key)}
              aria-pressed={expenseFilter === item.key}
              className={`rounded-2xl border px-3 py-3 text-left transition ${item.className} ${
                expenseFilter === item.key ? 'ring-2 ring-white/25' : 'hover:border-white/25'
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{item.shortLabel}</p>
              <p className="mt-1 font-mono text-sm font-bold">{formatCurrency(item.total)}</p>
              <p className="mt-0.5 text-[10px] opacity-70">{item.count} lançamento{item.count === 1 ? '' : 's'}</p>
            </button>
          ))}
        </section>
      ) : null}

      <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
        {movementFilter === 'pending' && pendingInvoiceSummaries.length > 0 ? (
          <div className="space-y-3">
            {pendingInvoiceSummaries.map(({ card, invoice, itemCount, total }) => (
              <article key={`${card.id}:${invoice.period}`} className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-500/[0.12] to-[#101319] p-4">
                <span className="absolute inset-y-0 left-0 w-1 bg-violet-500" />
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <CreditCard size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="mb-1.5 inline-flex rounded-md border border-violet-400/20 bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-violet-300">
                    Fatura pendente
                  </span>
                  <p className="truncate text-sm font-bold text-white">{card.name} - {invoice.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {itemCount} lançamento{itemCount === 1 ? '' : 's'} • vence {invoice.dueDate.slice(8, 10)}/{invoice.dueDate.slice(5, 7)}
                  </p>
                  <span className="mt-2 inline-flex rounded-full border border-violet-400/20 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-100">
                    Pague pela aba Cartões
                  </span>
                </div>
                <p className="shrink-0 text-right font-mono text-sm font-bold text-rose-300">-{formatCurrency(total)}</p>
              </article>
            ))}
          </div>
        ) : null}

        {visibleItemCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#101319] p-6 text-center">
            <p className="text-sm font-bold text-white">Nenhum lançamento neste filtro</p>
            <p className="mt-1 text-xs text-slate-500">Escolha outro tipo de despesa ou limpe a busca.</p>
          </div>
        ) : filteredTransactions.map((transaction) => {
          const isIncome = transaction.flow === 'income';
          const isTransfer = transaction.flow === 'transfer';
          const isCredit = isInvoiceCredit(transaction);
          const isPayment = isInvoicePayment(transaction);
          const isCardEntry = Boolean(transaction.cardId);
          const isPaid = transaction.status === 'paid';
          const meta = readTransactionMeta(transaction.notes);
          const isInvoiceSettled = Boolean(meta.paidAt && meta.paidFromAccountId);
          const expenseNeedLabel = transaction.isReimbursable ? '' : meta.expenseNeed === 'essential' ? 'Essencial' : meta.expenseNeed === 'superfluous' ? 'Supérflua' : '';
          const sourceLabel = getPaymentSource(accounts, cards, transaction);
          return (
            <article
              key={transaction.id}
              className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 ${
                isCardEntry
                  ? 'border-violet-400/20 bg-gradient-to-r from-violet-500/[0.09] to-[#101319]'
                  : 'border-sky-400/15 bg-gradient-to-r from-sky-500/[0.06] to-[#101319]'
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${isCardEntry ? 'bg-violet-500' : 'bg-sky-500'}`} />
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${transaction.cardId ? 'bg-violet-500/10 text-violet-300' : isTransfer ? 'bg-sky-500/10 text-sky-300' : 'bg-white/5 text-slate-300'}`}>
                {transaction.cardId ? <CreditCard size={18} /> : <Landmark size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`mb-1.5 inline-flex rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                  isCardEntry
                    ? 'border-violet-400/20 bg-violet-500/10 text-violet-300'
                    : 'border-sky-400/20 bg-sky-500/10 text-sky-300'
                }`}>
                  {isCardEntry ? 'Cartão' : 'Conta'} • {sourceLabel}
                </span>
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-white">{transaction.description}</p>
                  {isPayment ? (
                    <CheckCircle2 size={15} className="text-emerald-300" />
                  ) : isCardEntry ? null : (
                    <button
                      type="button"
                      onClick={() => {
                        if (isPaid || isTransfer) onToggleStatus(transaction);
                        else openPaymentAccountPicker(transaction);
                      }}
                      className={`${isPaid ? 'text-emerald-300' : 'text-amber-300'}`}
                    >
                      {isPaid ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    </button>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {getCategoryName(categories, transaction.categoryId)}
                  {expenseNeedLabel ? ` - ${expenseNeedLabel}` : ''}
                </p>
                {transaction.isReimbursable ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                    <UserRound size={11} />
                    Reembolso - {getReimbursementPersonName(reimbursementPeople, transaction.reimbursementPersonId)}
                  </span>
                ) : null}
                {transaction.flow === 'expense' && !isCredit && !isPayment ? (
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getEntryModeTagClass(transaction)}`}>
                    {getEntryModeLabel(transaction)}
                  </span>
                ) : null}
                {isCredit ? (
                  <span className="mt-2 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                    Credito na fatura
                  </span>
                ) : null}
                {isPayment ? (
                  <span className="mt-2 inline-flex rounded-full border border-sky-400/20 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-100">
                    Pagamento de fatura
                  </span>
                ) : null}
                {isCardEntry && !isCredit ? (
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    isInvoiceSettled
                      ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100'
                      : 'border-violet-400/20 bg-violet-500/15 text-violet-100'
                  }`}>
                    {isInvoiceSettled ? 'Fatura paga' : 'Na fatura'}
                  </span>
                ) : null}
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-bold ${isIncome || isCredit ? 'text-emerald-300' : isTransfer ? 'text-sky-300' : 'text-rose-300'}`}>
                  {isIncome || isCredit ? '+' : isTransfer ? '' : '-'}{formatCurrency(transaction.amount)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {transaction.cardId ? 'Compra ' : ''}{transaction.date.slice(8, 10)}/{transaction.date.slice(5, 7)}
                </p>
                {!isPayment ? <div className="mt-2 flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(transaction)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-sky-500/20 hover:text-sky-200"
                    title="Editar lançamento"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(transaction)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-100"
                    title="Excluir lançamento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div> : null}
              </div>
            </article>
          );
        })}
      </section>

      {paymentTransaction ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6">
          <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#101319] p-5 shadow-2xl md:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Confirmar pagamento</p>
                <h2 className="mt-1 truncate text-lg font-bold text-white">{paymentTransaction.description}</h2>
                <p className="mt-1 font-mono text-sm font-bold text-rose-300">-{formatCurrency(paymentTransaction.amount)}</p>
              </div>
              <button
                type="button"
                onClick={closePaymentAccountPicker}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <label className="mt-5 block text-xs font-bold text-slate-300">
              De qual conta o saldo vai sair?
              <select
                value={paymentAccountId}
                onChange={(event) => {
                  setPaymentAccountId(event.target.value);
                  setPaymentError('');
                }}
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#0B0E14] px-3 text-sm font-semibold text-white outline-none focus:border-sky-400"
              >
                {accounts.length === 0 ? <option value="">Nenhuma conta cadastrada</option> : null}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(account.balance)}
                  </option>
                ))}
              </select>
            </label>

            {paymentError ? <p className="mt-3 text-xs font-semibold text-rose-300">{paymentError}</p> : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closePaymentAccountPicker}
                className="h-11 rounded-lg border border-white/10 text-sm font-bold text-slate-300 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPaymentAccount}
                disabled={accounts.length === 0}
                className="h-11 rounded-lg bg-sky-500 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                Marcar como pago
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
