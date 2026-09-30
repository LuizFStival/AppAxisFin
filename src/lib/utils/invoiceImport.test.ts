import assert from 'node:assert/strict';
import { Card, Category, Transaction } from '../../types';
import { writeTransactionNotes } from './transactionMeta';
import {
  buildInvoiceImportTransactions,
  filterInvoiceImportItemsByCardPeriod,
  parseNubankInvoiceCsv,
  reconcileInvoiceImportItems,
  suggestInvoiceImportCategoryId,
} from './invoiceImport';

const card: Card = {
  id: 'card-nubank',
  name: 'Nubank',
  accountId: 'account-nubank',
  limit: 5000,
  used: 0,
  dueDay: 17,
  closingDay: 10,
  color: '#8A05BE',
  network: 'mastercard',
  isActive: true,
};

const categories: Category[] = [
  { id: 'cat-food', name: 'Alimentação', flow: 'expense', color: '#F43F5E', icon: 'Utensils' },
  { id: 'cat-services', name: 'Serviços', flow: 'expense', color: '#F59E0B', icon: 'Settings' },
];

const csv = `date,title,amount
2026-09-11,Padaria Bom Dia,12.34
2026-09-12,Netflix - Parcela 2/5,29.90
2026-09-13,Estorno Nubank,-10.00
`;

const parsed = parseNubankInvoiceCsv(csv);
assert.equal(parsed.items.length, 3);
assert.equal(parsed.items[0].amount, 12.34);
assert.equal(parsed.items[0].categoryHint, 'Alimentação');
assert.equal(parsed.items[1].baseTitle, 'Netflix');
assert.equal(parsed.items[1].installmentNumber, 2);
assert.equal(parsed.items[1].totalInstallments, 5);
assert.equal(parsed.items[2].kind, 'credit');

const periodItems = filterInvoiceImportItemsByCardPeriod(parsed.items, card, '2026-10');
assert.equal(periodItems.length, 3);

const existing: Transaction = {
  id: 'existing',
  description: 'Padoca principal',
  amount: 12.34,
  flow: 'expense',
  status: 'pending',
  date: '2026-09-11',
  cardId: card.id,
  notes: writeTransactionNotes(undefined, { entryMode: 'variable' }),
};

const reconciled = reconcileInvoiceImportItems(periodItems, [existing]);
assert.equal(reconciled[0].matchStatus, 'matched');
assert.equal(reconciled[0].matchReason, 'date_amount');
assert.equal(reconciled[1].matchStatus, 'new');

const categoryByImportId = Object.fromEntries(
  reconciled.map((item) => [item.id, suggestInvoiceImportCategoryId(categories, item) ?? '']),
);
const transactions = buildInvoiceImportTransactions({
  items: reconciled,
  cardId: card.id,
  categoryByImportId,
  reimbursementByImportId: {
    [reconciled[1].id]: {
      splitMode: 'shared',
      reimbursementPersonId: 'person-1',
      personalAmount: 10,
      reimbursementStatus: 'pending',
    },
  },
  reimbursementPersonNameById: {
    'person-1': 'Viagem BC',
  },
});
assert.equal(transactions.length, 3);
assert.equal(transactions[0].description, 'Netflix (2/5)');
assert.equal(transactions[0].categoryId, 'cat-services');
assert.equal(transactions[0].amount, 10);
assert.equal(transactions[0].splitMode, 'none');
assert.equal(transactions[0].isReimbursable, false);
assert.equal(transactions[1].description, 'Netflix (2/5) - Viagem BC');
assert.equal(transactions[1].amount, 19.9);
assert.equal(transactions[1].splitMode, 'third_party_full');
assert.equal(transactions[1].personalAmount, 0);
assert.equal(transactions[1].reimbursementAmount, 19.9);
assert.equal(transactions[1].reimbursementPersonId, 'person-1');
assert.equal(transactions[2].description, 'Estorno Nubank');
assert.equal(transactions[2].amount, 10);

const reimported = reconcileInvoiceImportItems(periodItems, [
  { ...transactions[0], id: 'personal-imported' },
  { ...transactions[1], id: 'reimbursement-imported' },
  { ...transactions[2], id: 'credit-imported' },
]);
assert.equal(reimported[1].matchStatus, 'matched');
assert.equal(reimported[1].matchReason, 'import_id');
