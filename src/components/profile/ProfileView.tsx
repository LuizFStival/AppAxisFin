import React from 'react';
import { BarChart3, Bell, ChevronRight, CircleHelp, CreditCard, Database, Download, LogOut, Pencil, Plus, Shield, Tags, Trash2, UserRound } from 'lucide-react';
import { Card, Category, UserProfile } from '../../types';

interface ProfileViewProps {
  user: UserProfile;
  cards: Card[];
  categories: Category[];
  onViewReports: () => void;
  onAddCard: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onReset: () => void;
  onSignOut: () => void;
}

const settings = [
  { label: 'Preferências da conta', icon: UserRound },
  { label: 'Notificações', icon: Bell },
  { label: 'Segurança e privacidade', icon: Shield },
  { label: 'Ajuda', icon: CircleHelp },
];

export function ProfileView({
  user,
  cards,
  categories,
  onViewReports,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onReset,
  onSignOut,
}: ProfileViewProps) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="px-4 pt-7 md:px-8 md:pt-8">
      <header>
        <p className="text-sm text-slate-400">Conta</p>
        <h1 className="font-display text-2xl font-bold text-white">Configurações</h1>
      </header>

      <section className="mt-5 flex items-center gap-4 rounded-[24px] border border-white/8 bg-[#101319] p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-display text-xl font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold text-white">{user.name}</p>
          <p className="truncate text-sm text-slate-400">{user.email}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-300">{user.plan}</p>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-white/8 bg-[#101319] p-2">
        {settings.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" className="flex h-14 w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/5">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sky-300">
                  <Icon size={17} />
                </span>
                {item.label}
              </span>
              <ChevronRight size={17} className="text-slate-600" />
            </button>
          );
        })}
        <button type="button" onClick={onViewReports} className="flex h-14 w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/5">
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-violet-300">
              <BarChart3 size={17} />
            </span>
            Relatórios
          </span>
          <ChevronRight size={17} className="text-slate-600" />
        </button>
      </section>

      <section className="mt-5 rounded-[24px] border border-white/8 bg-[#101319] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Financeiro</p>
            <h2 className="font-display text-lg font-bold text-white">Cartões</h2>
            <p className="mt-0.5 text-xs text-slate-500">Edite ou exclua cartões cadastrados.</p>
          </div>
          <button
            type="button"
            onClick={onAddCard}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300"
            aria-label="Adicionar cartão"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: card.color }}>
                  <CreditCard size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{card.name}</p>
                  <p className="text-xs text-slate-500">Fecha dia {card.closingDay} · vence dia {card.dueDay}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditCard(card)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label={`Editar cartão ${card.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCard(card)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-300 hover:bg-rose-500/10"
                  aria-label={`Excluir cartão ${card.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-white/8 bg-[#101319] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Organização</p>
            <h2 className="font-display text-lg font-bold text-white">Categorias</h2>
            <p className="mt-0.5 text-xs text-slate-500">Edite ou exclua categorias do app.</p>
          </div>
          <button
            type="button"
            onClick={onAddCategory}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300"
            aria-label="Adicionar categoria"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: category.color }}>
                  <Tags size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{category.name}</p>
                  <p className="text-xs text-slate-500">{category.flow === 'expense' ? 'Despesa' : 'Receita'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditCategory(category)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label={`Editar categoria ${category.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCategory(category)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-300 hover:bg-rose-500/10"
                  aria-label={`Excluir categoria ${category.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 font-bold text-slate-200">
          <Download size={17} />
          Exportar dados
        </button>
        <button type="button" onClick={onReset} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 font-bold text-rose-200">
          <Database size={17} />
          Restaurar demo
        </button>
      </section>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0F1116] font-bold text-slate-200 hover:bg-white/5"
      >
        <LogOut size={17} />
        Sair da conta
      </button>
    </div>
  );
}
