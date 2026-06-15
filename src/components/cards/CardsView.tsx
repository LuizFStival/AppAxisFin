import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, CreditCard, Pencil, Search, Trash2 } from 'lucide-react';
import { Account, Card, Category, Transaction } from '../../types';
import { formatCurrency, formatMonthLabel, getCategoryName } from '../../lib/utils/finance';
import { getCardInvoiceInfo, getCardInvoiceInfoForClosingMonth } from '../../lib/utils/cardInvoices';
import { formatLocalDate } from '../../lib/utils/date';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { CardInvoiceActions } from './CardInvoiceActions';

interface CardsViewProps {
  cards: Card[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  selectedCardId: string;
  activeMonth: string;
  onSelectCard: (cardId: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onPayInvoice: (input: {
    card: Card;
    accountId: string;
    paymentDate: string;
    amount: number;
    transactions: Transaction[];
  }) => Promise<void>;
  onUpdateCardClosingDay: (card: Card, closingDay: number) => Promise<void>;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
}

function getInvoiceTransactions(card: Card, transactions: Transaction[], closingMonth: string) {
  return transactions
    .filter((transaction) => {
      if (transaction.flow !== 'expense' || transaction.cardId !== card.id) return false;
      return getCardInvoiceInfo(card, transaction.date).endDate.slice(0, 7) === closingMonth;
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

function getInvoiceStatusLabel(status: 'aberta' | 'fechada' | 'vencida') {
  return status === 'aberta' ? 'Aberta' : status === 'fechada' ? 'Fechada' : 'Vencida';
}

function getInvoiceDisplayStatus(status: 'aberta' | 'fechada' | 'vencida', invoiceTransactions: Transaction[]) {
  if (status !== 'aberta' && invoiceTransactions.length > 0 && invoiceTransactions.every((transaction) => transaction.status === 'paid')) {
    return 'Paga';
  }

  return getInvoiceStatusLabel(status);
}

function getEntryModeLabel(entryMode?: string) {
  if (entryMode === 'fixed') return 'Fixa';
  if (entryMode === 'installment') return 'Parcela';
  return 'Variável';
}

function getExpenseNeedLabel(expenseNeed?: string) {
  if (expenseNeed === 'essential') return 'Essencial';
  if (expenseNeed === 'superfluous') return 'Supérflua';
  return '';
}

function getEntryModeTagClass(entryMode?: string) {
  if (entryMode === 'installment') return 'border-violet-400/20 bg-violet-500/15 text-violet-100';
  if (entryMode === 'fixed') return 'border-amber-400/20 bg-amber-500/15 text-amber-100';
  return 'border-sky-400/20 bg-sky-500/15 text-sky-100';
}

function getExpenseNeedTagClass(expenseNeed?: string) {
  if (expenseNeed === 'essential') return 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100';
  if (expenseNeed === 'superfluous') return 'border-rose-400/20 bg-rose-500/15 text-rose-100';
  return 'border-slate-400/20 bg-slate-500/15 text-slate-100';
}

export function CardsView({
  cards,
  accounts,
  categories,
  transactions,
  selectedCardId,
  activeMonth,
  onSelectCard,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onEditTransaction,
  onDeleteTransaction,
  onPayInvoice,
  onUpdateCardClosingDay,
  onEditCard,
  onDeleteCard,
}: CardsViewProps) {
  const [search, setSearch] = useState('');
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const invoices = useMemo(() => {
    return cards.map((card) => {
      const invoice = getCardInvoiceInfoForClosingMonth(card, activeMonth, formatLocalDate(new Date()));
      const invoiceTransactions = getInvoiceTransactions(card, transactions, activeMonth);
      const total = invoiceTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      return { card, invoice, transactions: invoiceTransactions, total };
    });
  }, [activeMonth, cards, transactions]);
  const selectedInvoice = selectedCard
    ? invoices.find((item) => item.card.id === selectedCard.id)
    : null;
  const visibleTransactions = (selectedInvoice?.transactions ?? [])
    .filter((transaction) => transaction.description.toLowerCase().includes(search.toLowerCase()));
  const totalAllCards = invoices.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pt-7 text-white md:px-8 md:pt-8">
      <header className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">Conferência</p>
            <h1 className="font-display text-2xl font-bold text-white">{selectedCard ? selectedCard.name : 'Cartões'}</h1>
          </div>
          {selectedCard ? (
            <button
              type="button"
              onClick={() => onSelectCard('')}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300"
              title="Voltar para todos os cartões"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 rounded-2xl border border-white/8 bg-[#101319] p-2">
          <button type="button" onClick={onPreviousMonth} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={onCurrentMonth} className="min-w-0 flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center hover:bg-white/5">
            <CalendarDays size={16} className="text-sky-300" />
            <span className="truncate text-sm font-bold capitalize text-white">{formatMonthLabel(activeMonth)}</span>
          </button>
          <button type="button" onClick={onNextMonth} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {!selectedCard ? (
        <>
          <section className="mt-4 shrink-0 rounded-2xl border border-white/8 bg-[#101319] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Faturas que fecham no mês</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{formatCurrency(totalAllCards)}</p>
            <p className="mt-1 text-xs text-slate-500">{invoices.reduce((sum, item) => sum + item.transactions.length, 0)} lançamentos em {cards.length} cartão{cards.length === 1 ? '' : 'ões'}</p>
          </section>

          <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
            {invoices.map(({ card, invoice, transactions: invoiceTransactions, total }) => {
              const progress = card.limit > 0 ? Math.min(100, (total / card.limit) * 100) : 0;
              return (
                <article key={card.id} className="rounded-2xl border border-white/8 bg-[#101319] p-4">
                  <button type="button" onClick={() => onSelectCard(card.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{card.name}</p>
                        <p className="mt-1 text-[10px] font-semibold text-sky-200">{invoice.label} {getInvoiceDisplayStatus(invoice.status, invoiceTransactions)}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{invoice.startDate} até {invoice.endDate}. Vence em {invoice.dueDate}</p>
                      </div>
                      <CreditCard size={20} style={{ color: card.color }} />
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="font-mono font-bold text-white">{formatCurrency(total)}</span>
                      <span className="text-slate-500">{invoiceTransactions.length} lançamento{invoiceTransactions.length === 1 ? '' : 's'}</span>
                    </div>
                  </button>
                </article>
              );
            })}
          </section>
        </>
      ) : null}

      {selectedCard && selectedInvoice ? (
        <>
          <section className="mt-4 shrink-0 rounded-2xl border border-white/8 bg-[#101319] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Fatura do ciclo</p>
                <p className="mt-1 font-display text-2xl font-bold text-white">{formatCurrency(selectedInvoice.total)}</p>
                <p className="mt-1 text-xs text-slate-500">{selectedInvoice.invoice.startDate} até {selectedInvoice.invoice.endDate}. Vence em {selectedInvoice.invoice.dueDate}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-200">
                  {getInvoiceDisplayStatus(selectedInvoice.invoice.status, selectedInvoice.transactions)}
                </span>
                <CardInvoiceActions
                  card={selectedCard}
                  accounts={accounts}
                  invoiceLabel={selectedInvoice.invoice.label}
                  invoiceTotal={selectedInvoice.total}
                  invoiceTransactions={selectedInvoice.transactions}
                  onPayInvoice={onPayInvoice}
                  onUpdateClosingDay={onUpdateCardClosingDay}
                  onEditCard={onEditCard}
                  onDeleteCard={onDeleteCard}
                />
              </div>
            </div>
          </section>

          <label className="mt-4 flex h-12 shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#101319] px-4 text-slate-400">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar na fatura" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
          </label>

          <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
            {visibleTransactions.map((transaction) => {
              const meta = readTransactionMeta(transaction.notes);
              const expenseNeedLabel = getExpenseNeedLabel(meta.expenseNeed);
              const entryModeLabel = getEntryModeLabel(meta.entryMode);
              return (
                <article key={transaction.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#101319] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <CreditCard size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{transaction.description}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {getCategoryName(categories, transaction.categoryId)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getEntryModeTagClass(meta.entryMode)}`}>{entryModeLabel}</span>
                      {expenseNeedLabel ? <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getExpenseNeedTagClass(meta.expenseNeed)}`}>{expenseNeedLabel}</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-rose-300">-{formatCurrency(transaction.amount)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{transaction.date.slice(8, 10)}/{transaction.date.slice(5, 7)}</p>
                    <div className="mt-2 flex justify-end gap-1">
                      <button type="button" onClick={() => onEditTransaction(transaction)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300" title="Editar lançamento">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => onDeleteTransaction(transaction)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300" title="Excluir lançamento">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      ) : null}
    </div>
  );
}
