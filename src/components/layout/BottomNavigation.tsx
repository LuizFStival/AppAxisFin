import React, { useState } from 'react';
import { ArrowLeftRight, BarChart3, CreditCard, HandCoins, Home, MoreHorizontal, Plus, Target, User, Wallet } from 'lucide-react';
import { AppView } from '../../types';

interface BottomNavigationProps {
  currentView: AppView;
  reimbursementsEnabled: boolean;
  onNavigate: (view: AppView) => void;
  onAdd: () => void;
}

const primaryItems = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'transactions' as const, label: 'Transações', icon: ArrowLeftRight },
  { id: 'cards' as const, label: 'Cartões', icon: CreditCard },
];

const moreItems = [
  { id: 'reimbursements' as const, label: 'Reembolsos', icon: HandCoins },
  { id: 'accounts' as const, label: 'Contas', icon: Wallet },
  { id: 'goals' as const, label: 'Metas', icon: Target },
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
    <nav className="fixed inset-x-0 bottom-0 z-40 h-[72px] border-t border-[#1A1C22] bg-[#0A0B0E]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:absolute md:rounded-b-[34px]">
      {isMoreOpen ? (
        <div className="absolute bottom-[76px] right-4 w-56 rounded-2xl border border-white/10 bg-[#101319] p-2 shadow-2xl shadow-black/50">
          {visibleMoreItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${
                  isActive ? 'bg-sky-500/15 text-sky-300' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        {primaryItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`flex h-12 flex-col items-center justify-center rounded-full transition ${
                isActive ? 'text-[#3B82F6]' : 'text-gray-500 hover:text-gray-300'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setIsMoreOpen(false);
            onAdd();
          }}
          className="mx-auto flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] text-white shadow-lg shadow-[#3B82F6]/30 transition hover:rotate-90 hover:scale-105 active:scale-95"
          aria-label="Adicionar lançamento"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        {primaryItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`flex h-12 flex-col items-center justify-center rounded-full transition ${
                isActive ? 'text-[#3B82F6]' : 'text-gray-500 hover:text-gray-300'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMoreOpen((value) => !value)}
          className={`flex h-12 flex-col items-center justify-center rounded-full transition ${
            isMoreActive || isMoreOpen ? 'text-[#3B82F6]' : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Mais opções"
          aria-label="Mais opções"
          aria-expanded={isMoreOpen}
        >
          <MoreHorizontal size={22} strokeWidth={isMoreActive || isMoreOpen ? 2.5 : 2} />
        </button>
      </div>
      <div className="absolute bottom-1 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/20" />
    </nav>
  );
}
