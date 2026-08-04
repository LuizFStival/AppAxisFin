import React, { useState } from 'react';
import { ArrowLeftRight, BarChart3, CalendarCheck2, CreditCard, HandCoins, Home, MoreHorizontal, Plus, Target, User, Wallet } from 'lucide-react';
import { AppView } from '../../types';

interface BottomNavigationProps {
  currentView: AppView;
  reimbursementsEnabled: boolean;
  onNavigate: (view: AppView) => void;
  onAdd: () => void;
}

const primaryItems = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'month-center' as const, label: 'Central', icon: CalendarCheck2 },
  { id: 'cards' as const, label: 'Cartões', icon: CreditCard },
];

const moreItems = [
  { id: 'transactions' as const, label: 'Transações', icon: ArrowLeftRight },
  { id: 'reimbursements' as const, label: 'Reembolsos', icon: HandCoins },
  { id: 'accounts' as const, label: 'Contas', icon: Wallet },
  { id: 'goals' as const, label: 'Metas & Compromissos', icon: Target },
  { id: 'reports' as const, label: 'Relatórios', icon: BarChart3 },
  { id: 'profile' as const, label: 'Perfil', icon: User },
];

export function BottomNavigation({ currentView, reimbursementsEnabled, onNavigate, onAdd }: BottomNavigationProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const visibleMoreItems = reimbursementsEnabled
    ? moreItems
    : moreItems.filter((item) => item.id !== 'reimbursements');
  const isMoreActive = visibleMoreItems.some((item) => item.id === currentView);

  function handleNavigate(view: AppView) {
    setIsMoreOpen(false);
    onNavigate(view);
  }

  return (
    <nav className="bottom-navigation fixed inset-x-0 bottom-0 z-40 bg-transparent px-4 pt-2 md:absolute" aria-label="Navegacao inferior">
      {isMoreOpen ? (
        <div className="absolute bottom-[86px] right-4 w-56 rounded-2xl border border-white/10 bg-[#101319]/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {visibleMoreItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${
                  isActive ? 'premium-metal text-white' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mx-auto grid max-w-md grid-cols-[1fr_auto] items-center gap-2">
        <div className="grid grid-cols-4 items-center gap-1 rounded-full border border-black/10 bg-[#E7E7E4] p-1.5 text-[#5E626B] shadow-[0_18px_46px_-28px_rgba(255,255,255,0.86)]">
          {[...primaryItems, { id: 'more' as const, label: 'Mais opções', icon: MoreHorizontal }].map((item) => {
            const Icon = item.icon;
            const isMoreButton = item.id === 'more';
            const isActive = isMoreButton ? isMoreActive || isMoreOpen : currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => isMoreButton ? setIsMoreOpen((value) => !value) : handleNavigate(item.id)}
                className={`flex h-12 flex-col items-center justify-center rounded-full transition ${
                  isActive ? 'bg-[#07080B] text-white shadow-sm' : 'hover:bg-black/5 hover:text-[#15171C]'
                }`}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive && !isMoreButton ? 'page' : undefined}
                aria-expanded={isMoreButton ? isMoreOpen : undefined}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsMoreOpen(false);
            onAdd();
          }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#0B0C10] text-white shadow-[0_18px_42px_-24px_rgba(139,92,246,0.85)] transition hover:scale-105 hover:text-violet-200 active:scale-95"
          aria-label="Adicionar lançamento"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  );
}
