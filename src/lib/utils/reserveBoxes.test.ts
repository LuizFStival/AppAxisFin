import assert from 'node:assert/strict';
import { ReserveBox, ReserveBoxMovement } from '../../types';
import {
  estimateReserveYield,
  getReserveBoxExpectedBalance,
  getReserveBoxMovements,
  getReserveInstitutions,
  summarizeReserveBoxes,
} from './reserveBoxes';

const boxes: ReserveBox[] = [
  {
    id: 'turbo',
    name: 'Turbo Ultravioleta',
    institution: 'Nubank',
    cdiPercent: 120,
    initialBalance: 10000,
    currentBalance: 10000,
    createdOn: '2026-08-01',
    goal: 'Reserva',
    color: '#8A05BE',
    icon: 'Zap',
    lastBalanceUpdate: '2026-08-01',
    isActive: true,
  },
  {
    id: 'cofrinhos',
    name: 'Cofrinhos',
    institution: 'Mercado Pago',
    cdiPercent: 115,
    initialBalance: 5000,
    currentBalance: 5000,
    createdOn: '2026-08-10',
    color: '#009EE3',
    icon: 'PiggyBank',
    lastBalanceUpdate: '2026-08-10',
    isActive: true,
  },
  {
    id: 'old',
    name: 'Antiga',
    institution: '99Pay',
    cdiPercent: 100,
    initialBalance: 1000,
    currentBalance: 1000,
    createdOn: '2026-08-01',
    color: '#F8D117',
    icon: 'Archive',
    lastBalanceUpdate: '2026-08-01',
    isActive: false,
  },
];

const yield30Days = estimateReserveYield(10000, 120, '2026-08-01', '2026-08-31');
assert.ok(yield30Days > 95 && yield30Days < 105);
assert.equal(getReserveBoxExpectedBalance(boxes[0], '2026-08-01'), 10000);

const summary = summarizeReserveBoxes(boxes, '2026-08-31');
assert.equal(summary.count, 2);
assert.equal(summary.totalBalance, 15000);
assert.ok(summary.estimatedYield > 120 && summary.estimatedYield < 140);
assert.equal(summary.expectedBalance, summary.totalBalance + summary.estimatedYield);

assert.deepEqual(getReserveInstitutions(boxes), ['99Pay', 'Mercado Pago', 'Nubank']);

const movements: ReserveBoxMovement[] = [
  { id: 'one', reserveBoxId: 'turbo', type: 'deposit', amount: 100, date: '2026-08-02', createdAt: '2026-08-02T10:00:00Z' },
  { id: 'two', reserveBoxId: 'turbo', type: 'yield', amount: 12, date: '2026-08-10', createdAt: '2026-08-10T10:00:00Z' },
  { id: 'other', reserveBoxId: 'cofrinhos', type: 'withdrawal', amount: 10, date: '2026-08-11' },
];

assert.deepEqual(getReserveBoxMovements(boxes[0], movements).map((movement) => movement.id), ['two', 'one']);

console.log('reserve box tests passed');
