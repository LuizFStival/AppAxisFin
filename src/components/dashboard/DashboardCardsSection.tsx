import { CreditCard, Plus } from 'lucide-react';
import { Account, Card, Transaction } from '../../types';
import { formatCurrency, getExpenseSignedAmount, isCardInvoicePaid } from '../../lib/utils/finance';
import { getCardInvoiceInfo, getCardInvoiceInfoForClosingMonth } from '../../lib/utils/cardInvoices';
import { formatDatePtBr, formatLocalDate } from '../../lib/utils/date';
import { CardInvoiceActions } from '../cards/CardInvoiceActions';
import { CardPhysicalPreview, getNetworkLabel } from '../cards/CardPhysicalPreview';

interface DashboardCardsSectionProps {
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  activeMonth: string;
  showBalances: boolean;
  onAddCard: () => void;
  onViewCards: (cardId?: string) => void;
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

function hiddenMoney(show: boolean, value: number) {
  return show ? formatCurrency(value) : 'R$ *****';
}

function getInvoiceSummary(card: Card, transactions: Transaction[], closingMonth: string) {
  const openInvoice = getCardInvoiceInfoForClosingMonth(card, closingMonth, formatLocalDate(new Date()));
  const invoiceTransactions = transactions.filter((transaction) => {
    if (transaction.flow !== 'expense' || transaction.cardId !== card.id) return false;
    return getCardInvoiceInfo(card, transaction.date).endDate.slice(0, 7) === closingMonth;
  });
  const total = invoiceTransactions.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0);

  return {
    ...openInvoice,
    total,
    transactions: invoiceTransactions,
    transactionCount: invoiceTransactions.length,
  };
}

function getInvoiceStatusLabel(status: 'aberta' | 'fechada' | 'vencida') {
  return status === 'aberta' ? 'Aberta' : status === 'fechada' ? 'Fechada' : 'Vencida';
}

function getInvoiceDisplayStatus(status: 'aberta' | 'fechada' | 'vencida', invoiceTransactions: Transaction[]) {
  if (isCardInvoicePaid(invoiceTransactions)) return 'Paga';

  return getInvoiceStatusLabel(status);
}

function getInvoiceStatusClass(displayStatus: string) {
  if (displayStatus === 'Paga') return 'border-emerald-400/25 bg-emerald-500/15 text-emerald-200';
  if (displayStatus === 'Vencida') return 'border-rose-400/25 bg-rose-500/15 text-rose-200';
  if (displayStatus === 'Fechada') return 'border-amber-400/25 bg-amber-500/15 text-amber-200';
  return 'border-sky-400/25 bg-sky-500/15 text-sky-200';
}

export function DashboardCardsSection({
  accounts,
  cards,
  transactions,
  activeMonth,
  showBalances,
  onAddCard,
  onViewCards,
  onPayInvoice,
  onUpdateCardClosingDay,
  onEditCard,
  onDeleteCard,
}: DashboardCardsSectionProps) {
  const invoiceSummaries = cards.map((card) => ({ card, invoice: getInvoiceSummary(card, transactions, activeMonth) }));
  const activeInvoiceSummaries = invoiceSummaries.filter(({ invoice }) => invoice.transactionCount > 0);
  const upcomingInvoiceTotal = activeInvoiceSummaries.reduce(
    (sum, { invoice }) => sum + (isCardInvoicePaid(invoice.transactions) ? 0 : invoice.total),
    0,
  );

  return (
    <section className="app-page-gutters">
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <button type="button" onClick={() => onViewCards()} className="font-display text-base font-semibold tracking-tight text-white">
            Cartões do mês
          </button>
          <p className="mt-0.5 text-[10px] text-gray-500">
            {hiddenMoney(showBalances, upcomingInvoiceTotal)} em faturas ativas
          </p>
        </div>
        <button
          type="button"
          onClick={onAddCard}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-200 transition hover:bg-white hover:text-black"
          title="Adicionar cartão"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {activeInvoiceSummaries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-5 text-center">
          <CreditCard size={22} className="mx-auto mb-2 text-gray-600" />
          <p className="text-sm font-semibold text-gray-300">Nenhum cartão cadastrado</p>
          <p className="mt-1 text-xs text-gray-500">Seus cartões reais vão aparecer aqui quando forem adicionados.</p>
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-[repeat(auto-fit,minmax(380px,1fr))]">
          {activeInvoiceSummaries.map(({ card, invoice }) => {
            const progress = card.limit > 0 ? Math.min(100, (invoice.total / card.limit) * 100) : 0;
            const displayStatus = getInvoiceDisplayStatus(invoice.status, invoice.transactions);
            const statusClass = getInvoiceStatusClass(displayStatus);

            return (
              <article
                key={card.id}
                className="cosmic-card cosmic-card-hover relative w-full overflow-hidden rounded-3xl border p-4"
                style={{
                  borderColor: `${card.color}55`,
                  backgroundImage: `linear-gradient(135deg, ${card.color}18, transparent 55%)`,
                }}
              >
                <button type="button" onClick={() => onViewCards(card.id)} className="w-full text-left">
                  <CardPhysicalPreview
                    card={card}
                    displayStatus={displayStatus}
                    invoiceLabel={invoice.label}
                    total={invoice.total}
                    totalDisplay={hiddenMoney(showBalances, invoice.total)}
                  />

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-400">
                      <CreditCard size={14} style={{ color: card.color }} />
                      <span className="truncate">{getNetworkLabel(card.network)} crédito</span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass}`}>
                      {displayStatus}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
                    <span className="text-[10px] leading-relaxed text-slate-500">
                      Ciclo {formatDatePtBr(invoice.startDate)}-{formatDatePtBr(invoice.endDate)}
                    </span>
                    <span className="text-right">
                      <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-500">Vencimento</span>
                      <span className={`mt-0.5 block font-mono text-xs font-bold ${displayStatus === 'Vencida' ? 'text-rose-300' : 'text-white'}`}>
                        {formatDatePtBr(invoice.dueDate)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: card.color }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="font-mono font-bold text-white">{hiddenMoney(showBalances, invoice.total)}</span>
                    <span className="text-slate-500">{invoice.transactionCount} lançamento{invoice.transactionCount === 1 ? '' : 's'}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Limite {hiddenMoney(showBalances, card.limit)}</p>
                </button>

                <div className="mt-3 flex justify-end gap-2 border-t border-white/8 pt-3">
                  <CardInvoiceActions
                    card={card}
                    accounts={accounts}
                    invoiceLabel={invoice.label}
                    invoiceTotal={invoice.total}
                    invoiceTransactions={invoice.transactions}
                    onPayInvoice={onPayInvoice}
                    onUpdateClosingDay={onUpdateCardClosingDay}
                    onEditCard={onEditCard}
                    onDeleteCard={onDeleteCard}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
