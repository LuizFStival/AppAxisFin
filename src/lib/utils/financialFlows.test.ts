import assert from 'node:assert/strict';
import type { Account, Category, Transaction } from '../../types';
import { expensesByCategory, getAccountSignedAmount, getExpenseSignedAmount, summarizeDashboard } from './finance';
import { writeTransactionNotes } from './transactionMeta';

const accounts: Account[] = [
  { id: 'main', name: 'Conta', type: 'checking', balance: 900, color: '#fff', institution: 'Banco' },
];
const categories: Category[] = [
  { id: 'food', name: 'Alimentação', flow: 'expense', color: '#f00', icon: 'Utensils' },
];
const transactions: Transaction[] = [
  { id: 'income', description: 'Salário', amount: 1000, flow: 'income', status: 'paid', date: '2026-06-01', accountId: 'main' },
  { id: 'personal', description: 'Mercado', amount: 300, flow: 'expense', status: 'paid', date: '2026-06-02', accountId: 'main', categoryId: 'food' },
  { id: 'third-pending', description: 'Terceiro', amount: 200, flow: 'expense', status: 'paid', date: '2026-06-03', categoryId: 'food', isReimbursable: true, reimbursementStatus: 'pending' },
  { id: 'third-received', description: 'Terceiro recebido', amount: 100, flow: 'expense', status: 'paid', date: '2026-06-04', categoryId: 'food', isReimbursable: true, reimbursementStatus: 'received' },
  { id: 'credit', description: 'Estorno', amount: 50, flow: 'expense', status: 'paid', date: '2026-06-05', categoryId: 'food', cardId: 'card', notes: writeTransactionNotes(undefined, { invoiceAdjustment: 'credit' }) },
  { id: 'transfer', description: 'Transferência', amount: 80, flow: 'transfer', status: 'paid', date: '2026-06-06', fromAccountId: 'main', toAccountId: 'reserve' },
];

assert.deepEqual(summarizeDashboard(accounts, transactions, '2026-06'), {
  currentBalance: 900,
  income: 1000,
  expenses: 250,
  received: 1000,
  paid: 300,
  pendingIncome: 0,
  pendingExpenses: 0,
  reimbursementsPending: 200,
  reimbursementsReceived: 100,
});
assert.deepEqual(expensesByCategory(transactions, categories, '2026-06'), [
  { name: 'Alimentação', value: 250, color: '#f00' },
]);
assert.equal(getExpenseSignedAmount(transactions[4]), -50);
assert.equal(getAccountSignedAmount(transactions[5], 'main'), -80);
assert.equal(getAccountSignedAmount(transactions[5], 'reserve'), 80);

console.log('financial flow tests passed');
