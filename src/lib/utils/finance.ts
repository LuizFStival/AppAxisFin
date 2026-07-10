import { Account, Card, Category, DashboardSummary, Transaction } from '../../types';
import { getCardInvoiceClosingMonth, getCardInvoiceInfoForClosingMonth } from './cardInvoices';
import { getReimbursementMonthKey } from './reimbursements';
import { readTransactionMeta } from './transactionMeta';

export const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function getCurrentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonthKey(month: string, offset: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  return Array.from(new Set(transactions.map(getFinancialMonthKey)))
    .sort()
    .reverse();
}

export function getFinancialMonthKey(transaction: Transaction): string {
  const invoicePaymentPeriod = readTransactionMeta(transaction.notes).invoicePaymentPeriod;
  if (invoicePaymentPeriod) return invoicePaymentPeriod;
  return getMonthKey(transaction.date);
}

export function getCategoryName(categories: Category[], categoryId?: string): string {
  if (!categoryId) return 'Transferência';
  return categories.find((category) => category.id === categoryId)?.name ?? 'Outros';
}

export function getPaymentSource(accounts: Account[], cards: Card[], transaction: Transaction): string {
  if (transaction.cardId) return cards.find((card) => card.id === transaction.cardId)?.name ?? 'Cartão';
  if (transaction.accountId) return accounts.find((account) => account.id === transaction.accountId)?.name ?? 'Conta';
  if (transaction.fromAccountId && transaction.toAccountId) {
    const from = accounts.find((account) => account.id === transaction.fromAccountId)?.name ?? 'Origem';
    const to = accounts.find((account) => account.id === transaction.toAccountId)?.name ?? 'Destino';
    return `${from} -> ${to}`;
  }
  return 'Sem origem';
}

export function getAccountMovementEntries(transaction: Transaction, accountId: string, cards: Card[] = []): Array<{ month: string; amount: number }> {
  const entries: Array<{ month: string; amount: number }> = [];

  if (transaction.status === 'paid') {
    if (transaction.flow === 'income' && transaction.accountId === accountId) {
      entries.push({ month: getFinancialMonthKey(transaction), amount: transaction.amount });
    } else if (transaction.flow === 'expense' && transaction.accountId === accountId) {
      entries.push({ month: getFinancialMonthKey(transaction), amount: -transaction.amount });
    } else if (transaction.flow === 'transfer' && transaction.toAccountId === accountId) {
      entries.push({ month: getFinancialMonthKey(transaction), amount: transaction.amount });
    } else if (transaction.flow === 'transfer' && transaction.fromAccountId === accountId) {
      entries.push({ month: getFinancialMonthKey(transaction), amount: -transaction.amount });
    }
  }

  if (
    transaction.isReimbursable
    && transaction.reimbursementStatus === 'received'
    && transaction.reimbursementReceivedAccountId === accountId
  ) {
    entries.push({
      month: cards.length > 0 ? getReimbursementMonthKey(transaction, cards) : getFinancialMonthKey(transaction),
      amount: transaction.amount,
    });
  }

  return entries;
}

export function getAccountSignedAmount(transaction: Transaction, accountId: string): number {
  return roundMoney(getAccountMovementEntries(transaction, accountId).reduce((sum, entry) => sum + entry.amount, 0));
}

export function isThirdPartyExpense(transaction: Transaction): boolean {
  return transaction.flow === 'expense' && Boolean(transaction.isReimbursable);
}

export function isInvoiceCredit(transaction: Transaction): boolean {
  return transaction.flow === 'expense' && Boolean(transaction.cardId) && readTransactionMeta(transaction.notes).invoiceAdjustment === 'credit';
}

export function isInvoicePayment(transaction: Transaction): boolean {
  return transaction.flow === 'expense' && Boolean(readTransactionMeta(transaction.notes).invoicePaymentCardId);
}

export function getExpenseSignedAmount(transaction: Transaction): number {
  return isInvoiceCredit(transaction) ? -transaction.amount : transaction.amount;
}

export interface PendingInvoiceSummary {
  card: Card;
  invoice: ReturnType<typeof getCardInvoiceInfoForClosingMonth>;
  itemCount: number;
  total: number;
}

export function hasCardInvoicePayment(transactions: Transaction[], cardId: string, period: string): boolean {
  return transactions.some((transaction) => {
    const meta = readTransactionMeta(transaction.notes);
    return isInvoicePayment(transaction)
      && meta.invoicePaymentCardId === cardId
      && meta.invoicePaymentPeriod === period;
  });
}

export function getCardInvoiceTransactions(card: Card, transactions: Transaction[], closingMonth: string): Transaction[] {
  return transactions.filter((transaction) => {
    if (transaction.flow !== 'expense' || transaction.cardId !== card.id) return false;
    return getCardInvoiceClosingMonth(card, transaction.date) === closingMonth;
  });
}

