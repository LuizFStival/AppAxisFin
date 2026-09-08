import {
  EntryStatus,
  ExpenseNeed,
  ExpenseSplitMode,
  MoneyFlow,
  ReimbursementPerson,
  ReimbursementStatus,
  Transaction,
  TransactionMeta,
} from '../../types';
import { addMonths } from '../../lib/utils/date';
import { createSeriesId, formatDescriptionForTransactionMeta, mergeTransactionMeta, writeTransactionNotes } from '../../lib/utils/transactionMeta';
import { parseEntryCount, PaymentSourceType } from './addEntryRules';
import { QuickReviewItem } from './QuickEntry';

export interface AddEntryDraft {
  flow: MoneyFlow;
  amount: number;
  status: EntryStatus;
  notes?: string;
  categoryId?: string;
  sourceType: PaymentSourceType;
  accountId?: string;
  cardId?: string;
  splitMode: ExpenseSplitMode;
  expenseNeed: ExpenseNeed | '';
  isInvoiceCredit: boolean;
  hasPersonalExpenseShare: boolean;
  personalAmount: number;
  reimbursementAmount: number;
  reimbursementPersonId?: string;
  reimbursementStatus: ReimbursementStatus;
  reimbursementReceivedAccountId?: string;
  reimbursementPeople: ReimbursementPerson[];
}

export interface QuickEntrySaveDraft {
  sourceType: PaymentSourceType;
  accountId?: string;
  cardId?: string;
  items: QuickReviewItem[];
}

function shouldUseCard(draft: AddEntryDraft): boolean {
  return draft.flow === 'expense' && (draft.sourceType === 'card' || draft.isInvoiceCredit);
}

function shouldMarkReimbursement(draft: AddEntryDraft): boolean {
  return draft.flow === 'expense' && draft.splitMode !== 'none' && !draft.isInvoiceCredit;
}

function reimbursementPersonName(draft: AddEntryDraft): string | undefined {
  return draft.reimbursementPeople.find((person) => person.id === draft.reimbursementPersonId)?.name;
}

export function buildSingleEntryTransaction(
  draft: AddEntryDraft,
  dateValue: string,
  descriptionValue: string,
  meta: TransactionMeta,
): Omit<Transaction, 'id'> {
  const nextMeta = mergeTransactionMeta(meta, {
    expenseNeed: draft.hasPersonalExpenseShare ? draft.expenseNeed || undefined : undefined,
    invoiceAdjustment: draft.flow === 'expense' && draft.isInvoiceCredit ? 'credit' : undefined,
  });
  const useCard = shouldUseCard(draft);
  const markReimbursement = shouldMarkReimbursement(draft);

  return {
    description: formatDescriptionForTransactionMeta(descriptionValue, meta),
    amount: draft.amount,
    flow: draft.flow,
    status: useCard ? 'pending' : draft.status,
    date: dateValue,
    notes: writeTransactionNotes(draft.notes, nextMeta),
    categoryId: draft.categoryId,
    accountId: useCard ? undefined : draft.accountId,
    cardId: useCard ? draft.cardId || undefined : undefined,
    isReimbursable: markReimbursement,
    splitMode: markReimbursement ? draft.splitMode : 'none',
    personalAmount: markReimbursement ? draft.personalAmount : undefined,
    reimbursementAmount: markReimbursement ? draft.reimbursementAmount : undefined,
    reimbursementPersonId: markReimbursement ? draft.reimbursementPersonId : undefined,
    reimbursementStatus: markReimbursement ? draft.reimbursementStatus : undefined,
    reimbursementReceivedAt: markReimbursement && draft.reimbursementStatus === 'received' ? dateValue : undefined,
    reimbursementReceivedAccountId: markReimbursement && draft.reimbursementStatus === 'received'
      ? draft.reimbursementReceivedAccountId || undefined
      : undefined,
  };
}

