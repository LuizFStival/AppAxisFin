import assert from 'node:assert/strict';
import type { Transaction } from '../../types';
import { getBudgetAlertLevel, getPersonalCategorySpending } from './budgets';

assert.equal(getBudgetAlertLevel(69.9), 'safe');
assert.equal(getBudgetAlertLevel(70), 'warning-70');
assert.equal(getBudgetAlertLevel(90), 'warning-90');
assert.equal(getBudgetAlertLevel(100), 'limit-100');

const transactions: Transaction[] = [
  { id: 'personal', description: 'Mercado', amount: 200, flow: 'expense', status: 'paid', date: '2026-06-10', categoryId: 'food' },
  { id: 'third-party', description: 'Reembolso', amount: 500, flow: 'expense', status: 'paid', date: '2026-06-11', categoryId: 'food', isReimbursable: true },
  { id: 'previous', description: 'Mercado anterior', amount: 100, flow: 'expense', status: 'paid', date: '2026-05-10', categoryId: 'food' },
];

assert.equal(getPersonalCategorySpending(transactions, '2026-06').get('food'), 200);
assert.equal(getPersonalCategorySpending(transactions, '2026-05').get('food'), 100);

console.log('budget tests passed');