export function getPendingInvoiceSummaries(cards: Card[], transactions: Transaction[], month: string): PendingInvoiceSummary[] {
  return cards
    .map((card) => {
      if (hasCardInvoicePayment(transactions, card.id, month)) return null;
      const invoiceItems = getCardInvoiceTransactions(card, transactions, month)
        .filter((transaction) => !isInvoicePayment(transaction));
      if (invoiceItems.length === 0 || isCardInvoicePaid(invoiceItems)) return null;
      const total = roundMoney(invoiceItems.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0));
      if (total <= 0) return null;
      return {
        card,
        invoice: getCardInvoiceInfoForClosingMonth(card, month),
        itemCount: invoiceItems.length,
        total,
      };
    })
    .filter((item): item is PendingInvoiceSummary => Boolean(item));
}

export function isPendingAccountExpense(transaction: Transaction, month: string): boolean {
  return transaction.flow === 'expense'
    && !transaction.cardId
    && !isInvoicePayment(transaction)
    && !isInvoiceCredit(transaction)
    && transaction.status === 'pending'
    && getFinancialMonthKey(transaction) === month;
}

export function getPendingPaymentTotal(cards: Card[], transactions: Transaction[], month: string): number {
  const pendingInvoices = getPendingInvoiceSummaries(cards, transactions, month)
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const pendingAccountExpenses = transactions
    .filter((transaction) => isPendingAccountExpense(transaction, month))
    .reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0);
  return roundMoney(pendingInvoices + pendingAccountExpenses);
}

export function isCardInvoicePaid(transactions: Transaction[]): boolean {
  if (transactions.length === 0) return false;

  return transactions.every((transaction) => {
    const meta = readTransactionMeta(transaction.notes);
    return Boolean(meta.paidAt && meta.paidFromAccountId);
  });
}

function splitInvoicePaymentAmount(payment: Transaction, transactions: Transaction[], cards: Card[]) {
  const meta = readTransactionMeta(payment.notes);
  const card = cards.find((item) => item.id === meta.invoicePaymentCardId);
  if (!card || !meta.invoicePaymentPeriod) {
    return { personal: payment.amount, thirdParty: 0 };
  }

  const invoiceItems = getCardInvoiceTransactions(card, transactions, meta.invoicePaymentPeriod)
    .filter((transaction) => !isInvoicePayment(transaction));
  const personalTotal = roundMoney(invoiceItems
    .filter((transaction) => !isThirdPartyExpense(transaction))
    .reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0));
  const thirdPartyTotal = roundMoney(invoiceItems
    .filter(isThirdPartyExpense)
    .reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0));
  const invoiceTotal = roundMoney(personalTotal + thirdPartyTotal);
  if (invoiceTotal <= 0) return { personal: payment.amount, thirdParty: 0 };

  const ratio = payment.amount / invoiceTotal;
  const thirdParty = roundMoney(thirdPartyTotal * ratio);
  return {
    personal: roundMoney(payment.amount - thirdParty),
    thirdParty,
  };
}

export function summarizeDashboard(accounts: Account[], transactions: Transaction[], month: string, cards: Card[] = []): DashboardSummary {
  const monthTransactions = transactions.filter((transaction) => getFinancialMonthKey(transaction) === month);
  const incomeTransactions = monthTransactions.filter((transaction) => transaction.flow === 'income');
  const expenseTransactions = monthTransactions.filter((transaction) =>
    transaction.flow === 'expense'
    && !isThirdPartyExpense(transaction)
    && !isInvoicePayment(transaction),
  );
  const reimbursementTransactions = transactions
    .filter(isThirdPartyExpense)
    .filter((transaction) => cards.length > 0
      ? getReimbursementMonthKey(transaction, cards) === month
      : getFinancialMonthKey(transaction) === month);

  const income = roundMoney(incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
  const expenses = roundMoney(expenseTransactions.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0));
  const received = roundMoney(incomeTransactions
    .filter((transaction) => transaction.status === 'paid')
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const settledExpenses = roundMoney(Math.min(expenses, expenseTransactions
    .filter((transaction) =>
      transaction.status === 'paid'
      && (!transaction.cardId || Boolean(readTransactionMeta(transaction.notes).paidAt)),
    )
    .reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0)));
  const accountOutflowByOwner = monthTransactions
    .filter((transaction) => transaction.flow === 'expense' && transaction.status === 'paid' && !transaction.cardId)
    .reduce((totals, transaction) => {
      if (isInvoicePayment(transaction)) {
        const split = splitInvoicePaymentAmount(transaction, transactions, cards);
        totals.personal += split.personal;
        totals.thirdParty += split.thirdParty;
      } else if (isThirdPartyExpense(transaction)) {
        totals.thirdParty += transaction.amount;
      } else {
        totals.personal += transaction.amount;
      }
      return totals;
    }, { personal: 0, thirdParty: 0 });
  const paid = roundMoney(accountOutflowByOwner.personal);
  const thirdPartyAccountOutflow = roundMoney(accountOutflowByOwner.thirdParty);
  const reimbursementsPending = roundMoney(reimbursementTransactions
    .filter((transaction) => transaction.reimbursementStatus !== 'received')
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const reimbursementsReceived = roundMoney(reimbursementTransactions
      .filter((transaction) => transaction.reimbursementStatus === 'received')
      .reduce((sum, transaction) => sum + transaction.amount, 0));
  const accountReimbursementsReceived = reimbursementsReceived;
  const pendingExpenses = cards.length > 0
    ? getPendingPaymentTotal(cards, transactions, month)
    : roundMoney(Math.max(0, expenses - settledExpenses));
  const effectiveSettledExpenses = roundMoney(Math.max(0, expenses - pendingExpenses));

  return {
    currentBalance: roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0)),
    accountInflow: roundMoney(received + accountReimbursementsReceived),
    accountInflowPersonal: received,
    accountInflowThirdParty: accountReimbursementsReceived,
    accountOutflow: roundMoney(paid + thirdPartyAccountOutflow),
    accountOutflowPersonal: paid,
    accountOutflowThirdParty: thirdPartyAccountOutflow,
    income,
    expenses,
    settledExpenses: effectiveSettledExpenses,
    received,
    paid,
    pendingIncome: roundMoney(income - received),
    pendingExpenses,
    reimbursementsPending,
    reimbursementsReceived,
  };
}

