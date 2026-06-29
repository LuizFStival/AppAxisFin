import type { Account, Card, Transaction } from '../../types';
import { formatLocalDate, parseLocalDate } from './date';
import { getReimbursementDueDate } from './reimbursements';
import { readTransactionMeta } from './transactionMeta';

export interface CashForecastEvent {
  id: string;
  date: string;
  description: string;
  amount: number;
  kind: 'income' | 'fixed-expense' | 'reimbursement';
  overdue: boolean;
}

export interface CashForecast {
  currentBalance: number;
  projectedBalance: number;
  pendingIncome: number;
  pendingReimbursements: number;
  pendingFixedExpenses: number;
  events: CashForecastEvent[];
  endDate: string;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addDays(value: string, days: number) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function calculateCashForecast(
  accounts: Account[],
  cards: Card[],
  transactions: Transaction[],
  today: string,
  days = 30,
  includeReimbursements = true,
): CashForecast {
  const endDate = addDays(today, days);
  const events: CashForecastEvent[] = [];

  transactions.forEach((transaction) => {
    if (transaction.flow === 'income' && transaction.status === 'pending') {
      const eventDate = transaction.date < today ? today : transaction.date;
      if (eventDate <= endDate) {
        events.push({
          id: `income:${transaction.id}`,
          date: eventDate,
          description: transaction.description,
          amount: transaction.amount,
          kind: 'income',
          overdue: transaction.date < today,
        });
      }
      return;
    }

    if (includeReimbursements && transaction.isReimbursable && transaction.reimbursementStatus !== 'received') {
      const dueDate = getReimbursementDueDate(transaction, cards) ?? transaction.date;
      const eventDate = dueDate < today ? today : dueDate;
      if (eventDate <= endDate) {
        events.push({
          id: `reimbursement:${transaction.id}`,
          date: eventDate,
          description: transaction.description,
          amount: transaction.amount,
          kind: 'reimbursement',
          overdue: dueDate < today,
        });
      }
      return;
    }

    const meta = readTransactionMeta(transaction.notes);
    const isFixed = meta.entryMode === 'fixed' || Boolean(transaction.recurringTransactionId);
    if (
      transaction.flow === 'expense'
      && transaction.status === 'pending'
      && !transaction.cardId
      && isFixed
    ) {
      const eventDate = transaction.date < today ? today : transaction.date;
      if (eventDate <= endDate) {
        events.push({
          id: `fixed:${transaction.id}`,
          date: eventDate,
          description: transaction.description,
          amount: -transaction.amount,
          kind: 'fixed-expense',
          overdue: transaction.date < today,
        });
      }
    }
  });

  events.sort((left, right) => left.date.localeCompare(right.date) || left.description.localeCompare(right.description));
  const currentBalance = roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0));
  const pendingIncome = roundMoney(events.filter((event) => event.kind === 'income').reduce((sum, event) => sum + event.amount, 0));
  const pendingReimbursements = roundMoney(events.filter((event) => event.kind === 'reimbursement').reduce((sum, event) => sum + event.amount, 0));
  const pendingFixedExpenses = roundMoney(Math.abs(events.filter((event) => event.kind === 'fixed-expense').reduce((sum, event) => sum + event.amount, 0)));

  return {
    currentBalance,
    projectedBalance: roundMoney(currentBalance + pendingIncome + pendingReimbursements - pendingFixedExpenses),
    pendingIncome,
    pendingReimbursements,
    pendingFixedExpenses,
    events,
    endDate,
  };
}
