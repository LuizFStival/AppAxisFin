import assert from 'node:assert/strict';
import {
  expensesByCategory,
  formatMonthLabel,
  getAvailableMonths,
  getPaymentSource,
  shiftMonthKey,
  summarizeDashboard,
} from './finance';
import { getCardInvoiceClosingMonth, getCardInvoiceInfo, getCardInvoiceInfoForClosingMonth, getCardInvoiceInfoForPeriod } from './cardInvoices';
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
];

const summary = summarizeDashboard(accounts, cards, transactions, '2026-06');

assert.deepEqual(summary, {
  currentBalance: 1500,
  income: 5800,
  expenses: 1600,
  received: 5000,
  paid: 350,
  pendingIncome: 800,
  pendingExpenses: 1250,
});

assert.deepEqual(getAvailableMonths(transactions), ['2026-06', '2026-05']);
assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
assert.equal(shiftMonthKey('2026-12', 1), '2027-01');
assert.equal(formatMonthLabel('2026-06'), 'junho de 2026');
assert.equal(getPaymentSource(accounts, cards, transactions[2]), 'Principal');
assert.equal(getPaymentSource(accounts, cards, transactions[4]), 'Principal -> Reserva');
assert.equal(getPaymentSource(accounts, cards, transactions[5]), 'Credito');

assert.deepEqual(expensesByCategory(transactions, cards, categories, '2026-06'), [
  { name: 'Moradia', value: 1200, color: '#6366F1' },
  { name: 'Alimentacao', value: 400, color: '#EF4444' },
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
  period: '2026-07',
  label: 'Fatura julho de 2026',
  startDate: '2026-05-26',
  endDate: '2026-06-26',
  dueDate: '2026-07-02',
  status: 'aberta',
});

assert.deepEqual(getCardInvoiceInfoForPeriod(closesOnTwentySix, '2026-07', '2026-06-12'), {
  period: '2026-07',
  label: 'Fatura julho de 2026',
  startDate: '2026-05-26',
  endDate: '2026-06-26',
  dueDate: '2026-07-02',
  status: 'aberta',
});

assert.deepEqual(getCardInvoiceInfoForClosingMonth(closesOnTwentySix, '2026-06', '2026-06-12'), {
  period: '2026-07',
  label: 'Fatura julho de 2026',
  startDate: '2026-05-26',
  endDate: '2026-06-26',
  dueDate: '2026-07-02',
  status: 'aberta',
});

assert.equal(getCardInvoiceClosingMonth(closesOnTwentySix, '2026-05-26'), '2026-06');
