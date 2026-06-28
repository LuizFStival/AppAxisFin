import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, CreditCard, Landmark, Pencil, Trash2, UserRound } from 'lucide-react';
import { Account, Card, Category, DashboardTransactionFilter, ReimbursementPerson, Transaction, TransactionTab } from '../../types';
import { formatCurrency, getCategoryName, getCurrentMonthKey, getFinancialMonthKey, getPaymentSource, isInvoiceCredit, isThirdPartyExpense, shiftMonthKey } from '../../lib/utils/finance';
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
  onToggleStatus: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const tabs: { id: TransactionTab; label: string }[] = [
  { id: 'general', label: 'Geral' },
  { id: 'cards', label: 'Cartões' },
  { id: 'accounts', label: 'Contas' },
];

const dashboardFilterLabels: Record<DashboardTransactionFilter, string> = {
  income: 'Receitas',
  expenses: 'Despesas do mês',
  received: 'Recebido',
  paid: 'Pago',
};

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

function matchesScopedExpenseFilter(transaction: Transaction, filter: ExpenseViewFilter) {
  if (filter === 'personal') return true;
  const meta = readTransactionMeta(transaction.notes);
  if (filter === 'essential' || filter === 'superfluous') return meta.expenseNeed === filter;
  return (meta.entryMode ?? 'variable') === filter;
}

function matchesDashboardFilter(transaction: Transaction, selectedMonth: string, filter: DashboardTransactionFilter) {
  if (getFinancialMonthKey(transaction) !== selectedMonth) return false;
  if (filter === 'income') return transaction.flow === 'income';
  if (filter === 'expenses') return transaction.flow === 'expense' && !isThirdPartyExpense(transaction);
  if (filter === 'received') return transaction.flow === 'income' && transaction.status === 'paid';
  return transaction.flow === 'expense' && transaction.status === 'paid' && !transaction.cardId && !isThirdPartyExpense(transaction);
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
  const [showMonthlyDetails, setShowMonthlyDetails] = useState(false);
  const isDashboardFiltered = Boolean(dashboardFilter);

  useEffect(() => {
    if (!dashboardFilter) return;
    setSelectedMonth(activeMonth);
    setTab('general');
    setExpenseScope('all');
    setExpenseFilter('personal');
  }, [activeMonth, dashboardFilter]);

  const sourceTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        const matchesView = dashboardFilter
          ? matchesDashboardFilter(transaction, selectedMonth, dashboardFilter)
          : getFinancialMonthKey(transaction) === selectedMonth;
        return matchesView && matchesTransactionSource(transaction, tab);
      })
      .filter((transaction) => transaction.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [cards, dashboardFilter, search, selectedMonth, tab, transactions]);
  const filteredTransactions = useMemo(() => {
    if (expenseScope === 'all') return sourceTransactions;
    return sourceTransactions
      .filter((transaction) => transaction.flow === 'expense')
      .filter((transaction) => expenseScope === 'others'
        ? isThirdPartyExpense(transaction)
        : !isThirdPartyExpense(transaction))
      .filter((transaction) => matchesScopedExpenseFilter(transaction, expenseFilter));
  }, [expenseFilter, expenseScope, sourceTransactions]);
  const viewTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, transaction) => {
      if (transaction.flow === 'income') return sum + transaction.amount;
      if (isInvoiceCredit(transaction)) return sum + transaction.amount;
      if (transaction.flow === 'expense') return sum - transaction.amount;
      return sum;
    }, 0);
  }, [filteredTransactions]);
  const spendingSummary = useMemo(() => {
    return sourceTransactions.reduce((summary, transaction) => {
      if (transaction.flow !== 'expense') return summary;
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
    return sourceTransactions.filter((transaction) => transaction.flow === 'expense' && !isThirdPartyExpense(transaction));
  }, [expenseScope, sourceTransactions]);
  const expenseBreakdown = useMemo(
    () => summarizeExpenseBreakdown(scopedExpenseTransactions),
    [scopedExpenseTransactions],
  );
  const hasExpenseBreakdown = expenseScope !== 'all' && expenseBreakdown.some((item) => item.count > 0);
  const totalInflows = incomeTotal + spendingSummary.others;
  const totalOutflows = spendingSummary.personal + spendingSummary.others;
  const monthlyBalance = totalInflows - totalOutflows;
  const totalLabel = dashboardFilter === 'expenses'
    ? 'Despesas pessoais do mês'
    : expenseScope === 'all'
      ? 'Resultado projetado'
    : expenseScope === 'others'
      ? expenseFilter === 'personal' ? 'Dos outros' : 'Dos outros filtrado'
      : expenseFilter === 'personal'
        ? 'Meu gasto'
        : 'Total filtrado';
  const totalHint = dashboardFilter === 'expenses'
    ? 'Consumo pessoal; gastos de terceiros ficam separados'
    : expenseScope === 'all'
      ? 'Inclui valores recebidos e ainda previstos'
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pt-7 md:px-8 md:pt-8">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{isDashboardFiltered ? 'Dashboard' : 'Movimentações'}</p>
          <h1 className="font-display text-2xl font-bold text-white">{dashboardFilter ? dashboardFilterLabels[dashboardFilter] : 'Transações'}</h1>
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

      {!isDashboardFiltered ? (
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

      {!dashboardFilter && expenseScope === 'all' ? (
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
            <p className="mt-0.5 text-xs text-slate-500">{filteredTransactions.length} lançamento{filteredTransactions.length === 1 ? '' : 's'}</p>
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
        {filteredTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#101319] p-6 text-center">
            <p className="text-sm font-bold text-white">Nenhum lançamento neste filtro</p>
            <p className="mt-1 text-xs text-slate-500">Escolha outro tipo de despesa ou limpe a busca.</p>
          </div>
        ) : filteredTransactions.map((transaction) => {
          const isIncome = transaction.flow === 'income';
          const isTransfer = transaction.flow === 'transfer';
          const isCredit = isInvoiceCredit(transaction);
          const isPaid = transaction.status === 'paid';
          const meta = readTransactionMeta(transaction.notes);
          const expenseNeedLabel = transaction.isReimbursable ? '' : meta.expenseNeed === 'essential' ? 'Essencial' : meta.expenseNeed === 'superfluous' ? 'Supérflua' : '';
          return (
            <article key={transaction.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#101319] p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${transaction.cardId ? 'bg-violet-500/10 text-violet-300' : isTransfer ? 'bg-sky-500/10 text-sky-300' : 'bg-white/5 text-slate-300'}`}>
                {transaction.cardId ? <CreditCard size={18} /> : <Landmark size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-white">{transaction.description}</p>
                  <button type="button" onClick={() => onToggleStatus(transaction)} className={`${isPaid ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {isPaid ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  </button>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {getCategoryName(categories, transaction.categoryId)} - {getPaymentSource(accounts, cards, transaction)}
                  {expenseNeedLabel ? ` - ${expenseNeedLabel}` : ''}
                </p>
                {transaction.isReimbursable ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                    <UserRound size={11} />
                    Reembolso - {getReimbursementPersonName(reimbursementPeople, transaction.reimbursementPersonId)}
                  </span>
                ) : null}
                {transaction.flow === 'expense' && !isCredit ? (
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getEntryModeTagClass(transaction)}`}>
                    {getEntryModeLabel(transaction)}
                  </span>
                ) : null}
                {isCredit ? (
                  <span className="mt-2 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                    Credito na fatura
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
                <div className="mt-2 flex justify-end gap-1">
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
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
