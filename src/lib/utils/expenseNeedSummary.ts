import type { Transaction } from '../../types';
import { getPersonalExpenseSignedAmount, isInvoiceCredit, isInvoicePayment, roundMoney } from './finance';
import type { ExpenseNeedBucket } from './expenseNeed';
import { getExpenseNeedLabel } from './expenseNeed';
import { readTransactionMeta } from './transactionMeta';

export interface ExpenseNeedSummaryItem {
  key: ExpenseNeedBucket;
  label: string;
  total: number;
  count: number;
  percent: number;
}

const expenseNeedOrder: ExpenseNeedBucket[] = ['essential', 'durable', 'superfluous', 'unclassified'];

export function summarizeExpenseNeed(
  transactions: Transaction[],
  getAmount: (transaction: Transaction) => number = getPersonalExpenseSignedAmount,
): ExpenseNeedSummaryItem[] {
  const totals = new Map<ExpenseNeedBucket, { total: number; count: number }>(
    expenseNeedOrder.map((key) => [key, { total: 0, count: 0 }]),
  );

  transactions
    .filter((transaction) => transaction.flow === 'expense')
    .filter((transaction) => !isInvoiceCredit(transaction))
    .filter((transaction) => !isInvoicePayment(transaction))
    .forEach((transaction) => {
      const amount = Math.max(0, getAmount(transaction));
      if (amount <= 0) return;

      const key: ExpenseNeedBucket = readTransactionMeta(transaction.notes).expenseNeed ?? 'unclassified';
      const current = totals.get(key) ?? { total: 0, count: 0 };
      totals.set(key, {
        total: roundMoney(current.total + amount),
        count: current.count + 1,
      });
    });

  const totalAmount = roundMoney(Array.from(totals.values()).reduce((sum, item) => sum + item.total, 0));

  return expenseNeedOrder
    .map((key) => {
      const item = totals.get(key) ?? { total: 0, count: 0 };
      return {
        key,
        label: getExpenseNeedLabel(key),
        total: item.total,
        count: item.count,
        percent: totalAmount > 0 ? roundMoney((item.total / totalAmount) * 100) : 0,
      };
    })
    .filter((item) => item.total > 0 || item.count > 0);
}
