import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Pencil, Search, UserRound, X } from 'lucide-react';
import { Card, ReimbursementPerson, Transaction } from '../../types';
import { formatCurrency, getCurrentMonthKey, getFinancialMonthKey } from '../../lib/utils/finance';
import { MonthNavigator } from '../shared/MonthNavigator';

interface ReimbursementsViewProps {
  people: ReimbursementPerson[];
  cards: Card[];
  transactions: Transaction[];
  activeMonth: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onMarkReceived: (transaction: Transaction) => void | Promise<void>;
  onEditTransaction: (transaction: Transaction) => void;
}

type ReimbursementViewMode = 'month' | 'pending' | 'all';

const modeOptions: { id: ReimbursementViewMode; label: string }[] = [
  { id: 'month', label: 'Mes' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'all', label: 'Geral' },
];

function getPersonName(people: ReimbursementPerson[], personId?: string) {
  return people.find((person) => person.id === personId)?.name ?? 'Pessoa removida';
}

function formatShortDate(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(2, 4)}`;
}

export function ReimbursementsView({
  people,
  cards,
  transactions,
  activeMonth,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onMarkReceived,
  onEditTransaction,
}: ReimbursementsViewProps) {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<ReimbursementViewMode>('month');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const currentMonth = getCurrentMonthKey();

  const allReimbursements = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions
      .filter((transaction) => transaction.isReimbursable)
      .filter((transaction) => {
        if (!term) return true;
        return transaction.description.toLowerCase().includes(term) ||
          getPersonName(people, transaction.reimbursementPersonId).toLowerCase().includes(term);
      });
  }, [people, search, transactions]);

  const overduePending = useMemo(() => {
    return allReimbursements
      .filter((transaction) => transaction.reimbursementStatus !== 'received')
      .filter((transaction) => getFinancialMonthKey(transaction, cards) < currentMonth)
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [allReimbursements, cards, currentMonth]);

  const modeTransactions = useMemo(() => {
    return allReimbursements
      .filter((transaction) => {
        if (mode === 'all') return true;
        if (mode === 'pending') return transaction.reimbursementStatus !== 'received';
        return getFinancialMonthKey(transaction, cards) === activeMonth;
      })
      .sort((left, right) => {
        if (left.reimbursementStatus !== right.reimbursementStatus) {
          return left.reimbursementStatus === 'pending' ? -1 : 1;
        }
        return right.date.localeCompare(left.date);
      });
  }, [activeMonth, allReimbursements, cards, mode]);

  const personSummaries = useMemo(() => {
    const totals = new Map<string, { id: string; name: string; pending: number; received: number; count: number }>();
    modeTransactions.forEach((transaction) => {
      const key = transaction.reimbursementPersonId ?? 'unknown';
      const current = totals.get(key) ?? {
        id: key,
        name: getPersonName(people, transaction.reimbursementPersonId),
        pending: 0,
        received: 0,
        count: 0,
      };
      if (transaction.reimbursementStatus === 'received') {
        current.received += transaction.amount;
      } else {
        current.pending += transaction.amount;
      }
      current.count += 1;
      totals.set(key, current);
    });
    return Array.from(totals.values()).sort((left, right) => right.pending - left.pending);
  }, [modeTransactions, people]);

  const reimbursementTransactions = useMemo(() => {
    if (!selectedPersonId) return modeTransactions;
    return modeTransactions.filter((transaction) => (transaction.reimbursementPersonId ?? 'unknown') === selectedPersonId);
  }, [modeTransactions, selectedPersonId]);

  const pendingTotal = reimbursementTransactions
    .filter((transaction) => transaction.reimbursementStatus !== 'received')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const receivedTotal = reimbursementTransactions
    .filter((transaction) => transaction.reimbursementStatus === 'received')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const overdueTotal = overduePending.reduce((sum, transaction) => sum + transaction.amount, 0);
  const emptyMessage = mode === 'month'
    ? 'Nenhum reembolso neste mes'
    : mode === 'pending'
      ? 'Nenhum reembolso pendente'
      : 'Nenhum reembolso registrado';

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pt-4 text-white md:px-8 md:pt-6">
      <header className="shrink-0">
        <p className="text-xs text-slate-400">Controle de terceiros</p>
        <h1 className="font-display text-xl font-bold leading-tight text-white">Reembolsos</h1>
      </header>

      <div className="mt-3 grid shrink-0 grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
        {modeOptions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setMode(item.id);
              setSelectedPersonId(null);
            }}
            className={`h-10 rounded-xl text-sm font-bold transition ${mode === item.id ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'month' ? (
        <MonthNavigator month={activeMonth} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} onCurrentMonth={onCurrentMonth} className="mt-3 shrink-0" />
      ) : null}

      {overduePending.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setMode('pending');
            setSelectedPersonId(null);
          }}
          className="mt-3 flex shrink-0 items-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-left"
        >
          <AlertTriangle size={16} className="shrink-0 text-rose-200" />
          <span className="min-w-0">
            <span className="block text-xs font-bold leading-snug text-rose-100">
              {overduePending.length} pendente{overduePending.length === 1 ? '' : 's'} de meses anteriores
            </span>
            <span className="block text-[11px] font-semibold text-rose-200">{formatCurrency(overdueTotal)} em aberto</span>
          </span>
        </button>
      ) : null}

      <section className="mt-3 grid shrink-0 grid-cols-2 gap-2">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-100">A receber</p>
          <p className="mt-0.5 font-display text-lg font-bold text-white">{formatCurrency(pendingTotal)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-100">Recebido</p>
          <p className="mt-0.5 font-display text-lg font-bold text-white">{formatCurrency(receivedTotal)}</p>
        </div>
      </section>

      {personSummaries.length > 0 ? (
        <section className="mt-3 shrink-0">
          <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
            {personSummaries.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => setSelectedPersonId((current) => current === person.id ? null : person.id)}
                aria-pressed={selectedPersonId === person.id}
                className={`w-[112px] shrink-0 snap-start rounded-2xl border p-3 text-left transition ${
                  selectedPersonId === person.id
                    ? 'border-amber-300/60 bg-amber-400/15 ring-1 ring-amber-300/20'
                    : 'border-white/8 bg-[#101319] hover:border-amber-300/30'
                }`}
              >
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">
                  <UserRound size={14} />
                </div>
                <p className="truncate text-xs font-bold text-white">{person.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{person.count} item{person.count === 1 ? '' : 's'}</p>
                <p className="mt-1.5 truncate font-mono text-[11px] font-bold text-amber-200">{formatCurrency(person.pending)}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedPersonId ? (
        <div className="mt-3 flex shrink-0 items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2">
          <p className="truncate text-xs font-bold text-amber-100">
            Despesas de {selectedPersonId === 'unknown' ? 'Pessoa removida' : getPersonName(people, selectedPersonId)}
          </p>
          <button
            type="button"
            onClick={() => setSelectedPersonId(null)}
            className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-amber-100 hover:bg-white/10"
            title="Limpar filtro de pessoa"
            aria-label="Limpar filtro de pessoa"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      <label className="mt-3 flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-[#101319] px-3 text-slate-400">
        <Search size={15} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pessoa ou lancamento" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
      </label>

      <section className="no-scrollbar mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
        {reimbursementTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#101319] p-6 text-center">
            <UserRound size={24} className="mx-auto text-slate-500" />
            <p className="mt-3 text-sm font-bold text-white">{emptyMessage}</p>
            <p className="mt-1 text-xs text-slate-500">Marque uma despesa como reembolso no lancamento.</p>
          </div>
        ) : reimbursementTransactions.map((transaction) => {
          const received = transaction.reimbursementStatus === 'received';
          const isOverdue = !received && getFinancialMonthKey(transaction, cards) < currentMonth;
          return (
            <article key={transaction.id} className={`rounded-2xl border px-3 py-2.5 ${isOverdue ? 'border-rose-400/20 bg-rose-500/10' : 'border-white/8 bg-[#101319]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-white">{transaction.description}</p>
                    <span className="inline-flex max-w-[120px] shrink-0 items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                      <UserRound size={10} />
                      <span className="truncate">{getPersonName(people, transaction.reimbursementPersonId)}</span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{formatShortDate(transaction.date)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${received ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100' : 'border-amber-400/20 bg-amber-500/15 text-amber-100'}`}>
                      {received ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                      {received ? 'Recebido' : 'A receber'}
                    </span>
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-100">
                        <AlertTriangle size={12} />
                        Atrasado
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-bold text-white">{formatCurrency(transaction.amount)}</p>
                  <div className="mt-1.5 flex justify-end gap-1">
                    {!received ? (
                      <button type="button" onClick={() => onMarkReceived(transaction)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-200" title="Marcar recebido">
                        <CheckCircle2 size={14} />
                      </button>
                    ) : null}
                    <button type="button" onClick={() => onEditTransaction(transaction)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-300" title="Editar lancamento">
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
