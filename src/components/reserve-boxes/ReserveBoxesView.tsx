import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CalendarDays,
  Check,
  DollarSign,
  Home,
  Landmark,
  Minus,
  PiggyBank,
  Plane,
  Plus,
  RotateCcw,
  Shield,
  TrendingUp,
  Vault,
  X,
  Zap,
} from 'lucide-react';
import { Account, ReserveBox, ReserveBoxMovement, ReserveBoxMovementType } from '../../types';
import { DEFAULT_CURRENCY_INPUT, formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';
import { formatCurrency } from '../../lib/utils/finance';
import { formatDatePtBr, formatLocalDate } from '../../lib/utils/date';
import { CurrencyInput } from '../shared/CurrencyInput';
import {
  estimateReserveYield,
  getReserveBoxDeltaFromEstimate,
  getReserveBoxExpectedBalance,
  getReserveBoxMovements,
  getReserveInstitutions,
  summarizeReserveBoxes,
} from '../../lib/utils/reserveBoxes';
import { DuplicateNameError, hasDuplicateName } from '../../lib/utils/validation';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';

interface ReserveBoxesViewProps {
  boxes: ReserveBox[];
  movements: ReserveBoxMovement[];
  accounts: Account[];
  showBalances: boolean;
  onCreateBox: (input: {
    name: string;
    institution: string;
    cdiPercent: number;
    initialBalance: number;
    createdOn: string;
    goal?: string;
    color: string;
    icon: string;
  }) => Promise<void>;
  onAddMovement: (input: {
    reserveBoxId: string;
    type: ReserveBoxMovementType;
    amount: number;
    date: string;
    description?: string;
    createAccountIncome?: boolean;
    accountId?: string;
  }) => Promise<void>;
}

const COLORS = ['#8A05BE', '#009EE3', '#F8D117', '#10B981', '#38BDF8', '#F59E0B', '#22C55E', '#8B5CF6'];
const INSTITUTIONS = ['Nubank', 'Mercado Pago', '99Pay', 'Outro'];
const ICONS = [
  { id: 'PiggyBank', label: 'Cofre', Icon: PiggyBank },
  { id: 'Vault', label: 'Reserva', Icon: Vault },
  { id: 'Zap', label: 'Turbo', Icon: Zap },
  { id: 'Shield', label: 'Proteção', Icon: Shield },
  { id: 'Plane', label: 'Viagem', Icon: Plane },
  { id: 'Home', label: 'Moradia', Icon: Home },
  { id: 'DollarSign', label: 'Moeda', Icon: DollarSign },
  { id: 'TrendingUp', label: 'Renda', Icon: TrendingUp },
];

const movementLabels: Record<ReserveBoxMovementType, string> = {
  deposit: 'Aplicação',
  withdrawal: 'Resgate',
  yield: 'Rendimento',
  balance_update: 'Saldo real',
};

function hiddenMoney(show: boolean, value: number) {
  return show ? formatCurrency(value) : 'R$ *****';
}

function getIcon(icon: string) {
  return ICONS.find((item) => item.id === icon)?.Icon ?? PiggyBank;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDefaultMovementAccountId(accounts: Account[], box: ReserveBox) {
  const normalizedInstitution = normalizeText(box.institution);
  return accounts.find((account) =>
    normalizeText(account.institution).includes(normalizedInstitution)
    || normalizeText(account.name).includes(normalizedInstitution)
  )?.id ?? accounts[0]?.id ?? '';
}

function getAccountName(accounts: Account[], accountId?: string) {
  if (!accountId) return '';
  return accounts.find((account) => account.id === accountId)?.name ?? 'Conta';
}

export function ReserveBoxesView({ boxes, movements, accounts, showBalances, onCreateBox, onAddMovement }: ReserveBoxesViewProps) {
  const today = formatLocalDate(new Date());
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [selectedBoxId, setSelectedBoxId] = useState(boxes.find((box) => box.isActive)?.id ?? boxes[0]?.id ?? '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [movementBox, setMovementBox] = useState<ReserveBox | null>(null);
  const [movementType, setMovementType] = useState<ReserveBoxMovementType>('deposit');
  const [balanceBox, setBalanceBox] = useState<ReserveBox | null>(null);

  const activeBoxes = boxes.filter((box) => box.isActive);
  const institutions = getReserveInstitutions(activeBoxes);
  const visibleBoxes = institutionFilter === 'all'
    ? activeBoxes
    : activeBoxes.filter((box) => box.institution === institutionFilter);
  const summary = summarizeReserveBoxes(visibleBoxes, today);
  const selectedBox = boxes.find((box) => box.id === selectedBoxId) ?? visibleBoxes[0] ?? null;
  const selectedMovements = selectedBox ? getReserveBoxMovements(selectedBox, movements) : [];
  const totalInitial = visibleBoxes.reduce((sum, box) => sum + box.initialBalance, 0);
  const totalGain = summary.totalBalance - totalInitial;

  function openMovement(box: ReserveBox, type: ReserveBoxMovementType) {
    setMovementBox(box);
    setMovementType(type);
  }

  return (
    <div className="premium-scroll app-page-gutters h-full overflow-y-auto pb-8 pt-7 text-white">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">Reservas</p>
          <h1 className="font-display text-2xl font-bold text-white">Caixinhas e Reservas</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white px-3 text-sm font-bold text-black transition hover:bg-slate-200"
        >
          <Plus size={17} />
          Nova
        </button>
      </header>

      <section className="premium-card mt-5 overflow-hidden rounded-3xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total em caixinhas</p>
            <p className="mt-2 font-display text-3xl font-bold text-white">{hiddenMoney(showBalances, summary.totalBalance)}</p>
          </div>
          <span className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
            {summary.count} ativa{summary.count === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <SummaryPill label="Estimado CDI" value={hiddenMoney(showBalances, summary.estimatedYield)} tone="sky" />
          <SummaryPill label="Saldo esperado" value={hiddenMoney(showBalances, summary.expectedBalance)} tone="violet" />
          <SummaryPill label="Evolução real" value={hiddenMoney(showBalances, totalGain)} tone={totalGain >= 0 ? 'emerald' : 'rose'} />
        </div>
      </section>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <FilterButton active={institutionFilter === 'all'} onClick={() => setInstitutionFilter('all')}>
          Todas
        </FilterButton>
        {institutions.map((institution) => (
          <FilterButton key={institution} active={institutionFilter === institution} onClick={() => setInstitutionFilter(institution)}>
            {institution}
          </FilterButton>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="grid content-start gap-3 sm:grid-cols-2">
          {visibleBoxes.length === 0 ? (
            <div className="premium-card-soft rounded-3xl border-dashed p-7 text-center sm:col-span-2">
              <PiggyBank size={30} className="mx-auto text-slate-600" />
              <p className="mt-3 font-bold text-white">Nenhuma caixinha encontrada</p>
            </div>
          ) : null}
          {visibleBoxes.map((box) => {
            const Icon = getIcon(box.icon);
            const expectedBalance = getReserveBoxExpectedBalance(box, today);
            const estimateDelta = getReserveBoxDeltaFromEstimate(box, today);
            const monthYield = estimateReserveYield(box.currentBalance, box.cdiPercent, box.lastBalanceUpdate, today);
            const selected = selectedBox?.id === box.id;
            return (
              <article
                key={box.id}
                className={`cosmic-card cosmic-card-hover overflow-hidden rounded-3xl border p-4 transition ${selected ? 'border-white/30' : 'border-white/8'}`}
                style={{
                  borderColor: selected ? `${box.color}99` : `${box.color}44`,
                  backgroundImage: `radial-gradient(circle at 82% 14%, ${box.color}2f, transparent 30%), linear-gradient(135deg, ${box.color}18, transparent 58%)`,
                }}
              >
                <button type="button" onClick={() => setSelectedBoxId(box.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${box.color}22`, color: box.color }}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg font-bold text-white">{box.name}</h2>
                      <p className="mt-1 truncate text-xs text-slate-400">{box.institution} • {box.cdiPercent.toFixed(0)}% CDI</p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-bold text-white">{hiddenMoney(showBalances, box.currentBalance)}</p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, box.initialBalance > 0 ? (box.currentBalance / box.initialBalance) * 100 : 100)}%`, backgroundColor: box.color }} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <StatLine label="Esperado" value={hiddenMoney(showBalances, expectedBalance)} />
                    <StatLine label="Diferença" value={hiddenMoney(showBalances, estimateDelta)} tone={estimateDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
                  </div>
                  {box.goal ? <p className="mt-3 truncate text-xs text-slate-500">{box.goal}</p> : null}
                  <p className="mt-1 text-[10px] text-slate-600">Atualizada em {formatDatePtBr(box.lastBalanceUpdate)} • CDI previsto {hiddenMoney(showBalances, monthYield)}</p>
                </button>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <ActionButton onClick={() => openMovement(box, 'deposit')} icon={<Plus size={15} />} label="Aplicar" tone="emerald" />
                  <ActionButton onClick={() => openMovement(box, 'withdrawal')} icon={<Minus size={15} />} label="Resgatar" tone="rose" />
                  <ActionButton onClick={() => setBalanceBox(box)} icon={<RotateCcw size={15} />} label="Saldo" tone="sky" />
                </div>
              </article>
            );
          })}
        </section>

        <section className="premium-card-soft rounded-3xl p-4">
          {selectedBox ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Histórico</p>
                  <h2 className="mt-1 truncate font-display text-xl font-bold text-white">{selectedBox.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => openMovement(selectedBox, 'yield')}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200"
                >
                  <TrendingUp size={15} />
                  Rendimento
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatLine label="Criada em" value={formatDatePtBr(selectedBox.createdOn)} />
                <StatLine label="Inicial" value={hiddenMoney(showBalances, selectedBox.initialBalance)} />
              </div>
              <div className="premium-scroll mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {selectedMovements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm font-semibold text-slate-500">
                    Sem movimentos registrados
                  </div>
                ) : null}
                {selectedMovements.map((movement) => (
                  <MovementRow key={movement.id} movement={movement} accounts={accounts} showBalances={showBalances} />
                ))}
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <Vault size={30} className="mx-auto text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-400">Selecione uma caixinha</p>
            </div>
          )}
        </section>
      </div>

      {isCreateOpen ? (
        <AddReserveBoxModal
          boxes={activeBoxes}
          onClose={() => setIsCreateOpen(false)}
          onSave={onCreateBox}
        />
      ) : null}

      {movementBox ? (
        <ReserveMovementModal
          box={movementBox}
          type={movementType}
          accounts={accounts}
          onClose={() => setMovementBox(null)}
          onSave={async (input) => {
            await onAddMovement(input);
            setMovementBox(null);
          }}
        />
      ) : null}

      {balanceBox ? (
        <ReserveBalanceModal
          box={balanceBox}
          onClose={() => setBalanceBox(null)}
          onSave={async (input) => {
            await onAddMovement(input);
            setBalanceBox(null);
          }}
        />
      ) : null}
    </div>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'rose' | 'sky' | 'violet' }) {
  const color = {
    emerald: 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200',
    rose: 'border-rose-400/15 bg-rose-500/10 text-rose-200',
    sky: 'border-sky-400/15 bg-sky-500/10 text-sky-200',
    violet: 'border-violet-400/15 bg-violet-500/10 text-violet-200',
  }[tone];
  return (
    <div className={`rounded-2xl border p-3 ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function StatLine({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 truncate font-mono text-xs font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { key?: React.Key; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-xl px-4 text-xs font-bold transition ${active ? 'bg-white text-black' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function ActionButton({ icon, label, tone, onClick }: { icon: React.ReactNode; label: string; tone: 'emerald' | 'rose' | 'sky'; onClick: () => void }) {
  const className = {
    emerald: 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
    sky: 'bg-sky-500/10 text-sky-300 hover:bg-sky-500/20',
  }[tone];
  return (
    <button type="button" onClick={onClick} className={`flex h-10 items-center justify-center gap-1 rounded-xl text-xs font-bold transition ${className}`}>
      {icon}
      {label}
    </button>
  );
}

function MovementRow({ movement, accounts, showBalances }: { key?: React.Key; movement: ReserveBoxMovement; accounts: Account[]; showBalances: boolean }) {
  const positive = movement.type === 'deposit' || movement.type === 'yield';
  const neutral = movement.type === 'balance_update';
  const accountName = getAccountName(accounts, movement.accountId);
  const accountDetail = accountName
    ? movement.type === 'deposit'
      ? ` • saiu de ${accountName}`
      : movement.type === 'withdrawal'
        ? ` • entrou em ${accountName}`
        : ''
    : '';
  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">{movementLabels[movement.type]}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{formatDatePtBr(movement.date)}{accountDetail}{movement.description ? ` • ${movement.description}` : ''}</p>
      </div>
      <p className={`shrink-0 font-mono text-sm font-bold ${neutral ? 'text-sky-200' : positive ? 'text-emerald-300' : 'text-rose-300'}`}>
        {neutral ? '' : positive ? '+' : '-'}{hiddenMoney(showBalances, movement.amount)}
      </p>
    </article>
  );
}

function AddReserveBoxModal({ boxes, onClose, onSave }: {
  boxes: ReserveBox[];
  onClose: () => void;
  onSave: ReserveBoxesViewProps['onCreateBox'];
}) {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('Nubank');
  const [customInstitution, setCustomInstitution] = useState('');
  const [cdiPercent, setCdiPercent] = useState('100');
  const [initialBalance, setInitialBalance] = useState(DEFAULT_CURRENCY_INPUT);
  const [createdOn, setCreatedOn] = useState(formatLocalDate(new Date()));
  const [goal, setGoal] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0].id);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const selectedInstitution = institution === 'Outro' ? customInstitution.trim() || 'Outro' : institution;
    const amount = parseCurrencyInput(initialBalance);
    const cdi = Number.parseFloat(cdiPercent.replace(',', '.'));
    if (!name.trim()) {
      setError('Informe o nome da caixinha.');
      return;
    }
    if (hasDuplicateName(name, boxes.map((box) => box.name))) {
      setError('Já existe uma caixinha com esse nome.');
      return;
    }
    if (!Number.isFinite(cdi) || cdi < 0 || cdi > 300) {
      setError('Informe um percentual CDI entre 0 e 300.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        name,
        institution: selectedInstitution,
        cdiPercent: cdi,
        initialBalance: amount,
        createdOn,
        goal: goal.trim() || undefined,
        color,
        icon,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof DuplicateNameError
        ? saveError.message
        : getUserFriendlyError(saveError, 'Não foi possível criar a caixinha.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalFrame title="Nova caixinha" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        {error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
        <label className="grid gap-1 text-xs font-semibold text-slate-400">Nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex: Turbo Ultravioleta" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-slate-400">Banco<select value={institution} onChange={(event) => setInstitution(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">{INSTITUTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-slate-400">CDI (%)<input type="number" min={0} max={300} step={0.01} value={cdiPercent} onChange={(event) => setCdiPercent(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
        </div>
        {institution === 'Outro' ? <label className="grid gap-1 text-xs font-semibold text-slate-400">Instituição<input value={customInstitution} onChange={(event) => setCustomInstitution(event.target.value)} placeholder="Nome do banco" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-slate-400">Saldo inicial<CurrencyInput value={initialBalance} onChange={setInitialBalance} /></label>
          <label className="grid gap-1 text-xs font-semibold text-slate-400">Criação<input type="date" value={createdOn} onChange={(event) => setCreatedOn(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-slate-400">Objetivo<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Ex: Reserva de emergência" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
        <ColorIconPicker color={color} icon={icon} onColorChange={setColor} onIconChange={setIcon} />
        <button type="submit" disabled={isSaving} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black transition hover:bg-slate-200 disabled:opacity-60"><Check size={18} />{isSaving ? 'Criando...' : 'Criar caixinha'}</button>
      </form>
    </ModalFrame>
  );
}

function ReserveMovementModal({ box, type, accounts, onClose, onSave }: {
  box: ReserveBox;
  type: ReserveBoxMovementType;
  accounts: Account[];
  onClose: () => void;
  onSave: ReserveBoxesViewProps['onAddMovement'];
}) {
  const [amount, setAmount] = useState(DEFAULT_CURRENCY_INPUT);
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(getDefaultMovementAccountId(accounts, box));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isWithdrawal = type === 'withdrawal';
  const isDeposit = type === 'deposit';
  const requiresAccount = isDeposit || isWithdrawal;
  const selectedAccount = accounts.find((account) => account.id === accountId) ?? null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = parseCurrencyInput(amount);
    if (parsedAmount <= 0) {
      setError('Informe um valor válido.');
      return;
    }
    if (isWithdrawal && parsedAmount > box.currentBalance) {
      setError('O resgate não pode ser maior que o saldo atual.');
      return;
    }
    if (requiresAccount && !accountId) {
      setError(isDeposit ? 'Selecione a conta de origem da aplicação.' : 'Selecione a conta que recebeu o resgate.');
      return;
    }
    if (isDeposit && selectedAccount && parsedAmount > selectedAccount.balance) {
      setError('A aplicação não pode ser maior que o saldo atual da conta de origem.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        reserveBoxId: box.id,
        type,
        amount: parsedAmount,
        date,
        description: description.trim() || undefined,
        accountId: requiresAccount ? accountId : undefined,
      });
      onClose();
    } catch (saveError) {
      setError(getUserFriendlyError(saveError, 'Não foi possível registrar o movimento.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalFrame title={movementLabels[type]} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        {error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
        <p className="text-sm font-bold text-white">{box.name}</p>
        <label className="grid gap-1 text-xs font-semibold text-slate-400">Valor<CurrencyInput value={amount} onChange={setAmount} /></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-400">Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-400">Descrição<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={type === 'yield' ? 'Rendimento mensal' : 'Opcional'} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
        {requiresAccount ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <label className="grid gap-1 text-xs font-semibold text-slate-400">
              {isDeposit ? 'Conta de origem' : 'Conta de destino'}
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-sky-400">
                <option value="">Selecione</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <p className="mt-2 text-xs text-slate-500">
              {isDeposit ? 'O valor sai da conta escolhida e entra nesta caixinha.' : 'O valor sai desta caixinha e entra na conta escolhida.'}
            </p>
          </div>
        ) : null}
        <button type="submit" disabled={isSaving} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black transition hover:bg-slate-200 disabled:opacity-60">{type === 'withdrawal' ? <ArrowUpFromLine size={18} /> : <ArrowDownToLine size={18} />}{isSaving ? 'Salvando...' : isDeposit ? 'Aplicar na caixinha' : isWithdrawal ? 'Resgatar para conta' : 'Salvar movimento'}</button>
      </form>
    </ModalFrame>
  );
}

function ReserveBalanceModal({ box, onClose, onSave }: {
  box: ReserveBox;
  onClose: () => void;
  onSave: ReserveBoxesViewProps['onAddMovement'];
}) {
  const [balance, setBalance] = useState(formatCurrencyInput(box.currentBalance));
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const expectedBalance = getReserveBoxExpectedBalance(box, date);
  const parsedBalance = parseCurrencyInput(balance);
  const delta = parsedBalance - expectedBalance;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (parsedBalance < 0) {
      setError('Informe um saldo válido.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        reserveBoxId: box.id,
        type: 'balance_update',
        amount: parsedBalance,
        date,
        description: 'Atualização manual de saldo',
      });
      onClose();
    } catch (saveError) {
      setError(getUserFriendlyError(saveError, 'Não foi possível atualizar o saldo.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalFrame title="Atualizar saldo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        {error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
        <p className="text-sm font-bold text-white">{box.name}</p>
        <label className="grid gap-1 text-xs font-semibold text-slate-400">Saldo real<CurrencyInput value={balance} onChange={setBalance} /></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-400">Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" /></label>
        <div className="grid grid-cols-2 gap-2">
          <StatLine label="Esperado" value={formatCurrency(expectedBalance)} />
          <StatLine label="Diferença" value={formatCurrency(delta)} tone={delta >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
        </div>
        <button type="submit" disabled={isSaving} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black transition hover:bg-slate-200 disabled:opacity-60"><RotateCcw size={18} />{isSaving ? 'Salvando...' : 'Salvar saldo real'}</button>
      </form>
    </ModalFrame>
  );
}

function ColorIconPicker({ color, icon, onColorChange, onIconChange }: {
  color: string;
  icon: string;
  onColorChange: (value: string) => void;
  onIconChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {COLORS.map((option) => (
          <button key={option} type="button" onClick={() => onColorChange(option)} className={`h-8 w-8 rounded-full border-2 ${color === option ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: option }} aria-label={`Cor ${option}`} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ICONS.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => onIconChange(id)} title={label} className={`flex h-10 items-center justify-center rounded-xl border transition ${icon === id ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>
            <Icon size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="premium-card premium-scroll max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] p-5 sm:rounded-[28px]">
        <div className="mb-5 flex items-center justify-between gap-3">
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
