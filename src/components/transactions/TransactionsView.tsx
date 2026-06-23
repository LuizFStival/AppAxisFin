import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, CreditCard, Landmark, Pencil, Trash2, UserRound } from 'lucide-react';
import { Account, Card, Category, DashboardTransactionFilter, ReimbursementPerson, Transaction, TransactionTab } from '../../types';
import { formatCurrency, getCategoryName, getCurrentMonthKey, getFinancialMonthKey, getPaymentSource, isInvoiceCredit, isThirdPartyExpense, shiftMonthKey } from '../../lib/utils/finance';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { summarizeExpenseBreakdown } from '../../lib/utils/expenseBreakdown';
import { ExpenseViewFilter, matchesExpenseViewFilter } from '../../lib/utils/expenseFilters';
import { ExpenseFilterChips } from '../shared/ExpenseFilterChips';
import { CollapsibleSearch } from '../shared/CollapsibleSearch';
import { MonthNavigator } from '../shared/MonthNavigator';

interface TransactionsViewProps {
  transactions: Transaction[];
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

function matchesDashboardFilter(transaction: Transaction, cards: Card[], selectedMonth: string, filter: DashboardTransactionFilter) {
  if (getFinancialMonthKey(transaction, cards) !== selectedMonth) return false;
  if (filter === 'income') return transaction.flow === 'income';
  if (filter === 'expenses') return transaction.flow === 'expense' && !isThirdPartyExpense(transaction);
  if (filter === 'received') return transaction.flow === 'income' && transaction.status === 'paid';
  return transaction.flow === 'expense' && transaction.status === 'paid' && !transaction.cardId && !isThirdPartyExpense(transaction);
}

function getReimbursementPersonName(people: ReimbursementPerson[], personId?: string) {
  return people.find((person) => person.id === personId)?.name ?? 'Pessoa removida';
}

export function TransactionsView({
  transactions,
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
  const [expenseFilter, setExpenseFilter] = useState<ExpenseViewFilter>('all');
  const isDashboardFiltered = Boolean(dashboardFilter);

  useEffect(() => {
    if (!dashboardFilter) return;
    setSelectedMonth(activeMonth);
    setTab('general');
  }, [activeMonth, dashboardFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        if (dashboardFilter) return matchesDashboardFilter(transaction, cards, selectedMonth, dashboardFilter);

        if (getFinancialMonthKey(transaction, cards) !== selectedMonth) return false;
        if (tab === 'cards') return Boolean(transaction.cardId);
        if (tab === 'accounts') return Boolean(transaction.accountId || transaction.fromAccountId || transaction.toAccountId);
        return true;
      })
      .filter((transaction) => dashboardFilter || matchesExpenseViewFilter(transaction, expenseFilter))
      .filter((transaction) => transaction.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [cards, dashboardFilter, expenseFilter, search, selectedMonth, tab, transactions]);
  const viewTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, transaction) => {
      if (transaction.flow === 'income') return sum + transaction.amount;
      if (isInvoiceCredit(transaction)) return sum + transaction.amount;
      if (transaction.flow === 'expense') return sum - transaction.amount;
      return sum;
    }, 0);
  }, [filteredTransactions]);
  const expenseBreakdown = useMemo(() => summarizeExpenseBreakdown(filteredTransactions), [filteredTransactions]);
  const hasExpenseBreakdown = expenseBreakdown.some((item) => item.count > 0);

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

      {!isDashboardFiltered ? (
        <div className="mt-5 grid shrink-0 grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
          {tabs.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`h-11 rounded-xl text-sm font-bold transition ${tab === item.id ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {!isDashboardFiltered ? (
        <div className="relative mt-3 flex h-10 min-w-0 shrink-0 items-start gap-2">
          <ExpenseFilterChips value={expenseFilter} onChange={setExpenseFilter} className="min-w-0 flex-1" />
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

      <section className="mt-4 flex shrink-0 items-center justify-between rounded-2xl border border-white/8 bg-[#101319] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Meu total</p>
          <p className="mt-0.5 text-xs text-slate-500">{filteredTransactions.length} lançamento{filteredTransactions.length === 1 ? '' : 's'}</p>
        </div>
        <p className={`font-mono text-base font-bold ${viewTotal >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {viewTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(viewTotal))}
        </p>
      </section>

      {hasExpenseBreakdown ? (
        <section className="mt-3 grid shrink-0 grid-cols-3 gap-2">
          {expenseBreakdown.map((item) => (
            <div key={item.key} className={`rounded-2xl border px-3 py-3 ${item.className}`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{item.shortLabel}</p>
              <p className="mt-1 font-mono text-sm font-bold">{formatCurrency(item.total)}</p>
              <p className="mt-0.5 text-[10px] opacity-70">{item.count} lançamento{item.count === 1 ? '' : 's'}</p>
            </div>
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
