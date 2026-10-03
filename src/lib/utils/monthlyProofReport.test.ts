import assert from 'node:assert/strict';
import { Account, Card, Category, ReimbursementPerson, Transaction } from '../../types';
import { buildMonthlyProofReportRows } from './monthlyProofReport';
import { writeTransactionNotes } from './transactionMeta';

const accounts: Account[] = [
  { id: 'acc-main', name: 'Nubank', type: 'checking', balance: 1000, lastBalanceUpdate: '2026-09-30', color: '#8A05BE', institution: 'Nubank', isActive: true },
];

const card: Card = {
  id: 'card-main',
  name: 'NuCredito',
  accountId: 'acc-main',
  limit: 3000,
  used: 0,
  dueDay: 5,
  closingDay: 30,
  color: '#8A05BE',
  network: 'mastercard',
  isActive: true,
};

const categories: Category[] = [
  { id: 'income', name: 'Receita', flow: 'income', color: '#10B981', icon: 'Briefcase' },
  { id: 'food', name: 'Alimentacao', flow: 'expense', color: '#EF4444', icon: 'Utensils' },
  { id: 'leisure', name: 'Lazer', flow: 'expense', color: '#38BDF8', icon: 'Compass' },
];

const people: ReimbursementPerson[] = [
  { id: 'person-trip', name: 'Viagem BC' },
];

const transactions: Transaction[] = [
  { id: 'salary', description: 'Salario', amount: 1000, flow: 'income', status: 'paid', date: '2026-09-05', accountId: 'acc-main', categoryId: 'income' },
  { id: 'account-expense', description: 'Internet', amount: 80, flow: 'expense', status: 'paid', date: '2026-09-10', accountId: 'acc-main', categoryId: 'food' },
  { id: 'card-personal', description: 'Mercado cartao', amount: 300, flow: 'expense', status: 'paid', date: '2026-09-12', cardId: card.id, categoryId: 'food' },
  {
    id: 'card-shared',
    description: 'Ticket viagem',
    amount: 120,
    flow: 'expense',
    status: 'paid',
    date: '2026-09-18',
    cardId: card.id,
    categoryId: 'leisure',
    isReimbursable: true,
    splitMode: 'shared',
    personalAmount: 50,
    reimbursementAmount: 70,
    reimbursementPersonId: 'person-trip',
    reimbursementStatus: 'pending',
  },
  {
    id: 'invoice-payment',
    description: 'Pagamento da fatura NuCredito',
    amount: 420,
    flow: 'expense',
    status: 'paid',
    date: '2026-10-02',
    accountId: 'acc-main',
    notes: writeTransactionNotes(undefined, {
      invoicePaymentCardId: card.id,
      invoicePaymentPeriod: '2026-09',
    }),
  },
];

const rows = buildMonthlyProofReportRows({
  month: '2026-09',
  transactions,
  categories,
  accounts,
  cards: [card],
  reserveBoxes: [],
  reimbursementPeople: people,
  reimbursementsEnabled: true,
  visualScopeLabel: 'Geral',
});

const summaryOutflow = rows.find((row) => row[0] === 'Resumo do mes' && row[7] === 'Saidas totais');
assert.ok(summaryOutflow);
assert.equal(summaryOutflow[9], '-500,00');
assert.equal(summaryOutflow[10], '-430,00');
assert.equal(summaryOutflow[11], '-70,00');

const invoicePayment = rows.find((row) => row[0] === 'Pagamentos de fatura' && row[7] === 'Pagamento da fatura NuCredito');
assert.ok(invoicePayment);
assert.equal(invoicePayment[9], '-420,00');
assert.match(String(invoicePayment[12]), /Nao conta como novo gasto/);

const invoiceSummary = rows.find((row) => row[0] === 'Faturas do mes' && row[4] === 'NuCredito');
assert.ok(invoiceSummary);
assert.equal(invoiceSummary[9], '-420,00');
assert.equal(invoiceSummary[10], '-350,00');
assert.equal(invoiceSummary[11], '-70,00');

const reimbursement = rows.find((row) => row[0] === 'Reembolsos' && row[6] === 'Viagem BC');
assert.ok(reimbursement);
assert.equal(reimbursement[11], '70,00');

console.log('monthly proof report tests passed');
