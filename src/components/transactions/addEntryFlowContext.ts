import {
  Account,
  Card,
  Category,
  EditSeriesScope,
  EntryStatus,
  ExpenseEntryMode,
  ExpenseNeed,
  ExpenseSplitMode,
  MoneyFlow,
  ReimbursementPerson,
  ReimbursementStatus,
  Transaction,
  TransactionMeta,
} from '../../types';
import { getCardInvoiceInfo } from '../../lib/utils/cardInvoices';
import { parseCurrencyInput } from '../../lib/utils/currency';
import { buildMonthlyDates, buildOpenEndedMonthlyDates, PaymentSourceType } from './addEntryRules';
import { AddEntryDraft } from './addEntryBuilder';
import {
  getEntryImpactSummary,
  getFlowLabel,
  getFlowSubtitle,
  getInstallmentPreview,
  getSubmitLabel,
  hasAddEntryAdvancedContext,
} from './addEntryPresentation';

export interface AddEntryFlowContextInput {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  reimbursementPeople: ReimbursementPerson[];
  transaction?: Transaction | null;
  transactionMeta: TransactionMeta;
  isGroupedTransaction: boolean;
  canEditForwardEntries: boolean;
  flow: MoneyFlow;
  expenseMode: ExpenseEntryMode;
  expenseNeed: ExpenseNeed | '';
  amount: string;
  status: EntryStatus;
  notes: string;
  categoryId: string;
  sourceType: PaymentSourceType;
  lockedSourceType: PaymentSourceType | null;
  accountId: string;
  cardId: string;
  fromAccountId: string;
  toAccountId: string;
  date: string;
  splitMode: ExpenseSplitMode;
  splitType: 'percent' | 'fixed';
  splitPercent: string;
  splitFixedAmount: string;
  isInvoiceCredit: boolean;
  isReimbursable: boolean;
  reimbursementPersonId: string;
  reimbursementStatus: ReimbursementStatus;
  reimbursementReceivedAccountId: string;
  hasFixedEndDate: boolean;
  fixedEndDate: string;
  installmentCount: string;
  editScope: EditSeriesScope;
  newCategoryName: string;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildAddEntryFlowContext(input: AddEntryFlowContextInput) {
  const selectedCard = input.sourceType === 'card'
    ? input.cards.find((card) => card.id === input.cardId)
    : undefined;
  const invoiceInfo = selectedCard && input.flow === 'expense'
    ? getCardInvoiceInfo(selectedCard, input.date)
    : null;
  const isEditingClosedInvoice = Boolean(input.transaction && invoiceInfo && invoiceInfo.status !== 'aberta');
  const filteredCategories = input.categories.filter((category) => category.flow === input.flow);
  const isInstallmentExpense = input.flow === 'expense'
    && input.expenseMode === 'installment'
    && !input.isInvoiceCredit;
  const fixedDates = input.expenseMode === 'fixed'
    ? input.hasFixedEndDate
      ? buildMonthlyDates(input.date, input.fixedEndDate)
      : buildOpenEndedMonthlyDates(input.date)
    : [];
  const cannotSubmit = input.flow === 'expense'
    && (input.sourceType === 'card' || input.isInvoiceCredit)
    && input.cards.length === 0;
  const parsedAmount = parseCurrencyInput(input.amount);
  const selectedAccount = input.accounts.find((account) => account.id === input.accountId);
  const selectedFromAccount = input.accounts.find((account) => account.id === input.fromAccountId);
  const selectedToAccount = input.accounts.find((account) => account.id === input.toAccountId);
  const selectedSourceName = input.flow === 'transfer'
    ? [selectedFromAccount?.name, selectedToAccount?.name].filter(Boolean).join(' → ')
    : input.sourceType === 'card' || input.isInvoiceCredit
      ? selectedCard?.name
      : selectedAccount?.name;
  const installmentPreview = getInstallmentPreview({
    isInstallmentExpense,
    isEditing: Boolean(input.transaction),
    amount: parsedAmount,
    installmentCount: input.installmentCount,
  });
  const parsedSplitPercent = Math.min(100, Math.max(0, Number.parseFloat(input.splitPercent.replace(',', '.')) || 0));
  const parsedSplitFixedAmount = parseCurrencyInput(input.splitFixedAmount);
  const reimbursementAmount = input.flow === 'expense' && input.splitMode === 'third_party_full'
    ? parsedAmount
    : input.flow === 'expense' && input.splitMode === 'shared'
      ? roundMoney(input.splitType === 'fixed' ? parsedSplitFixedAmount : parsedAmount * parsedSplitPercent / 100)
      : 0;
  const personalAmount = roundMoney(Math.max(0, parsedAmount - reimbursementAmount));
  const hasPersonalExpenseShare = input.flow === 'expense'
    && !input.isInvoiceCredit
    && input.splitMode !== 'third_party_full';
  const shouldCreateSharedEntries = input.flow === 'expense'
    && input.splitMode === 'shared'
    && !input.isInvoiceCredit
    && personalAmount > 0
    && reimbursementAmount > 0;
  const entrySummary = getEntryImpactSummary({
    amount: parsedAmount,
    flow: input.flow,
    expenseMode: input.expenseMode,
    splitMode: input.splitMode,
    editScope: input.editScope,
    canEditForwardEntries: input.canEditForwardEntries,
    transactionEntryMode: input.transactionMeta.entryMode,
    isEditing: Boolean(input.transaction),
    isInvoiceCredit: input.isInvoiceCredit,
    selectedSourceName,
    installmentCount: input.installmentCount,
    date: input.date,
    firstInstallmentMonth: invoiceInfo?.period ?? input.date.slice(0, 7),
    shouldCreateSharedEntries,
    reimbursementAmount,
    personalAmount,
    hasFixedEndDate: input.hasFixedEndDate,
    fixedEndDate: input.fixedEndDate,
    fixedDatesCount: fixedDates.length,
  });
  const entryLabelsInput = {
    flow: input.flow,
    expenseMode: input.expenseMode,
    lockedSourceType: input.lockedSourceType,
    isEditing: Boolean(input.transaction),
    isInvoiceCredit: input.isInvoiceCredit,
    editScope: input.editScope,
    canEditForwardEntries: input.canEditForwardEntries,
  };
  const submitLabel = getSubmitLabel(entryLabelsInput);
  const flowLabel = getFlowLabel(entryLabelsInput);
  const flowSubtitle = getFlowSubtitle(entryLabelsInput);
  const hasAdvancedContext = hasAddEntryAdvancedContext({
    expenseMode: input.expenseMode,
    isInvoiceCredit: input.isInvoiceCredit,
    splitMode: input.splitMode,
    hasPersonalExpenseShare,
    isGroupedTransaction: Boolean(input.transaction && input.isGroupedTransaction),
    hasFixedEndDate: input.hasFixedEndDate,
    isReimbursable: input.isReimbursable,
    newCategoryName: input.newCategoryName,
  });
  const entryDraft: AddEntryDraft = {
    flow: input.flow,
    amount: parsedAmount,
    status: input.status,
    notes: input.notes,
    categoryId: input.categoryId,
    sourceType: input.sourceType,
    accountId: input.accountId,
    cardId: input.cardId,
    splitMode: input.splitMode,
    expenseNeed: input.expenseNeed,
    isInvoiceCredit: input.isInvoiceCredit,
    hasPersonalExpenseShare,
    personalAmount,
    reimbursementAmount,
    reimbursementPersonId: input.reimbursementPersonId,
    reimbursementStatus: input.reimbursementStatus,
    reimbursementReceivedAccountId: input.reimbursementReceivedAccountId,
    reimbursementPeople: input.reimbursementPeople,
  };

  return {
    selectedCard,
    invoiceInfo,
    isEditingClosedInvoice,
    filteredCategories,
    isInstallmentExpense,
    fixedDates,
    cannotSubmit,
    parsedAmount,
    selectedAccount,
    selectedFromAccount,
    selectedToAccount,
    selectedSourceName,
    installmentPreview,
    parsedSplitPercent,
    parsedSplitFixedAmount,
    reimbursementAmount,
    personalAmount,
    hasPersonalExpenseShare,
    shouldCreateSharedEntries,
    entrySummary,
    submitLabel,
    flowLabel,
    flowSubtitle,
    hasAdvancedContext,
    entryDraft,
  };
}
