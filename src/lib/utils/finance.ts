import { Account, Card, Category, DashboardSummary, Transaction } from '../../types';
import { getCardInvoiceClosingMonth } from './cardInvoices';

export const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function shiftMonthKey(month: string, offset: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  return Array.from(new Set(transactions.map((transaction) => getMonthKey(transaction.date))))
    .sort()
    .reverse();
}

export function getFinancialMonthKey(transaction: Transaction, cards: Card[]): string {
  if (!transaction.cardId) return getMonthKey(transaction.date);
  const card = cards.find((item) => item.id === transaction.cardId);
  return card ? getCardInvoiceClosingMonth(card, transaction.date) : getMonthKey(transaction.date);
}

export function getCategoryName(categories: Category[], categoryId?: string): string {
  if (!categoryId) return 'Transferência';
  return categories.find((category) => category.id === categoryId)?.name ?? 'Outros';
}

export function getPaymentSource(accounts: Account[], cards: Card[], transaction: Transaction): string {
  if (transaction.cardId) return cards.find((card) => card.id === transaction.cardId)?.name ?? 'Cartão';
  if (transaction.accountId) return accounts.find((account) => account.id === transaction.accountId)?.name ?? 'Conta';
  if (transaction.fromAccountId && transaction.toAccountId) {
    const from = accounts.find((account) => account.id === transaction.fromAccountId)?.name ?? 'Origem';
    const to = accounts.find((account) => account.id === transaction.toAccountId)?.name ?? 'Destino';
    return `${from} -> ${to}`;
  }
  return 'Sem origem';
}

export function summarizeDashboard(accounts: Account[], cards: Card[], transactions: Transaction[], month: string): DashboardSummary {
  const monthTransactions = transactions.filter((transaction) => getFinancialMonthKey(transaction, cards) === month);
  const incomeTransactions = monthTransactions.filter((transaction) => transaction.flow === 'income');
  const expenseTransactions = monthTransactions.filter((transaction) => transaction.flow === 'expense');

  const income = roundMoney(incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
  const expenses = roundMoney(expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
  const received = roundMoney(incomeTransactions
    .filter((transaction) => transaction.status === 'paid')
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const paid = roundMoney(expenseTransactions
    .filter((transaction) => transaction.status === 'paid' && !transaction.cardId)
    .reduce((sum, transaction) => sum + transaction.amount, 0));

  return {
    currentBalance: roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0)),
    income,
    expenses,
    received,
    paid,
    pendingIncome: roundMoney(income - received),
    pendingExpenses: roundMoney(expenses - paid),
  };
}

export function expensesByCategory(transactions: Transaction[], cards: Card[], categories: Category[], month: string) {
  const totals = new Map<string, { name: string; value: number; color: string }>();

  transactions
    .filter((transaction) => transaction.flow === 'expense' && getFinancialMonthKey(transaction, cards) === month)
    .forEach((transaction) => {
      const category = categories.find((item) => item.id === transaction.categoryId);
      const key = category?.id ?? 'other';
      const current = totals.get(key) ?? {
        name: category?.name ?? 'Outros',
        value: 0,
        color: category?.color ?? '#64748B',
      };

      totals.set(key, { ...current, value: roundMoney(current.value + transaction.amount) });
    });

  return Array.from(totals.values()).sort((a, b) => b.value - a.value);
}
