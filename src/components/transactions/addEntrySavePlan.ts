import { ExpenseNeed, MoneyFlow, Transaction, TransactionMeta } from '../../types';
import {
  AddEntryDraft,
  buildInstallmentEntryTransactions,
  buildSharedEntryTransactions,
  buildSharedInstallmentEntryTransactions,
  buildSingleEntryTransaction,
  buildTransferTransaction,
} from './addEntryBuilder';

export type AddEntrySavePlan =
  | {
    kind: 'save';
    transaction: Omit<Transaction, 'id'> | Array<Omit<Transaction, 'id'>>;
    scope?: 'single' | 'forward';
  }
  | {
    kind: 'createRecurring';
    transaction: Omit<Transaction, 'id'>;
    endDate?: string;
  }
  | {
    kind: 'createRecurringBatch';
    transactions: Array<Omit<Transaction, 'id'>>;
    endDate?: string;
  };

export interface AddEntrySavePlanInput {
  flow: MoneyFlow;
  transaction?: Transaction | null;
  transactionMeta: TransactionMeta;
  expenseMode: 'variable' | 'fixed' | 'installment';
  editScope: 'single' | 'forward';
  shouldCreateSharedEntries: boolean;
  hasPersonalExpenseShare: boolean;
  expenseNeed: ExpenseNeed | '';
  isInvoiceCredit: boolean;
  hasFixedEndDate: boolean;
  fixedEndDate: string;
  installmentCount: string;
  date: string;
  description: string;
  notes?: string;
  amount: number;
  status: Transaction['status'];
  fromAccountId: string;
  toAccountId: string;
  entryDraft: AddEntryDraft;
}

function withExpenseNeed(expenseNeed: ExpenseNeed | '', hasPersonalExpenseShare: boolean): TransactionMeta {
  return {
    expenseNeed: hasPersonalExpenseShare ? expenseNeed || undefined : undefined,
  };
}

function getEditTransactionMeta(input: AddEntrySavePlanInput): TransactionMeta {
  const nextMeta = {
    ...input.transactionMeta,
    ...withExpenseNeed(input.expenseNeed, input.hasPersonalExpenseShare),
    invoiceAdjustment: input.isInvoiceCredit ? 'credit' as const : undefined,
  };

  if (input.transactionMeta.seriesId) return nextMeta;
  return {
    ...nextMeta,
    entryMode: input.expenseMode,
  };
}

function fixedEndDate(input: AddEntrySavePlanInput) {
  return input.hasFixedEndDate ? input.fixedEndDate : undefined;
}

export function buildAddEntrySavePlan(input: AddEntrySavePlanInput): AddEntrySavePlan {
  const description = input.description.trim();

  if (input.flow === 'transfer') {
    return {
      kind: 'save',
      transaction: buildTransferTransaction({
        description,
        amount: input.amount,
        status: input.status,
        date: input.date,
        notes: input.notes?.trim() || undefined,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
      }),
    };
  }

  if (input.transaction) {
    return {
      kind: 'save',
      transaction: buildSingleEntryTransaction(input.entryDraft, input.date, description, getEditTransactionMeta(input)),
      scope: input.editScope,
    };
  }

  if (input.shouldCreateSharedEntries && input.expenseMode === 'fixed') {
    return {
      kind: 'createRecurringBatch',
      transactions: buildSharedEntryTransactions(input.entryDraft, input.date, description, {
        entryMode: 'fixed',
        expenseNeed: input.expenseNeed || undefined,
        generatedFrom: input.date,
        generatedUntil: fixedEndDate(input),
      }),
      endDate: fixedEndDate(input),
    };
  }

  if (input.flow === 'expense' && input.expenseMode === 'fixed' && !input.isInvoiceCredit) {
    return {
      kind: 'createRecurring',
      transaction: buildSingleEntryTransaction(input.entryDraft, input.date, description, {
        entryMode: 'fixed',
        ...withExpenseNeed(input.expenseNeed, input.hasPersonalExpenseShare),
        generatedFrom: input.date,
        generatedUntil: fixedEndDate(input),
      }),
      endDate: fixedEndDate(input),
    };
  }

  if (input.shouldCreateSharedEntries && input.expenseMode === 'installment') {
    return {
      kind: 'save',
      transaction: buildSharedInstallmentEntryTransactions(input.entryDraft, input.date, description, input.installmentCount),
    };
  }

  if (input.flow === 'expense' && input.expenseMode === 'installment' && !input.isInvoiceCredit) {
    return {
      kind: 'save',
      transaction: buildInstallmentEntryTransactions(input.entryDraft, input.date, description, input.installmentCount),
    };
  }

  if (input.shouldCreateSharedEntries) {
    return {
      kind: 'save',
      transaction: buildSharedEntryTransactions(input.entryDraft, input.date, description, {
        entryMode: 'variable',
        expenseNeed: input.expenseNeed || undefined,
      }),
    };
  }

  return {
    kind: 'save',
    transaction: buildSingleEntryTransaction(input.entryDraft, input.date, description, {
      entryMode: 'variable',
      ...withExpenseNeed(input.expenseNeed, input.hasPersonalExpenseShare),
    }),
  };
}
