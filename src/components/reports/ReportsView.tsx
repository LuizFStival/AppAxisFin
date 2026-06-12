import React from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Category, DashboardSummary, Transaction } from '../../types';
import { expensesByCategory, formatCurrency, getMonthKey } from '../../lib/utils/finance';
import { StatCard } from '../shared/StatCard';

interface ReportsViewProps {
  month: string;
  transactions: Transaction[];
  categories: Category[];
  summary: DashboardSummary;
}

export function ReportsView({ month, transactions, categories, summary }: ReportsViewProps) {
  const categoryData = expensesByCategory(transactions, categories, month);
  const chartData = [
    { name: 'Receitas', value: summary.income, fill: '#10B981' },
    { name: 'Despesas', value: summary.expenses, fill: '#F43F5E' },
    { name: 'Recebido', value: summary.received, fill: '#38BDF8' },
    { name: 'Pago', value: summary.paid, fill: '#8B5CF6' },
  ];
  const monthTransactions = transactions.filter((transaction) => getMonthKey(transaction.date) === month);
  const net = summary.received - summary.paid;

  return (
    <div className="px-4 pt-7 md:px-8 md:pt-8">
      <header>
        <p className="text-sm text-slate-400">Analise do mes {month}</p>
        <h1 className="font-display text-2xl font-bold text-white">Relatorios</h1>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Receitas" value={formatCurrency(summary.income)} tone="income" icon={TrendingUp} />
        <StatCard label="Despesas" value={formatCurrency(summary.expenses)} tone="expense" icon={TrendingDown} />
        <StatCard label="Liquido" value={formatCurrency(net)} tone={net >= 0 ? 'info' : 'expense'} icon={Wallet} />
        <StatCard label="Lancamentos" value={String(monthTransactions.length)} tone="neutral" icon={BarChart3} />
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[24px] border border-white/8 bg-[#101319] p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-sky-300" />
            <h2 className="font-display text-lg font-bold text-white">Fluxo financeiro</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(value) => formatCurrency(Number(value))} />
                <Tooltip contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/8 bg-[#101319] p-5">
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon size={18} className="text-violet-300" />
            <h2 className="font-display text-lg font-bold text-white">Gastos por categoria</h2>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={4}>
                  {categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0B0E14', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16 }} formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-mono font-bold text-white">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
