import assert from 'node:assert/strict';
import { addMonths, formatDatePtBr, formatLocalDate, parseLocalDate } from './date';
import { formatCurrencyInput, maskCurrencyInput, parseCurrencyInput } from './currency';
import { getVisibleNotes, readTransactionMeta, writeTransactionNotes } from './transactionMeta';

assert.equal(parseCurrencyInput('R$ 1.234,56'), 1234.56);
assert.equal(parseCurrencyInput(''), 0);
assert.equal(maskCurrencyInput('123456'), 'R$ 1.234,56');
assert.equal(formatCurrencyInput(0), 'R$ 0,00');

assert.equal(formatLocalDate(parseLocalDate('2026-02-28')), '2026-02-28');
assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
assert.equal(formatDatePtBr('2026-06-09'), '09/06/2026');

const notes = writeTransactionNotes('Observação visível', {
  entryMode: 'installment',
  expenseNeed: 'essential',
  installmentNumber: 2,
  totalInstallments: 6,
});
assert.equal(getVisibleNotes(notes), 'Observação visível');
assert.deepEqual(readTransactionMeta(notes), {
  entryMode: 'installment',
  expenseNeed: 'essential',
  installmentNumber: 2,
  totalInstallments: 6,
});
assert.deepEqual(readTransactionMeta('texto sem metadados'), {});
assert.deepEqual(readTransactionMeta('[axisfin-meta:inválido]'), {});
assert.equal(writeTransactionNotes('  somente texto  '), 'somente texto');

console.log('currency, date and metadata tests passed');
