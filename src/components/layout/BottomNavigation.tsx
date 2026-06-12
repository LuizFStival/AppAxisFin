import React from 'react';
import { ArrowLeftRight, BarChart3, Home, Plus, User } from 'lucide-react';
import { AppView } from '../../types';

interface BottomNavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onAdd: () => void;
}

const items = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'transactions' as const, label: 'Transacoes', icon: ArrowLeftRight },
  { id: 'reports' as const, label: 'Relatorios', icon: BarChart3 },
  { id: 'profile' as const, label: 'Perfil', icon: User },
];

export function BottomNavigation({ currentView, onNavigate, onAdd }: BottomNavigationProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-[72px] border-t border-[#1A1C22] bg-[#0A0B0E]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:absolute md:rounded-b-[34px]">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex h-12 flex-col items-center justify-center rounded-full transition ${
                isActive ? 'text-[#3B82F6]' : 'text-gray-500 hover:text-gray-300'
              }`}
              title={item.label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAdd}
          className="mx-auto flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] text-white shadow-lg shadow-[#3B82F6]/30 transition hover:rotate-90 hover:scale-105 active:scale-95"
          aria-label="Adicionar lancamento"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        {items.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex h-12 flex-col items-center justify-center rounded-full transition ${
                isActive ? 'text-[#3B82F6]' : 'text-gray-500 hover:text-gray-300'
              }`}
              title={item.label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </div>
      <div className="absolute bottom-1 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/20" />
    </nav>
  );
}
