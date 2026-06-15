import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Circle, CreditCard, Landmark, Pencil, Search, Trash2 } from 'lucide-react';
import { Account, Card, Category, DashboardTransactionFilter, Transaction, TransactionTab } from '../../types';
import { formatCurrency, getAvailableMonths, getCategoryName, getCurrentMonthKey, getFinancialMonthKey, getMonthKey, getPaymentSource } from '../../lib/utils/finance';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { getCardInvoiceClosingMonth } from '../../lib/utils/cardInvoices';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  cards: Card[];
  categories: Category[];
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
  if (filter === 'expenses') return transaction.flow === 'expense';
  if (filter === 'received') return transaction.flow === 'income' && transaction.status === 'paid';
  return transaction.flow === 'expense' && transaction.status === 'paid' && !transaction.cardId;
}

export function TransactionsView({
  transactions,
  accounts,
  cards,
  categories,
  activeMonth,
  dashboardFilter,
  onToggleStatus,
  onEdit,
  onDelete,
}: TransactionsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [tab, setTab] = useState<TransactionTab>('general');
  const [search, setSearch] = useState('');
  const isDashboardFiltered = Boolean(dashboardFilter);

  useEffect(() => {
    if (!dashboardFilter) return;
    setSelectedMonth(activeMonth);
    setTab('general');
  }, [activeMonth, dashboardFilter]);

  const months = useMemo(() => {
    if (tab !== 'cards') return getAvailableMonths(transactions);

    return Array.from(new Set(
      transactions
        .filter((transaction) => transaction.cardId)
        .map((transaction) => {
          const card = cards.find((item) => item.id === transaction.cardId);
          return card ? getCardInvoiceClosingMonth(card, transaction.date) : getMonthKey(transaction.date);
        }),
    )).sort().reverse();
  }, [cards, tab, transactions]);
  const monthOptions = useMemo(() => {
    return months.includes(selectedMonth) ? months : [selectedMonth, ...months];
  }, [months, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        if (dashboardFilter) return matchesDashboardFilter(transaction, cards, selectedMonth, dashboardFilter);

        if (tab === 'cards') {
          if (!transaction.cardId) return false;
          const card = cards.find((item) => item.id === transaction.cardId);
          const invoiceMonth = card ? getCardInvoiceClosingMonth(card, transaction.date) : getMonthKey(transaction.date);
          return invoiceMonth === selectedMonth;
        }

        if (getMonthKey(transaction.date) !== selectedMonth) return false;
        if (tab === 'accounts') return Boolean(transaction.accountId || transaction.fromAccountId || transaction.toAccountId);
        return true;
      })
      .filter((transaction) => transaction.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [cards, dashboardFilter, search, selectedMonth, tab, transactions]);
  const viewTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, transaction) => {
      if (transaction.flow === 'income') return sum + transaction.amount;
      if (transaction.flow === 'expense') return sum - transaction.amount;
      return sum;
    }, 0);
  }, [filteredTransactions]);

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pt-7 md:px-8 md:pt-8">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{isDashboardFiltered ? 'Dashboard' : 'Movimentações'}</p>
          <h1 className="font-display text-2xl font-bold text-white">{dashboardFilter ? dashboardFilterLabels[dashboardFilter] : 'Transações'}</h1>
        </div>
        <label className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-300">
          <Calendar size={16} />
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="bg-transparent text-white outline-none">
            {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
      </header>

      {!isDashboardFiltered ? (
        <div className="mt-5 grid shrink-0 grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
          {tabs.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`h-11 rounded-xl text-sm font-bold transition ${tab === item.id ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <label className="mt-4 flex h-12 shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#101319] px-4 text-slate-400">
        <Search size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lançamento" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
      </label>

      <section className="mt-4 flex shrink-0 items-center justify-between rounded-2xl border border-white/8 bg-[#101319] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total da visão</p>
          <p className="mt-0.5 text-xs text-slate-500">{filteredTransactions.length} lançamento{filteredTransactions.length === 1 ? '' : 's'}</p>
        </div>
        <p className={`font-mono text-base font-bold ${viewTotal >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {viewTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(viewTotal))}
        </p>
      </section>

      <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
        {filteredTransactions.map((transaction) => {
          const isIncome = transaction.flow === 'income';
          const isTransfer = transaction.flow === 'transfer';
          const isPaid = transaction.status === 'paid';
          const meta = readTransactionMeta(transaction.notes);
          const expenseNeedLabel = meta.expenseNeed === 'essential' ? 'Essencial' : meta.expenseNeed === 'superfluous' ? 'Supérflua' : '';
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
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-bold ${isIncome ? 'text-emerald-300' : isTransfer ? 'text-sky-300' : 'text-rose-300'}`}>
                  {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(transaction.amount)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{transaction.date.slice(8, 10)}/{transaction.date.slice(5, 7)}</p>
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
