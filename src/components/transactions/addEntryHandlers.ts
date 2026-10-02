import {
  Category,
  ExpenseEntryMode,
  ExpenseNeed,
  ExpenseSplitMode,
  MoneyFlow,
  ReimbursementPerson,
  ReimbursementStatus,
  Transaction,
} from '../../types';
import { hasDuplicateName } from '../../lib/utils/validation';
import {
  INVOICE_ADJUSTMENT_CATEGORY_NAME,
  PaymentSourceType,
  REIMBURSEMENT_CATEGORY_NAME,
} from './addEntryRules';

type CategoryDraft = Omit<Category, 'id' | 'isSystem'>;

export interface CategoryCreationRequest {
  ok: true;
  draft: CategoryDraft;
}

export interface CategoryCreationError {
  ok: false;
  error: string;
}

export function buildCustomCategoryCreationRequest(input: {
  name: string;
  flow: MoneyFlow;
  categories: Category[];
}): CategoryCreationRequest | CategoryCreationError {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Informe o nome da categoria.' };

  const categoryFlow: Category['flow'] = input.flow === 'income' ? 'income' : 'expense';
  const duplicateNames = input.categories
    .filter((category) => category.flow === categoryFlow)
    .map((category) => category.name);
  if (hasDuplicateName(name, duplicateNames)) {
    return { ok: false, error: 'Já existe uma categoria com esse nome.' };
  }

  return {
    ok: true,
    draft: {
      name,
      flow: categoryFlow,
      icon: 'MoreHorizontal',
      color: categoryFlow === 'income' ? '#10B981' : '#F43F5E',
    },
  };
}

export function buildSystemCategoryCreationRequest(kind: 'reimbursement' | 'invoiceAdjustment'): CategoryDraft {
  if (kind === 'reimbursement') {
    return {
      name: REIMBURSEMENT_CATEGORY_NAME,
      flow: 'expense',
      icon: 'HandCoins',
      color: '#F59E0B',
    };
  }

  return {
    name: INVOICE_ADJUSTMENT_CATEGORY_NAME,
    flow: 'expense',
    icon: 'ReceiptText',
    color: '#22C55E',
  };
}

export function validateReimbursementPersonName(name: string, reimbursementPeople: ReimbursementPerson[]) {
  const trimmedName = name.trim();
  if (!trimmedName) return 'Informe o nome da pessoa.';
  if (hasDuplicateName(trimmedName, reimbursementPeople.map((person) => person.name))) {
    return 'Já existe uma pessoa com esse nome.';
  }
  return null;
}

export interface AddEntrySubmissionValidationInput {
  parsedAmount: number;
  description: string;
  date: string;
  flow: MoneyFlow;
  categoryId: string;
  accountId: string;
  cardId: string;
  fromAccountId: string;
  toAccountId: string;
  sourceType: PaymentSourceType;
  expenseMode: ExpenseEntryMode;
  expenseNeed: ExpenseNeed | '';
  splitMode: ExpenseSplitMode;
  reimbursementAmount: number;
  reimbursementPersonId: string;
  reimbursementStatus: ReimbursementStatus;
  reimbursementReceivedAccountId: string;
  isInvoiceCredit: boolean;
  isReimbursable: boolean;
  hasPersonalExpenseShare: boolean;
  hasReimbursementCategory: boolean;
  hasInvoiceAdjustmentCategory: boolean;
  hasFixedEndDate: boolean;
  fixedDatesCount: number;
  transaction?: Transaction | null;
}

export function validateAddEntrySubmission(input: AddEntrySubmissionValidationInput) {
  if (input.parsedAmount <= 0) return 'Informe um valor maior que zero para salvar o lançamento.';
  if (!input.description.trim()) return 'Informe um título para identificar o lançamento.';
  if (!input.date) return 'Selecione a data do lançamento.';
  if (input.isInvoiceCredit && !input.hasInvoiceAdjustmentCategory && !input.categoryId) {
    return 'Crie ou mantenha a categoria Ajustes de fatura para salvar descontos da fatura.';
  }
  if (input.flow === 'expense' && input.splitMode === 'third_party_full' && !input.hasReimbursementCategory && !input.categoryId) {
    return 'Crie ou mantenha a categoria Reembolsos para salvar despesas de terceiros.';
  }
  if (input.flow !== 'transfer' && !input.categoryId) return 'Selecione uma categoria para salvar o lançamento.';
  if (input.hasPersonalExpenseShare && !input.expenseNeed) {
    return 'Selecione se a despesa é essencial ou supérflua.';
  }
  if (input.flow === 'expense'
    && input.splitMode === 'shared'
    && (input.reimbursementAmount <= 0 || input.reimbursementAmount >= input.parsedAmount)) {
    return 'Informe uma divisao maior que zero e menor que o valor total.';
  }
  if (input.flow === 'expense' && input.isReimbursable && !input.isInvoiceCredit && !input.reimbursementPersonId) {
    return 'Selecione quem deve esse reembolso.';
  }
  if (input.flow === 'expense'
    && input.isReimbursable
    && input.reimbursementStatus === 'received'
    && !input.reimbursementReceivedAccountId) {
    return 'Selecione a conta onde o reembolso entrou.';
  }
  if (input.flow === 'expense' && input.sourceType === 'account' && !input.accountId) {
    return 'Selecione uma conta para salvar a despesa.';
  }
  if (input.flow === 'expense' && (input.sourceType === 'card' || input.isInvoiceCredit) && !input.cardId) {
    return 'Selecione um cartão para salvar a despesa.';
  }
  if (input.flow === 'expense'
    && input.expenseMode === 'fixed'
    && !input.transaction
    && input.hasFixedEndDate
    && input.fixedDatesCount === 0) {
    return 'A data final precisa ser igual ou posterior à data inicial.';
  }
  if (input.flow === 'income' && !input.accountId) return 'Selecione uma conta para salvar a receita.';
  if (input.flow === 'transfer' && (!input.fromAccountId || !input.toAccountId)) {
    return 'Selecione as contas de origem e destino da transferência.';
  }
  if (input.flow === 'transfer' && input.fromAccountId === input.toAccountId) {
    return 'As contas de origem e destino precisam ser diferentes.';
  }
  return null;
}
