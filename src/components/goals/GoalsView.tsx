import React, { useEffect, useState } from 'react';
import { CalendarDays, Check, ImagePlus, Minus, Plus, Target, Trash2, X } from 'lucide-react';
import { Category, Goal } from '../../types';
import { goalRepository } from '../../features/goals/goalRepository';
import { CurrencyInput } from '../shared/CurrencyInput';
import { DEFAULT_CURRENCY_INPUT, parseCurrencyInput } from '../../lib/utils/currency';
import { formatCurrency } from '../../lib/utils/finance';
import { formatDatePtBr } from '../../lib/utils/date';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';

interface GoalsViewProps {
  categories: Category[];
}

const GOAL_COLORS = ['#38BDF8', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E'];

export function GoalsView({ categories }: GoalsViewProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [movementGoal, setMovementGoal] = useState<Goal | null>(null);
  const [movementType, setMovementType] = useState<'add' | 'remove'>('add');
  const [movementAmount, setMovementAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [targetDate, setTargetDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState<File | undefined>();
  const [color, setColor] = useState(GOAL_COLORS[0]);

  async function loadGoals() {
    try {
      setGoals(await goalRepository.list());
      setError('');
    } catch (loadError) {
      setError(getUserFriendlyError(loadError, 'Não foi possível carregar suas metas.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadGoals();
  }, []);

  function resetCreateForm() {
    setName('');
    setTargetAmount(DEFAULT_CURRENCY_INPUT);
    setTargetDate('');
    setCategoryId('');
    setImage(undefined);
    setColor(GOAL_COLORS[0]);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const amount = parseCurrencyInput(targetAmount);
    if (!name.trim() || amount <= 0) {
      setError('Informe o título e um valor válido para a meta.');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await goalRepository.create({
        name,
        targetAmount: amount,
        targetDate: targetDate || undefined,
        categoryId: categoryId || undefined,
        image,
        color,
      });
      setGoals((current) => [saved, ...current]);
      setIsCreateOpen(false);
      resetCreateForm();
      setError('');
    } catch (saveError) {
      setError(getUserFriendlyError(saveError, 'Não foi possível criar a meta.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMovement(event: React.FormEvent) {
    event.preventDefault();
    if (!movementGoal) return;
    const amount = parseCurrencyInput(movementAmount);
    if (amount <= 0) return;
    setIsSaving(true);
    try {
      await goalRepository.addMovement(movementGoal.id, movementType === 'add' ? amount : -amount);
      setMovementGoal(null);
      setMovementAmount(DEFAULT_CURRENCY_INPUT);
      await loadGoals();
    } catch (movementError) {
      setError(getUserFriendlyError(movementError, 'Não foi possível atualizar o valor da meta.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(goal: Goal) {
    if (!window.confirm(`Excluir a meta "${goal.name}" e todo o histórico de valores?`)) return;
    try {
      await goalRepository.remove(goal);
      setGoals((current) => current.filter((item) => item.id !== goal.id));
    } catch (deleteError) {
      setError(getUserFriendlyError(deleteError, 'Não foi possível excluir a meta.'));
    }
  }

  const visibleGoals = goals.filter((goal) => goal.status === tab);

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-8 pt-7">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Planejamento</p>
          <h1 className="font-display text-2xl font-bold text-white">Metas</h1>
        </div>
        <button type="button" onClick={() => setIsCreateOpen(true)} className="flex h-10 items-center gap-2 rounded-2xl bg-sky-500 px-3 text-sm font-bold text-white">
          <Plus size={17} /> Nova meta
        </button>
      </header>

      <div className="mt-5 grid grid-cols-2 rounded-2xl border border-white/8 bg-[#101319] p-1">
        {(['active', 'completed'] as const).map((status) => (
          <button key={status} type="button" onClick={() => setTab(status)} className={`h-10 rounded-xl text-xs font-bold ${tab === status ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>
            {status === 'active' ? 'Ativas' : 'Concluídas'} ({goals.filter((goal) => goal.status === status).length})
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      <section className="mt-5 grid gap-3">
        {isLoading ? <p className="py-8 text-center text-sm text-slate-500">Carregando metas...</p> : null}
        {!isLoading && visibleGoals.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-[#101319] p-7 text-center">
            <Target size={32} className="mx-auto text-slate-700" />
            <p className="mt-3 font-bold text-white">Nenhuma meta {tab === 'active' ? 'ativa' : 'concluída'}</p>
            <p className="mt-1 text-xs text-slate-500">Crie um objetivo e acompanhe seu progresso.</p>
          </div>
        ) : null}
        {visibleGoals.map((goal) => {
          const progress = Math.min(100, goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0);
          const category = categories.find((item) => item.id === goal.categoryId);
          return (
            <article key={goal.id} className="overflow-hidden rounded-[24px] border border-white/8 bg-[#101319]">
              <div className="relative h-28" style={{ background: goal.imageUrl ? undefined : `linear-gradient(135deg, ${goal.color}, #0B0E14)` }}>
                {goal.imageUrl ? <img src={goal.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#101319] via-transparent to-transparent" />
                <button type="button" onClick={() => void handleDelete(goal)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black/50 text-rose-300" aria-label={`Excluir meta ${goal.name}`}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-bold text-white">{goal.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {category?.name ?? 'Sem categoria'}
                      {goal.targetDate ? ` · até ${formatDatePtBr(goal.targetDate)}` : ''}
                    </p>
                  </div>
                  {goal.status === 'completed' ? <Check size={20} className="shrink-0 text-emerald-300" /> : null}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: goal.color }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-white">{formatCurrency(goal.currentAmount)}</span>
                  <span className="text-slate-500">{progress.toFixed(0)}% de {formatCurrency(goal.targetAmount)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setMovementGoal(goal); setMovementType('add'); }} className="flex h-10 items-center justify-center gap-1 rounded-xl bg-emerald-500/10 text-xs font-bold text-emerald-300"><Plus size={15} /> Adicionar</button>
                  <button type="button" onClick={() => { setMovementGoal(goal); setMovementType('remove'); }} disabled={goal.currentAmount <= 0} className="flex h-10 items-center justify-center gap-1 rounded-xl bg-rose-500/10 text-xs font-bold text-rose-300 disabled:opacity-40"><Minus size={15} /> Retirar</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <form onSubmit={handleCreate} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 sm:rounded-[28px]">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-white">Nova meta</h2><button type="button" onClick={() => setIsCreateOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400"><X size={18} /></button></div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Título<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Viagem, reserva..." className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Valor da meta<CurrencyInput value={targetAmount} onChange={setTargetAmount} /></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Categoria (opcional)<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white"><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Data final (opcional)<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white" /></label>
              <label className="grid gap-2 text-xs font-semibold text-slate-400">Imagem (opcional)<span className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-slate-300"><ImagePlus size={17} />{image?.name ?? 'Escolher imagem'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0])} className="sr-only" /></span></label>
              <div className="flex gap-2">{GOAL_COLORS.map((option) => <button key={option} type="button" onClick={() => setColor(option)} className={`h-8 w-8 rounded-full border-2 ${color === option ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: option }} aria-label={`Cor ${option}`} />)}</div>
            </div>
            <button type="submit" disabled={isSaving} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 font-bold text-white disabled:opacity-60"><Target size={18} />{isSaving ? 'Criando...' : 'Criar meta'}</button>
          </form>
        </div>
      ) : null}

      {movementGoal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <form onSubmit={handleMovement} className="w-full max-w-lg rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 sm:rounded-[28px]">
            <div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">{movementType === 'add' ? 'Adicionar em' : 'Retirar de'}</p><h2 className="font-display text-lg font-bold text-white">{movementGoal.name}</h2></div><button type="button" onClick={() => setMovementGoal(null)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400"><X size={18} /></button></div>
            <label className="mt-5 grid gap-1 text-xs font-semibold text-slate-400">Valor<CurrencyInput value={movementAmount} onChange={setMovementAmount} /></label>
            <button type="submit" disabled={isSaving} className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold text-white disabled:opacity-60 ${movementType === 'add' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{movementType === 'add' ? <Plus size={18} /> : <Minus size={18} />}{isSaving ? 'Salvando...' : movementType === 'add' ? 'Adicionar valor' : 'Retirar valor'}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
