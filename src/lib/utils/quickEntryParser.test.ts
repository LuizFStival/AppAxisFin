import { strict as assert } from 'node:assert';
import { parseQuickEntries } from './quickEntryParser';

const [first, second] = parseQuickEntries(
  '28/06 | Shopping Brei estacionamento | 21,50 | Transporte\nAmazon 29/06 R$ 82,28 Compras\ndia 4 de agosto keep Cut 32,90',
  new Date(2026, 7, 16),
);
const third = parseQuickEntries('dia 4 de agosto keep Cut 32,90', new Date(2026, 7, 16))[0];

assert.equal(first.date, '2026-06-28');
assert.equal(first.description, 'Shopping Brei estacionamento');
assert.equal(first.amount, 21.5);
assert.equal(first.categoryHint, 'Transporte');

assert.equal(second.date, '2026-06-29');
assert.equal(second.description, 'Amazon Compras');
assert.equal(second.amount, 82.28);
assert.equal(second.error, undefined);

assert.equal(third.date, '2026-08-04');
assert.equal(third.description, 'keep Cut');
assert.equal(third.amount, 32.9);
