import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Circle, CreditCard, Landmark, Pencil, Search, Trash2 } from 'lucide-react';
import { Account, Card, Category, Transaction, TransactionTab } from '../../types';
import { formatCurrency, getAvailableMonths, getCategoryName, getCurrentMonthKey, getMonthKey, getPaymentSource } from '../../lib/utils/finance';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  onToggleStatus: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const tabs: { id: TransactionTab; label: string }[] = [
  { id: 'general', label: 'Geral' },
  { id: 'cards', label: 'Cartoes' },
  { id: 'accounts', label: 'Contas' },
];

export function TransactionsView({ transactions, accounts, cards, categories, onToggleStatus, onEdit, onDelete }: TransactionsViewProps) {
  const months = getAvailableMonths(transactions);
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? getCurrentMonthKey());
  const [tab, setTab] = useState<TransactionTab>('general');
  const [search, setSearch] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => getMonthKey(transaction.date) === selectedMonth)
      .filter((transaction) => {
        if (tab === 'cards') return Boolean(transaction.cardId);
        if (tab === 'accounts') return Boolean(transaction.accountId || transaction.fromAccountId || transaction.toAccountId);
        return true;
      })
      .filter((transaction) => transaction.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [search, selectedMonth, tab, transactions]);

  return (
    <div className="px-4 pt-7 md:px-8 md:pt-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Movimentacoes</p>
          <h1 className="font-display text-2xl font-bold text-white">Transacoes</h1>
        </div>
        <label className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-300">
          <Calendar size={16} />
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="bg-transparent text-white outline-none">
            {months.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
        {tabs.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`h-11 rounded-xl text-sm font-bold transition ${tab === item.id ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>
            {item.label}
          </button>
        ))}
      </div>

      <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#101319] px-4 text-slate-400">
        <Search size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar lancamento" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
      </label>

      <section className="mt-5 space-y-3">
        {filteredTransactions.map((transaction) => {
          const isIncome = transaction.flow === 'income';
          const isTransfer = transaction.flow === 'transfer';
          const isPaid = transaction.status === 'paid';
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
                    title="Editar lancamento"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(transaction)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-100"
                    title="Excluir lancamento"
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
