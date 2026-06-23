import { Transaction } from '../../types';
import { readTransactionMeta } from './transactionMeta';

export type ExpenseViewFilter =
  | 'all'
  | 'personal'
  | 'others'
  | 'variable'
  | 'fixed'
  | 'installment'
  | 'essential'
  | 'superfluous';

export const expenseViewFilterOptions: Array<{ id: ExpenseViewFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'personal', label: 'Meu gasto' },
  { id: 'others', label: 'Dos outros' },
  { id: 'variable', label: 'Variáveis' },
  { id: 'fixed', label: 'Fixas' },
  { id: 'installment', label: 'Parceladas' },
  { id: 'essential', label: 'Essenciais' },
  { id: 'superfluous', label: 'Supérfluas' },
];

export function matchesExpenseViewFilter(transaction: Transaction, filter: ExpenseViewFilter): boolean {
  if (filter === 'all') return true;
  if (transaction.flow !== 'expense') return false;
  if (filter === 'others') return Boolean(transaction.isReimbursable);
  if (filter === 'personal') return !transaction.isReimbursable;
  if (transaction.isReimbursable) return false;

  const meta = readTransactionMeta(transaction.notes);
  if (filter === 'essential' || filter === 'superfluous') return meta.expenseNeed === filter;
  return (meta.entryMode ?? 'variable') === filter;
}
