import type { AppNotification, Card, Transaction } from '../../types';
import { getCardInvoiceInfo, getCardInvoiceInfoForPeriod } from './cardInvoices';
import { formatCurrency, getExpenseSignedAmount, isCardInvoicePaid } from './finance';
import { parseLocalDate } from './date';
import { getReimbursementDueDate, isReimbursementOverdue } from './reimbursements';

export type NotificationCandidate = Omit<AppNotification, 'id' | 'readAt' | 'createdAt'>;
export type NotificationCandidateWithReadState = NotificationCandidate & Pick<AppNotification, 'readAt'>;

export function preserveNotificationReadState(
  candidates: NotificationCandidate[],
  existing: Pick<AppNotification, 'sourceKey' | 'readAt'>[],
): NotificationCandidateWithReadState[] {
  const readAtBySourceKey = new Map(existing.map((notification) => [notification.sourceKey, notification.readAt]));
  return candidates.map((candidate) => ({
    ...candidate,
    readAt: readAtBySourceKey.get(candidate.sourceKey),
  }));
}

function differenceInDays(date: string, today: string) {
  return Math.round((parseLocalDate(date).getTime() - parseLocalDate(today).getTime()) / 86_400_000);
}

export function buildOperationalNotifications(
  transactions: Transaction[],
  cards: Card[],
  today: string,
  includeReimbursements = true,
): NotificationCandidate[] {
  const notifications: NotificationCandidate[] = [];

  transactions.forEach((transaction) => {
    if (
      transaction.flow !== 'expense'
      || transaction.status !== 'pending'
      || transaction.cardId
      || transaction.isReimbursable
    ) return;

    const days = differenceInDays(transaction.date, today);
    if (days > 3) return;
    const overdue = days < 0;
    notifications.push({
      sourceKey: `due:${transaction.id}`,
      title: overdue ? 'Despesa atrasada' : days === 0 ? 'Despesa vence hoje' : 'Despesa próxima do vencimento',
      body: `${transaction.description} · ${formatCurrency(transaction.amount)}`,
      type: overdue ? 'danger' : 'warning',
      scheduledFor: transaction.date,
      actionView: 'transactions',
    });
  });

  const invoiceGroups = new Map<string, { card: Card; period: string; transactions: Transaction[] }>();
  transactions.forEach((transaction) => {
    if (transaction.flow !== 'expense' || !transaction.cardId) return;
    const card = cards.find((candidate) => candidate.id === transaction.cardId);
    if (!card) return;
    const period = getCardInvoiceInfo(card, transaction.date, today).period;
    const key = `${card.id}:${period}`;
    const group = invoiceGroups.get(key) ?? { card, period, transactions: [] };
    group.transactions.push(transaction);
    invoiceGroups.set(key, group);
  });

  invoiceGroups.forEach(({ card, period, transactions: invoiceTransactions }) => {
    if (isCardInvoicePaid(invoiceTransactions)) return;
    const total = invoiceTransactions.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0);
    if (total <= 0) return;
    const invoice = getCardInvoiceInfoForPeriod(card, period, today);
    const days = differenceInDays(invoice.dueDate, today);
    if (days > 7) return;
    const overdue = days < 0;
    notifications.push({
      sourceKey: `invoice:${card.id}:${period}`,
      title: overdue ? `Fatura ${card.name} vencida` : days === 0 ? `Fatura ${card.name} vence hoje` : `Fatura ${card.name} vence em breve`,
      body: `${formatCurrency(total)} · vencimento ${invoice.dueDate.split('-').reverse().join('/')}`,
      type: overdue ? 'danger' : 'warning',
      scheduledFor: invoice.dueDate,
      actionView: 'cards',
    });
  });

  if (includeReimbursements) transactions.forEach((transaction) => {
    if (!transaction.isReimbursable || !isReimbursementOverdue(transaction, cards, today)) return;
    const dueDate = getReimbursementDueDate(transaction, cards);
    notifications.push({
      sourceKey: `reimbursement:${transaction.id}`,
      title: 'Reembolso atrasado',
      body: `${transaction.description} · ${formatCurrency(transaction.amount)}`,
      type: 'danger',
      scheduledFor: dueDate ?? transaction.date,
      actionView: 'reimbursements',
    });
  });

  return notifications.sort((left, right) => {
    if (left.type !== right.type) return left.type === 'danger' ? -1 : 1;
    return (left.scheduledFor ?? '').localeCompare(right.scheduledFor ?? '');
  });
}
