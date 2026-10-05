import assert from 'node:assert/strict';
import { Account } from '../../types';
import { buildAccountBalanceAdjustmentTransaction } from './accountBalanceAdjustment';
import { readTransactionMeta } from './transactionMeta';

const account: Account = {
  id: 'account-99pay',
  name: '99Pay',
  type: 'investment',
  balance: 738.29,
  lastBalanceUpdate: '2026-09-29',
  color: '#FACC15',
  institution: '99Pay',
  isActive: true,
};

const increase = buildAccountBalanceAdjustmentTransaction({
  account,
  balance: 748.29,
  date: '2026-09-29',
  description: 'Rendimento CDI 99Pay',
});

assert.ok(increase);
assert.equal(increase.description, 'Rendimento CDI 99Pay');
assert.equal(increase.flow, 'income');
assert.equal(increase.amount, 10);
assert.equal(increase.accountId, account.id);
assert.equal(readTransactionMeta(increase.notes).accountBalanceAdjustment, 'increase');
assert.equal(readTransactionMeta(increase.notes).accountBalancePreviousBalance, 738.29);
assert.equal(readTransactionMeta(increase.notes).accountBalanceNewBalance, 748.29);

const decrease = buildAccountBalanceAdjustmentTransaction({
  account,
  balance: 700,
  date: '2026-09-29',
});

assert.ok(decrease);
assert.equal(decrease.description, 'Ajuste negativo de saldo');
assert.equal(decrease.flow, 'expense');
assert.equal(decrease.amount, 38.29);
assert.equal(readTransactionMeta(decrease.notes).accountBalanceAdjustment, 'decrease');

const unchanged = buildAccountBalanceAdjustmentTransaction({
  account,
  balance: 738.29,
  date: '2026-09-29',
});

assert.equal(unchanged, undefined);

const internalTransferAdjustment = buildAccountBalanceAdjustmentTransaction({
  account,
  balance: 883.47,
  date: '2026-09-29',
  description: 'Resgate Dolar',
  adjustmentNature: 'internal_transfer',
});

assert.ok(internalTransferAdjustment);
assert.equal(internalTransferAdjustment.flow, 'income');
assert.equal(internalTransferAdjustment.amount, 145.18);
assert.equal(readTransactionMeta(internalTransferAdjustment.notes).internalTransfer, 'balance_adjustment');
