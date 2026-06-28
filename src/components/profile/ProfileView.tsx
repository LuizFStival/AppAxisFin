import React, { useState } from 'react';
import { Bell, Check, CreditCard, Database, Download, Eye, EyeOff, HandCoins, LogOut, Pencil, Plus, Tags, Trash2, Wallet, X } from 'lucide-react';
import { Account, Card, Category, Transaction, UserProfile } from '../../types';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';
import { getCategoryName, getCurrentMonthKey, getFinancialMonthKey, getPaymentSource } from '../../lib/utils/finance';
import { getVisibleNotes } from '../../lib/utils/transactionMeta';

interface ProfileViewProps {
  user: UserProfile;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  showBalances: boolean;
  onToggleBalances: () => void;
  onUpdateProfile: (input: { name: string }) => Promise<void>;
  onUpdateReimbursementsEnabled: (enabled: boolean) => Promise<void>;
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
  onAddCard: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
  onAddCategory: (flow: Category['flow']) => void;
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

function escapeCsvCell(value: string | number | undefined) {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function ProfileView({
  user,
  accounts,
  cards,
  categories,
  transactions,
  showBalances,
  onToggleBalances,
  onUpdateProfile,
  onUpdateReimbursementsEnabled,
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
  const [isSavingReimbursements, setIsSavingReimbursements] = useState(false);
  const [categoryFlow, setCategoryFlow] = useState<Category['flow']>('expense');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [exportMonth, setExportMonth] = useState(getCurrentMonthKey());
  const [exportYear, setExportYear] = useState(() => getCurrentMonthKey().slice(0, 4));
  const visibleCategories = categories.filter((category) => category.flow === categoryFlow);
  const incomeCategoryCount = categories.filter((category) => category.flow === 'income').length;
  const expenseCategoryCount = categories.filter((category) => category.flow === 'expense').length;
  const availableYears = Array.from(new Set([
    getCurrentMonthKey().slice(0, 4),
    ...transactions.map((transaction) => getFinancialMonthKey(transaction).slice(0, 4)),
  ])).sort().reverse();

  function handleExportData() {
    const periodKey = exportPeriod === 'monthly' ? exportMonth : exportYear;
    const exportedTransactions = transactions
      .filter((transaction) => {
        const transactionMonth = getFinancialMonthKey(transaction);
        return exportPeriod === 'monthly'
          ? transactionMonth === exportMonth
          : transactionMonth.startsWith(`${exportYear}-`);
      })
      .sort((left, right) => left.date.localeCompare(right.date));

    const headers = [
      'Data',
      'Descrição',
      'Tipo',
      'Status',
      'Valor',
      'Categoria',
      'Conta ou cartão',
      'Reembolsável',
      'Status do reembolso',
      'Projetado',
      'Observações',
    ];
    const rows = exportedTransactions.map((transaction) => [
      transaction.date,
      transaction.description,
      transaction.flow === 'income' ? 'Entrada' : transaction.flow === 'expense' ? 'Despesa' : 'Transferência',
      transaction.status === 'paid' ? 'Confirmado' : 'Pendente',
      transaction.amount.toFixed(2).replace('.', ','),
      getCategoryName(categories, transaction.categoryId),
      getPaymentSource(accounts, cards, transaction),
      transaction.isReimbursable ? 'Sim' : 'Não',
      transaction.isReimbursable
        ? transaction.reimbursementStatus === 'received' ? 'Recebido' : 'Pendente'
        : '',
      transaction.isProjected ? 'Sim' : 'Não',
      getVisibleNotes(transaction.notes),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(';'))
      .join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `axisfin-${periodKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  }


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

  async function handleToggleReimbursements() {
    setProfileMessage('');
    setIsSavingReimbursements(true);
    try {
      await onUpdateReimbursementsEnabled(!user.reimbursementsEnabled);
      setProfileMessage(`Reembolsos ${user.reimbursementsEnabled ? 'desativados' : 'ativados'}.`);
    } catch (error) {
      setProfileMessage(getUserFriendlyError(error, 'Não foi possível alterar o recurso de reembolsos.'));
    } finally {
      setIsSavingReimbursements(false);
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
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Preferências</p>
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
          <button
            type="button"
            onClick={() => void handleToggleReimbursements()}
            disabled={isSavingReimbursements}
            className="flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-60"
            title="Habilitar ou desabilitar reembolsos e gastos de terceiros"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${user.reimbursementsEnabled ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-slate-500'}`}>
                <HandCoins size={17} />
              </span>
              <span className="truncate">Reembolsos e terceiros</span>
            </span>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
              user.reimbursementsEnabled
                ? 'border-emerald-400/15 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-white/5 text-slate-500'
            }`}>
              {isSavingReimbursements ? 'Salvando' : user.reimbursementsEnabled ? 'Ativo' : 'Inativo'}
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
            aria-label="Adicionar cartão"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {cards.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-500">
              Nenhum cartão cadastrado.
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
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Ajustes do app</p>
            <h2 className="font-display text-lg font-bold text-white">Minhas categorias</h2>
          </div>
          <button
            type="button"
            onClick={() => onAddCategory(categoryFlow)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20"
            aria-label="Adicionar categoria"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/8 bg-black/20 p-1" role="tablist" aria-label="Tipo de categoria">
          <button
            type="button"
            role="tab"
            aria-selected={categoryFlow === 'income'}
            onClick={() => setCategoryFlow('income')}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              categoryFlow === 'income'
                ? 'bg-emerald-500/15 text-emerald-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Entradas <span className="ml-1 text-xs opacity-70">{incomeCategoryCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={categoryFlow === 'expense'}
            onClick={() => setCategoryFlow('expense')}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              categoryFlow === 'expense'
                ? 'bg-rose-500/15 text-rose-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Despesas <span className="ml-1 text-xs opacity-70">{expenseCategoryCount}</span>
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {visibleCategories.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-500">
              Nenhuma categoria de {categoryFlow === 'income' ? 'entrada' : 'despesa'} cadastrada.
            </p>
          ) : null}

          {visibleCategories.map((category) => (
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
        <button type="button" onClick={() => setIsExportOpen(true)} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 font-bold text-slate-200">
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

      {isExportOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="export-title" className="w-full max-w-lg rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 shadow-2xl sm:rounded-[28px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Exportação CSV</p>
                <h2 id="export-title" className="mt-1 font-display text-lg font-bold text-white">Exportar dados</h2>
              </div>
              <button type="button" onClick={() => setIsExportOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400" aria-label="Fechar exportação">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 rounded-2xl border border-white/8 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setExportPeriod('monthly')}
                className={`h-11 rounded-xl text-sm font-bold transition ${exportPeriod === 'monthly' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setExportPeriod('annual')}
                className={`h-11 rounded-xl text-sm font-bold transition ${exportPeriod === 'annual' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                Anual
              </button>
            </div>

            <label className="mt-4 grid gap-1.5 text-xs font-semibold text-slate-400">
              {exportPeriod === 'monthly' ? 'Mês da exportação' : 'Ano da exportação'}
              {exportPeriod === 'monthly' ? (
                <input type="month" value={exportMonth} onChange={(event) => setExportMonth(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" />
              ) : (
                <select value={exportYear} onChange={(event) => setExportYear(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400">
                  {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              )}
            </label>

            <p className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-500">
              O arquivo inclui lançamentos confirmados, pendentes e projetados, além de categorias, origem e reembolsos.
            </p>

            <button type="button" onClick={handleExportData} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-bold text-white">
              <Check size={18} />
              Baixar CSV
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
