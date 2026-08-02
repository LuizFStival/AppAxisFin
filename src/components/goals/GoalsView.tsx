import React, { useEffect, useMemo, useState } from 'react';
import { Check, HandCoins, Home, ImagePlus, Minus, Plus, Target, Trash2, UserRound, X } from 'lucide-react';
import { Category, Commitment, Goal, ReimbursementPerson } from '../../types';
import { commitmentRepository } from '../../features/commitments/commitmentRepository';
import { goalRepository } from '../../features/goals/goalRepository';
import { CurrencyInput } from '../shared/CurrencyInput';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';
import { formatCurrency } from '../../lib/utils/finance';
import { formatDatePtBr } from '../../lib/utils/date';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';

interface GoalsViewProps {
  categories: Category[];
  reimbursementPeople: ReimbursementPerson[];
}

const COLORS = ['#38BDF8', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E'];

function getPersonName(people: ReimbursementPerson[], personId?: string) {
  if (!personId) return 'Sem pessoa vinculada';
  return people.find((person) => person.id === personId)?.name ?? 'Pessoa removida';
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(1, value));
}

export function GoalsView({ categories, reimbursementPeople }: GoalsViewProps) {
  const [section, setSection] = useState<'goals' | 'commitments'>('goals');
  const [goalStatus, setGoalStatus] = useState<'active' | 'completed'>('active');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGoalCreateOpen, setIsGoalCreateOpen] = useState(false);
  const [isCommitmentCreateOpen, setIsCommitmentCreateOpen] = useState(false);
  const [movementGoal, setMovementGoal] = useState<Goal | null>(null);
  const [movementType, setMovementType] = useState<'add' | 'remove'>('add');
  const [movementAmount, setMovementAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [targetDate, setTargetDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState<File | undefined>();
  const [color, setColor] = useState(COLORS[0]);

  const [commitmentName, setCommitmentName] = useState('');
  const [commitmentTotalValue, setCommitmentTotalValue] = useState(DEFAULT_CURRENCY_INPUT);
  const [commitmentSharePercent, setCommitmentSharePercent] = useState('50');
  const [commitmentPartnerId, setCommitmentPartnerId] = useState('');
  const [commitmentMonthlyAmount, setCommitmentMonthlyAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [commitmentInstallments, setCommitmentInstallments] = useState('');
  const [commitmentStartDate, setCommitmentStartDate] = useState('');
  const [commitmentPaidAmount, setCommitmentPaidAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [commitmentColor, setCommitmentColor] = useState(COLORS[1]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [nextGoals, nextCommitments] = await Promise.all([
        goalRepository.list(),
        commitmentRepository.list(),
      ]);
      setGoals(nextGoals);
      setCommitments(nextCommitments);
      setError('');
    } catch (loadError) {
      setError(getUserFriendlyError(loadError, 'Nao foi possivel carregar Metas & Compromissos.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const visibleGoals = goals.filter((goal) => goal.status === goalStatus);
  const activeCommitments = commitments.filter((commitment) => commitment.status === 'active');
  const completedCommitments = commitments.filter((commitment) => commitment.status === 'completed');
  const commitmentPreview = useMemo(() => {
    const total = parseCurrencyInput(commitmentTotalValue);
    const sharePercent = clampPercent(Number.parseFloat(commitmentSharePercent.replace(',', '.')) || 50);
    const myShareValue = Math.round(total * sharePercent) / 100;
    const paid = parseCurrencyInput(commitmentPaidAmount);
    const remaining = Math.max(0, myShareValue - paid);
    const progress = myShareValue > 0 ? Math.min(100, (paid / myShareValue) * 100) : 0;
    return { total, sharePercent, myShareValue, paid, remaining, progress };
  }, [commitmentPaidAmount, commitmentSharePercent, commitmentTotalValue]);

  function resetGoalForm() {
    setName('');
    setTargetAmount(DEFAULT_CURRENCY_INPUT);
    setTargetDate('');
    setCategoryId('');
    setImage(undefined);
    setColor(COLORS[0]);
  }

  function resetCommitmentForm() {
    setCommitmentName('');
    setCommitmentTotalValue(DEFAULT_CURRENCY_INPUT);
    setCommitmentSharePercent('50');
    setCommitmentPartnerId(reimbursementPeople[0]?.id ?? '');
    setCommitmentMonthlyAmount(DEFAULT_CURRENCY_INPUT);
    setCommitmentInstallments('');
    setCommitmentStartDate('');
    setCommitmentPaidAmount(DEFAULT_CURRENCY_INPUT);
    setCommitmentColor(COLORS[1]);
  }

  async function handleCreateGoal(event: React.FormEvent) {
    event.preventDefault();
    const amount = parseCurrencyInput(targetAmount);
    if (!name.trim() || amount <= 0) {
      setError('Informe o titulo e um valor valido para a meta.');
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
      setIsGoalCreateOpen(false);
      resetGoalForm();
      setError('');
    } catch (saveError) {
      setError(getUserFriendlyError(saveError, 'Nao foi possivel criar a meta.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCommitment(event: React.FormEvent) {
    event.preventDefault();
    const totalValue = parseCurrencyInput(commitmentTotalValue);
    const monthlyAmount = parseCurrencyInput(commitmentMonthlyAmount);
    const paidAmount = parseCurrencyInput(commitmentPaidAmount);
    const sharePercent = clampPercent(Number.parseFloat(commitmentSharePercent.replace(',', '.')) || 50);
    const installments = Number.parseInt(commitmentInstallments, 10);
    if (!commitmentName.trim() || totalValue <= 0) {
      setError('Informe o nome e o valor total do compromisso.');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await commitmentRepository.create({
        name: commitmentName,
        totalValue,
        mySharePercent: sharePercent,
        partnerPersonId: commitmentPartnerId || undefined,
        monthlyAmount: monthlyAmount > 0 ? monthlyAmount : undefined,
        installmentCount: Number.isFinite(installments) && installments > 0 ? installments : undefined,
        startDate: commitmentStartDate || undefined,
        paidAmount,
        color: commitmentColor,
      });
      setCommitments((current) => [saved, ...current]);
      setIsCommitmentCreateOpen(false);
      resetCommitmentForm();
      setError('');
    } catch (saveError) {
      setError(getUserFriendlyError(saveError, 'Nao foi possivel criar o compromisso.'));
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
      await loadData();
    } catch (movementError) {
      setError(getUserFriendlyError(movementError, 'Nao foi possivel atualizar o valor da meta.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteGoal(goal: Goal) {
    if (!window.confirm(`Excluir a meta "${goal.name}" e todo o historico de valores?`)) return;
    try {
      await goalRepository.remove(goal);
      setGoals((current) => current.filter((item) => item.id !== goal.id));
    } catch (deleteError) {
      setError(getUserFriendlyError(deleteError, 'Nao foi possivel excluir a meta.'));
    }
  }

  async function handleDeleteCommitment(commitment: Commitment) {
    if (!window.confirm(`Excluir o compromisso "${commitment.name}"?`)) return;
    try {
      await commitmentRepository.remove(commitment);
      setCommitments((current) => current.filter((item) => item.id !== commitment.id));
    } catch (deleteError) {
      setError(getUserFriendlyError(deleteError, 'Nao foi possivel excluir o compromisso.'));
    }
  }

  return (
    <div className="premium-scroll app-page-gutters h-full overflow-y-auto pb-8 pt-7">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">Planejamento</p>
          <h1 className="font-display text-2xl font-bold text-white">Metas & Compromissos</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            if (section === 'goals') setIsGoalCreateOpen(true);
            else {
              resetCommitmentForm();
              setIsCommitmentCreateOpen(true);
            }
          }}
          className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white text-sm font-bold text-black transition hover:bg-slate-200"
        >
          <Plus size={17} />
          {section === 'goals' ? 'Nova meta' : 'Novo compromisso'}
        </button>
      </header>

      <div className="premium-card-soft mt-5 grid grid-cols-2 rounded-2xl p-1">
        <button type="button" onClick={() => setSection('goals')} className={`h-10 rounded-xl text-xs font-bold transition ${section === 'goals' ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
          Juntar dinheiro
        </button>
        <button type="button" onClick={() => setSection('commitments')} className={`h-10 rounded-xl text-xs font-bold transition ${section === 'commitments' ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
          Compromissos
        </button>
      </div>

      {section === 'goals' ? (
        <div className="premium-card-soft mt-3 grid grid-cols-2 rounded-2xl p-1">
          {(['active', 'completed'] as const).map((status) => (
            <button key={status} type="button" onClick={() => setGoalStatus(status)} className={`h-10 rounded-xl text-xs font-bold transition ${goalStatus === status ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              {status === 'active' ? 'Ativas' : 'Concluidas'} ({goals.filter((goal) => goal.status === status).length})
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      {section === 'goals' ? (
        <section className="mt-5 grid gap-3">
          {isLoading ? <p className="py-8 text-center text-sm text-slate-500">Carregando metas...</p> : null}
          {!isLoading && visibleGoals.length === 0 ? (
            <div className="premium-card-soft rounded-[24px] border-dashed p-7 text-center">
              <Target size={32} className="mx-auto text-slate-700" />
              <p className="mt-3 font-bold text-white">Nenhuma meta {goalStatus === 'active' ? 'ativa' : 'concluida'}</p>
              <p className="mt-1 text-xs text-slate-500">Crie um objetivo e acompanhe seu progresso.</p>
            </div>
          ) : null}
          {visibleGoals.map((goal) => {
            const progress = Math.min(100, goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0);
            const category = categories.find((item) => item.id === goal.categoryId);
            return (
              <article key={goal.id} className="cosmic-card cosmic-card-hover overflow-hidden rounded-[24px] border border-white/8">
                <div className="relative h-28" style={{ background: goal.imageUrl ? undefined : `linear-gradient(135deg, ${goal.color}, #0B0E14)` }}>
                  {goal.imageUrl ? <img src={goal.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101116] via-transparent to-transparent" />
                  <button type="button" onClick={() => void handleDeleteGoal(goal)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black/50 text-rose-300" aria-label={`Excluir meta ${goal.name}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-bold text-white">{goal.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {category?.name ?? 'Sem categoria'}
                        {goal.targetDate ? ` - ate ${formatDatePtBr(goal.targetDate)}` : ''}
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
      ) : (
        <section className="mt-5 grid gap-3">
          {isLoading ? <p className="py-8 text-center text-sm text-slate-500">Carregando compromissos...</p> : null}
          {!isLoading && commitments.length === 0 ? (
            <div className="premium-card-soft rounded-[24px] border-dashed p-7 text-center">
              <Home size={32} className="mx-auto text-slate-700" />
              <p className="mt-3 font-bold text-white">Nenhum compromisso cadastrado</p>
              <p className="mt-1 text-xs text-slate-500">Cadastre financiamentos, reformas ou pagamentos divididos de longo prazo.</p>
            </div>
          ) : null}
          {activeCommitments.length > 0 ? <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ativos</p> : null}
          {activeCommitments.map((commitment) => (
            <CommitmentCard key={commitment.id} commitment={commitment} people={reimbursementPeople} onDelete={handleDeleteCommitment} />
          ))}
          {completedCommitments.length > 0 ? <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Concluidos</p> : null}
          {completedCommitments.map((commitment) => (
            <CommitmentCard key={commitment.id} commitment={commitment} people={reimbursementPeople} onDelete={handleDeleteCommitment} />
          ))}
        </section>
      )}

      {isGoalCreateOpen ? (
        <ModalFrame title="Nova meta" onClose={() => setIsGoalCreateOpen(false)}>
          <form onSubmit={handleCreateGoal}>
            <div className="grid gap-4">
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Titulo<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Viagem, reserva..." className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Valor da meta<CurrencyInput value={targetAmount} onChange={setTargetAmount} /></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Categoria (opcional)<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white"><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Data final (opcional)<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white" /></label>
              <label className="grid gap-2 text-xs font-semibold text-slate-400">Imagem (opcional)<span className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-slate-300"><ImagePlus size={17} />{image?.name ?? 'Escolher imagem'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0])} className="sr-only" /></span></label>
              <ColorPicker value={color} onChange={setColor} />
            </div>
            <button type="submit" disabled={isSaving} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black transition hover:bg-slate-200 disabled:opacity-60"><Target size={18} />{isSaving ? 'Criando...' : 'Criar meta'}</button>
          </form>
        </ModalFrame>
      ) : null}

      {isCommitmentCreateOpen ? (
        <ModalFrame title="Novo compromisso" onClose={() => setIsCommitmentCreateOpen(false)}>
          <form onSubmit={handleCreateCommitment}>
            <div className="grid gap-4">
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Nome<input value={commitmentName} onChange={(event) => setCommitmentName(event.target.value)} placeholder="Ex: Apartamento Centro" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-amber-300" /></label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">Valor total<CurrencyInput value={commitmentTotalValue} onChange={setCommitmentTotalValue} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-400">Minha cota (%)<input type="number" min={1} max={100} value={commitmentSharePercent} onChange={(event) => setCommitmentSharePercent(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-amber-300" /></label>
                <label className="grid gap-1 text-xs font-semibold text-slate-400">Com quem<select value={commitmentPartnerId} onChange={(event) => setCommitmentPartnerId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white"><option value="">Sem pessoa</option>{reimbursementPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-400">Parcela mensal<CurrencyInput value={commitmentMonthlyAmount} onChange={setCommitmentMonthlyAmount} /></label>
                <label className="grid gap-1 text-xs font-semibold text-slate-400">Total de parcelas<input type="number" min={1} value={commitmentInstallments} onChange={(event) => setCommitmentInstallments(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-amber-300" /></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-400">Inicio<input type="date" value={commitmentStartDate} onChange={(event) => setCommitmentStartDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white" /></label>
                <label className="grid gap-1 text-xs font-semibold text-slate-400">Ja pago<CurrencyInput value={commitmentPaidAmount} onChange={setCommitmentPaidAmount} /></label>
              </div>
              <div className="premium-card-soft rounded-2xl border-amber-400/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100">Minha cota</p>
                <p className="mt-1 font-mono text-lg font-bold text-white">{formatCurrency(commitmentPreview.myShareValue)}</p>
                <p className="mt-1 text-xs text-amber-100/80">Falta {formatCurrency(commitmentPreview.remaining)} - {commitmentPreview.progress.toFixed(0)}% pago</p>
              </div>
              <ColorPicker value={commitmentColor} onChange={setCommitmentColor} />
            </div>
            <button type="submit" disabled={isSaving} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black transition hover:bg-slate-200 disabled:opacity-60"><HandCoins size={18} />{isSaving ? 'Criando...' : 'Criar compromisso'}</button>
          </form>
        </ModalFrame>
      ) : null}

      {movementGoal ? (
        <ModalFrame title={movementType === 'add' ? 'Adicionar valor' : 'Retirar valor'} onClose={() => setMovementGoal(null)}>
          <form onSubmit={handleMovement}>
            <p className="text-sm font-bold text-white">{movementGoal.name}</p>
            <label className="mt-5 grid gap-1 text-xs font-semibold text-slate-400">Valor<CurrencyInput value={movementAmount} onChange={setMovementAmount} /></label>
            <button type="submit" disabled={isSaving} className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold text-white disabled:opacity-60 ${movementType === 'add' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{movementType === 'add' ? <Plus size={18} /> : <Minus size={18} />}{isSaving ? 'Salvando...' : movementType === 'add' ? 'Adicionar valor' : 'Retirar valor'}</button>
          </form>
        </ModalFrame>
      ) : null}
    </div>
  );
}

function CommitmentCard({ commitment, people, onDelete }: { key?: React.Key; commitment: Commitment; people: ReimbursementPerson[]; onDelete: (commitment: Commitment) => void | Promise<void> }) {
  const myShareValue = Math.round(commitment.totalValue * commitment.mySharePercent) / 100;
  const remaining = Math.max(0, myShareValue - commitment.paidAmount);
  const progress = myShareValue > 0 ? Math.min(100, (commitment.paidAmount / myShareValue) * 100) : 0;
  return (
    <article className="cosmic-card cosmic-card-hover rounded-[24px] border border-white/8 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${commitment.color}22`, color: commitment.color }}>
              <Home size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-bold text-white">{commitment.name}</h2>
              <p className="truncate text-xs text-slate-500">{getPersonName(people, commitment.partnerPersonId)}</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => void onDelete(commitment)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300" aria-label={`Excluir compromisso ${commitment.name}`}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: commitment.color }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Minha cota" value={formatCurrency(myShareValue)} />
        <Stat label="Pago" value={formatCurrency(commitment.paidAmount)} />
        <Stat label="Falta" value={formatCurrency(remaining)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1">Cota {commitment.mySharePercent.toFixed(0)}%</span>
        {commitment.monthlyAmount ? <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1">Parcela {formatCurrency(commitment.monthlyAmount)}</span> : null}
        {commitment.installmentCount ? <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1">{commitment.installmentCount}x</span> : null}
        {commitment.startDate ? <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1">Inicio {formatDatePtBr(commitment.startDate)}</span> : null}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="premium-card-soft rounded-2xl p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs font-bold text-white">{value}</p>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex gap-2">
      {COLORS.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} className={`h-8 w-8 rounded-full border-2 ${value === option ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: option }} aria-label={`Cor ${option}`} />
      ))}
    </div>
  );
}

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="premium-card premium-scroll max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] p-5 sm:rounded-[28px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
