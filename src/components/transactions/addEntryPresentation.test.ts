import assert from 'node:assert/strict';
import {
  getEntryImpactSummary,
  getFlowLabel,
  getFlowSubtitle,
  getInstallmentPreview,
  getSubmitLabel,
  hasAddEntryAdvancedContext,
} from './addEntryPresentation';

function readableCurrencySpacing(text: string) {
  return text.replace(/\u00a0/g, ' ');
}

assert.equal(
  readableCurrencySpacing(getInstallmentPreview({
    isInstallmentExpense: true,
    isEditing: false,
    amount: 297.55,
    installmentCount: '5',
  }) ?? ''),
  '5x de R$ 59,51. Total R$ 297,55.',
);

assert.equal(
  readableCurrencySpacing(getEntryImpactSummary({
    amount: 297.55,
    flow: 'expense',
    expenseMode: 'installment',
    splitMode: 'shared',
    editScope: 'single',
    canEditForwardEntries: false,
    isEditing: false,
    isInvoiceCredit: false,
    installmentCount: '5',
    shouldCreateSharedEntries: true,
    reimbursementAmount: 119.35,
    personalAmount: 178.2,
    hasFixedEndDate: false,
    fixedEndDate: '',
    fixedDatesCount: 0,
  })),
  'Compra total de R$ 297,55 será dividida em 5 parcelas de aproximadamente R$ 59,51. Também cria 5 registros de reembolso para R$ 119,35 no total.',
);

assert.equal(
  readableCurrencySpacing(getEntryImpactSummary({
    amount: 534.6,
    flow: 'expense',
    expenseMode: 'variable',
    splitMode: 'third_party_full',
    editScope: 'single',
    canEditForwardEntries: false,
    isEditing: false,
    isInvoiceCredit: false,
    installmentCount: '2',
    shouldCreateSharedEntries: false,
    reimbursementAmount: 534.6,
    personalAmount: 0,
    hasFixedEndDate: false,
    fixedEndDate: '',
    fixedDatesCount: 0,
  })),
  'Despesa de R$ 534,60 é 100% de terceiro. Fica em reembolsos e não pesa como gasto pessoal.',
);

assert.equal(
  getEntryImpactSummary({
    amount: 120,
    flow: 'expense',
    expenseMode: 'installment',
    splitMode: 'none',
    editScope: 'forward',
    canEditForwardEntries: true,
    transactionEntryMode: 'installment',
    isEditing: true,
    isInvoiceCredit: false,
    installmentCount: '3',
    shouldCreateSharedEntries: false,
    reimbursementAmount: 0,
    personalAmount: 120,
    hasFixedEndDate: false,
    fixedEndDate: '',
    fixedDatesCount: 0,
  }),
  'Você está editando esta parcela e as próximas; meses anteriores não mudam.',
);

const cardExpenseLabels = {
  flow: 'expense' as const,
  expenseMode: 'installment' as const,
  lockedSourceType: 'card' as const,
  isEditing: false,
  isInvoiceCredit: false,
  editScope: 'single' as const,
  canEditForwardEntries: false,
};

assert.equal(getSubmitLabel(cardExpenseLabels), 'Criar parcelas');
assert.equal(getFlowLabel(cardExpenseLabels), 'Compra no cartão');
assert.equal(getFlowSubtitle(cardExpenseLabels), 'Compra entra na fatura do cartão selecionado.');

assert.equal(hasAddEntryAdvancedContext({
  expenseMode: 'variable',
  isInvoiceCredit: false,
  splitMode: 'none',
  hasPersonalExpenseShare: true,
  isGroupedTransaction: false,
  hasFixedEndDate: false,
  isReimbursable: false,
  newCategoryName: '',
}), true);

console.log('add entry presentation tests passed');
