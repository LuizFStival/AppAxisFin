import React, { useRef } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ArrowRight,
  Bell,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  HandCoins,
  Plus,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Account, Card, Category, DashboardSummary, DashboardTransactionFilter, Transaction, UserProfile } from '../../types';
import { formatCurrency, formatMonthLabel, getAccountMovementEntries, getCurrentMonthKey, getExpenseSignedAmount, isCardInvoicePaid, shiftMonthKey, summarizeDashboard, summarizeMonthlyInvestmentGoal, summarizeMonthlyResult } from '../../lib/utils/finance';
import { getCardInvoiceInfo, getCardInvoiceInfoForClosingMonth } from '../../lib/utils/cardInvoices';
import { formatDatePtBr, formatLocalDate } from '../../lib/utils/date';
import { StatCard } from '../shared/StatCard';
import { BankLogo } from '../shared/BankLogo';
import { CardInvoiceActions } from '../cards/CardInvoiceActions';

interface DashboardViewProps {
  userName: string;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  activeMonth: string;
  summary: DashboardSummary;
  savingsPreferences: Pick<UserProfile, 'savingsGoalMode' | 'savingsGoalAmount' | 'savingsGoalPercentage' | 'includePendingSalary'>;
  reimbursementsEnabled: boolean;
  showBalances: boolean;
  notificationCount: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onToggleBalances: () => void;
  onAdd: () => void;
  onAddAccount: () => void;
  onAddCard: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onViewAccounts: (accountId?: string) => void;
  onViewCards: (cardId?: string) => void;
  onViewReimbursements: () => void;
  onViewDashboardTransactions: (filter: DashboardTransactionFilter) => void;
  onPayInvoice: (input: {
    card: Card;
    accountId: string;
    paymentDate: string;
    amount: number;
    transactions: Transaction[];
  }) => Promise<void>;
  onUpdateCardClosingDay: (card: Card, closingDay: number) => Promise<void>;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
}

function hiddenMoney(show: boolean, value: number) {
  return show ? formatCurrency(value) : 'R$ *****';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatMonthComparison(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? '0,0% igual ao mês anterior' : 'Sem base no mês anterior';
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.05) return '0,0% igual ao mês anterior';
  return `${Math.abs(change).toFixed(1).replace('.', ',')}% ${change > 0 ? 'acima' : 'abaixo'} do mês anterior`;
}

function getInvoiceSummary(card: Card, transactions: Transaction[], closingMonth: string) {
  const openInvoice = getCardInvoiceInfoForClosingMonth(card, closingMonth, formatLocalDate(new Date()));
  const invoiceTransactions = transactions.filter((transaction) => {
    if (transaction.flow !== 'expense' || transaction.cardId !== card.id) return false;
    return getCardInvoiceInfo(card, transaction.date).endDate.slice(0, 7) === closingMonth;
  });
  const total = invoiceTransactions.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0);

  return {
    ...openInvoice,
    total,
    transactions: invoiceTransactions,
    transactionCount: invoiceTransactions.length,
  };
}

function getAccountMonthSummary(account: Account, transactions: Transaction[], month: string, cards: Card[]) {
  const signedAmounts = transactions.flatMap((transaction) =>
    getAccountMovementEntries(transaction, account.id, cards)
      .filter((entry) => entry.month === month)
      .map((entry) => entry.amount),
  );
  const inflow = signedAmounts.reduce((sum, amount) => amount > 0 ? sum + amount : sum, 0);
  const outflow = Math.abs(signedAmounts.reduce((sum, amount) => amount < 0 ? sum + amount : sum, 0));

  return {
    inflow,
    outflow,
    net: inflow - outflow,
  };
}

