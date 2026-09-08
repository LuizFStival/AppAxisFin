import { TransactionMeta } from '../../types';

const META_PREFIX = '[axisfin-meta:';
const META_SUFFIX = ']';

export function getVisibleNotes(notes?: string): string {
  if (!notes) return '';
  const index = notes.indexOf(META_PREFIX);
  return (index >= 0 ? notes.slice(0, index) : notes).trim();
}

export function readTransactionMeta(notes?: string): TransactionMeta {
  if (!notes) return {};
  const start = notes.indexOf(META_PREFIX);
  if (start < 0) return {};
  const end = notes.indexOf(META_SUFFIX, start + META_PREFIX.length);
  if (end < 0) return {};

  try {
    const encoded = notes.slice(start + META_PREFIX.length, end);
    return JSON.parse(atob(encoded)) as TransactionMeta;
  } catch {
    return {};
  }
}

export function writeTransactionNotes(visibleNotes: string | undefined, meta: TransactionMeta = {}): string | undefined {
  const cleanNotes = getVisibleNotes(visibleNotes).trim();
  const hasMeta = Object.values(meta).some((value) => value !== undefined && value !== '');
  if (!hasMeta) return cleanNotes || undefined;

  const encoded = btoa(JSON.stringify(meta));
  return [cleanNotes, `${META_PREFIX}${encoded}${META_SUFFIX}`].filter(Boolean).join('\n\n');
}

export function formatDescriptionForTransactionMeta(description: string, meta: TransactionMeta): string {
  if (meta.entryMode !== 'installment' || !meta.installmentNumber || !meta.totalInstallments) return description;
  return `${description.replace(/\s\(\d+\/\d+\)$/, '')} (${meta.installmentNumber}/${meta.totalInstallments})`;
}

export function mergeTransactionMeta(base: TransactionMeta, overrides: TransactionMeta): TransactionMeta {
  return {
    ...base,
    ...overrides,
  };
}

export function getTransactionEntryMode(notes?: string): TransactionMeta['entryMode'] {
  return readTransactionMeta(notes).entryMode;
}

export function isFixedEntryMeta(notes?: string): boolean {
  return getTransactionEntryMode(notes) === 'fixed';
}

export function isInstallmentEntryMeta(notes?: string): boolean {
  return getTransactionEntryMode(notes) === 'installment';
}

export function getTransactionExpenseNeed(notes?: string): TransactionMeta['expenseNeed'] {
  return readTransactionMeta(notes).expenseNeed;
}

export function getTransactionInstallmentLabel(notes?: string): string | undefined {
  const meta = readTransactionMeta(notes);
  if (!meta.installmentNumber || !meta.totalInstallments) return undefined;
  return `${meta.installmentNumber}/${meta.totalInstallments}`;
}

export function hasInvoiceSettlementMeta(notes?: string): boolean {
  const meta = readTransactionMeta(notes);
  return Boolean(meta.paidAt && meta.paidFromAccountId);
}

export function hasRecurringSourceMeta(notes?: string): boolean {
  return Boolean(readTransactionMeta(notes).recurringTransactionId);
}

export function createSeriesId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `series-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
