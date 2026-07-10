import assert from 'node:assert/strict';
import type { Account, Category, Transaction } from '../../types';
import { expensesByCategory, getAccountSignedAmount, getExpenseSignedAmount, summarizeDashboard, summarizeMonthlyInvestmentGoal } from './finance';
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
  { id: 'invoice-payment', description: 'Pagamento fatura', amount: 500, flow: 'expense', status: 'paid', date: '2026-06-05', accountId: 'main', notes: writeTransactionNotes(undefined, { invoicePaymentCardId: 'card', invoicePaymentPeriod: '2026-06' }) },
  { id: 'transfer', description: 'Transferência', amount: 80, flow: 'transfer', status: 'paid', date: '2026-06-06', fromAccountId: 'main', toAccountId: 'reserve' },
];

assert.deepEqual(summarizeDashboard(accounts, transactions, '2026-06'), {
  currentBalance: 900,
  accountInflow: 1100,
  accountInflowPersonal: 1000,
  accountInflowThirdParty: 100,
  accountOutflow: 1100,
  accountOutflowPersonal: 800,
  accountOutflowThirdParty: 300,
  income: 1000,
  expenses: 250,
  settledExpenses: 250,
  received: 1000,
  paid: 800,
  pendingIncome: 0,
  pendingExpenses: 0,
  reimbursementsPending: 200,
  reimbursementsReceived: 100,
});
assert.deepEqual(expensesByCategory(transactions, categories, '2026-06'), [
  { name: 'Alimentação', value: 250, color: '#f00' },
]);
assert.equal(getExpenseSignedAmount(transactions[4]), -50);
assert.equal(getAccountSignedAmount(transactions[6], 'main'), -80);
assert.equal(getAccountSignedAmount(transactions[6], 'reserve'), 80);

const investmentAccounts: Account[] = [
  ...accounts,
  { id: 'broker', name: 'Corretora', type: 'investment', balance: 200, color: '#fff', institution: 'Corretora' },
];
const investmentTransactions: Transaction[] = [
  { id: 'salary', description: 'Salário', amount: 3000, flow: 'income', status: 'paid', date: '2026-06-05', accountId: 'main' },
  { id: 'investment', description: 'Aporte mensal', amount: 400, flow: 'transfer', status: 'paid', date: '2026-06-06', fromAccountId: 'main', toAccountId: 'broker' },
];
assert.deepEqual(summarizeMonthlyInvestmentGoal(investmentAccounts, categories, investmentTransactions, '2026-06'), {
  salaryReceived: 3000,
  salaryConsidered: 3000,
  target: 600,
  saved: 3000,
  remaining: 0,
  progress: 500,
});

const pendingSalaryTransactions: Transaction[] = [
  ...investmentTransactions,
  { id: 'salary-pending', description: 'Salário pendente', amount: 1000, flow: 'income', status: 'pending', date: '2026-06-20', accountId: 'main' },
];
assert.equal(summarizeMonthlyInvestmentGoal(
  investmentAccounts,
  categories,
  pendingSalaryTransactions,
  '2026-06',
  { percentage: 25, includePendingSalary: true },
).target, 1000);
assert.equal(summarizeMonthlyInvestmentGoal(
  investmentAccounts,
  categories,
  pendingSalaryTransactions,
  '2026-06',
  { percentage: 25, includePendingSalary: false },
).target, 750);
assert.equal(summarizeMonthlyInvestmentGoal(
  investmentAccounts,
  categories,
  pendingSalaryTransactions,
  '2026-06',
  { mode: 'fixed', fixedAmount: 850 },
).target, 850);

console.log('financial flow tests passed');
