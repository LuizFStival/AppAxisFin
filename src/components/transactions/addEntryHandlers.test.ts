import assert from 'node:assert/strict';
import { Category, ReimbursementPerson } from '../../types';
import {
  buildCustomCategoryCreationRequest,
  buildSystemCategoryCreationRequest,
  validateAddEntrySubmission,
  validateReimbursementPersonName,
} from './addEntryHandlers';

const categories: Category[] = [
  { id: 'income', name: 'Salário', flow: 'income', color: '#10b981', icon: 'wallet' },
  { id: 'food', name: 'Alimentação', flow: 'expense', color: '#f43f5e', icon: 'utensils' },
];

const people: ReimbursementPerson[] = [
  { id: 'ana', name: 'Ana' },
];

assert.deepEqual(buildCustomCategoryCreationRequest({
  name: '  Mercado  ',
  flow: 'expense',
  categories,
}), {
  ok: true,
  draft: {
    name: 'Mercado',
    flow: 'expense',
    icon: 'MoreHorizontal',
    color: '#F43F5E',
  },
});

assert.deepEqual(buildCustomCategoryCreationRequest({
  name: 'alimentação',
  flow: 'expense',
  categories,
}), {
  ok: false,
  error: 'Já existe uma categoria com esse nome.',
});

assert.equal(buildSystemCategoryCreationRequest('reimbursement').name, 'Reembolsos');
assert.equal(buildSystemCategoryCreationRequest('invoiceAdjustment').name, 'Ajustes de fatura');
assert.equal(validateReimbursementPersonName('', people), 'Informe o nome da pessoa.');
assert.equal(validateReimbursementPersonName('ana', people), 'Já existe uma pessoa com esse nome.');
assert.equal(validateReimbursementPersonName('Viagem BC', people), null);

const validBase = {
  parsedAmount: 120,
  description: 'Posto Felicita',
  date: '2026-09-23',
  flow: 'expense' as const,
  categoryId: 'food',
  accountId: 'nubank',
  cardId: '',
  fromAccountId: 'itau',
  toAccountId: 'nubank',
  sourceType: 'account' as const,
  expenseMode: 'variable' as const,
  expenseNeed: 'essential' as const,
  splitMode: 'none' as const,
  reimbursementAmount: 0,
  reimbursementPersonId: '',
  reimbursementStatus: 'pending' as const,
  reimbursementReceivedAccountId: '',
  isInvoiceCredit: false,
  isReimbursable: false,
  hasPersonalExpenseShare: true,
  hasReimbursementCategory: true,
  hasInvoiceAdjustmentCategory: true,
  hasFixedEndDate: false,
  fixedDatesCount: 0,
};

assert.equal(validateAddEntrySubmission(validBase), null);
assert.equal(
  validateAddEntrySubmission({ ...validBase, parsedAmount: 0 }),
  'Informe um valor maior que zero para salvar o lançamento.',
);
assert.equal(
  validateAddEntrySubmission({ ...validBase, splitMode: 'shared', reimbursementAmount: 120 }),
  'Informe uma divisao maior que zero e menor que o valor total.',
);
assert.equal(
  validateAddEntrySubmission({
    ...validBase,
    isReimbursable: true,
    reimbursementStatus: 'received',
    reimbursementPersonId: 'ana',
    reimbursementReceivedAccountId: '',
  }),
  'Selecione a conta onde o reembolso entrou.',
);
assert.equal(
  validateAddEntrySubmission({
    ...validBase,
    flow: 'transfer',
    categoryId: '',
    fromAccountId: 'nubank',
    toAccountId: 'nubank',
    hasPersonalExpenseShare: false,
  }),
  'As contas de origem e destino precisam ser diferentes.',
);
assert.equal(
  validateAddEntrySubmission({
    ...validBase,
    flow: 'income',
    categoryId: 'income',
    accountId: '',
    hasPersonalExpenseShare: false,
  }),
  'Selecione uma conta para salvar a receita.',
);

console.log('add entry handlers tests passed');
