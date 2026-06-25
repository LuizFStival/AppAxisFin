import React, { useMemo } from 'react';
import { ArrowLeft, ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { Account, Card, Category, Transaction } from '../../types';
import { formatCurrency, getAccountSignedAmount, getCategoryName, getPaymentSource, getMonthKey } from '../../lib/utils/finance';
import { BankLogo } from '../shared/BankLogo';

interface AccountsViewProps {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  activeMonth: string;
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
}

const accountTypeLabels: Record<Account['type'], string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  investment: 'Investimento',
};

function isAccountTransaction(transaction: Transaction, accountId: string) {
  return transaction.accountId === accountId || transaction.fromAccountId === accountId || transaction.toAccountId === accountId;
}

export function AccountsView({
  accounts,
  cards,
  categories,
  transactions,
  activeMonth,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
}: AccountsViewProps) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const selectedTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions
      .filter((transaction) => getMonthKey(transaction.date) === activeMonth && isAccountTransaction(transaction, selectedAccount.id))
      .filter((transaction) => getAccountSignedAmount(transaction, selectedAccount.id) !== 0)
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [activeMonth, selectedAccount, transactions]);
  const inflow = selectedTransactions.reduce((sum, transaction) => {
    const signedAmount = getAccountSignedAmount(transaction, selectedAccount?.id ?? '');
    return signedAmount > 0 ? sum + signedAmount : sum;
  }, 0);
  const outflow = Math.abs(selectedTransactions.reduce((sum, transaction) => {
    const signedAmount = getAccountSignedAmount(transaction, selectedAccount?.id ?? '');
    return signedAmount < 0 ? sum + signedAmount : sum;
  }, 0));

  return (
    <div className="flex h-full min-h-0 flex-col px-5 pb-6 pt-7 text-white">
      <header className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{selectedAccount ? 'Resumo da conta' : 'Contas'}</p>
          <h1 className="truncate font-display text-2xl font-bold text-white">{selectedAccount?.name ?? 'Minhas contas'}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selectedAccount ? (
            <button
              type="button"
              onClick={() => onSelectAccount('')}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              title="Voltar para contas"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAddAccount}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/15 text-sky-300 transition hover:bg-sky-500 hover:text-white"
            title="Adicionar conta"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {!selectedAccount ? (
        <>
          <section className="mt-5 shrink-0 rounded-2xl border border-white/8 bg-[#101319] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo total em contas</p>
            <p className="mt-2 font-display text-3xl font-bold text-white">{formatCurrency(totalBalance)}</p>
          </section>

          <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-center">
                <Wallet size={22} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma conta cadastrada</p>
                <p className="mt-1 text-xs text-slate-500">Adicione suas contas reais para o saldo do app nascer correto.</p>
              </div>
            ) : (
              accounts.map((account) => (
                <article key={account.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#101319] p-4">
                  <button type="button" onClick={() => onSelectAccount(account.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <BankLogo account={account} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{account.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {accountTypeLabels[account.type]} - {account.institution}
                      </p>
                    </div>
                  </button>
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
              ))
            )}
          </section>
        </>
      ) : null}

      {selectedAccount ? (
        <>
          <section className="mt-5 shrink-0 rounded-2xl border border-white/8 bg-[#101319] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo atual</p>
                <p className="mt-2 font-display text-3xl font-bold text-white">{formatCurrency(selectedAccount.balance)}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{accountTypeLabels[selectedAccount.type]} - {selectedAccount.institution}</p>
              </div>
              <BankLogo account={selectedAccount} />
            </div>
          </section>

          <section className="mt-4 grid shrink-0 grid-cols-3 gap-2">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3">
              <ArrowDownToLine size={16} className="text-emerald-300" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">Entradas</p>
              <p className="mt-1 font-mono text-xs font-bold text-white">{formatCurrency(inflow)}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-3">
              <ArrowUpFromLine size={16} className="text-rose-300" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-rose-200">Saídas</p>
              <p className="mt-1 font-mono text-xs font-bold text-white">{formatCurrency(outflow)}</p>
            </div>
            <div className="rounded-2xl border border-sky-400/15 bg-sky-500/10 p-3">
              <ArrowRightLeft size={16} className="text-sky-300" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-sky-200">Movimento</p>
              <p className="mt-1 font-mono text-xs font-bold text-white">{selectedTransactions.length}</p>
            </div>
          </section>

          <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
            {selectedTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-center">
                <Wallet size={22} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">Sem transações nesta conta</p>
                <p className="mt-1 text-xs text-slate-500">O resumo respeita o mês selecionado no app.</p>
              </div>
            ) : (
              selectedTransactions.map((transaction) => {
                const signedAmount = getAccountSignedAmount(transaction, selectedAccount.id);
                return (
                  <article key={transaction.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#101319] p-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${signedAmount >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                      {transaction.flow === 'transfer' ? <ArrowRightLeft size={17} /> : signedAmount >= 0 ? <ArrowDownToLine size={17} /> : <ArrowUpFromLine size={17} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{transaction.description}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {getCategoryName(categories, transaction.categoryId)} - {getPaymentSource(accounts, cards, transaction)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`whitespace-nowrap font-mono text-sm font-bold ${signedAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {signedAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(signedAmount))}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{transaction.date.slice(8, 10)}/{transaction.date.slice(5, 7)}</p>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
