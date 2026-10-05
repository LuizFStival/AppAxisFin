import assert from 'node:assert/strict';
import { Account, ReserveBox, ReserveBoxMovement, Transaction } from '../../types';
import { summarizeBalanceFreshness, summarizePatrimonyVariation } from './patrimony';

const accounts: Account[] = [
  { id: 'main', name: 'Nubank', type: 'checking', balance: 1200, lastBalanceUpdate: '2026-09-10', color: '#8A05BE', institution: 'Nubank', isActive: true },
  { id: 'old', name: 'Antiga', type: 'checking', balance: 500, lastBalanceUpdate: '2026-08-01', color: '#64748B', institution: 'Banco', isActive: false },
];

const reserveBoxes: ReserveBox[] = [
  {
    id: 'reserve',
    name: 'Viagem',
    institution: 'Nubank',
    cdiPercent: 100,
    initialBalance: 300,
    currentBalance: 500,
    createdOn: '2026-08-01',
    color: '#22C55E',
    icon: 'PiggyBank',
    lastBalanceUpdate: '2026-09-19',
    isActive: true,
  },
];

const transactions: Transaction[] = [
  { id: 'salary', description: 'Salario', amount: 1000, flow: 'income', status: 'paid', date: '2026-09-05', accountId: 'main' },
  { id: 'market', description: 'Mercado', amount: 300, flow: 'expense', status: 'paid', date: '2026-09-06', accountId: 'main' },
];

const reserveMovements: ReserveBoxMovement[] = [
  { id: 'linked-deposit', reserveBoxId: 'reserve', accountId: 'main', type: 'deposit', amount: 200, date: '2026-09-07' },
  { id: 'yield', reserveBoxId: 'reserve', type: 'yield', amount: 10, date: '2026-09-08' },
  { id: 'external-deposit', reserveBoxId: 'reserve', type: 'deposit', amount: 100, date: '2026-09-09' },
  { id: 'old-month', reserveBoxId: 'reserve', accountId: 'main', type: 'withdrawal', amount: 50, date: '2026-08-30' },
];

const summary = summarizePatrimonyVariation({
  accounts,
  reserveBoxes,
  reserveBoxMovements: reserveMovements,
  transactions,
  month: '2026-09',
  referenceDate: '2026-09-20',
});

assert.equal(summary.accountPatrimony, 1200);
assert.equal(summary.reservePatrimony, 500);
assert.equal(summary.currentPatrimony, 1700);
assert.equal(summary.monthlyAccountChange, 500);
assert.equal(summary.monthlyReserveChange, 310);
assert.equal(summary.monthlyPatrimonyChange, 810);
assert.equal(summary.externalContributions, 100);
assert.equal(summary.adjustedPatrimonyChange, 710);
assert.equal(summary.estimatedStartPatrimony, 890);
assert.equal(summary.freshness.staleCount, 1);
assert.equal(summary.freshness.mixedBalanceDates, true);

const freshness = summarizeBalanceFreshness(accounts, reserveBoxes, '2026-09-20');
assert.equal(freshness.items.length, 2);
assert.deepEqual(freshness.staleItems.map((item) => item.name), ['Nubank']);

console.log('patrimony tests passed');
