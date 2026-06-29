import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Pencil, ShieldCheck, Target, X } from 'lucide-react';
import type { Budget, Category, Transaction } from '../../types';
import { budgetRepository } from '../../features/budgets/budgetRepository';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';
import { formatCurrency, shiftMonthKey } from '../../lib/utils/finance';
import { getBudgetAlertLevel, getPersonalCategorySpending } from '../../lib/utils/budgets';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';
import { CurrencyInput } from '../shared/CurrencyInput';

interface BudgetSectionProps {
  categories: Category[];
  month: string;
  transactions: Transaction[];
}

function getAlert(percent: number) {
  const level = getBudgetAlertLevel(percent);
  if (level === 'limit-100') return { label: 'Limite atingido', color: '#FB7185', tone: 'text-rose-300', Icon: AlertTriangle };
  if (level === 'warning-90') return { label: 'Atenção máxima', color: '#F59E0B', tone: 'text-amber-300', Icon: AlertTriangle };
  if (level === 'warning-70') return { label: 'Atenção', color: '#FACC15', tone: 'text-yellow-300', Icon: AlertTriangle };
  return { label: 'Dentro do limite', color: '#38BDF8', tone: 'text-sky-300', Icon: CheckCircle2 };
}

export function BudgetSection({ categories, month, transactions }: BudgetSectionProps) {
  const expenseCategories = categories.filter((category) => category.flow === 'expense');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    budgetRepository.list(month)
      .then((loaded) => {
        if (!active) return;
        setBudgets(loaded);
        setError('');
      })
      .catch((loadError: unknown) => {
        if (active) setError(getUserFriendlyError(loadError, 'Não foi possível carregar os orçamentos.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month]);

  const currentSpending = useMemo(() => getPersonalCategorySpending(transactions, month), [month, transactions]);
  const previousSpending = useMemo(
    () => getPersonalCategorySpending(transactions, shiftMonthKey(month, -1)),
    [month, transactions],
  );

  function openEditor() {
    const byCategory = new Map<string, number>(budgets.map((budget) => [budget.categoryId, budget.limitAmount]));
    setLimitInputs(Object.fromEntries(expenseCategories.map((category) => [
      category.id,
      byCategory.has(category.id) ? formatCurrencyInput(byCategory.get(category.id) ?? 0) : DEFAULT_CURRENCY_INPUT,
    ])));
    setIsEditing(true);
  }

  async function saveBudgets() {
    setIsSaving(true);
    try {
      const limits = Object.fromEntries(expenseCategories.map((category) => [
        category.id,
        parseCurrencyInput(limitInputs[category.id] ?? DEFAULT_CURRENCY_INPUT),
      ]));
      setBudgets(await budgetRepository.savePeriod(month, limits));
      setError('');
      setIsEditing(false);
    } catch (saveError) {
      setError(getUserFriendlyError(saveError, 'Não foi possível salvar os orçamentos.'));
    } finally {
      setIsSaving(false);
    }
  }

  const rows = budgets
    .map((budget) => {
      const category = expenseCategories.find((candidate) => candidate.id === budget.categoryId);
      const used = currentSpending.get(budget.categoryId) ?? 0;
      const previous = previousSpending.get(budget.categoryId) ?? 0;
      const percent = budget.limitAmount > 0 ? (used / budget.limitAmount) * 100 : 0;
      return { budget, category, used, previous, percent, available: Math.max(0, budget.limitAmount - used) };
    })
    .filter((row) => row.category)
    .sort((left, right) => right.percent - left.percent);

  const totalLimit = rows.reduce((sum, row) => sum + row.budget.limitAmount, 0);
  const totalUsed = rows.reduce((sum, row) => sum + row.used, 0);

  return (
    <section className="mt-6 rounded-[24px] border border-white/8 bg-[#101319] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="flex items-center gap-2 text-sky-300"><Target size={18} /><span className="text-[10px] font-bold uppercase tracking-widest">Planejamento</span></span>
          <h2 className="mt-1 font-display text-lg font-bold text-white">Orçamentos do mês</h2>
          <p className="mt-1 text-xs text-slate-500">Somente gastos pessoais; valores de terceiros ficam fora.</p>
        </div>
        <button type="button" onClick={openEditor} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-200">
          <Pencil size={14} /> Ajustar
        </button>
      </div>

      {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}

      {!isLoading && rows.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/[0.035] p-3"><p className="text-[10px] uppercase text-slate-500">Planejado</p><p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrency(totalLimit)}</p></div>
            <div className="rounded-2xl bg-white/[0.035] p-3"><p className="text-[10px] uppercase text-slate-500">Consumido</p><p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrency(totalUsed)}</p></div>
          </div>
          <div className="mt-3 space-y-3">
            {rows.map(({ budget, category, used, previous, percent, available }) => {
              const alert = getAlert(percent);
              const change = previous > 0 ? ((used - previous) / previous) * 100 : null;
              return (
                <article key={budget.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{category?.name}</p>
                      <p className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${alert.tone}`}><alert.Icon size={12} />{alert.label}</p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-bold text-white">{Math.round(percent)}%</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, percent)}%`, backgroundColor: alert.color }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div><p className="text-slate-500">Usado</p><p className="mt-0.5 font-mono font-bold text-white">{formatCurrency(used)}</p></div>
                    <div><p className="text-slate-500">Disponível</p><p className="mt-0.5 font-mono font-bold text-emerald-300">{formatCurrency(available)}</p></div>
                    <div className="text-right"><p className="text-slate-500">Mês anterior</p><p className={`mt-0.5 font-mono font-bold ${change !== null && change > 0 ? 'text-rose-300' : 'text-slate-300'}`}>{change === null ? 'sem base' : `${change > 0 ? '+' : ''}${change.toFixed(0)}%`}</p></div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : !isLoading ? (
        <button type="button" onClick={openEditor} className="mt-4 flex w-full flex-col items-center rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
          <ShieldCheck size={28} className="text-sky-300" />
          <span className="mt-2 text-sm font-bold text-white">Definir limites por categoria</span>
          <span className="mt-1 text-xs text-slate-500">Acompanhe 70%, 90% e 100% do orçamento.</span>
        </button>
      ) : <p className="mt-5 text-center text-xs text-slate-500">Carregando orçamentos...</p>}

      {isEditing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm md:items-center md:p-6">
          <div className="max-h-[85dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#101319] p-5 md:rounded-[28px]">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-sky-300">Orçamento mensal</p><h3 className="font-display text-xl font-bold text-white">Limites por categoria</h3></div>
              <button type="button" onClick={() => setIsEditing(false)} aria-label="Fechar" className="rounded-xl bg-white/5 p-2 text-slate-400"><X size={20} /></button>
            </div>
            <div className="mt-5 space-y-3">
              {expenseCategories.map((category) => (
                <label key={category.id} className="block rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                  <span className="text-sm font-bold text-white">{category.name}</span>
                  <CurrencyInput value={limitInputs[category.id] ?? DEFAULT_CURRENCY_INPUT} onChange={(value) => setLimitInputs((current) => ({ ...current, [category.id]: value }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080A0E] px-3 font-mono text-white outline-none focus:border-sky-400" />
                </label>
              ))}
            </div>
            <button type="button" disabled={isSaving} onClick={() => void saveBudgets()} className="mt-5 h-12 w-full rounded-2xl bg-sky-500 text-sm font-bold text-white disabled:opacity-50">
              {isSaving ? 'Salvando...' : 'Salvar orçamentos'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
