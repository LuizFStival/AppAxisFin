import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarCheck2, CheckCircle2, Clock3, CreditCard, HandCoins, Layers, ListChecks, ReceiptText, Repeat, WalletCards } from 'lucide-react';
import { Account, Card, Category, DashboardSummary, ReimbursementPerson, Transaction } from '../../types';
import {
  expensesByCategory,
  formatCurrency,
  formatMonthLabel,
  getCardInvoiceTransactions,
  getExpenseSignedAmount,
  getPaymentSource,
  getPendingInvoiceSummaries,
  getPersonalExpenseSignedAmount,
  getTransactionPersonalAmount,
  getTransactionCompetenceMonth,
  getTransactionReimbursementAmount,
  isCardInvoicePaid,
  isInvoiceCredit,
  isInvoicePayment,
  isPendingAccountExpense,
  roundMoney,
  shiftMonthKey,
  summarizeDashboard,
} from '../../lib/utils/finance';
import { getCardInvoiceInfo, getCardInvoiceInfoForClosingMonth } from '../../lib/utils/cardInvoices';
import { formatDatePtBr, formatLocalDate, parseLocalDate } from '../../lib/utils/date';
import { getReimbursementDueDate, getReimbursementMonthKey, isReimbursementOverdue } from '../../lib/utils/reimbursements';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { MonthNavigator } from '../shared/MonthNavigator';
import { CardInvoiceActions } from '../cards/CardInvoiceActions';
import { CurrencyInput } from '../shared/CurrencyInput';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';

interface MonthCenterViewProps {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  people: ReimbursementPerson[];
  transactions: Transaction[];
  activeMonth: string;
  summary: DashboardSummary;
  reimbursementsEnabled: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onOpenCards: (cardId?: string) => void;
  onOpenTransactions: () => void;
  onOpenReimbursements: (personId?: string) => void;
  onPayInvoice: (input: { card: Card; accountId: string; paymentDate: string; amount: number; transactions: Transaction[] }) => Promise<void>;
  onMarkAccountExpensePaid: (transaction: Transaction, input: { accountId: string; paymentDate: string }) => void | Promise<void>;
  onMarkReimbursementReceived: (transaction: Transaction, accountId: string, receivedAmount?: number) => void | Promise<void>;
  onCarryReimbursement: (transaction: Transaction) => void | Promise<void>;
  onSkipFixedOccurrence: (transaction: Transaction) => void | Promise<void>;
}

type CenterTab = 'payments' | 'fixed' | 'closing';
type CommitmentFilter = 'all' | 'fixed' | 'installment';
type CommitmentOwner = 'mine' | 'others';
type PriorityKind = 'invoice' | 'account';
type PaymentStatusFilter = 'pending' | 'paid' | 'all';

function daysBetween(date: string, today: string) {
  return Math.round((parseLocalDate(date).getTime() - parseLocalDate(today).getTime()) / 86400000);
}

function getPersonName(people: ReimbursementPerson[], personId?: string) {
  return people.find((person) => person.id === personId)?.name ?? 'Pessoa removida';
}

function isFixedExpense(transaction: Transaction, cards: Card[], activeMonth: string) {
  if (transaction.flow !== 'expense') return false;
  if (isInvoicePayment(transaction) || isInvoiceCredit(transaction)) return false;
  if (getTransactionCompetenceMonth(transaction, cards) !== activeMonth) return false;

  const meta = readTransactionMeta(transaction.notes);
  return meta.entryMode === 'fixed'
    || Boolean(transaction.recurringTransactionId)
    || Boolean(meta.recurringTransactionId);
}

function isInstallmentExpense(transaction: Transaction, cards: Card[], activeMonth: string) {
  if (transaction.flow !== 'expense') return false;
  if (isInvoicePayment(transaction) || isInvoiceCredit(transaction)) return false;
  if (getTransactionCompetenceMonth(transaction, cards) !== activeMonth) return false;

  return readTransactionMeta(transaction.notes).entryMode === 'installment';
}

function getExpenseDueDate(transaction: Transaction, cards: Card[]) {
  const card = transaction.cardId ? cards.find((item) => item.id === transaction.cardId) : undefined;
  return card ? getCardInvoiceInfo(card, transaction.date).dueDate : transaction.date;
}

function dueBadge(dueDate: string, today: string) {
  const days = daysBetween(dueDate, today);
  if (days < 0) return { label: `${Math.abs(days)} dia${days === -1 ? '' : 's'} atrasado`, className: 'border-rose-400/20 bg-rose-500/15 text-rose-100' };
  if (days === 0) return { label: 'vence hoje', className: 'border-amber-300/25 bg-amber-400/15 text-amber-100' };
  if (days <= 3) return { label: `vence em ${days} dias`, className: 'border-amber-300/25 bg-amber-400/15 text-amber-100' };
  return { label: `vence em ${formatDatePtBr(dueDate)}`, className: 'border-white/10 bg-white/5 text-slate-300' };
}

function priorityKindLabel(kind: PriorityKind) {
  if (kind === 'invoice') return 'Fatura';
  return 'Conta';
}