export function summarizeMonthlyResult(transactions: Transaction[], month: string, cards: Card[] = []) {
  const monthTransactions = transactions.filter((transaction) => getFinancialMonthKey(transaction) === month);
  const reimbursementTransactions = transactions
    .filter(isThirdPartyExpense)
    .filter((transaction) => cards.length > 0
      ? getReimbursementMonthKey(transaction, cards) === month
      : getFinancialMonthKey(transaction) === month);
  const income = roundMoney(monthTransactions
    .filter((transaction) => transaction.flow === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const personalExpenses = roundMoney(monthTransactions
    .filter((transaction) =>
      transaction.flow === 'expense'
      && !isThirdPartyExpense(transaction)
      && !isInvoicePayment(transaction),
    )
    .reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0));
  const reimbursementsExpected = roundMoney(reimbursementTransactions
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const thirdPartyExpenses = roundMoney(reimbursementTransactions
    .reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0));
  const totalInflows = roundMoney(income + reimbursementsExpected);
  const totalOutflows = roundMoney(personalExpenses + thirdPartyExpenses);

  return {
    income,
    reimbursementsExpected,
    personalExpenses,
    thirdPartyExpenses,
    totalInflows,
    totalOutflows,
    result: roundMoney(totalInflows - totalOutflows),
  };
}

export function summarizeMonthlyInvestmentGoal(
  _accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  month: string,
  options: {
    mode?: 'fixed' | 'salary_percentage';
    fixedAmount?: number;
    percentage?: number;
    includePendingSalary?: boolean;
    cards?: Card[];
  } = {},
) {
  const normalize = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const salaryCategoryIds = new Set(
    categories
      .filter((category) => normalize(category.name).includes('salario'))
      .map((category) => category.id),
  );
  const salaryTransactions = transactions
    .filter((transaction) =>
      transaction.flow === 'income'
      && (options.includePendingSalary || transaction.status === 'paid')
      && getFinancialMonthKey(transaction) === month
      && (
        Boolean(transaction.categoryId && salaryCategoryIds.has(transaction.categoryId))
        || normalize(transaction.description).includes('salario')
      ),
    );
  const salaryReceived = roundMoney(salaryTransactions
    .filter((transaction) => transaction.status === 'paid')
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const salaryConsidered = roundMoney(salaryTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
  const monthlyResult = summarizeMonthlyResult(transactions, month, options.cards ?? []);
  const saved = roundMoney(Math.max(0, monthlyResult.result));
  const target = options.mode === 'fixed'
    ? roundMoney(Math.max(0, options.fixedAmount ?? 0))
    : roundMoney(salaryConsidered * Math.max(0, options.percentage ?? 20) / 100);

  return {
    salaryReceived,
    salaryConsidered,
    target,
    saved,
    remaining: roundMoney(Math.max(0, target - saved)),
    progress: target > 0 ? Math.min(100, roundMoney((saved / target) * 100)) : 0,
  };
}

export function expensesByCategory(transactions: Transaction[], categories: Category[], month: string) {
  const totals = new Map<string, { name: string; value: number; color: string }>();

  transactions
    .filter((transaction) => transaction.flow === 'expense' && getFinancialMonthKey(transaction) === month)
    .filter((transaction) => !isThirdPartyExpense(transaction))
    .filter((transaction) => !isInvoicePayment(transaction))
    .forEach((transaction) => {
      const category = categories.find((item) => item.id === transaction.categoryId);
      const key = category?.id ?? 'other';
      const current = totals.get(key) ?? {
        name: category?.name ?? 'Outros',
        value: 0,
        color: category?.color ?? '#64748B',
      };

      totals.set(key, { ...current, value: roundMoney(current.value + getExpenseSignedAmount(transaction)) });
    });

  return Array.from(totals.values())
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}
