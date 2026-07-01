import assert from 'node:assert/strict';
import {
  expensesByCategory,
  formatMonthLabel,
  getAccountSignedAmount,
  getAvailableMonths,
  getFinancialMonthKey,
  getCurrentMonthKey,
  isCardInvoicePaid,
  getPaymentSource,
  shiftMonthKey,
  summarizeDashboard,
} from './finance';
import { getCardInvoiceClosingMonth, getCardInvoiceInfo, getCardInvoiceInfoForClosingMonth, getCardInvoiceInfoForPeriod } from './cardInvoices';
import { writeTransactionNotes } from './transactionMeta';
import { matchesExpenseViewFilter } from './expenseFilters';
import { summarizeExpenseBreakdown } from './expenseBreakdown';
import { getReimbursementDueDate, getReimbursementMonthKey, isReimbursementOverdue } from './reimbursements';
import { Account, Card, Category, Transaction } from '../../types';

const accounts: Account[] = [
  { id: 'acc-main', name: 'Principal', type: 'checking', balance: 1200, color: '#3B82F6', institution: 'Banco' },
  { id: 'acc-save', name: 'Reserva', type: 'savings', balance: 300, color: '#10B981', institution: 'Banco' },
];

const cards: Card[] = [
  {
    id: 'card-main',
    name: 'Credito',
    accountId: 'acc-main',
    limit: 2000,
    used: 0,
    dueDay: 10,
    closingDay: 1,
    color: '#8B5CF6',
    network: 'mastercard',
  },
];

const categories: Category[] = [
  { id: 'cat-income', name: 'Salario', flow: 'income', color: '#10B981', icon: 'Briefcase' },
  { id: 'cat-food', name: 'Alimentacao', flow: 'expense', color: '#EF4444', icon: 'Utensils' },
  { id: 'cat-home', name: 'Moradia', flow: 'expense', color: '#6366F1', icon: 'Home' },
];

const transactions: Transaction[] = [
  {
    id: 'tx-income-paid',
    description: 'Salario',
    amount: 5000,
    flow: 'income',
    status: 'paid',
    date: '2026-06-05',
    categoryId: 'cat-income',
    accountId: 'acc-main',
  },
  {
    id: 'tx-income-pending',
    description: 'Freela',
    amount: 800,
    flow: 'income',
    status: 'pending',
    date: '2026-06-20',
    categoryId: 'cat-income',
    accountId: 'acc-main',
  },
  {
    id: 'tx-expense-paid',
    description: 'Mercado',
    amount: 350,
    flow: 'expense',
    status: 'paid',
    date: '2026-06-08',
    categoryId: 'cat-food',
    accountId: 'acc-main',
  },
  {
    id: 'tx-expense-pending',
    description: 'Aluguel',
    amount: 1200,
    flow: 'expense',
    status: 'pending',
    date: '2026-06-12',
    categoryId: 'cat-home',
    accountId: 'acc-main',
  },
  {
    id: 'tx-transfer',
    description: 'Reserva',
    amount: 200,
    flow: 'transfer',
    status: 'paid',
    date: '2026-06-14',
    fromAccountId: 'acc-main',
    toAccountId: 'acc-save',
  },
  {
    id: 'tx-card',
    description: 'Assinatura',
    amount: 50,
    flow: 'expense',
    status: 'paid',
    date: '2026-05-28',
    categoryId: 'cat-food',
    cardId: 'card-main',
  },
  {
    id: 'tx-card-current-month',
    description: 'Compra no credito',
    amount: 132.64,
    flow: 'expense',
    status: 'paid',
    date: '2026-06-18',
    categoryId: 'cat-food',
    cardId: 'card-main',
  },
  {
    id: 'tx-third-party-card',
    description: 'Conta dividida',
    amount: 90,
    flow: 'expense',
    status: 'paid',
    date: '2026-05-29',
    categoryId: 'cat-food',
    cardId: 'card-main',
    isReimbursable: true,
    reimbursementPersonId: 'person-ana',
    reimbursementStatus: 'pending',
  },
  {
    id: 'tx-card-credit',
    description: 'Devolucao TikTok',
    amount: 25.47,
    flow: 'expense',
    status: 'paid',
    date: '2026-05-29',
    categoryId: 'cat-food',
    cardId: 'card-main',
    notes: writeTransactionNotes(undefined, { entryMode: 'variable', invoiceAdjustment: 'credit' }),
  },
];

const summary = summarizeDashboard(accounts, transactions, '2026-06');

assert.deepEqual(summary, {
  currentBalance: 1500,
  income: 5800,
  expenses: 1682.64,
  received: 5000,
  paid: 350,
  pendingIncome: 800,
  pendingExpenses: 1332.64,
  reimbursementsPending: 0,
  reimbursementsReceived: 0,
});

assert.deepEqual(getAvailableMonths(transactions), ['2026-06', '2026-05']);
assert.equal(getCurrentMonthKey(new Date(2026, 5, 30, 23, 59)), '2026-06');
assert.equal(getCurrentMonthKey(new Date(2026, 6, 1, 0, 0)), '2026-07');
assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
assert.equal(shiftMonthKey('2026-12', 1), '2027-01');
assert.equal(formatMonthLabel('2026-06'), 'junho de 2026');
assert.equal(getPaymentSource(accounts, cards, transactions[2]), 'Principal');
assert.equal(getPaymentSource(accounts, cards, transactions[4]), 'Principal -> Reserva');
assert.equal(getPaymentSource(accounts, cards, transactions[5]), 'Credito');
assert.equal(getAccountSignedAmount(transactions[0], 'acc-main'), 5000);
assert.equal(getAccountSignedAmount(transactions[1], 'acc-main'), 0);
assert.equal(getAccountSignedAmount(transactions[2], 'acc-main'), -350);
assert.equal(getAccountSignedAmount(transactions[3], 'acc-main'), 0);

