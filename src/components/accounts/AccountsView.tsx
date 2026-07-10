import React, { useMemo } from 'react';
import { ArrowLeft, ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, CreditCard, Pencil, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Account, Card, Category, Transaction } from '../../types';
import { formatCurrency, formatMonthLabel, getAccountMovementEntries, getCategoryName, getPaymentSource, shiftMonthKey } from '../../lib/utils/finance';
import { BankLogo } from '../shared/BankLogo';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { MonthNavigator } from '../shared/MonthNavigator';

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
  onOpenInvoice: (cardId: string, period: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
}

const accountTypeLabels: Record<Account['type'], string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  investment: 'Investimento',
};

function isAccountTransaction(transaction: Transaction, accountId: string) {
  return transaction.accountId === accountId
    || transaction.fromAccountId === accountId
    || transaction.toAccountId === accountId
    || transaction.reimbursementReceivedAccountId === accountId;
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
  onOpenInvoice,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
}: AccountsViewProps) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const accountMonthlySummaries = useMemo(() => {
    return accounts.map((account) => {
      const entries = transactions.flatMap((transaction) =>
        getAccountMovementEntries(transaction, account.id, cards)
          .filter((entry) => entry.month === activeMonth)
          .map((entry) => entry.amount),
      );
      const monthlyInflow = entries.reduce((sum, amount) => amount > 0 ? sum + amount : sum, 0);
      const monthlyOutflow = Math.abs(entries.reduce((sum, amount) => amount < 0 ? sum + amount : sum, 0));

      return {
        account,
        inflow: monthlyInflow,
        outflow: monthlyOutflow,
        net: monthlyInflow - monthlyOutflow,
        count: entries.length,
      };
    });
  }, [accounts, activeMonth, cards, transactions]);
  const monthlyInflow = accountMonthlySummaries.reduce((sum, item) => sum + item.inflow, 0);
  const monthlyOutflow = accountMonthlySummaries.reduce((sum, item) => sum + item.outflow, 0);
  const monthlyNet = monthlyInflow - monthlyOutflow;
  const monthlyMovementCount = accountMonthlySummaries.reduce((sum, item) => sum + item.count, 0);
  const accountCashEvolution = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const month = shiftMonthKey(activeMonth, index - 5);
      const entries = accounts.flatMap((account) =>
        transactions.flatMap((transaction) =>
          getAccountMovementEntries(transaction, account.id, cards)
            .filter((entry) => entry.month === month)
            .map((entry) => entry.amount),
        ),
      );
      const inflow = entries.reduce((sum, amount) => amount > 0 ? sum + amount : sum, 0);
      const outflow = Math.abs(entries.reduce((sum, amount) => amount < 0 ? sum + amount : sum, 0));

      return {
        month,
        label: formatMonthLabel(month).slice(0, 3),
        inflow,
        outflow,
        net: inflow - outflow,
      };
    });
  }, [accounts, activeMonth, cards, transactions]);
  const previousCashNet = accountCashEvolution.at(-2)?.net ?? 0;
  const currentCashNet = accountCashEvolution.at(-1)?.net ?? 0;
  const cashTrendDelta = currentCashNet - previousCashNet;
  const cashTrendImproved = cashTrendDelta >= 0;
  const maxCashNet = Math.max(1, ...accountCashEvolution.map((item) => Math.abs(item.net)));
  const selectedMovements = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions
      .filter((transaction) => isAccountTransaction(transaction, selectedAccount.id))
      .flatMap((transaction) =>
        getAccountMovementEntries(transaction, selectedAccount.id, cards)
          .filter((entry) => entry.month === activeMonth)
          .map((entry) => ({ transaction, signedAmount: entry.amount })),
      )
      .sort((left, right) => right.transaction.date.localeCompare(left.transaction.date));
  }, [activeMonth, cards, selectedAccount, transactions]);
  const inflow = selectedMovements.reduce((sum, movement) => {
    return movement.signedAmount > 0 ? sum + movement.signedAmount : sum;
  }, 0);
  const outflow = Math.abs(selectedMovements.reduce((sum, movement) => {
    return movement.signedAmount < 0 ? sum + movement.signedAmount : sum;
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

      <MonthNavigator
        month={activeMonth}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onCurrentMonth={onCurrentMonth}
        className="mt-4 shrink-0"
      />

      {!selectedAccount ? (
        <>
          <section className="mt-5 shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-[#101319]">
            <div className="px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo atual em contas</p>
              <p className="mt-2 font-display text-3xl font-bold text-white">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="border-t border-white/8 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-300">Movimento de {formatMonthLabel(activeMonth)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{monthlyMovementCount} movimento{monthlyMovementCount === 1 ? '' : 's'} nas contas</p>
                </div>
                <p className={`font-mono text-base font-bold ${monthlyNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {monthlyNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyNet))}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200">Entrou</p>
                  <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrency(monthlyInflow)}</p>
                </div>
                <div className="rounded-xl border border-rose-400/15 bg-rose-500/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-200">Saiu</p>
                  <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrency(monthlyOutflow)}</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-white/8 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Tendencia de caixa</p>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      {cashTrendImproved ? 'Melhorou contra o mes anterior' : 'Piorou contra o mes anterior'}
                    </p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 font-mono text-xs font-bold ${cashTrendImproved ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {cashTrendImproved ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    {cashTrendDelta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(cashTrendDelta))}
                  </span>
                </div>
                <div className="mt-4 flex h-24 items-end gap-2">
                  {accountCashEvolution.map((item) => {
                    const height = Math.max(8, Math.round((Math.abs(item.net) / maxCashNet) * 76));
                    return (
                      <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                        <div className="flex h-20 w-full items-end justify-center rounded-lg bg-white/[0.03] px-1">
                          <div
                            className={`w-full max-w-8 rounded-t-md ${item.net >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                            style={{ height }}
                            title={`${item.label}: ${item.net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(item.net))}`}
                          />
                        </div>
                        <span className="truncate text-[9px] font-bold uppercase text-slate-500">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-center">
                <Wallet size={22} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma conta cadastrada</p>
                <p className="mt-1 text-xs text-slate-500">Adicione suas contas reais para o saldo do app nascer correto.</p>
              </div>
            ) : (
              accountMonthlySummaries.map(({ account, net, count }) => (
                <article key={account.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#101319] p-4">
                  <button type="button" onClick={() => onSelectAccount(account.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <BankLogo account={account} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{account.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {accountTypeLabels[account.type]} - {account.institution}
                      </p>
                      <p className={`mt-1 font-mono text-[11px] font-bold ${net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        Mês {net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(net))} • {count} mov.
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
              <p className="mt-1 font-mono text-xs font-bold text-white">{selectedMovements.length}</p>
            </div>
          </section>

          <section className="no-scrollbar mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
            {selectedMovements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-center">
                <Wallet size={22} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">Sem transações nesta conta</p>
                <p className="mt-1 text-xs text-slate-500">O resumo respeita o mês selecionado no app.</p>
              </div>
            ) : (
              selectedMovements.map(({ transaction, signedAmount }) => {
                const meta = readTransactionMeta(transaction.notes);
                const isInvoicePayment = Boolean(meta.invoicePaymentCardId && meta.invoicePaymentPeriod);
                return (
                  <button
                    key={`${transaction.id}-${signedAmount}`}
                    type="button"
                    onClick={isInvoicePayment
                      ? () => onOpenInvoice(meta.invoicePaymentCardId!, meta.invoicePaymentPeriod!)
                      : undefined}
                    disabled={!isInvoicePayment}
                    className={`flex w-full items-center gap-3 rounded-2xl border bg-[#101319] p-4 text-left ${
                      isInvoicePayment
                        ? 'cursor-pointer border-violet-400/20 transition hover:border-violet-400/40 hover:bg-violet-500/[0.07]'
                        : 'cursor-default border-white/8'
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${signedAmount >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                      {isInvoicePayment ? <CreditCard size={17} /> : transaction.flow === 'transfer' ? <ArrowRightLeft size={17} /> : signedAmount >= 0 ? <ArrowDownToLine size={17} /> : <ArrowUpFromLine size={17} />}
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
                      {isInvoicePayment ? <p className="mt-1 text-[9px] font-bold text-violet-300">Abrir fatura</p> : null}
                    </div>
                  </button>
                );
              })
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
