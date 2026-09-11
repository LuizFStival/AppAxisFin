import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Car,
  ChevronDown,
  ChevronUp,
  Compass,
  CreditCard,
  Download,
  Home,
  Landmark,
  Laptop,
  MoreHorizontal,
  PiggyBank,
  Scale,
  Settings,
  Tags,
  TrendingDown,
  TrendingUp,
  Utensils,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Account, Card, Category, ReportWidgetId, ReserveBox, Transaction, UserProfile } from '../../types';
import {
  expensesByCategory,
  formatCurrency,
  getFinancialMonthKey,
  formatMonthLabel,
  getPersonalExpenseSignedAmount,
  getTransactionCompetenceMonth,
  getTransactionReimbursementAmount,
  getTransactionReimbursementReceivedAmount,
  isInvoicePayment,
  isThirdPartyExpense,
  shiftMonthKey,
  summarizeMonthlyInvestmentGoal,
  summarizeMonthlyResult,
  roundMoney,
} from '../../lib/utils/finance';
import { summarizeExpenseBreakdown } from '../../lib/utils/expenseBreakdown';
import { getReimbursementMonthKey } from '../../lib/utils/reimbursements';
import { MonthNavigator } from '../shared/MonthNavigator';
import { BudgetSection } from './BudgetSection';

interface ReportsViewProps {
  month: string;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  reserveBoxes: ReserveBox[];
  cards: Card[];
  savingsPreferences: Pick<UserProfile, 'savingsGoalMode' | 'savingsGoalAmount' | 'savingsGoalPercentage' | 'includePendingSalary'>;
  reportWidgets: ReportWidgetId[];
  reimbursementsEnabled: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
}

const REPORT_CATEGORY_COLORS = [
  '#38BDF8',
  '#F59E0B',
  '#A78BFA',
  '#34D399',
  '#FB7185',
  '#60A5FA',
  '#F97316',
  '#2DD4BF',
  '#E879F9',
  '#FACC15',
  '#818CF8',
  '#4ADE80',
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Utensils,
  Home,
  Car,
  Compass,
  Settings,
  Briefcase,
  Laptop,
  MoreHorizontal,
};

const EXPENSE_BREAKDOWN_COLORS: Record<string, string> = {
  installment: '#A78BFA',
  fixed: '#F59E0B',
  variable: '#38BDF8',
};

function getChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function ChangeBadge({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  const change = getChange(current, previous);
  if (change === null) return <span className="text-[10px] text-slate-500">sem base anterior</span>;
  const improved = inverse ? change <= 0 : change >= 0;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${improved ? 'text-emerald-300' : 'text-rose-300'}`}>
      <Icon size={12} />
      {Math.abs(change).toFixed(1).replace('.', ',')}% vs. mês anterior
    </span>
  );
}

export function ReportsView({
  month,
  transactions,
  categories,
  accounts,
  reserveBoxes,
  cards,
  savingsPreferences,
  reportWidgets,
  reimbursementsEnabled,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
}: ReportsViewProps) {
  const [reportScope, setReportScope] = useState<'general' | 'personal'>('general');
  const [showIncomeBreakdown, setShowIncomeBreakdown] = useState(false);
  const [showOutflowBreakdown, setShowOutflowBreakdown] = useState(false);
  const effectiveReportScope = reimbursementsEnabled ? reportScope : 'personal';
  const previousMonth = shiftMonthKey(month, -1);
  const report = useMemo(() => {
    const summarize = (period: string) => {
      const periodTransactions = transactions.filter((transaction) => getTransactionCompetenceMonth(transaction, cards) === period);
      return periodTransactions.reduce((totals, transaction) => {
        if (transaction.flow === 'income') totals.income += transaction.amount;
        if (transaction.flow === 'expense' && !isInvoicePayment(transaction)) {
          if (isThirdPartyExpense(transaction)) {
            const amount = getTransactionReimbursementAmount(transaction);
            const receivedAmount = getTransactionReimbursementReceivedAmount(transaction);
            totals.thirdParty += amount;
            totals.reimbursementsReceived += receivedAmount;
            if (transaction.reimbursementStatus !== 'received') totals.reimbursementsPending += amount;
          }
          const personalAmount = getPersonalExpenseSignedAmount(transaction);
          totals.expenses += personalAmount;
          if (transaction.cardId) totals.cardExpenses += personalAmount;
          else totals.accountExpenses += personalAmount;
        }
        return totals;
      }, {
        income: 0,
        expenses: 0,
        thirdParty: 0,
        cardExpenses: 0,
        accountExpenses: 0,
        reimbursementsReceived: 0,
        reimbursementsPending: 0,
      });
    };

    return { current: summarize(month), previous: summarize(previousMonth) };
  }, [cards, month, previousMonth, transactions]);

  const currentMonthlyResult = summarizeMonthlyResult(transactions, month, cards, {
    includeReimbursements: reimbursementsEnabled,
  });
  const previousMonthlyResult = summarizeMonthlyResult(transactions, previousMonth, cards, {
    includeReimbursements: reimbursementsEnabled,
  });
  const totalInflows = currentMonthlyResult.totalInflows;
  const totalOutflows = currentMonthlyResult.totalOutflows;
  const reimbursementExpected = currentMonthlyResult.reimbursementsExpected;
  const reimbursementReceived = Math.min(reimbursementExpected, report.current.reimbursementsReceived);
  const reimbursementPending = Math.max(0, reimbursementExpected - reimbursementReceived);
  const visibleInflows = effectiveReportScope === 'general' ? totalInflows : report.current.income;
  const visibleOutflows = effectiveReportScope === 'general' ? totalOutflows : report.current.expenses;
  const balance = visibleInflows - visibleOutflows;
  const previousBalance = effectiveReportScope === 'general'
    ? previousMonthlyResult.result
    : report.previous.income - report.previous.expenses;
  const categoryData = expensesByCategory(transactions, categories, month, cards).map((item, index) => {
    const category = categories.find((candidate) => candidate.name === item.name);
    return {
      ...item,
      color: REPORT_CATEGORY_COLORS[index % REPORT_CATEGORY_COLORS.length],
      Icon: CATEGORY_ICONS[category?.icon ?? ''] ?? Tags,
    };
  });
  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => getTransactionCompetenceMonth(transaction, cards) === month),
    [cards, month, transactions],
  );
  const expenseBreakdown = useMemo(() => {
    const personalBreakdown = summarizeExpenseBreakdown(
      monthTransactions.filter((transaction) =>
        transaction.flow === 'expense'
        && !isInvoicePayment(transaction)
      ),
      getPersonalExpenseSignedAmount,
    );

    if (effectiveReportScope === 'personal' || !reimbursementsEnabled) return personalBreakdown;

    const thirdPartyBreakdown = summarizeExpenseBreakdown(
      transactions
        .filter(isThirdPartyExpense)
        .filter((transaction) => cards.length > 0
          ? getReimbursementMonthKey(transaction, cards) === month
          : getFinancialMonthKey(transaction) === month),
      getTransactionReimbursementAmount,
    );

    return personalBreakdown.map((item) => {
      const thirdPartyItem = thirdPartyBreakdown.find((candidate) => candidate.key === item.key);
      return {
        ...item,
        total: roundMoney(item.total + (thirdPartyItem?.total ?? 0)),
        count: item.count + (thirdPartyItem?.count ?? 0),
      };
    });
  }, [cards, effectiveReportScope, month, monthTransactions, reimbursementsEnabled, transactions]);
  const expenseBreakdownTotal = expenseBreakdown.reduce((sum, item) => sum + Math.max(0, item.total), 0);
  const monthlyEvolution = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => shiftMonthKey(month, index - 5)).map((period) => {
      const result = summarizeMonthlyResult(transactions, period, cards, {
        includeReimbursements: reimbursementsEnabled,
      });
      const totals = effectiveReportScope === 'general'
        ? { income: result.totalInflows, expenses: result.totalOutflows }
        : transactions
          .filter((transaction) => getTransactionCompetenceMonth(transaction, cards) === period)
          .reduce((current, transaction) => {
            if (transaction.flow === 'income') current.income += transaction.amount;
            if (
              transaction.flow === 'expense'
              && !isInvoicePayment(transaction)
            ) {
              current.expenses += getPersonalExpenseSignedAmount(transaction);
            }
            return current;
          }, { income: 0, expenses: 0 });

      return {
        month: formatMonthLabel(period).slice(0, 3),
        Receitas: totals.income,
        Despesas: totals.expenses,
        Resultado: totals.income - totals.expenses,
      };
    });
  }, [cards, effectiveReportScope, month, reimbursementsEnabled, transactions]);
  const reportYear = month.slice(0, 4);
  const selectedYearMonthIndex = Math.min(12, Math.max(1, Number(month.slice(5, 7)) || 1));
  const accountPatrimony = roundMoney(accounts
    .filter((account) => account.isActive)
    .reduce((sum, account) => sum + account.balance, 0));
  const reservePatrimony = roundMoney(reserveBoxes
    .filter((box) => box.isActive)
    .reduce((sum, box) => sum + box.currentBalance, 0));
  const currentPatrimony = roundMoney(accountPatrimony + reservePatrimony);
  const annualEvolution = useMemo(() => {
    let accumulated = 0;
    const periods = Array.from({ length: 12 }, (_, index) => `${reportYear}-${String(index + 1).padStart(2, '0')}`);
    const rows = periods.map((period) => {
      const monthlyResult = summarizeMonthlyResult(transactions, period, cards, {
        includeReimbursements: reimbursementsEnabled,
      });
      const scopedTotals = effectiveReportScope === 'general'
        ? { income: monthlyResult.totalInflows, expenses: monthlyResult.totalOutflows }
        : transactions
          .filter((transaction) => getTransactionCompetenceMonth(transaction, cards) === period)
          .reduce((totals, transaction) => {
            if (transaction.flow === 'income') totals.income += transaction.amount;
            if (
              transaction.flow === 'expense'
              && !isInvoicePayment(transaction)
            ) {
              totals.expenses += getPersonalExpenseSignedAmount(transaction);
            }
            return totals;
          }, { income: 0, expenses: 0 });
      const result = roundMoney(scopedTotals.income - scopedTotals.expenses);
      accumulated = roundMoney(accumulated + result);

      return {
        period,
        month: formatMonthLabel(period).slice(0, 3),
        Receitas: roundMoney(scopedTotals.income),
        Despesas: roundMoney(scopedTotals.expenses),
        Resultado: result,
        Acumulado: accumulated,
      };
    });
    const selectedAccumulated = rows[selectedYearMonthIndex - 1]?.Acumulado ?? 0;
    return rows.map((row) => ({
      ...row,
      Patrimonio: roundMoney(currentPatrimony - selectedAccumulated + row.Acumulado),
    }));
  }, [cards, currentPatrimony, effectiveReportScope, reimbursementsEnabled, reportYear, selectedYearMonthIndex, transactions]);
  const annualMonthsToDate = annualEvolution.slice(0, selectedYearMonthIndex);
  const annualIncome = roundMoney(annualMonthsToDate.reduce((sum, item) => sum + item.Receitas, 0));
  const annualExpenses = roundMoney(annualMonthsToDate.reduce((sum, item) => sum + item.Despesas, 0));
  const annualResult = roundMoney(annualMonthsToDate.reduce((sum, item) => sum + item.Resultado, 0));
  const annualAverageResult = roundMoney(annualMonthsToDate.length > 0 ? annualResult / annualMonthsToDate.length : 0);
  const positiveMonths = annualMonthsToDate.filter((item) => item.Resultado > 0).length;
  const negativeMonths = annualMonthsToDate.filter((item) => item.Resultado < 0).length;
  const savingsGoal = summarizeMonthlyInvestmentGoal(accounts, categories, transactions, month, {
    mode: savingsPreferences.savingsGoalMode,
    fixedAmount: savingsPreferences.savingsGoalAmount,
    percentage: savingsPreferences.savingsGoalPercentage,
    includePendingSalary: savingsPreferences.includePendingSalary,
    cards,
    includeReimbursements: reimbursementsEnabled,
  });
  const savingsZone = savingsGoal.progress >= 100
    ? { label: 'Meta atingida', bar: 'bg-emerald-400', text: 'text-emerald-300' }
    : savingsGoal.progress >= 80
      ? { label: 'Muito perto', bar: 'bg-sky-400', text: 'text-sky-300' }
      : savingsGoal.progress >= 50
        ? { label: 'Zona de atenção', bar: 'bg-amber-400', text: 'text-amber-300' }
        : { label: 'Zona de perigo', bar: 'bg-rose-400', text: 'text-rose-300' };
  const savingsRate = visibleInflows > 0
    ? Math.max(0, balance / visibleInflows * 100)
    : 0;
  const averageExpenses = monthlyEvolution.reduce((sum, item) => sum + item.Despesas, 0) / monthlyEvolution.length;

  function downloadReport() {
    const rows = [
      ['Indicador', 'Valor'],
      ['Receitas', report.current.income],
      ['Despesas pessoais', report.current.expenses],
      ['Despesas parceladas', expenseBreakdown.find((item) => item.key === 'installment')?.total ?? 0],
      ['Despesas fixas', expenseBreakdown.find((item) => item.key === 'fixed')?.total ?? 0],
      ['Despesas variáveis', expenseBreakdown.find((item) => item.key === 'variable')?.total ?? 0],
      ['Resultado', balance],
      [`Receitas no ano ${reportYear}`, annualIncome],
      [`Despesas no ano ${reportYear}`, annualExpenses],
      [`Resultado no ano ${reportYear}`, annualResult],
      ['Patrimônio atual em contas e caixinhas', currentPatrimony],
      ['Meta mensal para investir', savingsGoal.target],
      ['Economizado', savingsGoal.saved],
      ['Taxa de economia (%)', savingsRate.toFixed(2)],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `axisfin-relatorio-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const dailyData = useMemo(() => {
    const totals = new Map<number, { income: number; expenses: number }>();
    monthTransactions.forEach((transaction) => {
      if (transaction.flow === 'transfer' || isInvoicePayment(transaction)) return;
      const day = Number(transaction.date.slice(8, 10));
      const current = totals.get(day) ?? { income: 0, expenses: 0 };
      if (transaction.flow === 'income') current.income += transaction.amount;
      if (transaction.flow === 'expense') current.expenses += getPersonalExpenseSignedAmount(transaction);
      totals.set(day, current);
    });
    return Array.from(totals.entries())
      .sort(([left], [right]) => left - right)
      .map(([day, values]) => ({ day: String(day).padStart(2, '0'), ...values }));
  }, [monthTransactions]);

  const hasDailyData = dailyData.some((item) => item.income !== 0 || item.expenses !== 0);
  const largestCategory = categoryData[0];
  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0);
  const scopeHint = effectiveReportScope === 'general'
    ? 'Geral: meu + terceiros'
    : 'Apenas meus valores';

  return (
    <div className="premium-scroll app-page-gutters h-full w-full min-w-0 overflow-x-hidden overflow-y-auto pb-8 pt-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Relatório</p>
          <h1 className="font-display text-2xl font-bold text-white">Detalhado</h1>
        </div>
        <button type="button" onClick={downloadReport} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-bold text-slate-200 transition hover:bg-white hover:text-black">
          <Download size={16} /> Baixar
        </button>
      </header>

      <MonthNavigator
        month={month}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onCurrentMonth={onCurrentMonth}
        className="mt-4"
      />

      {reimbursementsEnabled ? <div className="premium-card-soft mt-3 grid grid-cols-2 rounded-2xl p-1" role="tablist" aria-label="Escopo do relatório">
        <button
          type="button"
          role="tab"
          aria-selected={reportScope === 'general'}
          onClick={() => setReportScope('general')}
          className={`h-10 rounded-xl text-xs font-bold transition ${reportScope === 'general' ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          Geral
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={reportScope === 'personal'}
          onClick={() => setReportScope('personal')}
          className={`h-10 rounded-xl text-xs font-bold transition ${reportScope === 'personal' ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          Apenas meu
        </button>
      </div> : null}
      <p className="mt-2 text-xs font-semibold text-slate-500">{scopeHint}</p>

      {reportWidgets.length > 0 ? <section className="mt-5 grid min-w-0 grid-cols-2 gap-3">
        {reportWidgets.map((widget) => {
          const incomeLabel = effectiveReportScope === 'general' ? 'Total de entradas' : 'Receitas';
          const expenseLabel = effectiveReportScope === 'general' ? 'Total de saídas' : 'Despesas pessoais';
          const breakdown = widget === 'income'
            ? effectiveReportScope === 'general'
              ? [
                ['Meu', report.current.income, 'text-emerald-200'],
                ['Terceiros', reimbursementExpected, 'text-amber-200'],
              ]
              : [['Meu', report.current.income, 'text-emerald-200']]
            : widget === 'expenses'
              ? effectiveReportScope === 'general'
                ? [
                  ['Meu', report.current.expenses, 'text-rose-200'],
                  ['Terceiros', currentMonthlyResult.thirdPartyExpenses, 'text-amber-200'],
                ]
                : [['Meu', report.current.expenses, 'text-rose-200']]
              : null;
          const item = widget === 'income'
            ? [incomeLabel, formatCurrency(visibleInflows), 'border-emerald-400/15 bg-emerald-500/[0.07] text-emerald-300']
            : widget === 'expenses'
              ? [expenseLabel, formatCurrency(visibleOutflows), 'border-rose-400/15 bg-rose-500/[0.07] text-rose-300']
              : widget === 'savings_rate'
                ? ['Taxa de economia', `${savingsRate.toFixed(1).replace('.', ',')}%`, 'border-sky-400/15 bg-sky-500/[0.07] text-sky-300']
                : ['Média de gastos (6 meses)', formatCurrency(averageExpenses), 'border-amber-400/15 bg-amber-500/[0.07] text-amber-300'];
          return (
            <article key={widget} className={`premium-card min-w-0 overflow-hidden rounded-[22px] border p-3 ${item[2]}`}>
              <p className="text-xs font-semibold text-slate-400">{item[0]}</p>
              <p className="mt-2 font-display text-lg font-bold">{item[1]}</p>
              {breakdown ? (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-2">
                  {breakdown.map(([label, value, tone]) => (
                    <div key={label}>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
                      <p className={`mt-1 truncate font-mono text-xs font-bold ${tone}`}>{formatCurrency(Number(value))}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section> : null}

      <section className="premium-card mt-3 overflow-hidden rounded-[22px]">
        <div className="grid grid-cols-2">
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">Total de entradas</p>
            <p className="mt-1 font-mono text-base font-bold text-white">{formatCurrency(visibleInflows)}</p>
          </div>
          <div className="border-l border-white/8 p-4 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300">Total de saídas</p>
            <p className="mt-1 font-mono text-base font-bold text-white">{formatCurrency(visibleOutflows)}</p>
          </div>
        </div>
        <div className="h-2 bg-rose-500/70">
          <div
            className="h-full bg-emerald-400"
            style={{ width: `${visibleInflows + visibleOutflows > 0 ? (visibleInflows / (visibleInflows + visibleOutflows)) * 100 : 50}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-400"><Scale size={17} /> Balanço</span>
          <div className="text-right">
            <p className={`font-mono text-base font-bold ${balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {balance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(balance))}
            </p>
            <ChangeBadge current={balance} previous={previousBalance} />
          </div>
        </div>
      </section>

      <section className="premium-card mt-3 rounded-[22px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300">Composição das despesas</p>
            <h2 className="font-display text-lg font-bold text-white">Fixo, parcelado e variável</h2>
          </div>
          <TrendingDown size={20} className="shrink-0 text-rose-300" />
        </div>
        <div className="mt-4 space-y-3">
          {expenseBreakdown.map((item) => {
            const percentage = expenseBreakdownTotal > 0 ? (Math.max(0, item.total) / expenseBreakdownTotal) * 100 : 0;
            return (
              <div key={item.key} className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-100">{item.label}</span>
                    <span className="block text-[10px] text-slate-500">
                      {item.count} {item.count === 1 ? 'lançamento' : 'lançamentos'} · {percentage.toFixed(1).replace('.', ',')}%
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-bold text-white">{formatCurrency(item.total)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: EXPENSE_BREAKDOWN_COLORS[item.key] }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="premium-card mt-3 rounded-[22px] p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <PiggyBank size={19} />
            </span>
            <span>
              <span className="block text-xs font-semibold text-slate-400">Meta mensal para investir</span>
              <span className="mt-0.5 block font-mono text-base font-bold text-white">{formatCurrency(savingsGoal.target)}</span>
            </span>
          </span>
          <span className={`text-right text-xs font-bold ${savingsZone.text}`}>
            <span className="block text-base">{savingsGoal.progress.toFixed(0)}%</span>
            <span className="block text-[9px]">{savingsZone.label}</span>
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
          <div className={`h-full rounded-full ${savingsZone.bar}`} style={{ width: `${Math.min(100, savingsGoal.progress)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px]">
          <span className="text-slate-500">Economizado <strong className="text-slate-300">{formatCurrency(savingsGoal.saved)}</strong></span>
          <span className="text-slate-500">
            {savingsGoal.remaining > 0 ? <>Falta <strong className={savingsZone.text}>{formatCurrency(savingsGoal.remaining)}</strong></> : 'Objetivo alcançado'}
          </span>
        </div>
      </section>

      <section className="premium-card mt-3 rounded-[22px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">Ano {reportYear}</p>
            <h2 className="font-display text-lg font-bold text-white">Patrimônio e sobra</h2>
            <p className="mt-1 text-xs text-slate-500">Patrimônio atual em contas e caixinhas, com evolução pelo resultado mensal registrado.</p>
          </div>
          <PiggyBank size={20} className="shrink-0 text-emerald-300" />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.07] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Patrimônio atual</p>
            <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrency(currentPatrimony)}</p>
            <p className="mt-1 text-[10px] text-slate-500">Contas {formatCurrency(accountPatrimony)} · Caixinhas {formatCurrency(reservePatrimony)}</p>
          </div>
          <div className={`rounded-2xl border p-3 ${annualResult >= 0 ? 'border-sky-400/15 bg-sky-500/[0.07]' : 'border-rose-400/15 bg-rose-500/[0.07]'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${annualResult >= 0 ? 'text-sky-200' : 'text-rose-200'}`}>Resultado acumulado</p>
            <p className={`mt-1 font-mono text-sm font-bold ${annualResult >= 0 ? 'text-sky-200' : 'text-rose-200'}`}>
              {annualResult >= 0 ? '+' : '-'}{formatCurrency(Math.abs(annualResult))}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">Até {formatMonthLabel(month)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Média mensal</p>
            <p className={`mt-1 font-mono text-sm font-bold ${annualAverageResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {annualAverageResult >= 0 ? '+' : '-'}{formatCurrency(Math.abs(annualAverageResult))}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">{positiveMonths} meses positivos · {negativeMonths} negativos</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Entradas vs. saídas</p>
            <p className="mt-1 font-mono text-sm font-bold text-emerald-300">{formatCurrency(annualIncome)}</p>
            <p className="mt-1 font-mono text-xs font-bold text-rose-300">{formatCurrency(annualExpenses)}</p>
          </div>
        </div>

        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={annualEvolution}>
              <defs>
                <linearGradient id="annualPatrimonyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="annualResultGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#64748B" fontSize={10} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="Patrimonio" name="Patrimônio estimado" stroke="#34D399" fill="url(#annualPatrimonyGradient)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="Acumulado" name="Resultado acumulado" stroke="#38BDF8" fill="url(#annualResultGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="Resultado" name="Resultado mensal" stroke="#FACC15" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold">
          <span className="text-emerald-300">● Patrimônio</span>
          <span className="text-sky-300">● Acumulado</span>
          <span className="text-amber-300">● Resultado mensal</span>
        </div>
      </section>

      <div className="hidden">
        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Entradas</h2>
              <p className="mt-1 text-xs text-slate-500">{scopeHint}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Total</p>
              <p className="font-mono text-sm font-bold text-emerald-300">{formatCurrency(visibleInflows)}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => setShowIncomeBreakdown((current) => !current)}
              className="flex items-center justify-between rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.07] p-4 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-emerald-100">Total de entradas</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {effectiveReportScope === 'general' ? 'Receitas + reembolsos de terceiros' : 'Somente receitas pessoais'}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-sm font-bold text-white">{formatCurrency(visibleInflows)}</span>
                {showIncomeBreakdown ? <ChevronUp size={16} className="text-emerald-300" /> : <ChevronDown size={16} className="text-emerald-300" />}
              </span>
            </button>
            {showIncomeBreakdown ? <>
            <article className="cosmic-card flex items-center justify-between rounded-2xl border border-white/8 p-4">
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><Wallet size={18} /></span>
                Receitas
              </span>
              <span className="font-mono font-bold text-white">{formatCurrency(report.current.income)}</span>
            </article>
            {reimbursementsEnabled && effectiveReportScope === 'general' ? <article className="cosmic-card rounded-2xl border border-white/8 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><UserRound size={18} /></span>
                  Reembolsos
                </span>
                <span className="font-mono font-bold text-white">{formatCurrency(reimbursementExpected)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 text-xs">
                <div><p className="text-slate-500">Concluídos</p><p className="mt-1 font-mono font-bold text-emerald-300">{formatCurrency(reimbursementReceived)}</p></div>
                <div><p className="text-slate-500">Pendentes</p><p className="mt-1 font-mono font-bold text-amber-300">{formatCurrency(reimbursementPending)}</p></div>
              </div>
            </article> : null}
            </> : null}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Saídas</h2>
              <p className="mt-1 text-xs text-slate-500">{scopeHint}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Total</p>
              <p className="font-mono text-sm font-bold text-rose-300">{formatCurrency(visibleOutflows)}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => setShowOutflowBreakdown((current) => !current)}
              className="flex items-center justify-between rounded-2xl border border-rose-400/15 bg-rose-500/[0.07] p-4 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-rose-100">Total de saídas</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {effectiveReportScope === 'general' ? 'Meus gastos + valores de terceiros' : 'Somente meus gastos'}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-sm font-bold text-white">{formatCurrency(visibleOutflows)}</span>
                {showOutflowBreakdown ? <ChevronUp size={16} className="text-rose-300" /> : <ChevronDown size={16} className="text-rose-300" />}
              </span>
            </button>
            {showOutflowBreakdown ? <>
            {effectiveReportScope === 'general' || !reimbursementsEnabled ? <article className="cosmic-card flex items-center justify-between rounded-2xl border border-white/8 p-4">
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300"><Landmark size={18} /></span>
                Gastos em contas
              </span>
              <span className="font-mono font-bold text-white">{formatCurrency(report.current.accountExpenses)}</span>
            </article> : null}
            <article className="cosmic-card flex items-center justify-between rounded-2xl border border-white/8 p-4">
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><CreditCard size={18} /></span>
                Gastos no cartão
              </span>
              <span className="font-mono font-bold text-white">{formatCurrency(report.current.cardExpenses)}</span>
            </article>
            {reimbursementsEnabled && effectiveReportScope === 'general' ? <article className="cosmic-card flex items-center justify-between rounded-2xl border border-white/8 p-4">
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><UserRound size={18} /></span>
                Valores de terceiros
              </span>
              <span className="font-mono font-bold text-white">{formatCurrency(currentMonthlyResult.thirdPartyExpenses)}</span>
            </article> : null}
            </> : null}
          </div>
        </section>
      </div>

      <section className="premium-card mt-6 rounded-[24px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-300">Últimos 6 meses</p>
            <h2 className="font-display text-lg font-bold text-white">Evolução financeira</h2>
            <p className="mt-1 text-xs text-slate-500">Compare receitas, despesas pessoais e o resultado de cada mês.</p>
          </div>
          <TrendingUp size={20} className="shrink-0 text-sky-300" />
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyEvolution}>
              <defs>
                <linearGradient id="monthlyIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="monthlyExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#64748B" fontSize={10} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="Receitas" stroke="#10B981" fill="url(#monthlyIncomeGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="Despesas" stroke="#F43F5E" fill="url(#monthlyExpenseGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="Resultado" stroke="#38BDF8" fill="transparent" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold">
          <span className="text-emerald-300">● Receitas</span>
          <span className="text-rose-300">● Despesas</span>
          <span className="text-sky-300">● Resultado</span>
        </div>
      </section>

      <section className="premium-card mt-6 rounded-[24px] p-5">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-sky-300" />
          <h2 className="font-display text-lg font-bold text-white">Receitas vs. despesas</h2>
        </div>
        <div className="mt-4 h-64">
          {hasDailyData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748B" fontSize={10} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="income" name="Receitas" stroke="#10B981" fill="url(#incomeGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#F43F5E" fill="url(#expenseGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <BarChart3 size={34} className="text-slate-700" />
              <p className="mt-3 text-sm font-semibold">Sem movimentações no período</p>
            </div>
          )}
        </div>
      </section>

      <BudgetSection month={month} transactions={transactions} categories={categories} />

      <section className="premium-card mt-5 rounded-[24px] p-5">
        <div>
          <p className="text-xs text-slate-500">Maior gasto</p>
          <h2 className="font-display text-lg font-bold text-white">{largestCategory?.name ?? 'Gastos por categoria'}</h2>
          {largestCategory ? <p className="mt-1 font-mono text-xl font-bold text-rose-300">{formatCurrency(largestCategory.value)}</p> : null}
        </div>
        {categoryData.length > 0 ? (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4}>
                    {categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }} formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {categoryData.map((item) => {
                const percentage = categoryTotal > 0 ? (item.value / categoryTotal) * 100 : 0;
                return (
                  <div key={item.name} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-3 text-slate-200">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${item.color}20`, color: item.color }}
                        >
                          <item.Icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{item.name}</span>
                          <span className="text-[10px] text-slate-500">{percentage.toFixed(1).replace('.', ',')}% dos gastos</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-sm font-bold text-white">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-center text-slate-500">
            <Wallet size={34} className="text-slate-700" />
            <p className="mt-3 text-sm font-semibold">Sem gastos pessoais no período</p>
          </div>
        )}
      </section>
    </div>
  );
}
