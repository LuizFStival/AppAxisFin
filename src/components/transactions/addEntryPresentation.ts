import { EditSeriesScope, ExpenseEntryMode, ExpenseSplitMode, MoneyFlow } from '../../types';
import { formatCurrency, formatMonthLabel, roundMoney, shiftMonthKey } from '../../lib/utils/finance';
import { parseEntryCount } from './addEntryRules';
import { splitAmountIntoInstallments } from './addEntryBuilder';

interface InstallmentPreviewInput {
  isInstallmentExpense: boolean;
  isEditing: boolean;
  amount: number;
  installmentCount: string;
}

export interface AddEntryImpactSummaryInput {
  amount: number;
  flow: MoneyFlow;
  expenseMode: ExpenseEntryMode;
  splitMode: ExpenseSplitMode;
  editScope: EditSeriesScope;
  canEditForwardEntries: boolean;
  transactionEntryMode?: ExpenseEntryMode;
  isEditing: boolean;
  isInvoiceCredit: boolean;
  selectedSourceName?: string;
  installmentCount: string;
  date?: string;
  firstInstallmentMonth?: string;
  shouldCreateSharedEntries: boolean;
  reimbursementAmount: number;
  personalAmount: number;
  hasFixedEndDate: boolean;
  fixedEndDate: string;
  fixedDatesCount: number;
}

export interface AddEntryLabelsInput {
  flow: MoneyFlow;
  expenseMode: ExpenseEntryMode;
  lockedSourceType: 'account' | 'card' | null;
  isEditing: boolean;
  isInvoiceCredit: boolean;
  editScope: EditSeriesScope;
  canEditForwardEntries: boolean;
}

export interface AddEntryAdvancedContextInput {
  expenseMode: ExpenseEntryMode;
  isInvoiceCredit: boolean;
  splitMode: ExpenseSplitMode;
  hasPersonalExpenseShare: boolean;
  isGroupedTransaction: boolean;
  hasFixedEndDate: boolean;
  isReimbursable: boolean;
  newCategoryName: string;
}

export function getInstallmentPreview(input: InstallmentPreviewInput) {
  if (!input.isInstallmentExpense || input.isEditing || input.amount <= 0) return null;

  const count = parseEntryCount(input.installmentCount, 2);
  const amounts = splitAmountIntoInstallments(input.amount, count);
  const firstAmount = amounts[0] ?? 0;
  const lastAmount = amounts[amounts.length - 1] ?? firstAmount;
  const hasAdjustment = amounts.some((item) => item !== firstAmount);

  return hasAdjustment
    ? `${count} parcelas: ${formatCurrency(firstAmount)} nas primeiras e ${formatCurrency(lastAmount)} na última. Total ${formatCurrency(input.amount)}.`
    : `${count}x de ${formatCurrency(firstAmount)}. Total ${formatCurrency(input.amount)}.`;
}

