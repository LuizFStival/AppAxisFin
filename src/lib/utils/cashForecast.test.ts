import assert from 'node:assert/strict';
import type { Account, Card, Transaction } from '../../types';
import { calculateCashForecast } from './cashForecast';
import { writeTransactionNotes } from './transactionMeta';

const accounts: Account[] = [{ id: 'account', name: 'Conta', type: 'checking', balance: 1000, color: '#fff', institution: 'Banco' }];
const cards: Card[] = [{ id: 'card', name: 'Cartão', accountId: 'account', limit: 2000, used: 0, dueDay: 10, closingDay: 1, color: '#000', network: 'visa' }];
const transactions: Transaction[] = [
  { id: 'income', description: 'Salário', amount: 1500, flow: 'income', status: 'pending', date: '2026-07-05', accountId: 'account' },
  { id: 'income-paid', description: 'Já recebido', amount: 300, flow: 'income', status: 'paid', date: '2026-07-04', accountId: 'account' },
  { id: 'fixed', description: 'Aluguel', amount: 700, flow: 'expense', status: 'pending', date: '2026-07-08', accountId: 'account', notes: writeTransactionNotes(undefined, { entryMode: 'fixed' }) },
  { id: 'variable', description: 'Mercado', amount: 200, flow: 'expense', status: 'pending', date: '2026-07-09', accountId: 'account', notes: writeTransactionNotes(undefined, { entryMode: 'variable' }) },
  { id: 'reimbursement', description: 'Reembolso', amount: 250, flow: 'expense', status: 'paid', date: '2026-06-20', cardId: 'card', isReimbursable: true, reimbursementStatus: 'pending' },
  { id: 'far', description: 'Receita distante', amount: 900, flow: 'income', status: 'pending', date: '2026-09-01', accountId: 'account' },
];

const forecast = calculateCashForecast(accounts, cards, transactions, '2026-07-01');
assert.equal(forecast.currentBalance, 1000);
assert.equal(forecast.pendingIncome, 1500);
assert.equal(forecast.pendingFixedExpenses, 700);
assert.equal(forecast.pendingReimbursements, 250);
assert.equal(forecast.projectedBalance, 2050);
assert.equal(forecast.events.length, 3);
assert.ok(!forecast.events.some((event) => event.id.includes('income-paid') || event.id.includes('variable') || event.id.includes('far')));
assert.equal(calculateCashForecast(accounts, cards, transactions, '2026-07-01', 30, false).pendingReimbursements, 0);

const overdue = calculateCashForecast(accounts, [], [{
  id: 'overdue',
  description: 'Fixa vencida',
  amount: 100,
  flow: 'expense',
  status: 'pending',
  date: '2026-06-20',
  accountId: 'account',
  recurringTransactionId: 'rule',
}], '2026-07-01');
assert.equal(overdue.events[0].date, '2026-07-01');
assert.equal(overdue.events[0].overdue, true);

console.log('cash forecast tests passed');