export function DashboardView({
  userName,
  accounts,
  cards,
  categories,
  transactions,
  activeMonth,
  summary,
  savingsPreferences,
  reimbursementsEnabled,
  showBalances,
  notificationCount,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onToggleBalances,
  onAddAccount,
  onAddCard,
  onOpenProfile,
  onOpenNotifications,
  onViewAccounts,
  onViewCards,
  onViewReimbursements,
  onViewDashboardTransactions,
  onPayInvoice,
  onUpdateCardClosingDay,
  onEditCard,
  onDeleteCard,
}: DashboardViewProps) {
  const firstName = userName.split(' ')[0] || 'você';
  const isCurrentMonth = activeMonth === getCurrentMonthKey();
  const accountsScrollerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });
  const invoiceSummaries = cards.map((card) => ({ card, invoice: getInvoiceSummary(card, transactions, activeMonth) }));
  const activeInvoiceSummaries = invoiceSummaries.filter(({ invoice }) => invoice.transactionCount > 0);
  const upcomingInvoiceTotal = activeInvoiceSummaries.reduce(
    (sum, { invoice }) => sum + (isCardInvoicePaid(invoice.transactions) ? 0 : invoice.total),
    0,
  );
  const previousSummary = summarizeDashboard(accounts, transactions, shiftMonthKey(activeMonth, -1), cards, {
    includeReimbursements: reimbursementsEnabled,
  });
  const reimbursementsTotal = summary.reimbursementsPending + summary.reimbursementsReceived;
  const previousReimbursementsTotal = previousSummary.reimbursementsPending + previousSummary.reimbursementsReceived;
  const cashMonthResult = Math.round((summary.accountInflow - summary.accountOutflow) * 100) / 100;
  const personalCashMonthResult = Math.round((summary.accountInflowPersonal - summary.accountOutflowPersonal) * 100) / 100;
  const monthResult = summarizeMonthlyResult(transactions, activeMonth, cards, {
    includeReimbursements: reimbursementsEnabled,
  }).result;
  const previousMonthResult = summarizeMonthlyResult(transactions, shiftMonthKey(activeMonth, -1), cards, {
    includeReimbursements: reimbursementsEnabled,
  }).result;
  const incomeComparison = formatMonthComparison(summary.income, previousSummary.income);
  const expenseComparison = formatMonthComparison(summary.expenses, previousSummary.expenses);
  const reimbursementComparison = formatMonthComparison(reimbursementsTotal, previousReimbursementsTotal);
  const resultComparison = formatMonthComparison(monthResult, previousMonthResult);
  const investmentGoal = summarizeMonthlyInvestmentGoal(accounts, categories, transactions, activeMonth, {
    mode: savingsPreferences.savingsGoalMode,
    fixedAmount: savingsPreferences.savingsGoalAmount,
    percentage: savingsPreferences.savingsGoalPercentage,
    includePendingSalary: savingsPreferences.includePendingSalary,
    cards,
    includeReimbursements: reimbursementsEnabled,
  });
  const investmentZone = investmentGoal.progress >= 100
    ? { label: 'Meta atingida', color: 'bg-emerald-400', text: 'text-emerald-300' }
    : investmentGoal.progress >= 80
      ? { label: 'Muito perto da meta', color: 'bg-sky-400', text: 'text-sky-300' }
      : investmentGoal.progress >= 50
        ? { label: 'Zona de atenção', color: 'bg-amber-400', text: 'text-amber-300' }
        : { label: 'Zona de perigo', color: 'bg-rose-400', text: 'text-rose-300' };

  function handleAccountsPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) return;

    const scroller = accountsScrollerRef.current;
    if (!scroller) return;

    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
    };
    scroller.setPointerCapture(event.pointerId);
  }

  function handleAccountsPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const scroller = accountsScrollerRef.current;
    const dragState = dragStateRef.current;
    if (!scroller || !dragState.isDragging) return;

    const walk = event.clientX - dragState.startX;
    scroller.scrollLeft = dragState.scrollLeft - walk;
  }

  function handleAccountsPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const scroller = accountsScrollerRef.current;
    dragStateRef.current.isDragging = false;
    if (scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="premium-scroll flex h-full min-h-0 flex-col overflow-y-auto pb-8 text-white">
      <header className="premium-card-soft mx-4 mb-3 mt-4 flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 md:mx-8 xl:mx-10">
        <button
          type="button"
          onClick={onOpenProfile}
          className="group flex min-w-0 items-center gap-3 rounded-xl pr-2 text-left transition hover:bg-white/[0.04]"
          aria-label="Abrir perfil"
        >
          <span className="relative shrink-0">
            <div className="premium-metal flex h-11 w-11 items-center justify-center rounded-2xl font-display text-xs font-bold tracking-wider text-white shadow-[0_0_18px_rgba(139,92,246,0.22)]">
              {getInitials(userName)}
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#111218] bg-violet-400">
              <span className="block h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Prisma Axis</span>
            <h1 className="font-display text-base font-semibold leading-tight tracking-tight text-white">
              Olá, {firstName}
            </h1>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-slate-400 backdrop-blur transition hover:border-white/20 hover:text-white"
            aria-label={notificationCount > 0 ? `Abrir notificações, ${notificationCount} não lidas` : 'Abrir notificações'}
          >
            <Bell size={18} />
            {notificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#050608] bg-rose-500 px-1 text-[9px] font-bold text-white">
                {Math.min(99, notificationCount)}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <section className="app-page-gutters pb-3">
        <div className="premium-card-soft flex items-center justify-between gap-2 rounded-2xl p-1.5">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onCurrentMonth}
            className="min-w-0 flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center transition hover:bg-white/5"
            title="Voltar para o mês atual"
          >
            <CalendarDays size={16} className={isCurrentMonth ? 'text-violet-200' : 'text-slate-500'} />
            <span className="truncate text-sm font-bold capitalize text-white">{formatMonthLabel(activeMonth)}</span>
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="app-page-gutters text-center">
        <div className="premium-card relative flex flex-col items-center overflow-hidden rounded-3xl px-4 py-4 md:px-5">
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">
            <span>Saldo atual</span>
            <button type="button" onClick={onToggleBalances} className="p-1 text-gray-400 transition hover:text-white">
              {showBalances ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <p className="mb-3 font-display text-3xl font-bold tracking-tight text-white">
            {hiddenMoney(showBalances, summary.currentBalance)}
          </p>

          <div className="mb-3 h-px w-full bg-white/8" />

          <div className="grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-2">
            <button type="button" onClick={() => onViewDashboardTransactions('received')} className="premium-card-soft rounded-2xl p-3 text-left transition hover:border-white/15" title="Ver entradas confirmadas">
              <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-gray-400">Entrou nas contas</p>
              <p className="whitespace-nowrap font-mono text-sm font-semibold text-emerald-400">
                {hiddenMoney(showBalances, summary.accountInflow)}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-500">
                Meu {hiddenMoney(showBalances, summary.accountInflowPersonal)} • Terceiros {hiddenMoney(showBalances, summary.accountInflowThirdParty)}
              </p>
            </button>
            <button type="button" onClick={() => onViewDashboardTransactions('paid')} className="premium-card-soft rounded-2xl p-3 text-left transition hover:border-white/15" title="Ver saídas confirmadas">
              <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-gray-400">Saiu das contas</p>
              <p className="whitespace-nowrap font-mono text-sm font-semibold text-red-400">
                {hiddenMoney(showBalances, summary.accountOutflow)}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-500">
                Meu {hiddenMoney(showBalances, summary.accountOutflowPersonal)} • Terceiros {hiddenMoney(showBalances, summary.accountOutflowThirdParty)}
              </p>
            </button>
          </div>

          <div className="mt-2 w-full rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-left">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Caixa do mês</p>
              <p className={`font-mono text-sm font-bold ${cashMonthResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {hiddenMoney(showBalances, cashMonthResult)}
              </p>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Movimento real nas contas. Meu {hiddenMoney(showBalances, personalCashMonthResult)} • inclui terceiros.
            </p>
          </div>
        </div>
      </section>

      <section className="app-page-gutters mt-3 grid grid-cols-2 items-start gap-2.5 md:grid-cols-4">
        <StatCard
          label="Receitas"
          value={hiddenMoney(showBalances, summary.income)}
          tone="info"
          icon={TrendingUp}
          hint={incomeComparison}
          details={<><span className="block">Recebido {formatCurrency(summary.received)}</span><span className="block">Falta receber {formatCurrency(summary.pendingIncome)}</span></>}
          onClick={() => onViewDashboardTransactions('income')}
        />
        <StatCard
          label="Despesas do mês"
          value={hiddenMoney(showBalances, summary.expenses)}
          tone="neutral"
          icon={TrendingDown}
          hint={expenseComparison}
          details={<><span className="block">Quitado {formatCurrency(summary.settledExpenses)}</span><span className="block">Falta quitar {formatCurrency(summary.pendingExpenses)}</span></>}
          onClick={() => onViewDashboardTransactions('pending')}
        />
        {reimbursementsEnabled ? (
          <StatCard
            label="Dos outros"
            value={hiddenMoney(showBalances, reimbursementsTotal)}
            tone="expense"
            icon={HandCoins}
            hint={reimbursementComparison}
            details={<><span className="block">Reembolsado {formatCurrency(summary.reimbursementsReceived)}</span><span className="block">Falta receber {formatCurrency(summary.reimbursementsPending)}</span></>}
            onClick={onViewReimbursements}
          />
        ) : null}
        <StatCard
          label="Resultado pessoal"
          value={hiddenMoney(showBalances, monthResult)}
          tone={investmentGoal.target <= 0 ? 'info' : investmentGoal.progress >= 100 ? 'income' : investmentGoal.progress >= 50 ? 'neutral' : 'expense'}
          icon={Scale}
          hint={investmentGoal.target > 0
            ? <span className={investmentZone.text}>{investmentGoal.progress.toFixed(0)}% da meta • {investmentZone.label}</span>
            : resultComparison}
          details={
            <>
              {investmentGoal.target <= 0 ? (
                <span className="block">Defina sua meta em Configurações</span>
              ) : (
                <>
                  <span className="block">Receitas {formatCurrency(summary.income)} - Despesas {formatCurrency(summary.expenses)}</span>
                  <span className="block">Meta {formatCurrency(investmentGoal.target)} • Economizado {formatCurrency(investmentGoal.saved)}</span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span className={`block h-full rounded-full ${investmentZone.color}`} style={{ width: `${Math.min(100, investmentGoal.progress)}%` }} />
                  </span>
                  <span className={`mt-1 block font-bold ${investmentZone.text}`}>
                    {investmentGoal.progress.toFixed(0)}% • {investmentZone.label}
                  </span>
                  <span className="mt-0.5 block">
                    {investmentGoal.remaining <= 0 ? 'Meta atingida' : `Falta economizar ${formatCurrency(investmentGoal.remaining)}`}
                  </span>
                </>
              )}
            </>
          }
          onClick={() => onViewDashboardTransactions('result')}
        />
      </section>

      <section className="app-page-gutters mt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold tracking-tight text-white">Minhas Contas</h2>
          <button
            type="button"
            onClick={onAddAccount}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-200 transition hover:bg-white hover:text-black"
            title="Adicionar conta"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div
          ref={accountsScrollerRef}
          onPointerDown={handleAccountsPointerDown}
          onPointerMove={handleAccountsPointerMove}
          onPointerUp={handleAccountsPointerEnd}
          onPointerCancel={handleAccountsPointerEnd}
          className="horizontal-scroll no-scrollbar -mx-4 flex cursor-grab touch-pan-x select-none snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-3 pt-1 active:cursor-grabbing md:mx-0 md:grid md:w-full md:grid-cols-[repeat(auto-fit,minmax(168px,1fr))] md:overflow-visible md:px-0"
        >
          {accounts.map((account) => {
            const accountMonth = getAccountMonthSummary(account, transactions, activeMonth, cards);
            return (
              <button
                type="button"
                key={account.id}
                onClick={() => onViewAccounts(account.id)}
                className="cosmic-card cosmic-card-hover relative flex w-[168px] shrink-0 snap-start cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-3 text-left md:min-h-[132px] md:w-auto md:shrink"
                style={{
                  borderColor: `${account.color}44`,
                  backgroundImage: `linear-gradient(135deg, ${account.color}22, transparent 54%)`,
                }}
              >
                <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: account.color }} />
                <div>
                  <div className="mb-3">
                    <BankLogo account={account} size="sm" />
                  </div>
                  <p className="mb-0.5 truncate text-xs font-semibold text-white">{account.name}</p>
                  <p className="text-[10px] font-semibold text-sky-200">Movimento do mês</p>
                </div>
                <div>
                  <p className={`whitespace-nowrap font-mono text-xs font-bold leading-tight tracking-tight ${accountMonth.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {hiddenMoney(showBalances, accountMonth.net)}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-500">Saldo {hiddenMoney(showBalances, account.balance)}</p>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onViewAccounts()}
            className="flex w-[110px] shrink-0 snap-start cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-3 text-center text-gray-400 transition hover:border-white/25 hover:text-white md:min-h-[132px] md:w-auto md:shrink"
          >
            <ArrowRight size={18} className="mb-1 text-gray-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Ver contas</span>
          </button>
        </div>
      </section>

      <section className="app-page-gutters">
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <button type="button" onClick={() => onViewCards()} className="font-display text-base font-semibold tracking-tight text-white">
              Cartões do mês
            </button>
            <p className="mt-0.5 text-[10px] text-gray-500">
              {hiddenMoney(showBalances, upcomingInvoiceTotal)} em faturas ativas
            </p>
          </div>
          <button
            type="button"
            onClick={onAddCard}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-200 transition hover:bg-white hover:text-black"
            title="Adicionar cartão"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
        {activeInvoiceSummaries.length === 0 ? (
          <div className="cosmic-card rounded-2xl border-dashed p-5 text-center">
            <CreditCard size={22} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm font-semibold text-gray-300">Nenhum cartão cadastrado</p>
            <p className="mt-1 text-xs text-gray-500">Seus cartões reais vão aparecer aqui quando forem adicionados.</p>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-[repeat(auto-fit,minmax(360px,1fr))]">
          {activeInvoiceSummaries.map(({ card, invoice }) => {
            const paid = isCardInvoicePaid(invoice.transactions);
            const progress = card.limit > 0 ? Math.min(100, (invoice.total / card.limit) * 100) : 0;
            return (
              <article
                key={card.id}
                className="cosmic-card cosmic-card-hover relative min-h-[152px] w-full cursor-pointer overflow-hidden rounded-3xl p-4"
                style={{
                  borderColor: `${card.color}66`,
                  backgroundImage: `radial-gradient(circle at 86% 18%, ${card.color}38, transparent 30%), linear-gradient(135deg, ${card.color}20, transparent 58%)`,
                }}
                onClick={() => onViewCards(card.id)}
              >
                <span className="pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 rounded-full border border-white/10" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{card.name}</p>
                    <p className="mt-1 text-[10px] font-semibold capitalize text-sky-200">
                      {invoice.label} {paid ? 'Paga' : invoice.status}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500">Vence em {formatDatePtBr(invoice.dueDate)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <CreditCard size={20} style={{ color: card.color }} />
                    <CardInvoiceActions
                      card={card}
                      accounts={accounts}
                      invoiceLabel={invoice.label}
                      invoiceTotal={invoice.total}
                      invoiceTransactions={invoice.transactions}
                      onPayInvoice={onPayInvoice}
                      onUpdateClosingDay={onUpdateCardClosingDay}
                      onEditCard={onEditCard}
                      onDeleteCard={onDeleteCard}
                    />
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: card.color }} />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                  <span>{hiddenMoney(showBalances, invoice.total)}</span>
                  <span>limite {hiddenMoney(showBalances, card.limit)}</span>
                </div>
                <p className="mt-2 text-[10px] text-gray-500">
                  {invoice.transactionCount} lançamento{invoice.transactionCount === 1 ? '' : 's'} no ciclo de {formatDatePtBr(invoice.startDate)} a {formatDatePtBr(invoice.endDate)}
                </p>
              </article>
            );
          })}
          </div>
        )}
      </section>
    </div>
  );
}

