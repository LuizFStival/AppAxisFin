import React from 'react';
import { AppView } from '../../types';
import { BottomNavigation } from './BottomNavigation';

interface AppShellProps {
  currentView: AppView;
  reimbursementsEnabled: boolean;
  onNavigate: (view: AppView) => void;
  onAdd: () => void;
  children: React.ReactNode;
}

export function AppShell({ currentView, reimbursementsEnabled, onNavigate, onAdd, children }: AppShellProps) {
  const contentScrollClass = currentView === 'transactions' || currentView === 'cards' || currentView === 'reimbursements' || currentView === 'goals' ? 'overflow-hidden' : 'overflow-y-auto';

  return (
    <main className="h-screen overflow-hidden bg-[#050608] text-[#E0E0E0] selection:bg-[#3B82F6] selection:text-white md:flex md:items-center md:justify-center md:p-6">
      <div className="cosmic-bg relative h-screen w-full overflow-hidden bg-[#050608] md:h-[860px] md:max-w-[430px] md:rounded-[34px] md:border md:border-[#15171C] md:shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
        <div className={`relative mx-auto flex h-full min-h-0 w-full flex-col pb-24 ${contentScrollClass}`}>
          {children}
        </div>
        <BottomNavigation currentView={currentView} reimbursementsEnabled={reimbursementsEnabled} onNavigate={onNavigate} onAdd={onAdd} />
      </div>
    </main>
  );
}
