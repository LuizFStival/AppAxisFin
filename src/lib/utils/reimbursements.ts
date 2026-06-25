import { Card, Transaction } from '../../types';
import { getCardInvoiceInfo } from './cardInvoices';
import { getMonthKey } from './finance';

export function getReimbursementDueDate(transaction: Transaction, cards: Card[]): string | undefined {
  if (!transaction.cardId) return undefined;
  const card = cards.find((item) => item.id === transaction.cardId);
  return card ? getCardInvoiceInfo(card, transaction.date).dueDate : undefined;
}

export function getReimbursementMonthKey(transaction: Transaction, cards: Card[]): string {
  if (!transaction.cardId) return getMonthKey(transaction.date);
  const card = cards.find((item) => item.id === transaction.cardId);
  return card ? getCardInvoiceInfo(card, transaction.date).period : getMonthKey(transaction.date);
}

export function isReimbursementOverdue(transaction: Transaction, cards: Card[], today: string): boolean {
  if (transaction.reimbursementStatus === 'received') return false;
  const dueDate = getReimbursementDueDate(transaction, cards);
  if (dueDate) return dueDate < today;
  return getMonthKey(transaction.date) < getMonthKey(today);
}
