import assert from 'node:assert/strict';
import type { Card, Transaction } from '../../types';
import { buildOperationalNotifications, preserveNotificationReadState } from './notifications';
import { writeTransactionNotes } from './transactionMeta';

const card: Card = {
  id: 'card',
  name: 'Principal',
  accountId: 'account',
  limit: 3000,
  used: 0,
  dueDay: 2,
  closingDay: 26,
  color: '#000',
  network: 'mastercard',
};

const transactions: Transaction[] = [
  { id: 'due', description: 'Aluguel', amount: 900, flow: 'expense', status: 'pending', date: '2026-07-03', accountId: 'account' },
  { id: 'future', description: 'Futuro', amount: 100, flow: 'expense', status: 'pending', date: '2026-07-20', accountId: 'account' },
  { id: 'invoice', description: 'Compra', amount: 250, flow: 'expense', status: 'paid', date: '2026-05-26', cardId: 'card' },
  { id: 'reimbursement', description: 'Compra de terceiro', amount: 80, flow: 'expense', status: 'paid', date: '2026-05-27', cardId: 'card', isReimbursable: true, reimbursementStatus: 'pending' },
  { id: 'received', description: 'Já recebido', amount: 50, flow: 'expense', status: 'paid', date: '2026-05-28', cardId: 'card', isReimbursable: true, reimbursementStatus: 'received' },
];

const notifications = buildOperationalNotifications(transactions, [card], '2026-07-03');
assert.ok(notifications.some((notification) => notification.sourceKey === 'due:due' && notification.type === 'warning'));
assert.ok(notifications.some((notification) => notification.sourceKey === 'invoice:card:2026-06' && notification.type === 'danger'));
assert.ok(notifications.some((notification) => notification.sourceKey === 'reimbursement:reimbursement' && notification.type === 'danger'));
assert.ok(!notifications.some((notification) => notification.sourceKey === 'due:future'));
assert.ok(!notifications.some((notification) => notification.sourceKey === 'reimbursement:received'));
assert.ok(!buildOperationalNotifications(transactions, [card], '2026-07-03', false).some((notification) => notification.sourceKey.startsWith('reimbursement:')));

const readAt = '2026-07-03T12:00:00.000Z';
const notificationsWithReadState = preserveNotificationReadState(notifications, [
  { sourceKey: 'due:due', readAt },
]);
assert.equal(notificationsWithReadState.find((notification) => notification.sourceKey === 'due:due')?.readAt, readAt);
assert.equal(notificationsWithReadState.find((notification) => notification.sourceKey === 'invoice:card:2026-06')?.readAt, undefined);

const paidInvoice = transactions.map((transaction) => transaction.cardId === 'card'
  ? { ...transaction, notes: writeTransactionNotes(undefined, { paidAt: '2026-07-02', paidFromAccountId: 'account' }) }
  : transaction);
assert.ok(!buildOperationalNotifications(paidInvoice, [card], '2026-07-03').some((notification) => notification.sourceKey.startsWith('invoice:')));

console.log('notification tests passed');