export function buildSharedEntryTransactions(
  draft: AddEntryDraft,
  dateValue: string,
  descriptionValue: string,
  meta: TransactionMeta,
): Array<Omit<Transaction, 'id'>> {
  const personName = reimbursementPersonName(draft);
  const baseMeta = mergeTransactionMeta(meta, { invoiceAdjustment: undefined });
  const personalMeta = mergeTransactionMeta(baseMeta, { expenseNeed: draft.expenseNeed || undefined });
  const reimbursementMeta = mergeTransactionMeta(baseMeta, { expenseNeed: undefined });
  const useCard = draft.sourceType === 'card';
  const personalDescription = formatDescriptionForTransactionMeta(descriptionValue, personalMeta);
  const reimbursementDescription = formatDescriptionForTransactionMeta(
    personName ? `${descriptionValue} - ${personName}` : `${descriptionValue} - terceiro`,
    reimbursementMeta,
  );

  return [
    {
      description: personalDescription,
      amount: draft.personalAmount,
      flow: 'expense',
      status: useCard ? 'pending' : draft.status,
      date: dateValue,
      notes: writeTransactionNotes(draft.notes, personalMeta),
      categoryId: draft.categoryId,
      accountId: useCard ? undefined : draft.accountId,
      cardId: useCard ? draft.cardId || undefined : undefined,
      isReimbursable: false,
      splitMode: 'none',
    },
    {
      description: reimbursementDescription,
      amount: draft.reimbursementAmount,
      flow: 'expense',
      status: useCard ? 'pending' : draft.status,
      date: dateValue,
      notes: writeTransactionNotes(draft.notes, reimbursementMeta),
      categoryId: draft.categoryId,
      accountId: useCard ? undefined : draft.accountId,
      cardId: useCard ? draft.cardId || undefined : undefined,
      isReimbursable: true,
      splitMode: 'third_party_full',
      personalAmount: 0,
      reimbursementAmount: draft.reimbursementAmount,
      reimbursementPersonId: draft.reimbursementPersonId,
      reimbursementStatus: draft.reimbursementStatus,
      reimbursementReceivedAt: draft.reimbursementStatus === 'received' ? dateValue : undefined,
      reimbursementReceivedAccountId: draft.reimbursementStatus === 'received'
        ? draft.reimbursementReceivedAccountId || undefined
        : undefined,
    },
  ];
}

export function buildInstallmentEntryTransactions(
  draft: AddEntryDraft,
  dateValue: string,
  descriptionValue: string,
  installmentCount: string,
): Array<Omit<Transaction, 'id'>> {
  const seriesId = createSeriesId();
  const total = parseEntryCount(installmentCount, 2);

  return Array.from({ length: total }, (_, index) =>
    buildSingleEntryTransaction(draft, addMonths(dateValue, index), descriptionValue, {
      entryMode: 'installment',
      expenseNeed: draft.hasPersonalExpenseShare ? draft.expenseNeed || undefined : undefined,
      seriesId,
      installmentNumber: index + 1,
      totalInstallments: total,
      generatedFrom: dateValue,
    }),
  );
}

export function buildSharedInstallmentEntryTransactions(
  draft: AddEntryDraft,
  dateValue: string,
  descriptionValue: string,
  installmentCount: string,
): Array<Omit<Transaction, 'id'>> {
  const seriesId = createSeriesId();
  const reimbursementSeriesId = createSeriesId();
  const total = parseEntryCount(installmentCount, 2);

  return Array.from({ length: total }, (_, index) => {
    const [personalEntry, reimbursementEntry] = buildSharedEntryTransactions(draft, addMonths(dateValue, index), descriptionValue, {
      entryMode: 'installment',
      expenseNeed: draft.expenseNeed || undefined,
      seriesId,
      installmentNumber: index + 1,
      totalInstallments: total,
      generatedFrom: dateValue,
    });

    return [
      personalEntry,
      {
        ...reimbursementEntry,
        notes: writeTransactionNotes(draft.notes, {
          entryMode: 'installment',
          seriesId: reimbursementSeriesId,
          installmentNumber: index + 1,
          totalInstallments: total,
          generatedFrom: dateValue,
        }),
      },
    ];
  }).flat();
}

export function buildQuickEntryTransactions(draft: QuickEntrySaveDraft): Array<Omit<Transaction, 'id'>> {
  return draft.items.map((item) => ({
    description: item.description.trim(),
    amount: item.amount,
    flow: 'expense',
    status: draft.sourceType === 'card' ? 'pending' : 'paid',
    date: item.date,
    notes: writeTransactionNotes(undefined, { entryMode: 'variable' }),
    categoryId: item.categoryId,
    accountId: draft.sourceType === 'account' ? draft.accountId : undefined,
    cardId: draft.sourceType === 'card' ? draft.cardId : undefined,
    isReimbursable: false,
    splitMode: 'none',
  }));
}

export function buildTransferTransaction(input: {
  description: string;
  amount: number;
  status: EntryStatus;
  date: string;
  notes?: string;
  fromAccountId: string;
  toAccountId: string;
}): Omit<Transaction, 'id'> {
  return {
    description: input.description,
    amount: input.amount,
    flow: 'transfer',
    status: input.status,
    date: input.date,
    notes: input.notes?.trim() || undefined,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
  };
}
