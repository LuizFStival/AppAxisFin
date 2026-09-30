import { Card, Category, ReimbursementStatus, Transaction, TransactionMeta } from '../../types';
import { getCardInvoiceClosingMonth } from './cardInvoices';
import { roundMoney } from './finance';
import { readTransactionMeta, writeTransactionNotes } from './transactionMeta';

export type InvoiceImportKind = 'expense' | 'credit';
export type InvoiceImportMatchStatus = 'new' | 'matched';
export type InvoiceImportMatchReason = 'import_id' | 'merchant' | 'date_amount' | 'manual';
export type InvoiceImportSplitMode = 'personal' | 'third_party_full' | 'shared';

export interface InvoiceImportReimbursementDraft {
  splitMode: InvoiceImportSplitMode;
  reimbursementPersonId?: string;
  personalAmount?: number;
  reimbursementStatus?: ReimbursementStatus;
}

export interface ImportedInvoiceItem {
  id: string;
  bank: 'nubank';
  date: string;
  title: string;
  baseTitle: string;
  merchantKey: string;
  amount: number;
  kind: InvoiceImportKind;
  installmentNumber?: number;
  totalInstallments?: number;
  categoryHint: string;
}

export interface InvoiceImportParseResult {
  items: ImportedInvoiceItem[];
  errors: string[];
}

export interface ReconciledInvoiceImportItem extends ImportedInvoiceItem {
  matchStatus: InvoiceImportMatchStatus;
  matchReason?: InvoiceImportMatchReason;
  matchedTransaction?: Transaction;
}

const NUBANK_ALIASES = {
  date: ['date', 'data'],
  title: ['title', 'titulo', 'descrição', 'descricao', 'estabelecimento'],
  amount: ['amount', 'valor'],
};

const INSTALLMENT_PATTERNS = [
  /\s*-\s*parcela\s+(\d+)\s*\/\s*(\d+)\s*$/i,
  /\s*\((\d+)\s*\/\s*(\d+)\)\s*$/i,
];

const CATEGORY_RULES: Array<[string, RegExp]> = [
  ['Alimentação', /ifood|rappi|restaurante|lanchonete|padaria|mercado|supermerc|atacad|carrefour|assai|muffato|condor|burger|pizza|sushi|cafe|acai/],
  ['Transporte', /uber|\b99\b|posto|shell|ipiranga|petrobras|combust|estacionamento|sem parar|pedagio|metro|auto|mecanica|pneu/],
  ['Serviços', /netflix|spotify|prime|amazon prime|disney|youtube|google|microsoft|adobe|apple|icloud|openai|chatgpt|canva|assinatura|servico/],
  ['Moradia', /leroy|construc|madeira|moveis|cobasi|petz|pet\b|casa/],
  ['Lazer', /cinema|ingresso|sympla|eventim|steam|playstation|xbox|nintendo|hotel|airbnb|booking|latam|azul|gol\b|viagem|show/],
];