export function MonthCenterView({
  accounts,
  cards,
  categories,
  people,
  transactions,
  activeMonth,
  summary,
  reimbursementsEnabled,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onOpenCards,
  onOpenTransactions,
  onOpenReimbursements,
  onPayInvoice,
  onMarkAccountExpensePaid,
  onMarkReimbursementReceived,
  onCarryReimbursement,
  onSkipFixedOccurrence,
}: MonthCenterViewProps) {
  const [tab, setTab] = useState<CenterTab>('payments');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('pending');
  const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>('all');
  const [commitmentOwner, setCommitmentOwner] = useState<CommitmentOwner>('mine');
  const [commitmentPersonId, setCommitmentPersonId] = useState('all');
  const [receivingTransaction, setReceivingTransaction] = useState<Transaction | null>(null);
  const [receivingAccountId, setReceivingAccountId] = useState('');
  const [receivingAmount, setReceivingAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [payingAccountExpense, setPayingAccountExpense] = useState<Transaction | null>(null);
  const [payingAccountId, setPayingAccountId] = useState('');
  const [accountPaymentDate, setAccountPaymentDate] = useState(formatLocalDate(new Date()));
  const today = formatLocalDate(new Date());

  const openAccountExpensePayment = useCallback((transaction: Transaction) => {
    setPayingAccountExpense(transaction);
    setPayingAccountId(transaction.accountId ?? accounts[0]?.id ?? '');
    setAccountPaymentDate(transaction.date || today);
  }, [accounts, today]);

  const pendingInvoices = useMemo(() => (
    getPendingInvoiceSummaries(cards, transactions, activeMonth)
      .sort((left, right) => left.invoice.dueDate.localeCompare(right.invoice.dueDate))
  ), [activeMonth, cards, transactions]);

  const allInvoiceSummaries = useMemo(() => (
    cards
      .map((card) => {
        const invoiceTransactions = getCardInvoiceTransactions(card, transactions, activeMonth)
          .filter((transaction) => !isInvoicePayment(transaction));
        const total = roundMoney(invoiceTransactions.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0));
        if (invoiceTransactions.length === 0 || total <= 0) return null;

        return {
          card,
          invoice: getCardInvoiceInfoForClosingMonth(card, activeMonth),
          itemCount: invoiceTransactions.length,
          paid: isCardInvoicePaid(invoiceTransactions),
          total,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => left.invoice.dueDate.localeCompare(right.invoice.dueDate))
  ), [activeMonth, cards, transactions]);

  const pendingAccountExpenses = useMemo(() => (
    transactions
      .filter((transaction) => isPendingAccountExpense(transaction, activeMonth))
      .sort((left, right) => left.date.localeCompare(right.date))
  ), [activeMonth, transactions]);

  const allAccountExpenses = useMemo(() => (
    transactions
      .filter((transaction) => transaction.flow === 'expense')
      .filter((transaction) => !transaction.cardId)
      .filter((transaction) => !isInvoicePayment(transaction) && !isInvoiceCredit(transaction))
      .filter((transaction) => getTransactionCompetenceMonth(transaction, cards) === activeMonth)
      .sort((left, right) => left.date.localeCompare(right.date))
  ), [activeMonth, cards, transactions]);

  const paidInvoiceSummaries = useMemo(() => (
    allInvoiceSummaries.filter((item) => item.paid)
  ), [allInvoiceSummaries]);

  const paidAccountExpenses = useMemo(() => (
    allAccountExpenses.filter((transaction) => transaction.status === 'paid')
  ), [allAccountExpenses]);

  const visibleInvoiceSummaries = paymentStatusFilter === 'pending'
    ? pendingInvoices.map((item) => ({ ...item, paid: false }))
    : paymentStatusFilter === 'paid'
      ? paidInvoiceSummaries
      : allInvoiceSummaries;

  const visibleAccountExpenses = paymentStatusFilter === 'pending'
    ? pendingAccountExpenses
    : paymentStatusFilter === 'paid'
      ? paidAccountExpenses
      : allAccountExpenses;

  const visiblePaymentCount = visibleInvoiceSummaries.length + visibleAccountExpenses.length;
  const pendingPaymentCount = pendingInvoices.length + pendingAccountExpenses.length;
  const paidPaymentCount = paidInvoiceSummaries.length + paidAccountExpenses.length;
  const visiblePaymentTotal = roundMoney(
    visibleInvoiceSummaries.reduce((sum, item) => sum + item.total, 0)
    + visibleAccountExpenses.reduce((sum, item) => sum + item.amount, 0),
  );

  const pendingReimbursements = useMemo(() => (
    transactions
      .filter((transaction) => transaction.isReimbursable && transaction.reimbursementStatus !== 'received')
      .filter((transaction) => getReimbursementMonthKey(transaction, cards) <= activeMonth)
      .sort((left, right) => {
        const leftDue = getReimbursementDueDate(left, cards) ?? left.date;
        const rightDue = getReimbursementDueDate(right, cards) ?? right.date;
        return leftDue.localeCompare(rightDue);
      })
  ), [activeMonth, cards, transactions]);

  const paymentPriorityItems = useMemo(() => {
    const invoiceItems = pendingInvoices.map((item) => ({
      id: `invoice:${item.card.id}:${item.invoice.period}`,
      title: item.card.name,
      detail: item.invoice.label,
      amount: item.total,
      dueDate: item.invoice.dueDate,
      kind: 'invoice' as const,
      action: () => onOpenCards(item.card.id),
    }));
    const accountItems = pendingAccountExpenses.map((transaction) => ({
      id: `account:${transaction.id}`,
      title: transaction.description,
      detail: 'Despesa de conta',
      amount: transaction.amount,
      dueDate: transaction.date,
      kind: 'account' as const,
      action: () => openAccountExpensePayment(transaction),
    }));

    return [...invoiceItems, ...accountItems]
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || right.amount - left.amount);
  }, [cards, onOpenCards, openAccountExpensePayment, pendingAccountExpenses, pendingInvoices]);

  const fixedExpenses = useMemo(() => (
    transactions
      .filter((transaction) => isFixedExpense(transaction, cards, activeMonth))
      .sort((left, right) => {
        const leftDueDate = getExpenseDueDate(left, cards);
        const rightDueDate = getExpenseDueDate(right, cards);
        return leftDueDate.localeCompare(rightDueDate) || left.description.localeCompare(right.description);
      })
  ), [activeMonth, cards, transactions]);

  const installmentExpenses = useMemo(() => (
    transactions
      .filter((transaction) => isInstallmentExpense(transaction, cards, activeMonth))
      .sort((left, right) => {
        const leftDueDate = getExpenseDueDate(left, cards);
        const rightDueDate = getExpenseDueDate(right, cards);
        const leftMeta = readTransactionMeta(left.notes);
        const rightMeta = readTransactionMeta(right.notes);
        return leftDueDate.localeCompare(rightDueDate)
          || left.description.localeCompare(right.description)
          || (leftMeta.installmentNumber ?? 0) - (rightMeta.installmentNumber ?? 0);
      })
  ), [activeMonth, cards, transactions]);

  const reimbursementPeopleSummaries = useMemo(() => {
    const summaries = new Map<string, {
      personId?: string;
      personName: string;
      total: number;
      count: number;
      overdueCount: number;
      oldestDueDate?: string;
      oldestTransaction?: Transaction;
      hasPreviousMonth: boolean;
    }>();

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
  }, [activeMonth, cards, pendingReimbursements, people, today]);

  const invoiceTotal = roundMoney(pendingInvoices.reduce((sum, item) => sum + item.total, 0));
  const accountExpenseTotal = roundMoney(pendingAccountExpenses.reduce((sum, item) => sum + item.amount, 0));
  const fixedExpenseTotal = roundMoney(fixedExpenses.reduce((sum, item) => sum + getPersonalExpenseSignedAmount(item), 0));
  const installmentExpenseTotal = roundMoney(installmentExpenses.reduce((sum, item) => sum + getPersonalExpenseSignedAmount(item), 0));
  const commitmentPeople = useMemo(() => {
    const peopleMap = new Map<string, string>();
    [...fixedExpenses, ...installmentExpenses].forEach((transaction) => {
      if (getTransactionReimbursementAmount(transaction) <= 0) return;
      const id = transaction.reimbursementPersonId ?? 'unknown';
      peopleMap.set(id, getPersonName(people, transaction.reimbursementPersonId));
    });
    return Array.from(peopleMap.entries()).map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name));
  }, [fixedExpenses, installmentExpenses, people]);
  const visibleFixedExpenses = fixedExpenses.filter((transaction) => {
    if (commitmentOwner === 'mine') return getPersonalExpenseSignedAmount(transaction) > 0;
    if (getTransactionReimbursementAmount(transaction) <= 0) return false;
    return commitmentPersonId === 'all' || (transaction.reimbursementPersonId ?? 'unknown') === commitmentPersonId;
  });
  const visibleInstallmentExpenses = installmentExpenses.filter((transaction) => {
    if (commitmentOwner === 'mine') return getPersonalExpenseSignedAmount(transaction) > 0;
    if (getTransactionReimbursementAmount(transaction) <= 0) return false;
    return commitmentPersonId === 'all' || (transaction.reimbursementPersonId ?? 'unknown') === commitmentPersonId;
  });
  const filteredFixedExpenses = commitmentFilter === 'installment' ? [] : visibleFixedExpenses;
  const filteredInstallmentExpenses = commitmentFilter === 'fixed' ? [] : visibleInstallmentExpenses;
  const visibleCommitmentCount = filteredFixedExpenses.length + filteredInstallmentExpenses.length;
  const selectedFixedTotal = roundMoney(visibleFixedExpenses.reduce((sum, item) => (
    sum + (commitmentOwner === 'mine' ? getPersonalExpenseSignedAmount(item) : getTransactionReimbursementAmount(item))
  ), 0));
  const selectedInstallmentTotal = roundMoney(visibleInstallmentExpenses.reduce((sum, item) => (
    sum + (commitmentOwner === 'mine' ? getPersonalExpenseSignedAmount(item) : getTransactionReimbursementAmount(item))
  ), 0));
  const commitmentExpenseTotal = roundMoney(selectedFixedTotal + selectedInstallmentTotal);
  const nextCommitmentDueDate = [...filteredFixedExpenses, ...filteredInstallmentExpenses]
    .map((transaction) => getExpenseDueDate(transaction, cards))
    .filter((date) => date >= today)
    .sort()[0];
  const reimbursementTotal = roundMoney(pendingReimbursements.reduce((sum, item) => sum + getTransactionReimbursementAmount(item), 0));
  const availableBalance = roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0));
  const totalToPay = roundMoney(invoiceTotal + accountExpenseTotal);
  const balanceAfterPayments = roundMoney(availableBalance - totalToPay);
  const overduePriorityItems = paymentPriorityItems.filter((item) => daysBetween(item.dueDate, today) < 0);
  const todayPriorityItems = paymentPriorityItems.filter((item) => daysBetween(item.dueDate, today) === 0);
  const nextWeekPriorityItems = paymentPriorityItems.filter((item) => {
    const days = daysBetween(item.dueDate, today);
    return days > 0 && days <= 7;
  });
  const overduePriorityTotal = roundMoney(overduePriorityItems.reduce((sum, item) => sum + item.amount, 0));
  const todayPriorityTotal = roundMoney(todayPriorityItems.reduce((sum, item) => sum + item.amount, 0));
  const nextWeekPriorityTotal = roundMoney(nextWeekPriorityItems.reduce((sum, item) => sum + item.amount, 0));
  const nextPriorityItem = paymentPriorityItems.find((item) => daysBetween(item.dueDate, today) >= 0) ?? paymentPriorityItems[0];
  const monthTransactions = transactions.filter((transaction) => getTransactionCompetenceMonth(transaction, cards) === activeMonth);
  const previousMonth = shiftMonthKey(activeMonth, -1);
  const previousSummary = summarizeDashboard(accounts, transactions, previousMonth, cards, {
    includeReimbursements: reimbursementsEnabled,
  });
  const monthPersonalExpenses = roundMoney(monthTransactions
    .filter((transaction) => transaction.flow === 'expense' && !isInvoicePayment(transaction))
    .reduce((sum, transaction) => sum + getTransactionPersonalAmount(transaction), 0));
  const monthThirdPartyExpenses = roundMoney(monthTransactions
    .filter((transaction) => transaction.flow === 'expense' && !isInvoicePayment(transaction))
    .reduce((sum, transaction) => sum + getTransactionReimbursementAmount(transaction), 0));
  const topCategory = expensesByCategory(transactions, categories, activeMonth, cards)[0];
  const superfluousTotal = roundMoney(monthTransactions
    .filter((transaction) => transaction.flow === 'expense' && !isInvoicePayment(transaction))
    .filter((transaction) => readTransactionMeta(transaction.notes).expenseNeed === 'superfluous')
    .reduce((sum, transaction) => sum + getPersonalExpenseSignedAmount(transaction), 0));
  const monthResult = roundMoney(summary.income - summary.expenses);
  const previousResult = roundMoney(previousSummary.income - previousSummary.expenses);
  const resultDelta = roundMoney(monthResult - previousResult);
  const spendableThisMonth = roundMoney(Math.max(0, monthResult));
  const oldPendingReimbursements = pendingReimbursements.filter((transaction) => getReimbursementMonthKey(transaction, cards) < activeMonth);
  const overdueReimbursements = pendingReimbursements.filter((transaction) => isReimbursementOverdue(transaction, cards, today));
  const paidInvoices = cards.length - pendingInvoices.length;

  const closingItems = [
    {
      id: 'invoices',
      done: pendingInvoices.length === 0,
      title: 'Faturas do mês',
      detail: pendingInvoices.length === 0 ? 'Todas as faturas com lançamento ativo estão quitadas.' : `${pendingInvoices.length} fatura${pendingInvoices.length === 1 ? '' : 's'} ainda em aberto.`,
      action: 'Ver cartões',
      onClick: () => onOpenCards(),
    },
    {
      id: 'account-expenses',
      done: pendingAccountExpenses.length === 0,
      title: 'Despesas fora do cartão',
      detail: pendingAccountExpenses.length === 0 ? 'Nenhuma despesa de conta pendente neste mês.' : `${pendingAccountExpenses.length} despesa${pendingAccountExpenses.length === 1 ? '' : 's'} pendente${pendingAccountExpenses.length === 1 ? '' : 's'} para resolver.`,
      action: 'Ver transações',
      onClick: onOpenTransactions,
    },
    {
      id: 'fixed-expenses',
      done: fixedExpenses.length > 0 || installmentExpenses.length > 0,
      title: 'Fixas e parceladas do mês',
      detail: fixedExpenses.length > 0 || installmentExpenses.length > 0
        ? `${fixedExpenses.length} fixa${fixedExpenses.length === 1 ? '' : 's'} e ${installmentExpenses.length} parcelada${installmentExpenses.length === 1 ? '' : 's'} em ${formatMonthLabel(activeMonth)}.`
        : 'Nenhuma despesa fixa ou parcelada encontrada neste mês.',
      action: 'Ver compromissos',
      onClick: () => setTab('fixed'),
    },
    {
      id: 'reimbursements',
      done: !reimbursementsEnabled || pendingReimbursements.length === 0,
      title: 'Reembolsos e terceiros',
      detail: !reimbursementsEnabled
        ? 'Reembolsos desativados no perfil.'
        : pendingReimbursements.length === 0
          ? 'Nada pendente de terceiros.'
          : `${formatCurrency(reimbursementTotal)} ainda a receber. ${oldPendingReimbursements.length > 0 ? 'Há pendências de meses anteriores.' : 'Você pode receber ou manter em acompanhamento.'}`,
      action: 'Ver reembolsos',
      onClick: () => onOpenReimbursements(),
    },
    {
      id: 'review',
      done: monthTransactions.length > 0,
      title: 'Lançamentos revisados',
      detail: monthTransactions.length > 0 ? `${monthTransactions.length} lançamento${monthTransactions.length === 1 ? '' : 's'} encontrado${monthTransactions.length === 1 ? '' : 's'} no mês.` : 'Ainda não há lançamentos neste mês para conferir.',
      action: 'Ver transações',
      onClick: onOpenTransactions,
    },
  ];

  const canCloseMonth = closingItems.every((item) => item.done);

  return (
    <div className="premium-scroll app-page-gutters flex h-full min-h-0 flex-col overflow-y-auto pb-8 pt-4 text-white md:pt-6">
      <header className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200/60">Central do mês</p>
        <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight text-white">Pagamentos e fechamento</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">Veja o que precisa sair da conta, o que falta receber de terceiros e se o mês já pode ser encerrado.</p>
          </div>
          <MonthNavigator month={activeMonth} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} onCurrentMonth={onCurrentMonth} className="lg:w-[360px]" />
        </div>
      </header>

      <section className="mt-4 grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="premium-card rounded-2xl p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preciso pagar</p>
              <p className="mt-1 font-display text-2xl font-black text-white">{formatCurrency(totalToPay)}</p>
              <p className="mt-1 text-xs text-slate-500">{pendingInvoices.length} fatura(s) + {pendingAccountExpenses.length} conta(s)</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100/80">A receber</p>
              <p className="mt-1 font-display text-2xl font-black text-white">{formatCurrency(reimbursementTotal)}</p>
              <p className="mt-1 text-xs text-slate-500">{pendingReimbursements.length} reembolso(s)</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo após pagar</p>
              <p className={`mt-1 font-display text-2xl font-black ${balanceAfterPayments < 0 ? 'text-rose-200' : 'text-emerald-100'}`}>{formatCurrency(balanceAfterPayments)}</p>
              <p className="mt-1 text-xs text-slate-500">saldo atual {formatCurrency(availableBalance)}</p>
            </div>
          </div>
        </div>

        <div className="premium-card-soft rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-100/80">Leitura rápida</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2">
              <span className="text-xs font-semibold text-slate-400">Pode gastar</span>
              <span className="font-mono text-sm font-black text-white">{formatCurrency(spendableThisMonth)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2">
              <span className="truncate text-xs font-semibold text-slate-400">Mais pesa: {topCategory?.name ?? 'sem despesas'}</span>
              <span className="font-mono text-sm font-black text-white">{topCategory ? formatCurrency(topCategory.value) : formatCurrency(0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2">
              <span className="text-xs font-semibold text-slate-400">Vs. mês anterior</span>
              <span className={`font-mono text-sm font-black ${resultDelta >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>{resultDelta >= 0 ? '+' : ''}{formatCurrency(resultDelta)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-card-soft mt-3 grid shrink-0 gap-2 rounded-2xl p-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => setTab('payments')} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-left transition hover:border-rose-200/40">
            <span className="text-xs font-black uppercase tracking-wide text-rose-100">Atrasado</span>
            <span className="text-right font-mono text-sm font-black text-white">{formatCurrency(overduePriorityTotal)}<br /><span className="text-[10px] font-semibold text-slate-400">{overduePriorityItems.length} item{overduePriorityItems.length === 1 ? '' : 's'}</span></span>
          </button>
          <button type="button" onClick={() => setTab('payments')} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-left transition hover:border-amber-100/40">
            <span className="text-xs font-black uppercase tracking-wide text-amber-100">Hoje</span>
            <span className="text-right font-mono text-sm font-black text-white">{formatCurrency(todayPriorityTotal)}<br /><span className="text-[10px] font-semibold text-slate-400">{todayPriorityItems.length} item{todayPriorityItems.length === 1 ? '' : 's'}</span></span>
          </button>
          <button type="button" onClick={() => setTab('payments')} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-left transition hover:border-cyan-100/35">
            <span className="text-xs font-black uppercase tracking-wide text-cyan-100">7 dias</span>
            <span className="text-right font-mono text-sm font-black text-white">{formatCurrency(nextWeekPriorityTotal)}<br /><span className="text-[10px] font-semibold text-slate-400">{nextWeekPriorityItems.length} item{nextWeekPriorityItems.length === 1 ? '' : 's'}</span></span>
          </button>
        </div>
        {nextPriorityItem ? (
          <button type="button" onClick={nextPriorityItem.action} className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-left transition hover:bg-white/10">
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-white">{nextPriorityItem.title}</span>
              <span className="block truncate text-[11px] font-semibold text-slate-500">{priorityKindLabel(nextPriorityItem.kind)} · vence {formatDatePtBr(nextPriorityItem.dueDate)}</span>
            </span>
            <span className="shrink-0 font-mono text-sm font-black text-white">{formatCurrency(nextPriorityItem.amount)}</span>
          </button>
        ) : (
          <div className="flex min-h-12 items-center rounded-xl bg-white/5 px-3 text-sm font-bold text-emerald-100">Nenhuma prioridade pendente.</div>
        )}
      </section>

      <section className="premium-card-soft mt-3 flex shrink-0 flex-col gap-2 rounded-2xl p-3 text-xs font-semibold text-slate-400 lg:flex-row lg:items-center lg:justify-between">
        <span>Resultado do mês: <strong className="font-mono text-white">{formatCurrency(monthResult)}</strong></span>
        <span>Meu x terceiros: <strong className="font-mono text-white">{formatCurrency(monthPersonalExpenses)}</strong> / {formatCurrency(monthThirdPartyExpenses)}</span>
        <span>Supérfluos: <strong className="font-mono text-white">{formatCurrency(superfluousTotal)}</strong></span>
      </section>

      <div className="premium-card-soft mt-4 grid shrink-0 grid-cols-3 gap-1 rounded-2xl p-1">
        <button type="button" onClick={() => setTab('payments')} className={`h-11 rounded-xl text-sm font-black transition ${tab === 'payments' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Pagamentos</button>
        <button type="button" onClick={() => setTab('fixed')} className={`h-11 rounded-xl text-sm font-black transition ${tab === 'fixed' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Compromissos</button>
        <button type="button" onClick={() => setTab('closing')} className={`h-11 rounded-xl text-sm font-black transition ${tab === 'closing' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Fechamento</button>
      </div>

      {tab === 'payments' ? (
        <section className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <WalletCards size={18} className="text-violet-200" />
                <div>
                  <h2 className="font-display text-lg font-bold">Ordem de pagamento</h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {visiblePaymentCount} item{visiblePaymentCount === 1 ? '' : 's'} · {formatCurrency(visiblePaymentTotal)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
                {[
                  { value: 'pending' as const, label: 'Pendentes', count: pendingPaymentCount },
                  { value: 'paid' as const, label: 'Pagos', count: paidPaymentCount },
                  { value: 'all' as const, label: 'Todos', count: allInvoiceSummaries.length + allAccountExpenses.length },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentStatusFilter(option.value)}
                    className={`h-9 rounded-xl px-3 text-xs font-black transition ${paymentStatusFilter === option.value ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    {option.label} <span className="font-mono text-[10px] opacity-70">{option.count}</span>
                  </button>
                ))}
              </div>
            </div>
            {visiblePaymentCount === 0 ? (
              <div className="premium-card-soft rounded-2xl border-emerald-400/20 p-6 text-center">
                <CheckCircle2 size={28} className="mx-auto text-emerald-200" />
                <p className="mt-3 font-bold text-white">
                  {paymentStatusFilter === 'pending' ? 'Nada pendente para pagar neste mês.' : 'Nada encontrado neste filtro.'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {paymentStatusFilter === 'pending' ? 'Hora boa de conferir reembolsos e fechar o mês.' : 'Troque o filtro para ver pendentes, pagos ou todos.'}
                </p>
              </div>
            ) : null}
            {visibleInvoiceSummaries.map((item) => {
              const badge = item.paid
                ? { label: 'paga', className: 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100' }
                : dueBadge(item.invoice.dueDate, today);
              const invoiceTransactions = getCardInvoiceTransactions(item.card, transactions, item.invoice.period);
              return (
                <article key={`${item.card.id}:${item.invoice.period}`} className="premium-card rounded-2xl p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-100"><CreditCard size={17} /></span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-bold text-white">{item.card.name}</h3>
                          <p className="text-xs text-slate-500">{item.invoice.label} · {item.paid ? 'quitada' : 'pendente'}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}>{badge.label}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{item.itemCount} lançamento{item.itemCount === 1 ? '' : 's'} no ciclo. Prioridade por vencimento: {formatDatePtBr(item.invoice.dueDate)}.</p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-display text-xl font-black text-white">{formatCurrency(item.total)}</p>
                      <div className="mt-2 flex items-center gap-2 sm:justify-end">
                        <CardInvoiceActions
                          card={item.card}
                          accounts={accounts}
                          invoiceLabel={item.invoice.label}
                          invoiceTotal={item.total}
                          invoiceTransactions={invoiceTransactions}
                          onPayInvoice={onPayInvoice}
                        />
                        <button type="button" onClick={() => onOpenCards(item.card.id)} className="flex h-9 items-center gap-1 rounded-xl bg-white/5 px-3 text-xs font-bold text-slate-200 hover:bg-white/10">
                          Abrir <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {visibleAccountExpenses.map((transaction) => {
              const paid = transaction.status === 'paid';
              const badge = paid
                ? { label: 'paga', className: 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100' }
                : dueBadge(transaction.date, today);
              return (
                <button key={transaction.id} type="button" disabled={paid} onClick={() => openAccountExpensePayment(transaction)} className="premium-card w-full rounded-2xl p-4 text-left transition hover:border-emerald-300/30 hover:bg-emerald-500/10 disabled:cursor-default disabled:opacity-80 disabled:hover:bg-transparent">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-100"><ReceiptText size={17} /></span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-bold text-white">{transaction.description}</h3>
                          <p className="text-xs text-slate-500">Despesa de conta · {paid ? 'quitada' : 'clique para pagar'}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}>{badge.label}</span>
                        {!paid ? <span className="rounded-full border border-emerald-300/20 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100">Pagar</span> : null}
                      </div>
                    </div>
                    <p className="shrink-0 font-display text-lg font-black text-white">{formatCurrency(transaction.amount)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="space-y-3">
            <div className="flex items-center gap-2">
              <HandCoins size={18} className="text-amber-200" />
              <h2 className="font-display text-lg font-bold">Reembolsos em aberto</h2>
            </div>
            {reimbursementPeopleSummaries.length === 0 ? (
              <div className="premium-card-soft rounded-2xl p-5 text-center">
                <CheckCircle2 size={24} className="mx-auto text-emerald-200" />
                <p className="mt-2 text-sm font-bold text-white">Sem pendências de terceiros.</p>
              </div>
            ) : reimbursementPeopleSummaries.slice(0, 6).map((person) => {
              const overdue = person.overdueCount > 0;
              return (
                <article key={person.personId ?? 'unknown'} className={`premium-card rounded-2xl p-3 ${overdue ? 'border-rose-400/20 bg-rose-500/10' : 'border-amber-400/10'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{person.personName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {person.count} item{person.count === 1 ? '' : 's'} em aberto
                        {person.oldestDueDate ? ` · mais antigo ${formatDatePtBr(person.oldestDueDate)}` : ''}
                      </p>
                      {person.hasPreviousMonth ? (
                        <p className="mt-1 text-[11px] font-semibold text-amber-100">Tem valor carregado de mês anterior. Se passar do dia 10, trate como prioridade de cobrança.</p>
                      ) : null}
                      {overdue ? (
                        <p className="mt-1 text-[11px] font-semibold text-rose-100">{person.overdueCount} pendência{person.overdueCount === 1 ? '' : 's'} atrasada{person.overdueCount === 1 ? '' : 's'}.</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-mono text-sm font-black text-amber-100">{formatCurrency(person.total)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!person.oldestTransaction) return;
                        setReceivingTransaction(person.oldestTransaction);
                        setReceivingAccountId(person.oldestTransaction.accountId ?? accounts[0]?.id ?? '');
                        setReceivingAmount(formatCurrencyInput(getTransactionReimbursementAmount(person.oldestTransaction)));
                      }}
                      className="h-9 flex-1 rounded-xl bg-emerald-500/15 text-xs font-bold text-emerald-100 hover:bg-emerald-500/25"
                    >
                      Registrar
                    </button>
                    {person.oldestTransaction ? (
                      <button
                        type="button"
                        onClick={() => void onCarryReimbursement(person.oldestTransaction!)}
                        className="h-9 rounded-xl bg-amber-500/10 px-3 text-xs font-bold text-amber-100 hover:bg-amber-500/20"
                      >
                        Próx. mês
                      </button>
                    ) : null}
                    <button type="button" onClick={() => onOpenReimbursements(person.personId)} className="h-9 flex-1 rounded-xl bg-white/5 text-xs font-bold text-slate-200 hover:bg-white/10">Ver pessoa</button>
                  </div>
                </article>
              );
            })}
            {reimbursementPeopleSummaries.length > 6 ? (
              <button type="button" onClick={() => onOpenReimbursements()} className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-white">Ver todas as {reimbursementPeopleSummaries.length} pessoas</button>
            ) : null}
          </aside>
        </section>
      ) : null}

      {tab === 'fixed' ? (
        <section className="mt-4 min-h-0 flex-1 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <button type="button" onClick={() => setCommitmentFilter('all')} className={`premium-card rounded-2xl p-4 text-left transition hover:border-white/20 ${commitmentFilter === 'all' ? 'ring-1 ring-white/35' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total compromissos</p>
              <p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(commitmentExpenseTotal)}</p>
              <p className="mt-1 text-xs text-slate-500">{visibleFixedExpenses.length + visibleInstallmentExpenses.length} lançamento{visibleFixedExpenses.length + visibleInstallmentExpenses.length === 1 ? '' : 's'}</p>
            </button>
            <button type="button" onClick={() => setCommitmentFilter('fixed')} className={`premium-card-soft rounded-2xl border-amber-400/15 p-4 text-left transition hover:border-amber-200/35 ${commitmentFilter === 'fixed' ? 'ring-1 ring-amber-200/45' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100/80">Fixas</p>
              <p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(selectedFixedTotal)}</p>
              <p className="mt-1 text-xs text-slate-500">{visibleFixedExpenses.length} lançamento{visibleFixedExpenses.length === 1 ? '' : 's'} fixo{visibleFixedExpenses.length === 1 ? '' : 's'}</p>
            </button>
            <button type="button" onClick={() => setCommitmentFilter('installment')} className={`premium-card-soft rounded-2xl border-violet-400/15 p-4 text-left transition hover:border-violet-200/35 ${commitmentFilter === 'installment' ? 'ring-1 ring-violet-200/45' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-100/80">Parceladas</p>
              <p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(selectedInstallmentTotal)}</p>
              <p className="mt-1 text-xs text-slate-500">{visibleInstallmentExpenses.length} parcela{visibleInstallmentExpenses.length === 1 ? '' : 's'} no mês</p>
            </button>
          </div>

          <div className="premium-card-soft flex flex-col gap-3 rounded-2xl p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1 sm:w-[280px]">
              <button type="button" onClick={() => setCommitmentOwner('mine')} className={`h-10 rounded-lg text-sm font-black transition ${commitmentOwner === 'mine' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Meus</button>
              <button type="button" onClick={() => setCommitmentOwner('others')} className={`h-10 rounded-lg text-sm font-black transition ${commitmentOwner === 'others' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Terceiros</button>
            </div>
            {commitmentOwner === 'others' ? (
              <select value={commitmentPersonId} onChange={(event) => setCommitmentPersonId(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-violet-300 sm:min-w-[220px]">
                <option value="all">Todos os terceiros</option>
                {commitmentPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            ) : (
              <p className="px-2 text-xs font-semibold text-slate-500">Mostrando só a parte que pesa no seu orçamento.</p>
            )}
          </div>

          <div className="premium-card overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-2 border-b border-white/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={18} className="text-amber-200" />
                <h2 className="font-display text-lg font-bold">Fixas e parceladas de {formatMonthLabel(activeMonth)}</h2>
              </div>
              <p className="text-xs font-semibold text-slate-500">Próximo vencimento: {nextCommitmentDueDate ? formatDatePtBr(nextCommitmentDueDate) : 'sem data futura'}</p>
            </div>

            {visibleCommitmentCount === 0 ? (
              <div className="p-6 text-center">
                <Repeat size={28} className="mx-auto text-slate-500" />
                <p className="mt-3 font-bold text-white">Nada encontrado neste filtro.</p>
                <p className="mt-1 text-sm text-slate-500">Troque entre Meus, Terceiros, Fixas ou Parceladas para conferir outro recorte.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {filteredFixedExpenses.length > 0 ? (
                  <div className="bg-amber-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-100">Fixas · {formatCurrency(selectedFixedTotal)}</div>
                ) : null}
                {filteredFixedExpenses.map((transaction) => {
                  const card = transaction.cardId ? cards.find((item) => item.id === transaction.cardId) : undefined;
                  const invoiceInfo = card ? getCardInvoiceInfo(card, transaction.date) : undefined;
                  const dueDate = invoiceInfo?.dueDate ?? transaction.date;
                  const badge = dueBadge(dueDate, today);
                  const meta = readTransactionMeta(transaction.notes);
                  const paid = transaction.cardId ? Boolean(meta.paidAt) : transaction.status === 'paid';
                  const canSkipOccurrence = Boolean(transaction.recurringTransactionId || meta.recurringTransactionId);

                  return (
                    <article key={transaction.id} className="grid gap-3 px-4 py-3 transition hover:bg-white/[0.035] md:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)_150px_120px_120px] md:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-100">
                          {transaction.cardId ? <CreditCard size={17} /> : <ReceiptText size={17} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{transaction.description}</p>
                          <p className="text-xs text-slate-500">{getPaymentSource(accounts, cards, transaction)}{invoiceInfo ? ` · ${invoiceInfo.label}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}>{badge.label}</span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${paid ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                          {paid ? 'paga' : transaction.cardId ? 'na fatura' : 'pendente'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-400 md:text-right">{formatDatePtBr(dueDate)}</p>
                      <p className="font-mono text-sm font-black text-white md:text-right">{formatCurrency(commitmentOwner === 'mine' ? getPersonalExpenseSignedAmount(transaction) : getTransactionReimbursementAmount(transaction))}</p>
                      {canSkipOccurrence ? (
                        <button
                          type="button"
                          onClick={() => void onSkipFixedOccurrence(transaction)}
                          className="h-9 rounded-xl bg-white/5 px-3 text-xs font-bold text-slate-200 transition hover:bg-amber-500/15 hover:text-amber-100 md:justify-self-end"
                        >
                          Não usei
                        </button>
                      ) : <span className="hidden md:block" />}
                    </article>
                  );
                })}

                {filteredInstallmentExpenses.length > 0 ? (
                  <div className="bg-violet-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-violet-100">Parceladas · {formatCurrency(selectedInstallmentTotal)}</div>
                ) : null}
                {filteredInstallmentExpenses.map((transaction) => {
                  const card = transaction.cardId ? cards.find((item) => item.id === transaction.cardId) : undefined;
                  const invoiceInfo = card ? getCardInvoiceInfo(card, transaction.date) : undefined;
                  const dueDate = invoiceInfo?.dueDate ?? transaction.date;
                  const badge = dueBadge(dueDate, today);
                  const meta = readTransactionMeta(transaction.notes);
                  const paid = transaction.cardId ? Boolean(meta.paidAt) : transaction.status === 'paid';
                  const installmentLabel = meta.installmentNumber && meta.totalInstallments ? `${meta.installmentNumber}/${meta.totalInstallments}` : 'parcela';

                  return (
                    <article key={transaction.id} className="grid gap-3 px-4 py-3 transition hover:bg-white/[0.035] md:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)_150px_120px] md:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-100">
                          <Layers size={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{transaction.description}</p>
                          <p className="text-xs text-slate-500">{getPaymentSource(accounts, cards, transaction)}{invoiceInfo ? ` · ${invoiceInfo.label}` : ''} · {installmentLabel}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}>{badge.label}</span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${paid ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                          {paid ? 'paga' : transaction.cardId ? 'na fatura' : 'pendente'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-400 md:text-right">{formatDatePtBr(dueDate)}</p>
                      <p className="font-mono text-sm font-black text-white md:text-right">{formatCurrency(commitmentOwner === 'mine' ? getPersonalExpenseSignedAmount(transaction) : getTransactionReimbursementAmount(transaction))}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === 'closing' ? (
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="premium-card rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <ListChecks size={18} className="text-violet-200" />
              <h2 className="font-display text-lg font-bold">Checklist de {formatMonthLabel(activeMonth)}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {closingItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.done ? 'bg-emerald-500/15 text-emerald-100' : 'bg-amber-500/15 text-amber-100'}`}>
                      {item.done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.detail}</p>
                    </div>
                    <button type="button" onClick={item.onClick} className="hidden h-8 shrink-0 rounded-xl bg-white/5 px-3 text-xs font-bold text-slate-200 hover:bg-white/10 sm:block">{item.action}</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="premium-card rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <CalendarCheck2 size={18} className="text-cyan-200" />
              <h2 className="font-display text-lg font-bold">Resumo para decidir</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Faturas quitadas</p><p className="mt-2 font-display text-2xl font-black text-white">{paidInvoices}/{cards.length}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Reembolsos atrasados</p><p className="mt-2 font-display text-2xl font-black text-white">{overdueReimbursements.length}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pendente a pagar</p><p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(totalToPay)}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pendente a receber</p><p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(reimbursementTotal)}</p></div>
            </div>
            <div className={`mt-4 rounded-2xl border p-4 ${canCloseMonth ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-amber-400/20 bg-amber-500/10'}`}>
              {canCloseMonth ? (
                <p className="text-sm font-bold text-emerald-100">Mês pronto para fechar. Nada crítico ficou pendente.</p>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-100" />
                  <p className="text-sm font-semibold leading-relaxed text-amber-100">Ainda existem pontos em aberto. Resolva, receba ou deixe conscientemente carregado para o próximo mês.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {receivingTransaction ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="premium-card w-full rounded-t-[28px] p-5 sm:max-w-sm sm:rounded-[28px]">
            <h2 className="font-display text-lg font-bold text-white">Registrar reembolso</h2>
            <p className="mt-1 text-xs text-slate-500">{receivingTransaction.description} · pendente {formatCurrency(getTransactionReimbursementAmount(receivingTransaction))}</p>
            <label className="mt-4 grid gap-1 text-xs font-semibold text-slate-400">
              Valor recebido
              <CurrencyInput value={receivingAmount} onChange={setReceivingAmount} />
            </label>
            <label className="mt-4 grid gap-1 text-xs font-semibold text-slate-400">
              Conta onde o dinheiro entrou
              <select value={receivingAccountId} onChange={(event) => setReceivingAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-emerald-300">
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            {(() => {
              const pendingAmount = getTransactionReimbursementAmount(receivingTransaction);
              const parsedReceivedAmount = parseCurrencyInput(receivingAmount);
              const remainingAmount = Math.max(0, pendingAmount - Math.min(pendingAmount, parsedReceivedAmount));
              return (
                <p className={`mt-3 rounded-2xl border p-3 text-xs leading-relaxed ${remainingAmount > 0 ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'}`}>
                  {parsedReceivedAmount <= 0
                    ? 'Informe um valor recebido maior que zero.'
                    : remainingAmount > 0
                      ? `Recebimento parcial. Ainda ficará pendente ${formatCurrency(remainingAmount)}.`
                      : 'Recebimento total. Este reembolso será marcado como recebido.'}
                </p>
              );
            })()}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setReceivingTransaction(null)} className="h-11 rounded-xl bg-white/5 text-sm font-bold text-slate-300">Cancelar</button>
              <button
                type="button"
                disabled={!receivingAccountId || parseCurrencyInput(receivingAmount) <= 0}
                onClick={async () => {
                  await onMarkReimbursementReceived(receivingTransaction, receivingAccountId, parseCurrencyInput(receivingAmount));
                  setReceivingTransaction(null);
                }}
                className="h-11 rounded-xl bg-white text-sm font-bold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {payingAccountExpense ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="premium-card w-full rounded-t-[28px] p-5 sm:max-w-sm sm:rounded-[28px]">
            <h2 className="font-display text-lg font-bold text-white">Registrar pagamento</h2>
            <p className="mt-1 text-xs text-slate-500">{payingAccountExpense.description} · {formatCurrency(payingAccountExpense.amount)}</p>
            <label className="mt-4 grid gap-1 text-xs font-semibold text-slate-400">
              Data do pagamento
              <input
                type="date"
                value={accountPaymentDate}
                onChange={(event) => setAccountPaymentDate(event.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-emerald-300"
              />
            </label>
            <label className="mt-3 grid gap-1 text-xs font-semibold text-slate-400">
              Conta usada
              <select value={payingAccountId} onChange={(event) => setPayingAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-emerald-300">
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <p className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-100">
              A despesa será marcada como paga e o saldo da conta escolhida será atualizado.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPayingAccountExpense(null)} className="h-11 rounded-xl bg-white/5 text-sm font-bold text-slate-300">Cancelar</button>
              <button
                type="button"
                disabled={!payingAccountId || !accountPaymentDate}
                onClick={async () => {
                  await onMarkAccountExpensePaid(payingAccountExpense, {
                    accountId: payingAccountId,
                    paymentDate: accountPaymentDate,
                  });
                  setPayingAccountExpense(null);
                }}
                className="h-11 rounded-xl bg-white text-sm font-bold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
