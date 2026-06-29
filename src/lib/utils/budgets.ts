import type { Transaction } from '../../types';
import { getExpenseSignedAmount, getFinancialMonthKey, isThirdPartyExpense } from './finance';

export type BudgetAlertLevel = 'safe' | 'warning-70' | 'warning-90' | 'limit-100';

export function getBudgetAlertLevel(percent: number): BudgetAlertLevel {
  if (percent >= 100) return 'limit-100';
  if (percent >= 90) return 'warning-90';
  if (percent >= 70) return 'warning-70';
  return 'safe';
}

export function getPersonalCategorySpending(transactions: Transaction[], period: string) {
  const totals = new Map<string, number>();
  transactions.forEach((transaction) => {
    if (
      transaction.flow !== 'expense'
      || !transaction.categoryId
      || isThirdPartyExpense(transaction)
      || getFinancialMonthKey(transaction) !== period
    ) return;
    totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + getExpenseSignedAmount(transaction));
  });
  return totals;
}
