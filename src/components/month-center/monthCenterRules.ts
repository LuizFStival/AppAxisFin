import { Card, ReimbursementPerson, Transaction } from '../../types';
import {
  formatCurrency,
  formatMonthLabel,
  getPersonalExpenseSignedAmount,
  getTransactionCompetenceMonth,
  getTransactionReimbursementAmount,
  isInvoiceCredit,
  isInvoicePayment,
  roundMoney,
} from '../../lib/utils/finance';
import { getCardInvoiceInfo } from '../../lib/utils/cardInvoices';
import { formatDatePtBr, parseLocalDate } from '../../lib/utils/date';
import { getReimbursementDueDate, getReimbursementMonthKey, isReimbursementOverdue } from '../../lib/utils/reimbursements';
import { hasRecurringSourceMeta, isFixedEntryMeta, isInstallmentEntryMeta, readTransactionMeta } from '../../lib/utils/transactionMeta';

export type PriorityKind = 'invoice' | 'account';
export type CommitmentOwner = 'mine' | 'others';
export type MonthClosingItemId = 'invoices' | 'account-expenses' | 'fixed-expenses' | 'reimbursements' | 'review';

export interface ReimbursementPersonSummary {
  personId?: string;
  personName: string;
  total: number;
  count: number;
  overdueCount: number;
  oldestDueDate?: string;
  oldestTransaction?: Transaction;
  hasPreviousMonth: boolean;
}

export interface MonthClosingChecklistItem {
  id: MonthClosingItemId;
  done: boolean;
  title: string;
  detail: string;
  action: string;
}

export interface MonthClosingChecklistInput {
  activeMonth: string;
  pendingInvoiceCount: number;
  pendingAccountExpenseCount: number;
  fixedExpenseCount: number;
  installmentExpenseCount: number;
  pendingReimbursementCount: number;
  oldPendingReimbursementCount: number;
  reimbursementTotal: number;
  monthTransactionCount: number;
  reimbursementsEnabled: boolean;
}

export function daysBetween(date: string, today: string) {
  return Math.round((parseLocalDate(date).getTime() - parseLocalDate(today).getTime()) / 86400000);
}

export function getPersonName(people: ReimbursementPerson[], personId?: string) {
  return people.find((person) => person.id === personId)?.name ?? 'Pessoa removida';
}

export function isFixedExpense(transaction: Transaction, cards: Card[], activeMonth: string) {
  if (transaction.flow !== 'expense') return false;
  if (isInvoicePayment(transaction) || isInvoiceCredit(transaction)) return false;
  if (getTransactionCompetenceMonth(transaction, cards) !== activeMonth) return false;

  return isFixedEntryMeta(transaction.notes)
    || Boolean(transaction.recurringTransactionId)
    || hasRecurringSourceMeta(transaction.notes);
}

export function isInstallmentExpense(transaction: Transaction, cards: Card[], activeMonth: string) {
  if (transaction.flow !== 'expense') return false;
  if (isInvoicePayment(transaction) || isInvoiceCredit(transaction)) return false;
  if (getTransactionCompetenceMonth(transaction, cards) !== activeMonth) return false;

  return isInstallmentEntryMeta(transaction.notes);
}

export function getFixedExpensesForMonth(transactions: Transaction[], cards: Card[], activeMonth: string) {
  return transactions
    .filter((transaction) => isFixedExpense(transaction, cards, activeMonth))
    .sort((left, right) => {
      const leftDueDate = getExpenseDueDate(left, cards);
      const rightDueDate = getExpenseDueDate(right, cards);
      return leftDueDate.localeCompare(rightDueDate) || left.description.localeCompare(right.description);
    });
}

export function getInstallmentExpensesForMonth(transactions: Transaction[], cards: Card[], activeMonth: string) {
  return transactions
    .filter((transaction) => isInstallmentExpense(transaction, cards, activeMonth))
    .sort((left, right) => {
      const leftDueDate = getExpenseDueDate(left, cards);
      const rightDueDate = getExpenseDueDate(right, cards);
      const leftMeta = readTransactionMeta(left.notes);
      const rightMeta = readTransactionMeta(right.notes);
      return leftDueDate.localeCompare(rightDueDate)
        || left.description.localeCompare(right.description)
        || (leftMeta.installmentNumber ?? 0) - (rightMeta.installmentNumber ?? 0);
    });
}

export function getPendingReimbursementsForMonth(transactions: Transaction[], cards: Card[], activeMonth: string) {
  return transactions
    .filter((transaction) => transaction.isReimbursable && transaction.reimbursementStatus !== 'received')
    .filter((transaction) => getReimbursementMonthKey(transaction, cards) <= activeMonth)
    .sort((left, right) => {
      const leftDue = getReimbursementDueDate(left, cards) ?? left.date;
      const rightDue = getReimbursementDueDate(right, cards) ?? right.date;
      return leftDue.localeCompare(rightDue);
    });
}

export function buildReimbursementPeopleSummaries(
  pendingReimbursements: Transaction[],
  people: ReimbursementPerson[],
  cards: Card[],
  activeMonth: string,
  today: string,
): ReimbursementPersonSummary[] {
  const summaries = new Map<string, ReimbursementPersonSummary>();

  pendingReimbursements.forEach((transaction) => {
    const key = transaction.reimbursementPersonId ?? 'unknown';
    const dueDate = getReimbursementDueDate(transaction, cards) ?? transaction.date;
    const current = summaries.get(key) ?? {
      personId: transaction.reimbursementPersonId,
      personName: getPersonName(people, transaction.reimbursementPersonId),
      total: 0,
      count: 0,
      overdueCount: 0,
      oldestDueDate: undefined,
      oldestTransaction: undefined,
      hasPreviousMonth: false,
    };

    current.total = roundMoney(current.total + getTransactionReimbursementAmount(transaction));
    current.count += 1;
    if (isReimbursementOverdue(transaction, cards, today)) current.overdueCount += 1;
    if (!current.oldestDueDate || dueDate < current.oldestDueDate) {
      current.oldestDueDate = dueDate;
      current.oldestTransaction = transaction;
    }
    if (getReimbursementMonthKey(transaction, cards) < activeMonth) current.hasPreviousMonth = true;
    summaries.set(key, current);
  });

  return Array.from(summaries.values()).sort((left, right) => {
    if (left.overdueCount !== right.overdueCount) return right.overdueCount - left.overdueCount;
    return right.total - left.total;
  });
}

