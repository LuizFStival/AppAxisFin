import { Account, Card, Category, DashboardSummary, Transaction } from '../../types';

export const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  return currency.format(value);
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

export function getCategoryName(categories: Category[], categoryId?: string): string {
  if (!categoryId) return 'Transferencia';
  return categories.find((category) => category.id === categoryId)?.name ?? 'Outros';
}

export function getPaymentSource(accounts: Account[], cards: Card[], transaction: Transaction): string {
  if (transaction.cardId) return cards.find((card) => card.id === transaction.cardId)?.name ?? 'Cartao';
  if (transaction.accountId) return accounts.find((account) => account.id === transaction.accountId)?.name ?? 'Conta';
  if (transaction.fromAccountId && transaction.toAccountId) {
    const from = accounts.find((account) => account.id === transaction.fromAccountId)?.name ?? 'Origem';
    const to = accounts.find((account) => account.id === transaction.toAccountId)?.name ?? 'Destino';
    return `${from} -> ${to}`;
  }
  return 'Sem origem';
}

export function summarizeDashboard(accounts: Account[], transactions: Transaction[], month: string): DashboardSummary {
  const monthTransactions = transactions.filter((transaction) => getMonthKey(transaction.date) === month);
  const incomeTransactions = monthTransactions.filter((transaction) => transaction.flow === 'income');
  const expenseTransactions = monthTransactions.filter((transaction) => transaction.flow === 'expense');

  const income = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const received = incomeTransactions
    .filter((transaction) => transaction.status === 'paid')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const paid = expenseTransactions
    .filter((transaction) => transaction.status === 'paid')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    currentBalance: accounts.reduce((sum, account) => sum + account.balance, 0),
    income,
    expenses,
    received,
    paid,
    pendingIncome: income - received,
    pendingExpenses: expenses - paid,
  };
}

export function expensesByCategory(transactions: Transaction[], categories: Category[], month: string) {
  const totals = new Map<string, { name: string; value: number; color: string }>();

  transactions
    .filter((transaction) => transaction.flow === 'expense' && getMonthKey(transaction.date) === month)
    .forEach((transaction) => {
      const category = categories.find((item) => item.id === transaction.categoryId);
      const key = category?.id ?? 'other';
      const current = totals.get(key) ?? {
        name: category?.name ?? 'Outros',
        value: 0,
        color: category?.color ?? '#64748B',
      };

      totals.set(key, { ...current, value: current.value + transaction.amount });
    });

  return Array.from(totals.values()).sort((a, b) => b.value - a.value);
}
