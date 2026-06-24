import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, CreditCard, GripVertical, Pencil, Trash2, UserRound } from 'lucide-react';
import { Account, Card, Category, ReimbursementPerson, Transaction } from '../../types';
import { formatCurrency, getCategoryName, getExpenseSignedAmount, isCardInvoicePaid, isInvoiceCredit } from '../../lib/utils/finance';
import { getCardInvoiceInfo, getCardInvoiceInfoForClosingMonth } from '../../lib/utils/cardInvoices';
import { formatDatePtBr, formatLocalDate, formatShortDatePtBr } from '../../lib/utils/date';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { summarizeExpenseBreakdown } from '../../lib/utils/expenseBreakdown';
import { ExpenseViewFilter, matchesExpenseViewFilter } from '../../lib/utils/expenseFilters';
import { CardInvoiceActions } from './CardInvoiceActions';
import { ExpenseFilterChips } from '../shared/ExpenseFilterChips';
import { CollapsibleSearch } from '../shared/CollapsibleSearch';
import { MonthNavigator } from '../shared/MonthNavigator';

interface CardsViewProps {
  cards: Card[];
  accounts: Account[];
  categories: Category[];
  reimbursementPeople: ReimbursementPerson[];
  transactions: Transaction[];
  selectedCardId: string;
  activeMonth: string;
  onSelectCard: (cardId: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onReorderInvoiceTransactions: (transactions: Transaction[]) => Promise<void>;
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
    .sort(compareInvoiceTransactions);
}

function getInvoiceStatusLabel(status: 'aberta' | 'fechada' | 'vencida') {
  return status === 'aberta' ? 'Aberta' : status === 'fechada' ? 'Fechada' : 'Vencida';
}

function getInvoiceDisplayStatus(status: 'aberta' | 'fechada' | 'vencida', invoiceTransactions: Transaction[]) {
  if (isCardInvoicePaid(invoiceTransactions)) return 'Paga';

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

function getReimbursementPersonName(people: ReimbursementPerson[], personId?: string) {
  return people.find((person) => person.id === personId)?.name ?? 'Pessoa removida';
}

function getInvoiceSortOrder(transaction: Transaction) {
  const order = readTransactionMeta(transaction.notes).invoiceSortOrder;
  return typeof order === 'number' && Number.isFinite(order) ? order : undefined;
}

function compareInvoiceTransactions(left: Transaction, right: Transaction) {
  const leftOrder = getInvoiceSortOrder(left);
  const rightOrder = getInvoiceSortOrder(right);
  const createdOrder = (left.createdAt ?? '').localeCompare(right.createdAt ?? '')
    || left.id.localeCompare(right.id);

  if (leftOrder !== undefined || rightOrder !== undefined) {
    return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER)
      || left.date.localeCompare(right.date)
      || createdOrder;
  }

  return left.date.localeCompare(right.date)
    || createdOrder;
}

export function CardsView({
  cards,
  accounts,
  categories,
  reimbursementPeople,
  transactions,
  selectedCardId,
  activeMonth,
  onSelectCard,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onEditTransaction,
  onDeleteTransaction,
  onReorderInvoiceTransactions,
  onPayInvoice,
  onUpdateCardClosingDay,
  onEditCard,
  onDeleteCard,
}: CardsViewProps) {
  const [search, setSearch] = useState('');
  const [expenseFilter, setExpenseFilter] = useState<ExpenseViewFilter>('all');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [draggedTransactionId, setDraggedTransactionId] = useState<string | null>(null);
  const [dragTargetTransactionId, setDragTargetTransactionId] = useState<string | null>(null);
  const pointerDragRef = useRef({
    transactionId: '',
    pointerId: -1,
    startX: 0,
    startY: 0,
    hasMoved: false,
  });
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const invoices = useMemo(() => {
    return cards.map((card) => {
      const invoice = getCardInvoiceInfoForClosingMonth(card, activeMonth, formatLocalDate(new Date()));
      const invoiceTransactions = getInvoiceTransactions(card, transactions, activeMonth);
      const total = invoiceTransactions.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0);
      const invoiceCreditTotal = invoiceTransactions
        .filter((transaction) => isInvoiceCredit(transaction))
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const reimbursementTotal = invoiceTransactions
        .filter((transaction) => transaction.isReimbursable)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const personalTransactions = invoiceTransactions.filter((transaction) => !transaction.isReimbursable);
      const reimbursementTransactions = invoiceTransactions.filter((transaction) => transaction.isReimbursable);
      const personalTotal = personalTransactions.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0);
      const personalBreakdown = summarizeExpenseBreakdown(personalTransactions.filter((transaction) => !isInvoiceCredit(transaction)));
      const reimbursementBreakdown = summarizeExpenseBreakdown(reimbursementTransactions);

      return {
        card,
        invoice,
        transactions: invoiceTransactions,
        total,
        invoiceCreditTotal,
        reimbursementTotal,
        personalTotal,
        personalBreakdown,
        reimbursementBreakdown,
      };
    });
  }, [activeMonth, cards, transactions]);
  const selectedInvoice = selectedCard
    ? invoices.find((item) => item.card.id === selectedCard.id)
    : null;
  const visibleTransactions = (selectedInvoice?.transactions ?? [])
    .filter((transaction) => matchesExpenseViewFilter(transaction, expenseFilter))
    .filter((transaction) => transaction.description.toLowerCase().includes(search.toLowerCase()));
  const totalAllCards = invoices.reduce((sum, item) => sum + item.total, 0);

  useEffect(() => {
    setIsBreakdownOpen(false);
  }, [activeMonth, selectedCardId]);

  function resetDragState() {
    setDraggedTransactionId(null);
    setDragTargetTransactionId(null);
    pointerDragRef.current = {
      transactionId: '',
      pointerId: -1,
      startX: 0,
      startY: 0,
      hasMoved: false,
    };
  }

  async function reorderInvoiceTransaction(draggedId: string, targetId: string) {
    if (!selectedInvoice || draggedId === targetId) return;

    const currentIndex = selectedInvoice.transactions.findIndex((item) => item.id === draggedId);
    const targetIndex = selectedInvoice.transactions.findIndex((item) => item.id === targetId);
    if (currentIndex < 0 || targetIndex < 0) return;

    const reordered = [...selectedInvoice.transactions];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    await onReorderInvoiceTransactions(reordered);
  }

  function getTransactionIdFromPoint(clientX: number, clientY: number, ignoredId?: string) {
    const element = document.elementFromPoint(clientX, clientY);
    const directTargetId = element?.closest<HTMLElement>('[data-invoice-transaction-id]')?.dataset.invoiceTransactionId;
    if (directTargetId && directTargetId !== ignoredId) return directTargetId;

    const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-invoice-transaction-id]'));
    const target = candidates.find((candidate) => {
      if (candidate.dataset.invoiceTransactionId === ignoredId) return false;
      const rect = candidate.getBoundingClientRect();
      return clientY >= rect.top && clientY <= rect.bottom;
    });

    if (target?.dataset.invoiceTransactionId) return target.dataset.invoiceTransactionId;

    const closest = candidates
      .filter((candidate) => candidate.dataset.invoiceTransactionId !== ignoredId)
      .map((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        return { id: candidate.dataset.invoiceTransactionId, distance: Math.abs(clientY - centerY) };
      })
      .filter((item): item is { id: string; distance: number } => Boolean(item.id))
      .sort((left, right) => left.distance - right.distance)[0];

    return closest?.id ?? null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>, transaction: Transaction) {
    if (transaction.isProjected || event.button !== 0) return;

    pointerDragRef.current = {
      transactionId: transaction.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers may release capture during scroll/gesture negotiation.
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const dragState = pointerDragRef.current;
    if (!dragState.transactionId || dragState.pointerId !== event.pointerId) return;

    const deltaX = Math.abs(event.clientX - dragState.startX);
    const deltaY = Math.abs(event.clientY - dragState.startY);
    if (!dragState.hasMoved && Math.max(deltaX, deltaY) < 10) return;

    dragState.hasMoved = true;
    setDraggedTransactionId(dragState.transactionId);
    setDragTargetTransactionId(getTransactionIdFromPoint(event.clientX, event.clientY, dragState.transactionId));
    event.preventDefault();
  }

  async function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const dragState = pointerDragRef.current;
    if (!dragState.transactionId || dragState.pointerId !== event.pointerId) return;

    const draggedId = dragState.transactionId;
    const targetId = dragState.hasMoved ? getTransactionIdFromPoint(event.clientX, event.clientY, draggedId) : null;
    resetDragState();
    if (targetId) await reorderInvoiceTransaction(draggedId, targetId);
  }

  function handlePointerCancel() {
    resetDragState();
  }

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

        <MonthNavigator month={activeMonth} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} onCurrentMonth={onCurrentMonth} className="mt-5" />
      </header>

      {!selectedCard ? (
        <>
          <section className="mt-4 shrink-0 rounded-2xl border border-white/8 bg-[#101319] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Faturas que fecham no mês</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{formatCurrency(totalAllCards)}</p>
            <p className="mt-1 text-xs text-slate-500">{invoices.reduce((sum, item) => sum + item.transactions.length, 0)} lançamentos em {cards.length} cartão{cards.length === 1 ? '' : 'ões'}</p>
          </section>

          <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
            {invoices.map(({ card, invoice, transactions: invoiceTransactions, total, reimbursementTotal, invoiceCreditTotal }) => {
              const progress = card.limit > 0 ? Math.max(0, Math.min(100, (total / card.limit) * 100)) : 0;
              return (
                <article key={card.id} className="rounded-2xl border border-white/8 bg-[#101319] p-4">
                  <button type="button" onClick={() => onSelectCard(card.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{card.name}</p>
                        <p className="mt-1 text-[10px] font-semibold text-sky-200">{invoice.label} {getInvoiceDisplayStatus(invoice.status, invoiceTransactions)}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{formatDatePtBr(invoice.startDate)} até {formatDatePtBr(invoice.endDate)}. Vence em {formatDatePtBr(invoice.dueDate)}</p>
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
                    {reimbursementTotal > 0 ? (
                      <p className="mt-1 text-[10px] font-semibold text-amber-200">Reembolsos na fatura: {formatCurrency(reimbursementTotal)}</p>
                    ) : null}
                    {invoiceCreditTotal > 0 ? (
                      <p className="mt-1 text-[10px] font-semibold text-emerald-200">Descontos/estornos: -{formatCurrency(invoiceCreditTotal)}</p>
                    ) : null}
                  </button>
                </article>
              );
            })}
          </section>
        </>
      ) : null}

      {selectedCard && selectedInvoice ? (
        <>
          <section className="mt-3 shrink-0 rounded-2xl border border-white/8 bg-[#101319] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Fatura do ciclo</p>
                <p className="mt-1 font-display text-xl font-bold text-white">{formatCurrency(selectedInvoice.total)}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold">
                  <span className="text-emerald-200">Meu: {formatCurrency(selectedInvoice.personalTotal)}</span>
                  {selectedInvoice.reimbursementTotal > 0 ? (
                    <span className="text-amber-200">Dos outros: {formatCurrency(selectedInvoice.reimbursementTotal)}</span>
                  ) : null}
                  {selectedInvoice.invoiceCreditTotal > 0 ? (
                    <span className="text-emerald-200">Descontos: -{formatCurrency(selectedInvoice.invoiceCreditTotal)}</span>
                  ) : null}
                </div>
                {selectedInvoice.reimbursementTotal > 0 ? (
                  <p className="sr-only">Dos outros: {formatCurrency(selectedInvoice.reimbursementTotal)}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-slate-500">{formatDatePtBr(selectedInvoice.invoice.startDate)} até {formatDatePtBr(selectedInvoice.invoice.endDate)}. Vence em {formatDatePtBr(selectedInvoice.invoice.dueDate)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-200">
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

          <section className="mt-2 shrink-0 rounded-2xl border border-white/8 bg-[#101319] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200">Meu gasto</p>
                <p className="mt-0.5 truncate font-mono text-sm font-bold text-white">{formatCurrency(selectedInvoice.personalTotal)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBreakdownOpen((current) => !current)}
                className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white/5 px-2 text-[11px] font-bold text-slate-200 transition hover:bg-white/10"
                title={isBreakdownOpen ? 'Recolher detalhes' : 'Mostrar detalhes'}
              >
                Detalhes
                {isBreakdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {isBreakdownOpen ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200">Meu gasto</p>
                    <p className="font-mono text-xs font-bold text-emerald-200">{formatCurrency(selectedInvoice.personalTotal)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedInvoice.personalBreakdown.map((item) => (
                      <div key={item.key} className={`rounded-xl border px-2 py-2 ${item.className}`}>
                        <p className="text-[9px] font-semibold uppercase tracking-widest opacity-80">{item.shortLabel}</p>
                        <p className="mt-1 font-mono text-xs font-bold">{formatCurrency(item.total)}</p>
                        <p className="mt-0.5 text-[9px] opacity-70">{item.count} lançamento{item.count === 1 ? '' : 's'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedInvoice.reimbursementTotal > 0 ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200">Dos outros</p>
                      <p className="font-mono text-xs font-bold text-amber-200">{formatCurrency(selectedInvoice.reimbursementTotal)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedInvoice.reimbursementBreakdown.map((item) => (
                        <div key={item.key} className={`rounded-xl border px-2 py-2 ${item.className}`}>
                          <p className="text-[9px] font-semibold uppercase tracking-widest opacity-80">{item.shortLabel}</p>
                          <p className="mt-1 font-mono text-xs font-bold">{formatCurrency(item.total)}</p>
                          <p className="mt-0.5 text-[9px] opacity-70">{item.count} lançamento{item.count === 1 ? '' : 's'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="relative mt-3 flex h-10 min-w-0 shrink-0 items-start gap-2">
            <ExpenseFilterChips value={expenseFilter} onChange={setExpenseFilter} className="w-0 flex-1" />
            <CollapsibleSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar na fatura"
              expandedClassName="absolute inset-0 z-10"
            />
          </div>

          <section className="no-scrollbar mt-3 min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-y-contain pb-4">
            {visibleTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#101319] p-6 text-center">
                <p className="text-sm font-bold text-white">Nenhuma despesa neste filtro</p>
                <p className="mt-1 text-xs text-slate-500">Escolha outro tipo ou limpe a busca da fatura.</p>
              </div>
            ) : visibleTransactions.map((transaction) => {
              const meta = readTransactionMeta(transaction.notes);
              const isCredit = isInvoiceCredit(transaction);
              const expenseNeedLabel = transaction.isReimbursable ? '' : getExpenseNeedLabel(meta.expenseNeed);
              const entryModeLabel = getEntryModeLabel(meta.entryMode);
              const isDragging = draggedTransactionId === transaction.id;
              const isDropTarget = dragTargetTransactionId === transaction.id && draggedTransactionId !== transaction.id;
              return (
                <article
                  key={transaction.id}
                  data-invoice-transaction-id={transaction.id}
                  className={`flex touch-pan-y items-center gap-2 rounded-2xl border px-3 py-2.5 transition ${
                    isDropTarget
                      ? 'border-sky-300 bg-sky-500/15'
                      : isDragging
                        ? 'border-violet-300/50 bg-violet-500/10 opacity-70'
                        : 'border-white/8 bg-[#101319]'
                  }`}
                >
                  <button
                    type="button"
                    disabled={transaction.isProjected}
                    onPointerDown={(event) => handlePointerDown(event, transaction)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(event) => void handlePointerUp(event)}
                    onPointerCancel={handlePointerCancel}
                    className={`flex h-9 w-5 shrink-0 touch-none items-center justify-center rounded-lg text-slate-600 ${
                      transaction.isProjected
                        ? 'cursor-not-allowed opacity-30'
                        : 'cursor-grab hover:bg-white/5 hover:text-slate-300 active:cursor-grabbing'
                    }`}
                    title={transaction.isProjected ? 'Ocorrências projetadas não podem ser reordenadas' : 'Arraste para reordenar'}
                    aria-label={`Reordenar ${transaction.description}`}
                  >
                    <GripVertical size={16} />
                  </button>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <CreditCard size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-white">{transaction.description}</p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {getCategoryName(categories, transaction.categoryId)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getEntryModeTagClass(meta.entryMode)}`}>{entryModeLabel}</span>
                      {isCredit ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-100">Crédito na fatura</span> : null}
                      {expenseNeedLabel ? <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getExpenseNeedTagClass(meta.expenseNeed)}`}>{expenseNeedLabel}</span> : null}
                      {transaction.isReimbursable ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                          <UserRound size={11} />
                          {getReimbursementPersonName(reimbursementPeople, transaction.reimbursementPersonId)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-bold ${isCredit ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {isCredit ? '-' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{formatShortDatePtBr(transaction.date)}</p>
                    <div className="mt-1.5 flex justify-end gap-1">
                      <button type="button" onClick={() => onEditTransaction(transaction)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-300" title="Editar lançamento">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => onDeleteTransaction(transaction)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300" title="Excluir lançamento">
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