export function getCommitmentPeople(
  fixedExpenses: Transaction[],
  installmentExpenses: Transaction[],
  people: ReimbursementPerson[],
) {
  const peopleMap = new Map<string, string>();
  [...fixedExpenses, ...installmentExpenses].forEach((transaction) => {
    if (getTransactionReimbursementAmount(transaction) <= 0) return;
    const id = transaction.reimbursementPersonId ?? 'unknown';
    peopleMap.set(id, getPersonName(people, transaction.reimbursementPersonId));
  });
  return Array.from(peopleMap.entries()).map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name));
}

export function filterCommitmentExpenses(
  transactions: Transaction[],
  owner: CommitmentOwner,
  personId: string,
) {
  return transactions.filter((transaction) => {
    if (owner === 'mine') return getPersonalExpenseSignedAmount(transaction) > 0;
    if (getTransactionReimbursementAmount(transaction) <= 0) return false;
    return personId === 'all' || (transaction.reimbursementPersonId ?? 'unknown') === personId;
  });
}

export function getExpenseDueDate(transaction: Transaction, cards: Card[]) {
  const card = transaction.cardId ? cards.find((item) => item.id === transaction.cardId) : undefined;
  return card ? getCardInvoiceInfo(card, transaction.date).dueDate : transaction.date;
}

export function dueBadge(dueDate: string, today: string) {
  const days = daysBetween(dueDate, today);
  if (days < 0) return { label: `${Math.abs(days)} dia${days === -1 ? '' : 's'} atrasado`, className: 'border-rose-400/20 bg-rose-500/15 text-rose-100' };
  if (days === 0) return { label: 'vence hoje', className: 'border-amber-300/25 bg-amber-400/15 text-amber-100' };
  if (days <= 3) return { label: `vence em ${days} dias`, className: 'border-amber-300/25 bg-amber-400/15 text-amber-100' };
  return { label: `vence em ${formatDatePtBr(dueDate)}`, className: 'border-white/10 bg-white/5 text-slate-300' };
}

export function priorityKindLabel(kind: PriorityKind) {
  if (kind === 'invoice') return 'Fatura';
  return 'Conta';
}

export function buildMonthClosingChecklist(input: MonthClosingChecklistInput): MonthClosingChecklistItem[] {
  return [
    {
      id: 'invoices',
      done: input.pendingInvoiceCount === 0,
      title: 'Faturas do mês',
      detail: input.pendingInvoiceCount === 0
        ? 'Todas as faturas com lançamento ativo estão quitadas.'
        : `${input.pendingInvoiceCount} fatura${input.pendingInvoiceCount === 1 ? '' : 's'} ainda em aberto.`,
      action: 'Ver cartões',
    },
    {
      id: 'account-expenses',
      done: input.pendingAccountExpenseCount === 0,
      title: 'Despesas fora do cartão',
      detail: input.pendingAccountExpenseCount === 0
        ? 'Nenhuma despesa de conta pendente neste mês.'
        : `${input.pendingAccountExpenseCount} despesa${input.pendingAccountExpenseCount === 1 ? '' : 's'} pendente${input.pendingAccountExpenseCount === 1 ? '' : 's'} para resolver.`,
      action: 'Ver transações',
    },
    {
      id: 'fixed-expenses',
      done: input.fixedExpenseCount > 0 || input.installmentExpenseCount > 0,
      title: 'Fixas e parceladas do mês',
      detail: input.fixedExpenseCount > 0 || input.installmentExpenseCount > 0
        ? `${input.fixedExpenseCount} fixa${input.fixedExpenseCount === 1 ? '' : 's'} e ${input.installmentExpenseCount} parcelada${input.installmentExpenseCount === 1 ? '' : 's'} em ${formatMonthLabel(input.activeMonth)}.`
        : 'Nenhuma despesa fixa ou parcelada encontrada neste mês.',
      action: 'Ver compromissos',
    },
    {
      id: 'reimbursements',
      done: !input.reimbursementsEnabled || input.pendingReimbursementCount === 0,
      title: 'Reembolsos e terceiros',
      detail: !input.reimbursementsEnabled
        ? 'Reembolsos desativados no perfil.'
        : input.pendingReimbursementCount === 0
          ? 'Nada pendente de terceiros.'
          : `${formatCurrency(input.reimbursementTotal)} ainda a receber. ${input.oldPendingReimbursementCount > 0 ? 'Há pendências de meses anteriores.' : 'Você pode receber ou manter em acompanhamento.'}`,
      action: 'Ver reembolsos',
    },
    {
      id: 'review',
      done: input.monthTransactionCount > 0,
      title: 'Lançamentos revisados',
      detail: input.monthTransactionCount > 0
        ? `${input.monthTransactionCount} lançamento${input.monthTransactionCount === 1 ? '' : 's'} encontrado${input.monthTransactionCount === 1 ? '' : 's'} no mês.`
        : 'Ainda não há lançamentos neste mês para conferir.',
      action: 'Ver transações',
    },
  ];
}