export function getEntryImpactSummary(input: AddEntryImpactSummaryInput) {
  if (input.amount <= 0) return 'Informe o valor para ver o impacto antes de salvar.';

  if (input.isEditing && input.canEditForwardEntries) {
    const modeLabel = input.transactionEntryMode === 'installment' ? 'parcela' : 'fixa';
    return input.editScope === 'single'
      ? `Você está editando só esta ${modeLabel}; as demais ocorrências continuam como estão.`
      : `Você está editando esta ${modeLabel} e as próximas; meses anteriores não mudam.`;
  }

  if (input.flow === 'transfer') {
    return `Transferência de ${formatCurrency(input.amount)}${input.selectedSourceName ? `: ${input.selectedSourceName}` : ''}. O patrimônio total não muda.`;
  }

  if (input.flow === 'income') {
    return `Receita de ${formatCurrency(input.amount)}${input.selectedSourceName ? ` em ${input.selectedSourceName}` : ''}. Entra como ganho no mês.`;
  }

  if (input.isInvoiceCredit) {
    return `Crédito de ${formatCurrency(input.amount)} na fatura${input.selectedSourceName ? ` ${input.selectedSourceName}` : ''}. Reduz a fatura e não vira receita.`;
  }

  if (input.expenseMode === 'installment' && !input.isEditing) {
    const count = parseEntryCount(input.installmentCount, 2);
    const amounts = splitAmountIntoInstallments(input.amount, count);
    const firstAmount = amounts[0] ?? 0;
    const personalAmounts = splitAmountIntoInstallments(input.personalAmount, count);
    const firstPersonalAmount = personalAmounts[0] ?? firstAmount;
    const futurePersonalAmount = roundMoney(personalAmounts.slice(1).reduce((sum, amount) => sum + amount, 0));
    const firstMonth = input.firstInstallmentMonth ?? input.date?.slice(0, 7);
    const lastMonth = firstMonth ? shiftMonthKey(firstMonth, count - 1) : undefined;
    const futureCommitmentText = input.personalAmount > 0 && futurePersonalAmount > 0 && lastMonth
      ? ` Sua parte pesa cerca de ${formatCurrency(firstPersonalAmount)} por mês e adiciona ${formatCurrency(futurePersonalAmount)} em compromissos futuros até ${formatMonthLabel(lastMonth)}.`
      : input.personalAmount === 0
        ? ' Não adiciona compromisso pessoal futuro porque a despesa é de terceiro.'
        : '';
    const reimbursementText = input.shouldCreateSharedEntries
      ? ` Também cria ${count} registro${count === 1 ? '' : 's'} de reembolso para ${formatCurrency(input.reimbursementAmount)} no total.`
      : '';
    return `Compra total de ${formatCurrency(input.amount)} será dividida em ${count} parcela${count === 1 ? '' : 's'} de aproximadamente ${formatCurrency(firstAmount)}.${futureCommitmentText}${reimbursementText}`;
  }

  if (input.expenseMode === 'fixed' && !input.isEditing) {
    const projection = input.hasFixedEndDate && input.fixedEndDate
      ? `${input.fixedDatesCount} ocorrência${input.fixedDatesCount === 1 ? '' : 's'} até ${input.fixedEndDate}`
      : 'regra mensal recorrente';
    return `Despesa fixa de ${formatCurrency(input.amount)}: será salva como ${projection}.`;
  }

  if (input.splitMode === 'third_party_full') {
    return `Despesa de ${formatCurrency(input.amount)} é 100% de terceiro. Fica em reembolsos e não pesa como gasto pessoal.`;
  }

  if (input.shouldCreateSharedEntries) {
    return `Divisão: sua parte será ${formatCurrency(input.personalAmount)} e o reembolso será ${formatCurrency(input.reimbursementAmount)}.`;
  }

  return `Despesa de ${formatCurrency(input.amount)}${input.selectedSourceName ? ` em ${input.selectedSourceName}` : ''}.`;
}

export function getSubmitLabel(input: AddEntryLabelsInput) {
  if (input.isEditing) {
    return input.editScope === 'forward' && input.canEditForwardEntries ? 'Salvar esta e próximas' : 'Salvar alteração';
  }

  if (input.expenseMode === 'installment' && input.flow === 'expense' && !input.isInvoiceCredit) return 'Criar parcelas';
  if (input.expenseMode === 'fixed' && input.flow === 'expense' && !input.isInvoiceCredit) return 'Criar fixa';
  return 'Salvar lançamento';
}

export function getFlowLabel(input: AddEntryLabelsInput) {
  if (input.isEditing) return 'Edição';
  if (input.flow === 'income') return 'Receita';
  if (input.flow === 'transfer') return 'Transferência';
  if (input.lockedSourceType === 'card') return 'Compra no cartão';
  if (input.lockedSourceType === 'account') return 'Despesa em conta';
  return 'Despesa';
}

export function getFlowSubtitle(input: AddEntryLabelsInput) {
  if (input.isEditing) return 'Revise os campos e escolha o escopo antes de salvar.';
  if (input.flow === 'income') return 'Entrada de dinheiro em uma conta.';
  if (input.flow === 'transfer') return 'Movimento entre contas, sem impacto no patrimônio total.';
  if (input.lockedSourceType === 'card') return 'Compra entra na fatura do cartão selecionado.';
  if (input.lockedSourceType === 'account') return 'Débito, Pix ou saída direta de uma conta.';
  return 'Escolha origem, categoria e detalhes da despesa.';
}

export function hasAddEntryAdvancedContext(input: AddEntryAdvancedContextInput) {
  return input.expenseMode !== 'variable'
    || input.isInvoiceCredit
    || input.splitMode !== 'none'
    || input.hasPersonalExpenseShare
    || input.isGroupedTransaction
    || input.hasFixedEndDate
    || input.isReimbursable
    || Boolean(input.newCategoryName.trim());
}
