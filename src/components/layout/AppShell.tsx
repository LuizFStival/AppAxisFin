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
    <main className="app-viewport overflow-hidden bg-[#050505] text-[#E7E8EC] selection:bg-[#8B5CF6] selection:text-white md:p-4 lg:p-5">
      <a
        href="#main-content"
        className="skip-to-content sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
      >
        Pular para o conteudo
      </a>
      <div className="app-safe-shell cosmic-bg relative w-full overflow-hidden bg-[#050505] md:grid md:h-[calc(100dvh-2rem)] md:grid-cols-[236px_minmax(0,1fr)] md:rounded-[2rem] md:border md:border-white/10 md:shadow-[0_30px_80px_rgba(0,0,0,0.92)] lg:h-[calc(100dvh-2.5rem)]">
        <aside className="premium-scroll hidden overflow-y-auto border-r border-white/8 bg-black/25 px-4 py-5 backdrop-blur-xl md:flex md:min-h-0 md:flex-col">
          <div className="premium-card shrink-0 rounded-2xl px-3 py-3">
            <AxisFinLogo showWordmark className="[&_svg]:h-10 [&_svg]:w-10 [&_span]:text-lg [&_span]:tracking-tight" />
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="hidden"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Novo lanÃ§amento</span>
          </button>
          <nav className="mt-6 flex shrink-0 flex-col gap-1.5" aria-label="Navegacao principal">
            {visibleDesktopItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? 'premium-metal text-white shadow-[0_14px_30px_-22px_rgba(139,92,246,0.7)]'
                      : 'text-slate-400 hover:bg-white/[0.055] hover:text-white'
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
            className="mb-4 mt-auto flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-black shadow-[0_16px_40px_-26px_rgba(255,255,255,0.72)] transition hover:bg-slate-200"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Novo lançamento</span>
          </button>
        </aside>
        <div
          id="main-content"
          tabIndex={-1}
          className="relative flex h-full min-h-0 w-full flex-col overflow-hidden pb-24 outline-none md:pb-0"
        >
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
