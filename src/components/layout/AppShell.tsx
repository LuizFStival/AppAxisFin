import React from 'react';
import { ArrowLeftRight, BarChart3, CreditCard, HandCoins, Home, Plus, Target, User, Wallet } from 'lucide-react';
import { AppView } from '../../types';
import { BottomNavigation } from './BottomNavigation';
import { PwaInstallPrompt } from '../pwa/PwaInstallPrompt';
import { AxisFinLogo } from '../shared/AxisFinLogo';

interface AppShellProps {
  currentView: AppView;
  reimbursementsEnabled: boolean;
  onNavigate: (view: AppView) => void;
  onAdd: () => void;
  children: React.ReactNode;
}

const desktopItems = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'transactions' as const, label: 'Transações', icon: ArrowLeftRight },
  { id: 'cards' as const, label: 'Cartões', icon: CreditCard },
  { id: 'accounts' as const, label: 'Contas', icon: Wallet },
  { id: 'goals' as const, label: 'Metas & Compromissos', icon: Target },
  { id: 'reports' as const, label: 'Relatórios', icon: BarChart3 },
  { id: 'reimbursements' as const, label: 'Reembolsos', icon: HandCoins },
  { id: 'profile' as const, label: 'Perfil', icon: User },
];

export function AppShell({ currentView, reimbursementsEnabled, onNavigate, onAdd, children }: AppShellProps) {
  const visibleDesktopItems = reimbursementsEnabled
    ? desktopItems
    : desktopItems.filter((item) => item.id !== 'reimbursements');

  return (
    <main className="app-viewport overflow-hidden bg-[#050608] text-[#E0E0E0] selection:bg-[#3B82F6] selection:text-white md:p-5 lg:p-6">
      <div className="app-safe-shell cosmic-bg relative w-full overflow-hidden bg-[#050608] md:grid md:h-[calc(100dvh-2.5rem)] md:grid-cols-[236px_minmax(0,1fr)] md:rounded-3xl md:border md:border-[#15171C] md:shadow-[0_25px_60px_rgba(0,0,0,0.9)] lg:h-[calc(100dvh-3rem)]">
        <aside className="hidden border-r border-white/8 bg-[#080A0F]/85 px-4 py-5 md:flex md:min-h-0 md:flex-col">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <AxisFinLogo showWordmark className="[&_svg]:h-9 [&_svg]:w-9 [&_span]:text-lg" />
          </div>
          <nav className="mt-7 flex flex-1 flex-col gap-1">
            {visibleDesktopItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition ${
                    isActive ? 'bg-sky-500/18 text-sky-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-black text-white shadow-lg shadow-sky-950/35 transition hover:bg-sky-400"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Novo lançamento</span>
          </button>
        </aside>
        <div className="relative mx-auto flex h-full min-h-0 w-full flex-col overflow-y-auto pb-24 md:pb-0">
          {children}
        </div>
        <div className="md:hidden">
          <PwaInstallPrompt />
          <BottomNavigation currentView={currentView} reimbursementsEnabled={reimbursementsEnabled} onNavigate={onNavigate} onAdd={onAdd} />
        </div>
      </div>
    </main>
  );
}
