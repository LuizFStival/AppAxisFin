import assert from 'node:assert/strict';
import { Card, ReimbursementPerson, Transaction } from '../../types';
import { writeTransactionNotes } from '../../lib/utils/transactionMeta';
import {
  buildMonthClosingChecklist,
  buildReimbursementPeopleSummaries,
  filterCommitmentExpenses,
  getFixedExpensesForMonth,
  getInstallmentExpensesForMonth,
  getPendingReimbursementsForMonth,
} from './monthCenterRules';

const cards: Card[] = [
  { id: 'card', name: 'NuCrédito', accountId: 'account', limit: 3000, used: 0, dueDay: 2, closingDay: 26, color: '#8b5cf6', network: 'mastercard' },
];
const people: ReimbursementPerson[] = [
  { id: 'person', name: 'Huboox' },
];
const transactions: Transaction[] = [
  { id: 'fixed', description: 'Tim AP', amount: 129.46, flow: 'expense', status: 'pending', date: '2026-08-10', accountId: 'account', notes: writeTransactionNotes(undefined, { entryMode: 'fixed' }) },
  { id: 'installment', description: 'Amazon (2/3)', amount: 80, flow: 'expense', status: 'pending', date: '2026-08-04', cardId: 'card', notes: writeTransactionNotes(undefined, { entryMode: 'installment', installmentNumber: 2, totalInstallments: 3 }) },
  { id: 'reimbursement', description: 'Starlink - Huboox', amount: 189, flow: 'expense', status: 'pending', date: '2026-08-04', cardId: 'card', isReimbursable: true, reimbursementStatus: 'pending', reimbursementAmount: 189, reimbursementPersonId: 'person', notes: writeTransactionNotes(undefined, { entryMode: 'fixed' }) },
  { id: 'received', description: 'Pago', amount: 30, flow: 'expense', status: 'pending', date: '2026-08-04', isReimbursable: true, reimbursementStatus: 'received', reimbursementAmount: 30 },
];

assert.deepEqual(getFixedExpensesForMonth(transactions, cards, '2026-08').map((item) => item.id), ['fixed', 'reimbursement']);
assert.deepEqual(getInstallmentExpensesForMonth(transactions, cards, '2026-08').map((item) => item.id), ['installment']);
assert.deepEqual(getPendingReimbursementsForMonth(transactions, cards, '2026-08').map((item) => item.id), ['reimbursement']);

const summaries = buildReimbursementPeopleSummaries(getPendingReimbursementsForMonth(transactions, cards, '2026-08'), people, cards, '2026-08', '2026-09-08');
assert.equal(summaries.length, 1);
assert.equal(summaries[0].personName, 'Huboox');
assert.equal(summaries[0].total, 189);
assert.equal(summaries[0].overdueCount, 1);

assert.deepEqual(filterCommitmentExpenses(transactions, 'mine', 'all').map((item) => item.id), ['fixed', 'installment']);
assert.deepEqual(filterCommitmentExpenses(transactions, 'others', 'person').map((item) => item.id), ['reimbursement']);

const openChecklist = buildMonthClosingChecklist({
  activeMonth: '2026-08',
  pendingInvoiceCount: 1,
  pendingAccountExpenseCount: 1,
  fixedExpenseCount: 1,
  installmentExpenseCount: 1,
  pendingReimbursementCount: 1,
  oldPendingReimbursementCount: 1,
  reimbursementTotal: 189,
  monthTransactionCount: 4,
  reimbursementsEnabled: true,
});
assert.equal(openChecklist.every((item) => item.done), false);
assert.equal(openChecklist.find((item) => item.id === 'reimbursements')?.done, false);
assert.match(openChecklist.find((item) => item.id === 'reimbursements')?.detail ?? '', /pendências de meses anteriores/);

const closedChecklist = buildMonthClosingChecklist({
  activeMonth: '2026-08',
  pendingInvoiceCount: 0,
  pendingAccountExpenseCount: 0,
  fixedExpenseCount: 1,
  installmentExpenseCount: 0,
  pendingReimbursementCount: 0,
  oldPendingReimbursementCount: 0,
  reimbursementTotal: 0,
  monthTransactionCount: 2,
  reimbursementsEnabled: true,
});
assert.equal(closedChecklist.every((item) => item.done), true);

console.log('month center rules tests passed');
