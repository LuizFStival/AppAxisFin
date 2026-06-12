import React, { useRef } from 'react';
import {
  ArrowDownToLine,
  CalendarDays,
  ChevronLeft,
  ArrowRight,
  ArrowUpFromLine,
  Bell,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  HelpCircle,
  Pencil,
  Plus,
  Settings,
  TrendingDown,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { Account, Card, Category, DashboardSummary, Transaction } from '../../types';
import { formatCurrency, formatMonthLabel, getCurrentMonthKey } from '../../lib/utils/finance';
import { StatCard } from '../shared/StatCard';
import { BankLogo } from '../shared/BankLogo';

interface DashboardViewProps {
  userName: string;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  activeMonth: string;
  summary: DashboardSummary;
  showBalances: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onToggleBalances: () => void;
  onAdd: () => void;
  onAddAccount: () => void;
  onAddCard: () => void;
  onViewAccounts: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
}

function hiddenMoney(show: boolean, value: number) {
  return show ? formatCurrency(value) : 'R$ •••••';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function DashboardView({
  userName,
  accounts,
  cards,
  activeMonth,
  summary,
  showBalances,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onToggleBalances,
  onAddAccount,
  onAddCard,
  onViewAccounts,
  onEditCard,
  onDeleteCard,
}: DashboardViewProps) {
  const firstName = userName.split(' ')[0] || 'voce';
  const isCurrentMonth = activeMonth === getCurrentMonthKey();
  const accountsScrollerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

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
    <div className="flex flex-1 flex-col pb-4 text-white">
      <header className="flex items-center justify-between px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] font-display text-sm font-bold tracking-wider text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              {getInitials(userName)}
            </div>
            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#050608] bg-[#3B82F6]">
              <span className="block h-1 w-1 rounded-full bg-white" />
            </span>
          </div>
          <div>
            <h1 className="font-display text-base font-semibold leading-tight tracking-tight text-white">
              Ola, {firstName}
            </h1>
            <button className="flex items-center gap-0.5 text-xs font-medium text-gray-400 transition hover:text-white">
              Perfil Principal <ChevronDown size={12} className="opacity-75" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[Settings, HelpCircle, Bell].map((Icon, index) => (
            <button
              key={index}
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#1A1C22] bg-[#0F1116] transition hover:bg-[#141720]"
            >
              <Icon size={18} className="text-gray-400" />
              {index === 2 ? <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#3B82F6]" /> : null}
            </button>
          ))}
        </div>
      </header>

      <section className="px-5 pb-4">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/8 bg-[#101319] p-2">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onCurrentMonth}
            className="min-w-0 flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center transition hover:bg-white/5"
            title="Voltar para o mes atual"
          >
            <CalendarDays size={16} className={isCurrentMonth ? 'text-sky-300' : 'text-slate-500'} />
            <span className="truncate text-sm font-bold capitalize text-white">{formatMonthLabel(activeMonth)}</span>
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Proximo mes"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <section className="px-5 text-center">
        <div className="cosmic-card relative flex flex-col items-center overflow-hidden rounded-3xl p-6">
          <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#3B82F6]/10 blur-2xl" />
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            <span>Saldo atual</span>
            <button type="button" onClick={onToggleBalances} className="p-1 text-gray-400 transition hover:text-white">
              {showBalances ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <p className="mb-5 font-display text-3xl font-bold tracking-tight text-white">
            {hiddenMoney(showBalances, summary.currentBalance)}
          </p>

          <div className="mb-5 h-px w-full bg-[#1A1C22]" />

          <div className="grid w-full grid-cols-2 text-left">
            <div className="border-r border-[#1A1C22] pr-4">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">Recebido</p>
              <p className="whitespace-nowrap font-mono text-sm font-semibold text-emerald-400">
                {hiddenMoney(showBalances, summary.received)}
              </p>
            </div>
            <div className="pl-6">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">Pago</p>
              <p className="whitespace-nowrap font-mono text-sm font-semibold text-red-400">
                {hiddenMoney(showBalances, summary.paid)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3.5 px-5">
        <StatCard label="Receitas" value={hiddenMoney(showBalances, summary.income)} tone="info" icon={TrendingUp} hint={`+${formatCurrency(summary.received)}`} />
        <StatCard label="Despesas" value={hiddenMoney(showBalances, summary.expenses)} tone="neutral" icon={TrendingDown} hint={`-${formatCurrency(summary.paid)}`} />
        <StatCard label="Recebido" value={hiddenMoney(showBalances, summary.received)} tone="info" icon={ArrowDownToLine} />
        <StatCard label="Pago" value={hiddenMoney(showBalances, summary.paid)} tone="neutral" icon={ArrowUpFromLine} />
      </section>

      <section className="mt-6 px-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold tracking-tight text-white">Minhas Contas</h2>
          <button
            type="button"
            onClick={onAddAccount}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#3B82F6]/20 bg-[#3B82F6]/15 text-[#3B82F6] transition hover:border-transparent hover:bg-gradient-to-tr hover:from-[#3B82F6] hover:to-[#8B5CF6] hover:text-white"
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
          className="horizontal-scroll no-scrollbar -mx-5 flex cursor-grab touch-pan-x select-none snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 pt-1 active:cursor-grabbing"
        >
          {accounts.map((account) => (
            <article key={account.id} className="cosmic-card cosmic-card-hover flex w-[145px] shrink-0 snap-start cursor-pointer flex-col justify-between rounded-2xl p-4">
              <div>
                <div className="mb-4">
                  <BankLogo account={account} size="sm" />
                </div>
                <p className="mb-0.5 truncate text-xs font-medium text-gray-400">{account.name}</p>
              </div>
              <p className="whitespace-nowrap font-mono text-xs font-bold leading-tight tracking-tight text-white">
                {hiddenMoney(showBalances, account.balance)}
              </p>
            </article>
          ))}

          <button
            type="button"
            onClick={onViewAccounts}
            className="flex w-[110px] shrink-0 snap-start cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-3 text-center text-gray-400 transition hover:border-white/25 hover:text-white"
          >
            <ArrowRight size={18} className="mb-1 text-gray-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Ver Contas</span>
          </button>
        </div>
      </section>

      <section className="px-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold tracking-tight text-white">Meus Cartoes</h2>
          <button
            type="button"
            onClick={onAddCard}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#8B5CF6]/20 bg-[#8B5CF6]/15 text-[#8B5CF6] transition hover:border-transparent hover:bg-gradient-to-tr hover:from-[#3B82F6] hover:to-[#8B5CF6] hover:text-white"
            title="Adicionar cartao"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
        {cards.length === 0 ? (
          <div className="cosmic-card rounded-2xl border-dashed p-5 text-center">
            <CreditCard size={22} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm font-semibold text-gray-300">Nenhum cartao cadastrado</p>
            <p className="mt-1 text-xs text-gray-500">Seus cartoes reais vao aparecer aqui quando forem adicionados.</p>
          </div>
        ) : (
          <div className="space-y-3">
          {cards.map((card) => {
            const progress = card.limit > 0 ? Math.min(100, (card.used / card.limit) * 100) : 0;
            return (
              <article key={card.id} className="cosmic-card rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{card.name}</p>
                    <p className="text-[10px] text-gray-500">Fecha dia {card.closingDay} - vence dia {card.dueDay}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditCard(card)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-sky-500/20 hover:text-sky-200"
                      title="Editar cartao"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCard(card)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-100"
                      title="Excluir cartao"
                    >
                      <Trash2 size={14} />
                    </button>
                    <CreditCard size={20} style={{ color: card.color }} />
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                  <span>{hiddenMoney(showBalances, card.used)}</span>
                  <span>limite {hiddenMoney(showBalances, card.limit)}</span>
                </div>
              </article>
            );
          })}
          </div>
        )}
      </section>
    </div>
  );
}