assert.deepEqual(expensesByCategory(transactions, categories, '2026-06'), [
  { name: 'Moradia', value: 1200, color: '#6366F1' },
  { name: 'Alimentacao', value: 482.64, color: '#EF4444' },
]);

const closesOnTwentySix: Card = {
  id: 'card-26',
  name: 'Fecha 26',
  accountId: 'acc-main',
  limit: 5000,
  used: 0,
  dueDay: 2,
  closingDay: 26,
  color: '#8B5CF6',
  network: 'mastercard',
};

assert.deepEqual(getCardInvoiceInfo(closesOnTwentySix, '2026-05-26', '2026-06-12'), {
  period: '2026-06',
  label: 'Fatura junho de 2026',
  startDate: '2026-05-26',
  endDate: '2026-06-26',
  dueDate: '2026-07-02',
  status: 'aberta',
});

assert.deepEqual(getCardInvoiceInfoForPeriod(closesOnTwentySix, '2026-06', '2026-06-12'), {
  period: '2026-06',
  label: 'Fatura junho de 2026',
  startDate: '2026-05-26',
  endDate: '2026-06-26',
  dueDate: '2026-07-02',
  status: 'aberta',
});

assert.deepEqual(getCardInvoiceInfoForClosingMonth(closesOnTwentySix, '2026-06', '2026-06-12'), {
  period: '2026-06',
  label: 'Fatura junho de 2026',
  startDate: '2026-05-26',
  endDate: '2026-06-26',
  dueDate: '2026-07-02',
  status: 'aberta',
});

assert.equal(getCardInvoiceClosingMonth(closesOnTwentySix, '2026-05-26'), '2026-06');
assert.equal(getFinancialMonthKey({
  id: 'tx-cycle-boundary',
  description: 'Compra no fechamento',
  amount: 100,
  flow: 'expense',
  status: 'paid',
  date: '2026-05-26',
  cardId: closesOnTwentySix.id,
}), '2026-05');

assert.equal(getFinancialMonthKey({
  id: 'tx-june-purchase-july-due',
  description: 'Compra antes do vencimento de julho',
  amount: 100,
  flow: 'expense',
  status: 'paid',
  date: '2026-06-23',
  cardId: closesOnTwentySix.id,
}), '2026-06');

assert.equal(getCardInvoiceInfo(closesOnTwentySix, '2026-06-23', '2026-06-24').dueDate, '2026-07-02');
const pendingMayCardReimbursement: Transaction = {
  id: 'reimbursement-card-may',
  description: 'Compra para terceiro',
  amount: 100,
  flow: 'expense',
  status: 'paid',
  date: '2026-05-26',
  cardId: closesOnTwentySix.id,
  isReimbursable: true,
  reimbursementStatus: 'pending',
};
assert.equal(getReimbursementDueDate(pendingMayCardReimbursement, [closesOnTwentySix]), '2026-07-02');
assert.equal(getReimbursementMonthKey(pendingMayCardReimbursement, [closesOnTwentySix]), '2026-06');
assert.equal(isReimbursementOverdue(pendingMayCardReimbursement, [closesOnTwentySix], '2026-06-25'), false);
assert.equal(isReimbursementOverdue(pendingMayCardReimbursement, [closesOnTwentySix], '2026-07-03'), true);

const unpaidCardTransactions: Transaction[] = [{
  id: 'invoice-unpaid',
  description: 'Compra no cartão',
  amount: 100,
  flow: 'expense',
  status: 'paid',
  date: '2026-05-26',
  cardId: closesOnTwentySix.id,
}];

assert.equal(isCardInvoicePaid(unpaidCardTransactions), false);
assert.equal(isCardInvoicePaid(unpaidCardTransactions.map((transaction) => ({
  ...transaction,
  notes: writeTransactionNotes(undefined, {
    paidAt: '2026-07-02',
    paidFromAccountId: 'acc-main',
  }),
}))), true);

const filterTransactions: Transaction[] = [
  {
    id: 'filter-variable',
    description: 'Mercado',
    amount: 120,
    flow: 'expense',
    status: 'paid',
    date: '2026-06-10',
    notes: writeTransactionNotes(undefined, { entryMode: 'variable', expenseNeed: 'essential' }),
  },
  {
    id: 'filter-installment',
    description: 'Roupa',
    amount: 80,
    flow: 'expense',
    status: 'paid',
    date: '2026-06-11',
    notes: writeTransactionNotes(undefined, { entryMode: 'installment', expenseNeed: 'superfluous' }),
  },
  {
    id: 'filter-others',
    description: 'Compra para terceiro',
    amount: 60,
    flow: 'expense',
    status: 'paid',
    date: '2026-06-12',
    isReimbursable: true,
  },
];

assert.equal(matchesExpenseViewFilter(filterTransactions[0], 'variable'), true);
assert.equal(matchesExpenseViewFilter(filterTransactions[0], 'essential'), true);
assert.equal(matchesExpenseViewFilter(filterTransactions[1], 'installment'), true);
assert.equal(matchesExpenseViewFilter(filterTransactions[1], 'superfluous'), true);
assert.equal(matchesExpenseViewFilter(filterTransactions[2], 'others'), true);
assert.equal(matchesExpenseViewFilter(filterTransactions[2], 'personal'), false);
assert.deepEqual(
  summarizeExpenseBreakdown(filterTransactions.filter((transaction) => !transaction.isReimbursable))
    .map(({ key, total, count }) => ({ key, total, count })),
  [
    { key: 'installment', total: 80, count: 1 },
    { key: 'fixed', total: 0, count: 0 },
    { key: 'variable', total: 120, count: 1 },
  ],
);
