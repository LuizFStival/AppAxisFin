import assert from 'node:assert/strict';
import type { Card, Transaction } from '../../types';
import { summarizeFutureInstallmentCommitments } from './futureCommitments';
import { writeTransactionNotes } from './transactionMeta';

const cards: Card[] = [
  {
    id: 'nucredit',
    name: 'NuCrédito',
    accountId: 'nubank',
    limit: 3000,
    used: 0,
    dueDay: 2,
    closingDay: 26,
    color: '#7c3aed',
    network: 'mastercard',
    isActive: true,
  },
];

const transactions: Transaction[] = [
  {
    id: 'current',
    description: 'Notebook (1/4)',
    amount: 100,
    flow: 'expense',
    status: 'pending',
    date: '2026-09-10',
    cardId: 'nucredit',
    notes: writeTransactionNotes(undefined, {
      entryMode: 'installment',
      expenseNeed: 'essential',
      seriesId: 'notebook',
      installmentNumber: 1,
      totalInstallments: 4,
    }),
  },
  {
    id: 'future-2',
    description: 'Notebook (2/4)',
    amount: 100,
    flow: 'expense',
    status: 'pending',
    date: '2026-10-10',
    cardId: 'nucredit',
    notes: writeTransactionNotes(undefined, {
      entryMode: 'installment',
      expenseNeed: 'essential',
      seriesId: 'notebook',
      installmentNumber: 2,
      totalInstallments: 4,
    }),
  },
  {
    id: 'future-3',
    description: 'Notebook (3/4)',
    amount: 100,
    flow: 'expense',
    status: 'pending',
    date: '2026-11-10',
    cardId: 'nucredit',
    notes: writeTransactionNotes(undefined, {
      entryMode: 'installment',
      expenseNeed: 'essential',
      seriesId: 'notebook',
      installmentNumber: 3,
      totalInstallments: 4,
    }),
  },
  {
    id: 'future-4',
    description: 'Notebook (4/4)',
    amount: 100,
    flow: 'expense',
    status: 'pending',
    date: '2026-12-10',
    cardId: 'nucredit',
    notes: writeTransactionNotes(undefined, {
      entryMode: 'installment',
      expenseNeed: 'essential',
      seriesId: 'notebook',
      installmentNumber: 4,
      totalInstallments: 4,
    }),
  },
  {
    id: 'shared-personal',
    description: 'Viagem (2/2)',
    amount: 40,
    flow: 'expense',
    status: 'pending',
    date: '2026-10-15',
    cardId: 'nucredit',
    notes: writeTransactionNotes(undefined, {
      entryMode: 'installment',
      expenseNeed: 'durable',
      seriesId: 'viagem',
      installmentNumber: 2,
      totalInstallments: 2,
    }),
  },
  {
    id: 'shared-third-party',
    description: 'Viagem - terceiro (2/2)',
    amount: 60,
    flow: 'expense',
    status: 'pending',
    date: '2026-10-15',
    cardId: 'nucredit',
    isReimbursable: true,
    splitMode: 'third_party_full',
    personalAmount: 0,
    reimbursementAmount: 60,
    notes: writeTransactionNotes(undefined, {
      entryMode: 'installment',
      seriesId: 'viagem-terceiro',
      installmentNumber: 2,
      totalInstallments: 2,
    }),
  },
  {
    id: 'past',
    description: 'Cadeira (1/2)',
    amount: 80,
    flow: 'expense',
    status: 'pending',
    date: '2026-08-10',
    cardId: 'nucredit',
    notes: writeTransactionNotes(undefined, {
      entryMode: 'installment',
      seriesId: 'cadeira',
      installmentNumber: 1,
      totalInstallments: 2,
    }),
  },
];

const summary = summarizeFutureInstallmentCommitments(transactions, cards, '2026-09');

assert.equal(summary.currentMonthTotal, 100);
assert.equal(summary.totalCommitted, 340);
assert.equal(summary.installmentCount, 4);
assert.equal(summary.seriesCount, 2);
assert.equal(summary.lastCommitmentMonth, '2026-12');
assert.equal(summary.essentialDurableTotal, 340);
assert.equal(summary.essentialDurablePercent, 100);
assert.equal(summary.superfluousTotal, 0);
assert.deepEqual(summary.natureSummary.map((item) => [item.key, item.total, item.percent]), [
  ['essential', 300, 88.24],
  ['durable', 40, 11.76],
]);
assert.deepEqual(summary.monthlyProjection.map((item) => [item.month, item.total, item.count, item.seriesCount]), [
  ['2026-10', 140, 2, 2],
  ['2026-11', 100, 1, 1],
  ['2026-12', 100, 1, 1],
]);

console.log('future commitments tests passed');
