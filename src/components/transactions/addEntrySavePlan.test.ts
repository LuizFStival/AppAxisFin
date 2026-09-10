import assert from 'node:assert/strict';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { AddEntryDraft } from './addEntryBuilder';
import { buildAddEntrySavePlan } from './addEntrySavePlan';

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

const commonInput = {
  flow: 'expense' as const,
  transaction: null,
  transactionMeta: {},
  expenseMode: 'variable' as const,
  editScope: 'single' as const,
  shouldCreateSharedEntries: false,
  hasPersonalExpenseShare: true,
  expenseNeed: 'essential' as const,
  isInvoiceCredit: false,
  hasFixedEndDate: false,
  fixedEndDate: '',
  installmentCount: '2',
  date: '2026-08-04',
  description: 'Mercado',
  notes: 'Observação',
  amount: 120,
  status: 'paid' as const,
  fromAccountId: 'from',
  toAccountId: 'to',
  entryDraft: baseDraft,
};

const transferPlan = buildAddEntrySavePlan({
  ...commonInput,
  flow: 'transfer',
  description: 'Reserva',
});
assert.equal(transferPlan.kind, 'save');
assert.equal(Array.isArray(transferPlan.transaction), false);
if (transferPlan.kind === 'save' && !Array.isArray(transferPlan.transaction)) {
  assert.equal(transferPlan.transaction.flow, 'transfer');
  assert.equal(transferPlan.transaction.fromAccountId, 'from');
}

const fixedPlan = buildAddEntrySavePlan({
  ...commonInput,
  expenseMode: 'fixed',
  hasFixedEndDate: true,
  fixedEndDate: '2026-12-04',
});
assert.equal(fixedPlan.kind, 'createRecurring');
if (fixedPlan.kind === 'createRecurring') {
  assert.equal(fixedPlan.endDate, '2026-12-04');
  assert.equal(readTransactionMeta(fixedPlan.transaction.notes).entryMode, 'fixed');
}

const installmentPlan = buildAddEntrySavePlan({
  ...commonInput,
  expenseMode: 'installment',
  installmentCount: '3',
});
assert.equal(installmentPlan.kind, 'save');
if (installmentPlan.kind === 'save' && Array.isArray(installmentPlan.transaction)) {
  assert.equal(installmentPlan.transaction.length, 3);
  assert.equal(installmentPlan.transaction[2].description, 'Mercado (3/3)');
}

const sharedFixedPlan = buildAddEntrySavePlan({
  ...commonInput,
  expenseMode: 'fixed',
  shouldCreateSharedEntries: true,
  entryDraft: {
    ...baseDraft,
    splitMode: 'shared',
    personalAmount: 70,
    reimbursementAmount: 50,
    reimbursementPersonId: 'person',
  },
});
assert.equal(sharedFixedPlan.kind, 'createRecurringBatch');
if (sharedFixedPlan.kind === 'createRecurringBatch') {
  assert.equal(sharedFixedPlan.transactions.length, 2);
  assert.equal(sharedFixedPlan.transactions[1].isReimbursable, true);
}

console.log('add entry save plan tests passed');
