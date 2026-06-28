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
  Compass,
  CreditCard,
  Home,
  Landmark,
  Laptop,
  MoreHorizontal,
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
import { Category, Transaction } from '../../types';
import {
  expensesByCategory,
  formatCurrency,
  getExpenseSignedAmount,
  getFinancialMonthKey,
  isThirdPartyExpense,
  shiftMonthKey,
} from '../../lib/utils/finance';
import { MonthNavigator } from '../shared/MonthNavigator';

interface ReportsViewProps {
  month: string;
  transactions: Transaction[];
  categories: Category[];
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
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
}: ReportsViewProps) {
  const [reportScope, setReportScope] = useState<'general' | 'personal'>('general');
  const previousMonth = shiftMonthKey(month, -1);
  const report = useMemo(() => {
    const summarize = (period: string) => {
      const periodTransactions = transactions.filter((transaction) => getFinancialMonthKey(transaction) === period);
      return periodTransactions.reduce((totals, transaction) => {
        if (transaction.flow === 'income') totals.income += transaction.amount;
        if (transaction.flow === 'expense') {
          const amount = getExpenseSignedAmount(transaction);
          if (isThirdPartyExpense(transaction)) {
            totals.thirdParty += amount;
            if (transaction.reimbursementStatus === 'received') totals.reimbursementsReceived += amount;
            else totals.reimbursementsPending += amount;
          } else {
            totals.expenses += amount;
            if (transaction.cardId) totals.cardExpenses += amount;
            else totals.accountExpenses += amount;
          }
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
  }, [month, previousMonth, transactions]);

  const totalInflows = report.current.income + report.current.thirdParty;
  const totalOutflows = report.current.expenses + report.current.thirdParty;
  const visibleInflows = reportScope === 'general' ? totalInflows : report.current.income;
  const visibleOutflows = reportScope === 'general' ? totalOutflows : report.current.expenses;
  const balance = visibleInflows - visibleOutflows;
  const previousBalance = report.previous.income - report.previous.expenses;
  const categoryData = expensesByCategory(transactions, categories, month).map((item, index) => {
    const category = categories.find((candidate) => candidate.name === item.name);
    return {
      ...item,
      color: REPORT_CATEGORY_COLORS[index % REPORT_CATEGORY_COLORS.length],
      Icon: CATEGORY_ICONS[category?.icon ?? ''] ?? Tags,
    };
  });
  const monthTransactions = transactions.filter((transaction) => getFinancialMonthKey(transaction) === month);

  const dailyData = useMemo(() => {
    const totals = new Map<number, { income: number; expenses: number }>();
    monthTransactions.forEach((transaction) => {
      if (transaction.flow === 'transfer' || isThirdPartyExpense(transaction)) return;
      const day = Number(transaction.date.slice(8, 10));
      const current = totals.get(day) ?? { income: 0, expenses: 0 };
      if (transaction.flow === 'income') current.income += transaction.amount;
      if (transaction.flow === 'expense') current.expenses += getExpenseSignedAmount(transaction);
      totals.set(day, current);
    });
    return Array.from(totals.entries())
      .sort(([left], [right]) => left - right)
      .map(([day, values]) => ({ day: String(day).padStart(2, '0'), ...values }));
  }, [monthTransactions]);

  const hasDailyData = dailyData.some((item) => item.income !== 0 || item.expenses !== 0);
  const largestCategory = categoryData[0];
  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="no-scrollbar h-full w-full min-w-0 overflow-x-hidden overflow-y-auto px-4 pb-8 pt-7">
      <header>
        <p className="text-sm text-slate-400">Relatório</p>
        <h1 className="font-display text-2xl font-bold text-white">Detalhado</h1>
      </header>

      <MonthNavigator
        month={month}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onCurrentMonth={onCurrentMonth}
        className="mt-4"
      />

      <div className="mt-3 grid grid-cols-2 rounded-2xl border border-white/8 bg-[#101319] p-1" role="tablist" aria-label="Escopo do relatório">
        <button
          type="button"
          role="tab"
          aria-selected={reportScope === 'general'}
          onClick={() => setReportScope('general')}
          className={`h-10 rounded-xl text-xs font-bold transition ${reportScope === 'general' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
        >
          Geral
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={reportScope === 'personal'}
          onClick={() => setReportScope('personal')}
          className={`h-10 rounded-xl text-xs font-bold transition ${reportScope === 'personal' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
        >
          Apenas meu
        </button>
      </div>

      <section className="mt-5 grid min-w-0 grid-cols-2 gap-3">
        <article className="min-w-0 overflow-hidden rounded-[22px] border border-emerald-400/15 bg-emerald-500/[0.07] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-400">Receitas</p>
              <p className="mt-2 whitespace-nowrap font-display text-lg font-bold text-white">{formatCurrency(report.current.income)}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <TrendingUp size={19} />
            </span>
          </div>
          <div className="mt-3"><ChangeBadge current={report.current.income} previous={report.previous.income} /></div>
        </article>

        <article className="min-w-0 overflow-hidden rounded-[22px] border border-rose-400/15 bg-rose-500/[0.07] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-400">Despesas pessoais</p>
              <p className="mt-2 whitespace-nowrap font-display text-lg font-bold text-white">{formatCurrency(report.current.expenses)}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
              <TrendingDown size={19} />
            </span>
          </div>
          <div className="mt-3"><ChangeBadge current={report.current.expenses} previous={report.previous.expenses} inverse /></div>
        </article>
      </section>

      <section className="mt-3 overflow-hidden rounded-[22px] border border-white/8 bg-[#101319]">
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

      <div className="mt-6 grid gap-5">
        <section>
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-white">Entradas</h2>
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Total</p>
              <p className="font-mono text-sm font-bold text-emerald-300">{formatCurrency(visibleInflows)}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            <article className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#101319] p-4">
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><Wallet size={18} /></span>
                Receitas
              </span>
              <span className="font-mono font-bold text-white">{formatCurrency(report.current.income)}</span>
            </article>
            {reportScope === 'general' ? <article className="rounded-2xl border border-white/8 bg-[#101319] p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><UserRound size={18} /></span>
                  Reembolsos
                </span>
                <span className="font-mono font-bold text-white">{formatCurrency(report.current.thirdParty)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 text-xs">
                <div><p className="text-slate-500">Concluídos</p><p className="mt-1 font-mono font-bold text-emerald-300">{formatCurrency(report.current.reimbursementsReceived)}</p></div>
                <div><p className="text-slate-500">Pendentes</p><p className="mt-1 font-mono font-bold text-amber-300">{formatCurrency(report.current.reimbursementsPending)}</p></div>
              </div>
            </article> : null}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-white">Saídas</h2>
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Total</p>
              <p className="font-mono text-sm font-bold text-rose-300">{formatCurrency(visibleOutflows)}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {reportScope === 'general' ? <article className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#101319] p-4">
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300"><Landmark size={18} /></span>
                Gastos em contas
              </span>
              <span className="font-mono font-bold text-white">{formatCurrency(report.current.accountExpenses)}</span>
            </article> : null}
            <article className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#101319] p-4">
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><CreditCard size={18} /></span>
                Gastos no cartão
              </span>
              <span className="font-mono font-bold text-white">{formatCurrency(report.current.cardExpenses)}</span>
            </article>
            <article className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#101319] p-4">
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><UserRound size={18} /></span>
                Valores de terceiros
              </span>
              <span className="font-mono font-bold text-white">{formatCurrency(report.current.thirdParty)}</span>
            </article>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[24px] border border-white/8 bg-[#101319] p-5">
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

      <section className="mt-5 rounded-[24px] border border-white/8 bg-[#101319] p-5">
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