export function parseNubankInvoiceCsv(text: string): InvoiceImportParseResult {
  const rows = parseCsv(text, detectDelimiter(text));
  if (rows.length < 2) throw new Error('CSV vazio ou sem lançamentos.');

  const header = rows[0];
  const columns = resolveColumns(header);
  const errors: string[] = [];
  const seen = new Map<string, number>();
  const items: ImportedInvoiceItem[] = [];

  rows.slice(1).forEach((row, index) => {
    try {
      const date = normalizeDate(row[columns.date]);
      const title = String(row[columns.title] ?? '').trim();
      if (!title) throw new Error('descrição vazia');

      const amountCents = parseAmountToCents(row[columns.amount]);
      if (amountCents === 0) throw new Error('valor zerado');

      const installmentInfo = parseInstallment(title);
      const merchant = merchantKey(installmentInfo.baseTitle);
      const fingerprint = `nubank|${date}|${title}|${amountCents}`;
      const occurrence = (seen.get(fingerprint) ?? 0) + 1;
      seen.set(fingerprint, occurrence);

      items.push({
        id: hashId(`${fingerprint}|${occurrence}`),
        bank: 'nubank',
        date,
        title,
        baseTitle: installmentInfo.baseTitle,
        merchantKey: merchant,
        amount: roundMoney(Math.abs(amountCents) / 100),
        kind: amountCents < 0 ? 'credit' : 'expense',
        installmentNumber: installmentInfo.installment?.current,
        totalInstallments: installmentInfo.installment?.total,
        categoryHint: inferCategoryHint(merchant),
      });
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'não foi possível ler'}`);
    }
  });

  if (items.length === 0) {
    throw new Error(`Nenhum lançamento válido encontrado. ${errors.slice(0, 2).join('; ')}`);
  }

  return { items, errors };
}

export function filterInvoiceImportItemsByCardPeriod(items: ImportedInvoiceItem[], card: Card, closingMonth: string) {
  return items.filter((item) => getCardInvoiceClosingMonth(card, item.date) === closingMonth);
}

export function reconcileInvoiceImportItems(
  items: ImportedInvoiceItem[],
  existingTransactions: Transaction[],
): ReconciledInvoiceImportItem[] {
  const usedTransactionIds = new Set<string>();

  return items.map((item) => {
    const sameImportedCount = items.filter((candidate) =>
      candidate.kind === item.kind
      && candidate.date === item.date
      && candidate.amount === item.amount).length;
    const exactImportMatch = existingTransactions.find((transaction) => {
      const meta = readTransactionMeta(transaction.notes);
      const sameKind = item.kind === 'credit' ? meta.invoiceAdjustment === 'credit' : meta.invoiceAdjustment !== 'credit';
      return sameKind
        && meta.invoiceImportId === item.id
        && !usedTransactionIds.has(transaction.id);
    });
    const candidates = existingTransactions.filter((transaction) => {
      const meta = readTransactionMeta(transaction.notes);
      const sameKind = item.kind === 'credit' ? meta.invoiceAdjustment === 'credit' : meta.invoiceAdjustment !== 'credit';
      return sameKind
        && transaction.date === item.date
        && roundMoney(transaction.amount) === item.amount
        && !usedTransactionIds.has(transaction.id);
    });
    const merchantMatch = exactImportMatch ? undefined : candidates.find((transaction) => merchantKey(transaction.description) === item.merchantKey);
    const dateAmountMatch = exactImportMatch || merchantMatch || sameImportedCount !== 1 || candidates.length !== 1
      ? undefined
      : candidates[0];
    const matchedTransaction = exactImportMatch ?? merchantMatch ?? dateAmountMatch;

    if (matchedTransaction) usedTransactionIds.add(matchedTransaction.id);

    return {
      ...item,
      matchStatus: matchedTransaction ? 'matched' : 'new',
      matchReason: exactImportMatch ? 'import_id' : merchantMatch ? 'merchant' : dateAmountMatch ? 'date_amount' : undefined,
      matchedTransaction,
    };
  });
}

export function suggestInvoiceImportCategoryId(categories: Category[], item: ImportedInvoiceItem): string | undefined {
  const expenseCategories = categories.filter((category) => category.flow === 'expense');
  return expenseCategories.find((category) => normalizeText(category.name) === normalizeText(item.categoryHint))?.id
    ?? expenseCategories.find((category) => normalizeText(item.categoryHint).includes(normalizeText(category.name)))?.id
    ?? expenseCategories.find((category) => normalizeText(category.name) === 'servicos' && item.categoryHint === 'Serviços')?.id
    ?? undefined;
}

export function buildInvoiceImportTransactions(input: {
  items: ReconciledInvoiceImportItem[];
  cardId: string;
  categoryByImportId: Record<string, string>;
  reimbursementByImportId?: Record<string, InvoiceImportReimbursementDraft>;
  reimbursementPersonNameById?: Record<string, string>;
}): Array<Omit<Transaction, 'id'>> {
  return input.items
    .filter((item) => item.matchStatus === 'new')
    .flatMap((item): Array<Omit<Transaction, 'id'>> => {
      const isInstallment = Boolean(item.installmentNumber && item.totalInstallments);
      const reimbursementDraft = item.kind === 'expense' ? input.reimbursementByImportId?.[item.id] : undefined;
      const splitMode = reimbursementDraft?.splitMode ?? 'personal';
      const reimbursement = buildReimbursementValues(item.amount, reimbursementDraft);
      const effectiveSplitMode = splitMode === 'shared' && reimbursement?.personalAmount === 0
        ? 'third_party_full'
        : splitMode === 'shared' && reimbursement?.reimbursementAmount === 0
          ? 'personal'
          : splitMode;
      const baseMeta: TransactionMeta = {
        entryMode: isInstallment ? 'installment' : 'variable',
        invoiceAdjustment: item.kind === 'credit' ? 'credit' : undefined,
        installmentNumber: item.installmentNumber,
        totalInstallments: item.totalInstallments,
        generatedFrom: isInstallment ? item.date : undefined,
        invoiceImportSource: 'nubank_csv',
        invoiceImportId: item.id,
        invoiceImportBank: item.bank,
      };
      const baseDescription = isInstallment ? `${item.baseTitle} (${item.installmentNumber}/${item.totalInstallments})` : item.baseTitle;
      const categoryId = input.categoryByImportId[item.id] || undefined;

      if (effectiveSplitMode === 'shared' && reimbursement && reimbursement.personalAmount > 0 && reimbursement.reimbursementAmount > 0) {
        const personName = reimbursementDraft?.reimbursementPersonId
          ? input.reimbursementPersonNameById?.[reimbursementDraft.reimbursementPersonId]
          : undefined;
        return [
          {
            description: baseDescription,
            amount: reimbursement.personalAmount,
            flow: 'expense',
            status: 'pending',
            date: item.date,
            notes: writeTransactionNotes(undefined, { ...baseMeta, invoiceImportPart: 'personal' }),
            categoryId,
            cardId: input.cardId,
            isReimbursable: false,
            splitMode: 'none',
          },
          {
            description: personName ? `${baseDescription} - ${personName}` : `${baseDescription} - terceiro`,
            amount: reimbursement.reimbursementAmount,
            flow: 'expense',
            status: 'pending',
            date: item.date,
            notes: writeTransactionNotes(undefined, { ...baseMeta, expenseNeed: undefined, invoiceImportPart: 'reimbursement' }),
            categoryId,
            cardId: input.cardId,
            isReimbursable: true,
            splitMode: 'third_party_full',
            personalAmount: 0,
            reimbursementAmount: reimbursement.reimbursementAmount,
            reimbursementPersonId: reimbursementDraft?.reimbursementPersonId,
            reimbursementStatus: reimbursementDraft?.reimbursementStatus ?? 'pending',
          },
        ] satisfies Array<Omit<Transaction, 'id'>>;
      }

      return [{
        description: baseDescription,
        amount: item.amount,
        flow: 'expense',
        status: 'pending',
        date: item.date,
        notes: writeTransactionNotes(undefined, { ...baseMeta, invoiceImportPart: effectiveSplitMode === 'third_party_full' ? 'reimbursement' : 'personal' }),
        categoryId,
        cardId: input.cardId,
        isReimbursable: effectiveSplitMode !== 'personal',
        splitMode: effectiveSplitMode === 'personal' ? 'none' : effectiveSplitMode,
        personalAmount: reimbursement?.personalAmount,
        reimbursementAmount: reimbursement?.reimbursementAmount,
        reimbursementPersonId: effectiveSplitMode !== 'personal' ? reimbursementDraft?.reimbursementPersonId : undefined,
        reimbursementStatus: effectiveSplitMode !== 'personal' ? reimbursementDraft?.reimbursementStatus ?? 'pending' : undefined,
      }];
    });
}

function buildReimbursementValues(amount: number, draft?: InvoiceImportReimbursementDraft) {
  if (!draft || draft.splitMode === 'personal') return undefined;
  if (draft.splitMode === 'third_party_full') {
    return {
      personalAmount: 0,
      reimbursementAmount: amount,
    };
  }

  const personalAmount = Math.max(0, Math.min(amount, roundMoney(draft.personalAmount ?? amount / 2)));
  return {
    personalAmount,
    reimbursementAmount: roundMoney(amount - personalAmount),
  };
}

function parseCsv(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const source = String(text).replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  return firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
}

function resolveColumns(header: string[]) {
  const normalizedHeader = header.map(normalizeText);
  const columns = {
    date: findColumn(normalizedHeader, NUBANK_ALIASES.date),
    title: findColumn(normalizedHeader, NUBANK_ALIASES.title),
    amount: findColumn(normalizedHeader, NUBANK_ALIASES.amount),
  };

  if (Object.values(columns).some((index) => index < 0)) {
    throw new Error(`Não encontrei as colunas de data, título e valor no CSV (${header.join(', ')}).`);
  }

  return columns;
}

function findColumn(header: string[], aliases: string[]) {
  return header.findIndex((column) => aliases.map(normalizeText).includes(column));
}

function normalizeDate(raw: string) {
  const value = String(raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const brDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return `${brDate[3]}-${brDate[2]}-${brDate[1]}`;

  throw new Error(`data inválida "${raw}"`);
}

function parseAmountToCents(raw: string) {
  let value = String(raw ?? '').trim().replace(/\s+/g, '').replace(/^R\$/i, '');
  if (!value) throw new Error('valor vazio');

  let negative = false;
  if (value.startsWith('-')) {
    negative = true;
    value = value.slice(1);
  } else if (value.startsWith('(') && value.endsWith(')')) {
    negative = true;
    value = value.slice(1, -1);
  }

  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`valor inválido "${raw}"`);

  const [reais, cents = ''] = value.split('.');
  const parsed = Number(reais) * 100 + Number(cents.padEnd(2, '0'));
  return negative ? -parsed : parsed;
}

function parseInstallment(title: string) {
  for (const pattern of INSTALLMENT_PATTERNS) {
    const match = title.match(pattern);
    if (!match) continue;

    const current = Number(match[1]);
    const total = Number(match[2]);
    return {
      baseTitle: title.replace(pattern, '').trim(),
      installment: current > 0 && total >= current ? { current, total } : undefined,
    };
  }

  return { baseTitle: title.trim(), installment: undefined };
}

function inferCategoryHint(key: string) {
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(key)) return category;
  }
  return 'Lazer';
}

function merchantKey(title: string) {
  return normalizeText(parseInstallment(title).baseTitle)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeText(value: string) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function hashId(value: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let index = 0; index < value.length; index += 1) {
    const char = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
