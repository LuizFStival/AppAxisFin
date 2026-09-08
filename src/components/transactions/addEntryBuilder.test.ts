import assert from 'node:assert/strict';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { AddEntryDraft, buildInstallmentEntryTransactions, buildSharedEntryTransactions, buildSingleEntryTransaction } from './addEntryBuilder';

const baseDraft: AddEntryDraft = {
  flow: 'expense',
  amount: 120,
  status: 'paid',
  notes: 'Observação',
  categoryId: 'food',
  sourceType: 'card',
  accountId: 'account',
  cardId: 'card',
  splitMode: 'none',
  expenseNeed: 'essential',
  isInvoiceCredit: false,
  hasPersonalExpenseShare: true,
  personalAmount: 120,
  reimbursementAmount: 0,
  reimbursementPersonId: undefined,
  reimbursementStatus: 'pending',
  reimbursementReceivedAccountId: undefined,
  reimbursementPeople: [{ id: 'person', name: 'Mariana' }],
};

const cardExpense = buildSingleEntryTransaction(baseDraft, '2026-08-04', 'Mercado', { entryMode: 'variable' });
assert.equal(cardExpense.status, 'pending');
assert.equal(cardExpense.cardId, 'card');
assert.equal(cardExpense.accountId, undefined);
assert.equal(cardExpense.isReimbursable, false);
assert.deepEqual(readTransactionMeta(cardExpense.notes), {
  entryMode: 'variable',
  expenseNeed: 'essential',
});

const sharedEntries = buildSharedEntryTransactions({
  ...baseDraft,
  splitMode: 'shared',
  personalAmount: 70,
  reimbursementAmount: 50,
  reimbursementPersonId: 'person',
}, '2026-08-04', 'Jantar', { entryMode: 'variable' });
assert.equal(sharedEntries.length, 2);
assert.equal(sharedEntries[0].amount, 70);
assert.equal(sharedEntries[0].isReimbursable, false);
assert.equal(sharedEntries[1].amount, 50);
assert.equal(sharedEntries[1].isReimbursable, true);
assert.equal(sharedEntries[1].description, 'Jantar - Mariana');
assert.equal(sharedEntries[1].reimbursementPersonId, 'person');

const installments = buildInstallmentEntryTransactions(baseDraft, '2026-08-04', 'Amazon', '3');
assert.equal(installments.length, 3);
assert.equal(installments[0].date, '2026-08-04');
assert.equal(installments[1].date, '2026-09-04');
assert.equal(installments[2].description, 'Amazon (3/3)');
assert.equal(readTransactionMeta(installments[2].notes).totalInstallments, 3);

console.log('add entry builder tests passed');
