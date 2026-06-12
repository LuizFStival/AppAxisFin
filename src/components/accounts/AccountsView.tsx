import React from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { Account } from '../../types';
import { formatCurrency } from '../../lib/utils/finance';
import { BankLogo } from '../shared/BankLogo';

interface AccountsViewProps {
  accounts: Account[];
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
}

const accountTypeLabels: Record<Account['type'], string> = {
  checking: 'Conta corrente',
  savings: 'Poupanca',
  cash: 'Dinheiro',
  investment: 'Investimento',
};

export function AccountsView({ accounts, onAddAccount, onEditAccount, onDeleteAccount }: AccountsViewProps) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-7 text-white">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Contas</p>
          <h1 className="font-display text-2xl font-bold text-white">Minhas contas</h1>
        </div>
        <button
          type="button"
          onClick={onAddAccount}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/15 text-sky-300 transition hover:bg-sky-500 hover:text-white"
          title="Adicionar conta"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </header>

      <section className="mt-5 rounded-2xl border border-white/8 bg-[#101319] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo total em contas</p>
        <p className="mt-2 font-display text-3xl font-bold text-white">{formatCurrency(totalBalance)}</p>
      </section>

      <section className="mt-5 space-y-3">
        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-center">
            <Wallet size={22} className="mx-auto mb-2 text-slate-500" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma conta cadastrada</p>
            <p className="mt-1 text-xs text-slate-500">Adicione suas contas reais para o saldo do app nascer correto.</p>
          </div>
        ) : (
          accounts.map((account) => {
            return (
              <article key={account.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#101319] p-4">
                <BankLogo account={account} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{account.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {accountTypeLabels[account.type]} - {account.institution}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="whitespace-nowrap font-mono text-sm font-bold text-white">
                    {formatCurrency(account.balance)}
                  </p>
                  <div className="mt-2 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditAccount(account)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-sky-500/20 hover:text-sky-200"
                      title="Editar conta"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAccount(account)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-100"
                      title="Excluir conta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
