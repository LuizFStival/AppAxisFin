import assert from 'node:assert/strict';
import { Account, Card, Category, ReimbursementPerson } from '../../types';
import { formatCurrencyInput } from '../../lib/utils/currency';
import { buildAddEntryFlowContext } from './addEntryFlowContext';

function readableCurrencySpacing(text: string) {
  return text.replace(/\u00a0/g, ' ');
}

const accounts: Account[] = [
  {
    id: 'nubank',
    name: 'Nubank',
    type: 'checking',
    balance: 3073.83,
    lastBalanceUpdate: '2026-09-07',
    color: '#8b5cf6',
    institution: 'Nubank',
    isActive: true,
  },
  {
    id: 'itau',
    name: 'Itaú',
    type: 'checking',
    balance: 708.92,
    lastBalanceUpdate: '2026-09-07',
    color: '#f97316',
    institution: 'Itaú',
    isActive: true,
  },
];

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

const categories: Category[] = [
  { id: 'income', name: 'Salário', flow: 'income', color: '#10b981', icon: 'wallet' },
  { id: 'shopping', name: 'Compras', flow: 'expense', color: '#f43f5e', icon: 'shopping-bag' },
];

const people: ReimbursementPerson[] = [
  { id: 'viagem-bc', name: 'Viagem BC' },
];

const baseInput = {
  accounts,
  cards,
  categories,
  reimbursementPeople: people,
  transactionMeta: {},
  isGroupedTransaction: false,
  canEditForwardEntries: false,
  flow: 'expense' as const,
  expenseMode: 'variable' as const,
  expenseNeed: 'essential' as const,
  amount: formatCurrencyInput(297.55),
  status: 'paid' as const,
  notes: '',
  categoryId: 'shopping',
  sourceType: 'card' as const,
  lockedSourceType: 'card' as const,
  accountId: 'nubank',
  cardId: 'nucredit',
  fromAccountId: 'itau',
  toAccountId: 'nubank',
  date: '2026-09-11',
  splitMode: 'none' as const,
  splitType: 'percent' as const,
  splitPercent: '50',
  splitFixedAmount: formatCurrencyInput(0),
  isInvoiceCredit: false,
  isReimbursable: false,
  reimbursementPersonId: 'viagem-bc',
  reimbursementStatus: 'pending' as const,
  reimbursementReceivedAccountId: '',
  hasFixedEndDate: false,
  fixedEndDate: '',
  installmentCount: '2',
  editScope: 'single' as const,
  newCategoryName: '',
};

const installmentContext = buildAddEntryFlowContext({
  ...baseInput,
  expenseMode: 'installment',
  installmentCount: '5',
});

assert.equal(readableCurrencySpacing(installmentContext.installmentPreview ?? ''), '5x de R$ 59,51. Total R$ 297,55.');
assert.match(
  readableCurrencySpacing(installmentContext.entrySummary),
  /Sua parte pesa cerca de R\$ 59,51 por mês e adiciona R\$ 238,04 em compromissos futuros até janeiro de 2027\./,
);
assert.equal(installmentContext.entryDraft.amount, 297.55);
assert.equal(installmentContext.entryDraft.cardId, 'nucredit');
assert.equal(installmentContext.entryDraft.accountId, 'nubank');
assert.equal(installmentContext.submitLabel, 'Criar parcelas');

const sharedContext = buildAddEntryFlowContext({
  ...baseInput,
  splitMode: 'shared',
  splitType: 'fixed',
  splitFixedAmount: formatCurrencyInput(119.35),
  isReimbursable: true,
});

assert.equal(sharedContext.shouldCreateSharedEntries, true);
assert.equal(sharedContext.personalAmount, 178.2);
assert.equal(sharedContext.reimbursementAmount, 119.35);
assert.equal(sharedContext.entryDraft.hasPersonalExpenseShare, true);
assert.equal(sharedContext.entryDraft.reimbursementPersonId, 'viagem-bc');

const accountExpenseContext = buildAddEntryFlowContext({
  ...baseInput,
  sourceType: 'account',
  lockedSourceType: 'account',
});

assert.equal(accountExpenseContext.flowLabel, 'Despesa em conta');
assert.equal(accountExpenseContext.selectedSourceName, 'Nubank');
assert.equal(accountExpenseContext.entryDraft.sourceType, 'account');
assert.equal(accountExpenseContext.entryDraft.accountId, 'nubank');

const incomeContext = buildAddEntryFlowContext({
  ...baseInput,
  flow: 'income',
  sourceType: 'account',
  lockedSourceType: null,
  categoryId: 'income',
});

assert.equal(incomeContext.flowLabel, 'Receita');
assert.equal(
  readableCurrencySpacing(incomeContext.entrySummary),
  'Receita de R$ 297,55 em Nubank. Entra como ganho no mês.',
);

const transferContext = buildAddEntryFlowContext({
  ...baseInput,
  flow: 'transfer',
  sourceType: 'account',
  lockedSourceType: null,
  categoryId: '',
});

assert.equal(transferContext.selectedSourceName, 'Itaú → Nubank');
assert.equal(
  readableCurrencySpacing(transferContext.entrySummary),
  'Transferência de R$ 297,55: Itaú → Nubank. O patrimônio total não muda.',
);

const editContext = buildAddEntryFlowContext({
  ...baseInput,
  transaction: {
    id: 'parcela-4',
    description: 'Almare (brinco) Presente (4/5)',
    amount: 59.51,
    flow: 'expense',
    status: 'pending',
    date: '2026-12-11',
    categoryId: 'shopping',
    cardId: 'nucredit',
  },
  transactionMeta: {
    entryMode: 'installment',
    seriesId: 'serie-1',
    installmentNumber: 4,
    totalInstallments: 5,
  },
  canEditForwardEntries: true,
  isGroupedTransaction: true,
  editScope: 'forward',
});

assert.equal(editContext.flowLabel, 'Edição');
assert.equal(editContext.submitLabel, 'Salvar esta e próximas');
assert.equal(editContext.entrySummary, 'Você está editando esta parcela e as próximas; meses anteriores não mudam.');

console.log('add entry flow context tests passed');
