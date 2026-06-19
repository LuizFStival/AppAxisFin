import { ExpenseEntryMode, Transaction } from '../../types';
import { getExpenseSignedAmount, isInvoiceCredit } from './finance';
import { readTransactionMeta } from './transactionMeta';

export type ExpenseBreakdownKey = ExpenseEntryMode;

export interface ExpenseBreakdownItem {
  key: ExpenseBreakdownKey;
  label: string;
  shortLabel: string;
  total: number;
  count: number;
  className: string;
}

const breakdownConfig: Array<Omit<ExpenseBreakdownItem, 'total' | 'count'>> = [
  {
    key: 'installment',
    label: 'Parcelas',
    shortLabel: 'Parc.',
    className: 'border-violet-400/20 bg-violet-500/10 text-violet-100',
  },
  {
    key: 'fixed',
    label: 'Fixas',
    shortLabel: 'Fixas',
    className: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  },
  {
    key: 'variable',
    label: 'Variáveis',
    shortLabel: 'Var.',
    className: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  },
];

export function summarizeExpenseBreakdown(transactions: Transaction[]): ExpenseBreakdownItem[] {
  const initialTotals = new Map<ExpenseBreakdownKey, { total: number; count: number }>(
    breakdownConfig.map((item) => [item.key, { total: 0, count: 0 }]),
  );

  transactions
    .filter((transaction) => transaction.flow === 'expense')
    .filter((transaction) => !isInvoiceCredit(transaction))
    .forEach((transaction) => {
      const meta = readTransactionMeta(transaction.notes);
      const key = meta.entryMode ?? 'variable';
      const current = initialTotals.get(key) ?? { total: 0, count: 0 };

      initialTotals.set(key, {
        total: current.total + getExpenseSignedAmount(transaction),
        count: current.count + 1,
      });
    });

  return breakdownConfig.map((item) => ({
    ...item,
    total: initialTotals.get(item.key)?.total ?? 0,
    count: initialTotals.get(item.key)?.count ?? 0,
  }));
}
