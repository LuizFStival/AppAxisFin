import React, { useState } from 'react';
import { Bell, CreditCard, Database, Download, Eye, EyeOff, LogOut, Pencil, Plus, Tags, Trash2, Wallet } from 'lucide-react';
import { Account, Card, Category, UserProfile } from '../../types';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';

interface ProfileViewProps {
  user: UserProfile;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  showBalances: boolean;
  onToggleBalances: () => void;
  onUpdateProfile: (input: { name: string }) => Promise<void>;
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
  onAddCard: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onReset: () => void;
  onSignOut: () => void;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function ProfileView({
  user,
  accounts,
  cards,
  categories,
  showBalances,
  onToggleBalances,
  onUpdateProfile,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onReset,
  onSignOut,
}: ProfileViewProps) {
  const initials = getInitials(user.name);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileMessage, setProfileMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileMessage('');
    setIsSavingProfile(true);

    try {
      const trimmedName = profileName.trim();
      if (!trimmedName) throw new Error('Informe um nome para o perfil.');
      await onUpdateProfile({ name: trimmedName });
      setProfileMessage('Perfil atualizado.');
      setIsEditingProfile(false);
    } catch (error) {
      setProfileMessage(getUserFriendlyError(error, 'Não foi possível atualizar o perfil. Tente novamente.'));
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div className="px-4 pt-7 md:px-8 md:pt-8">
      <header>
        <p className="text-sm text-slate-400">Conta</p>
        <h1 className="font-display text-2xl font-bold text-white">Perfil</h1>
      </header>

      <section className="mt-5 rounded-[24px] border border-white/8 bg-[#101319] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-display text-xl font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-bold text-white">{user.name}</p>
            <p className="truncate text-sm text-slate-400">{user.email}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">{user.plan}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setProfileMessage('');
              setProfileName(user.name);
              setIsEditingProfile((value) => !value);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20"
            aria-label="Editar perfil"
          >
            <Pencil size={17} />
          </button>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="mt-5 grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <label className="block text-xs font-semibold text-slate-400">
              Nome no app
              <input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-[#0A0B0E] px-3 text-sm font-semibold text-white outline-none focus:border-sky-400"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              Email de acesso
              <input
                value={user.email}
                disabled
                className="mt-1 h-11 w-full cursor-not-allowed rounded-2xl border border-white/8 bg-white/[0.02] px-3 text-sm text-slate-500 outline-none"
              />
            </label>
            {profileMessage ? <p className="text-xs font-semibold text-slate-400">{profileMessage}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setProfileMessage('');
                  setProfileName(user.name);
                  setIsEditingProfile(false);
                }}
                className="h-11 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="h-11 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingProfile ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
          <span className="flex items-center gap-3 text-sm font-semibold text-slate-500">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-500">
              <Bell size={17} />
            </span>
            Notificacoes
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Em breve
          </span>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-white/8 bg-[#101319] p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Preferencias</p>
          <h2 className="font-display text-lg font-bold text-white">Uso do app</h2>
        </div>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={onToggleBalances}
            className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-sky-300">
                {showBalances ? <Eye size={17} /> : <EyeOff size={17} />}
              </span>
              Mostrar valores financeiros
            </span>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${showBalances ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-slate-500'}`}>
              {showBalances ? 'Ativo' : 'Oculto'}
            </span>
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-white/8 bg-[#101319] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Ajustes do app</p>
            <h2 className="font-display text-lg font-bold text-white">Minhas contas</h2>
          </div>
          <button
            type="button"
            onClick={onAddAccount}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 transition hover:bg-emerald-500/20"
            aria-label="Adicionar conta"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {accounts.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-500">
              Nenhuma conta cadastrada.
            </p>
          ) : null}

          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: account.color }}>
                  <Wallet size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{account.name}</p>
                  <p className="text-xs text-slate-500">{account.institution || account.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditAccount(account)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label={`Editar conta ${account.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteAccount(account)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-300 hover:bg-rose-500/10"
                  aria-label={`Excluir conta ${account.name}`}
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
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Ajustes do app</p>
            <h2 className="font-display text-lg font-bold text-white">Meus cartoes</h2>
          </div>
          <button
            type="button"
            onClick={onAddCard}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300 transition hover:bg-violet-500/20"
            aria-label="Adicionar cartao"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {cards.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-500">
              Nenhum cartao cadastrado.
            </p>
          ) : null}

          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: card.color }}>
                  <CreditCard size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{card.name}</p>
                  <p className="text-xs text-slate-500">Fecha dia {card.closingDay} - vence dia {card.dueDay}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEditCard(card)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label={`Editar cartao ${card.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCard(card)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-300 hover:bg-rose-500/10"
                  aria-label={`Excluir cartao ${card.name}`}
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
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Ajustes do app</p>
            <h2 className="font-display text-lg font-bold text-white">Minhas categorias</h2>
          </div>
          <button
            type="button"
            onClick={onAddCategory}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20"
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
