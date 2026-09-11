import React, { useMemo, useState } from 'react';
import { AlertCircle, Archive, ArrowLeft, ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, Calendar, Check, CreditCard, Pencil, PiggyBank, Plus, RotateCcw, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { Account, Card, Category, ReserveBox, ReserveBoxMovement, Transaction } from '../../types';
import { formatCurrency, formatMonthLabel, getAccountMovementEntries, getCategoryName, getPaymentSource, shiftMonthKey } from '../../lib/utils/finance';
import { BankLogo } from '../shared/BankLogo';
import { readTransactionMeta } from '../../lib/utils/transactionMeta';
import { MonthNavigator } from '../shared/MonthNavigator';
import { CurrencyInput } from '../shared/CurrencyInput';
import { formatLocalDate } from '../../lib/utils/date';
import { formatCurrencyInput, parseCurrencyInput } from '../../lib/utils/currency';

interface AccountsViewProps {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  reserveBoxes: ReserveBox[];
  reserveBoxMovements: ReserveBoxMovement[];
  activeMonth: string;
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onUpdateAccountBalance: (account: Account, balance: number, date: string) => Promise<void>;
  onArchiveAccount: (account: Account) => void;
  onRestoreAccount: (account: Account) => void;
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

function getReserveBoxAccountAmount(movement: ReserveBoxMovement, accountId: string) {
  if (movement.accountId !== accountId) return 0;
  if (movement.type === 'deposit') return -movement.amount;
  if (movement.type === 'withdrawal') return movement.amount;
  return 0;
}

function formatDatePtBr(date: string) {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function AccountsView({
  accounts,
  cards,
  categories,
  transactions,
  reserveBoxes,
  reserveBoxMovements,
  activeMonth,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onUpdateAccountBalance,
  onArchiveAccount,
  onRestoreAccount,
  onOpenInvoice,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
}: AccountsViewProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [balanceAccount, setBalanceAccount] = useState<Account | null>(null);
  const activeAccounts = accounts.filter((account) => account.isActive);
  const archivedAccounts = accounts.filter((account) => !account.isActive);
  const visibleAccounts = showArchived ? archivedAccounts : activeAccounts;
  const totalBalance = activeAccounts.reduce((sum, account) => sum + account.balance, 0);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const accountMonthlySummaries = useMemo(() => {
    return visibleAccounts.map((account) => {
      const transactionEntries = transactions.flatMap((transaction) =>
        getAccountMovementEntries(transaction, account.id, cards)
          .filter((entry) => entry.month === activeMonth)
          .map((entry) => entry.amount),
      );
      const reserveEntries = reserveBoxMovements
        .filter((movement) => movement.date.startsWith(activeMonth))
        .map((movement) => getReserveBoxAccountAmount(movement, account.id))
        .filter((amount) => amount !== 0);
      const entries = [...transactionEntries, ...reserveEntries];
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
  }, [activeMonth, cards, reserveBoxMovements, transactions, visibleAccounts]);
  const monthlyInflow = accountMonthlySummaries.reduce((sum, item) => sum + item.inflow, 0);
  const monthlyOutflow = accountMonthlySummaries.reduce((sum, item) => sum + item.outflow, 0);
  const monthlyNet = monthlyInflow - monthlyOutflow;
  const monthlyMovementCount = accountMonthlySummaries.reduce((sum, item) => sum + item.count, 0);
  const accountCashEvolution = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const month = shiftMonthKey(activeMonth, index - 5);
      const entries = activeAccounts.flatMap((account) =>
        transactions.flatMap((transaction) =>
          getAccountMovementEntries(transaction, account.id, cards)
            .filter((entry) => entry.month === month)
            .map((entry) => entry.amount),
        ).concat(
          reserveBoxMovements
            .filter((movement) => movement.date.startsWith(month))
            .map((movement) => getReserveBoxAccountAmount(movement, account.id))
            .filter((amount) => amount !== 0),
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
  }, [activeAccounts, activeMonth, cards, reserveBoxMovements, transactions]);
  const previousCashNet = accountCashEvolution.at(-2)?.net ?? 0;
  const currentCashNet = accountCashEvolution.at(-1)?.net ?? 0;
  const cashTrendDelta = currentCashNet - previousCashNet;
  const cashTrendImproved = cashTrendDelta >= 0;
  const maxCashFlow = Math.max(1, ...accountCashEvolution.flatMap((item) => [item.inflow, item.outflow]));
  const selectedMovements = useMemo(() => {
    if (!selectedAccount) return [];
    const transactionMovements = transactions
      .filter((transaction) => isAccountTransaction(transaction, selectedAccount.id))
      .flatMap((transaction) =>
        getAccountMovementEntries(transaction, selectedAccount.id, cards)
          .filter((entry) => entry.month === activeMonth)
          .map((entry) => ({
            id: `${transaction.id}-${entry.month}-${entry.amount}`,
            date: transaction.date,
            description: transaction.description,
            detail: `${getCategoryName(categories, transaction.categoryId)} - ${getPaymentSource(accounts, cards, transaction)}`,
            signedAmount: entry.amount,
            transaction,
            type: transaction.flow,
          })),
      );
    const reserveMovements = reserveBoxMovements
      .map((movement) => ({
        movement,
        signedAmount: getReserveBoxAccountAmount(movement, selectedAccount.id),
      }))
      .filter(({ movement, signedAmount }) => signedAmount !== 0 && movement.date.startsWith(activeMonth))
      .map(({ movement, signedAmount }) => {
        const box = reserveBoxes.find((item) => item.id === movement.reserveBoxId);
        return {
          id: movement.id,
          date: movement.date,
          description: movement.type === 'deposit'
            ? `Aplicação em ${box?.name ?? 'caixinha'}`
            : `Resgate de ${box?.name ?? 'caixinha'}`,
          detail: movement.description ?? box?.institution ?? 'Caixinha',
          signedAmount,
          type: 'reserve' as const,
        };
      });

    return [...transactionMovements, ...reserveMovements]
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [accounts, activeMonth, cards, categories, reserveBoxes, reserveBoxMovements, selectedAccount, transactions]);
  const inflow = selectedMovements.reduce((sum, movement) => {
    return movement.signedAmount > 0 ? sum + movement.signedAmount : sum;
  }, 0);
  const outflow = Math.abs(selectedMovements.reduce((sum, movement) => {
    return movement.signedAmount < 0 ? sum + movement.signedAmount : sum;
  }, 0));

  return (
    <div className="premium-scroll app-page-gutters flex h-full min-h-0 flex-col overflow-y-auto pb-8 pt-7 text-white">
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
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-slate-200 transition hover:bg-white hover:text-black"
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
          <section className="premium-card mt-5 shrink-0 overflow-hidden rounded-2xl">
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
                <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold">
                  <span className="inline-flex items-center gap-1 text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Entrou</span>
                  <span className="inline-flex items-center gap-1 text-rose-300"><span className="h-2 w-2 rounded-full bg-rose-400" /> Saiu</span>
                </div>
                <div className="mt-3 flex h-28 items-end gap-2">
                  {accountCashEvolution.map((item) => {
                    const inflowHeight = Math.max(6, Math.round((item.inflow / maxCashFlow) * 80));
                    const outflowHeight = Math.max(6, Math.round((item.outflow / maxCashFlow) * 80));
                    return (
                      <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                        <div className="flex h-24 w-full items-end justify-center gap-1 rounded-lg bg-white/[0.03] px-1">
                          <div
                            className="w-full max-w-4 rounded-t-md bg-emerald-400"
                            style={{ height: inflowHeight }}
                            title={`${item.label} entrou: ${formatCurrency(item.inflow)}`}
                          />
                          <div
                            className="w-full max-w-4 rounded-t-md bg-rose-400"
                            style={{ height: outflowHeight }}
                            title={`${item.label} saiu: ${formatCurrency(item.outflow)}`}
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

          <section className="premium-scroll mt-5 min-h-[260px] flex-1 space-y-3 overflow-y-auto pb-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {showArchived ? 'Contas arquivadas' : 'Contas ativas'}
              </p>
              <button
                type="button"
                onClick={() => setShowArchived((current) => !current)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              >
                {showArchived ? 'Ver ativas' : `Arquivadas ${archivedAccounts.length}`}
              </button>
            </div>
            {visibleAccounts.length === 0 ? (
              <div className="premium-card-soft rounded-2xl border-dashed p-5 text-center">
                <Wallet size={22} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">{showArchived ? 'Nenhuma conta arquivada' : 'Nenhuma conta cadastrada'}</p>
                <p className="mt-1 text-xs text-slate-500">{showArchived ? 'Contas que você parar de usar aparecerão aqui.' : 'Adicione suas contas reais para o saldo do app nascer correto.'}</p>
              </div>
            ) : (
              accountMonthlySummaries.map(({ account, net, count }) => (
                <article
                  key={account.id}
                  className="cosmic-card cosmic-card-hover relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4"
                  style={{
                    borderColor: `${account.color}44`,
                    backgroundImage: `linear-gradient(135deg, ${account.color}18, transparent 58%)`,
                  }}
                >
                  <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: account.color }} />
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
                    <p className="mt-1 whitespace-nowrap text-[10px] text-slate-500">
                      Conferido {formatDatePtBr(account.lastBalanceUpdate)}
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
                        onClick={() => setBalanceAccount(account)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-emerald-300 transition hover:bg-emerald-500/20 hover:text-emerald-100"
                        title="Atualizar saldo"
                      >
                        <Wallet size={14} />
                      </button>
                      {account.isActive ? (
                        <button
                          type="button"
                          onClick={() => onArchiveAccount(account)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-amber-300 transition hover:bg-amber-500/20 hover:text-amber-100"
                          title="Arquivar conta"
                        >
                          <Archive size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRestoreAccount(account)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-emerald-300 transition hover:bg-emerald-500/20 hover:text-emerald-100"
                          title="Desarquivar conta"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
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
          <section className="premium-card mt-5 shrink-0 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo atual</p>
                <p className="mt-2 font-display text-3xl font-bold text-white">{formatCurrency(selectedAccount.balance)}</p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {accountTypeLabels[selectedAccount.type]} - {selectedAccount.institution} - conferido {formatDatePtBr(selectedAccount.lastBalanceUpdate)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceAccount(selectedAccount)}
                  className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-black transition hover:bg-slate-200"
                >
                  <Wallet size={15} />
                  Atualizar saldo
                </button>
                <BankLogo account={selectedAccount} />
              </div>
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

          <section className="premium-scroll mt-5 min-h-[260px] flex-1 space-y-3 overflow-y-auto pb-4">
            {selectedMovements.length === 0 ? (
              <div className="premium-card-soft rounded-2xl border-dashed p-5 text-center">
                <Wallet size={22} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">Sem movimentações nesta conta</p>
                <p className="mt-1 text-xs text-slate-500">Transações, transferências e caixinhas respeitam o mês selecionado no app.</p>
              </div>
            ) : (
              selectedMovements.map((movement) => {
                const meta = movement.transaction ? readTransactionMeta(movement.transaction.notes) : {};
                const isInvoicePayment = Boolean(meta.invoicePaymentCardId && meta.invoicePaymentPeriod);
                return (
                  <button
                    key={movement.id}
                    type="button"
                    onClick={isInvoicePayment
                      ? () => onOpenInvoice(meta.invoicePaymentCardId!, meta.invoicePaymentPeriod!)
                      : undefined}
                    disabled={!isInvoicePayment}
                    className={`cosmic-card flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                      isInvoicePayment
                        ? 'cursor-pointer border-violet-400/20 transition hover:border-violet-400/40 hover:bg-violet-500/[0.07]'
                        : 'cursor-default border-white/8'
                      }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${movement.signedAmount >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                      {isInvoicePayment ? <CreditCard size={17} /> : movement.type === 'transfer' ? <ArrowRightLeft size={17} /> : movement.type === 'reserve' ? <PiggyBank size={17} /> : movement.signedAmount >= 0 ? <ArrowDownToLine size={17} /> : <ArrowUpFromLine size={17} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{movement.description}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {movement.detail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`whitespace-nowrap font-mono text-sm font-bold ${movement.signedAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {movement.signedAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(movement.signedAmount))}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{movement.date.slice(8, 10)}/{movement.date.slice(5, 7)}</p>
                      {isInvoicePayment ? <p className="mt-1 text-[9px] font-bold text-violet-300">Abrir fatura</p> : null}
                    </div>
                  </button>
                );
              })
            )}
          </section>
        </>
      ) : null}

      {balanceAccount ? (
        <AccountBalanceModal
          account={balanceAccount}
          onClose={() => setBalanceAccount(null)}
          onSave={async (balance, date) => {
            await onUpdateAccountBalance(balanceAccount, balance, date);
            setBalanceAccount(null);
          }}
        />
      ) : null}
    </div>
  );
}

function AccountBalanceModal({
  account,
  onClose,
  onSave,
}: {
  account: Account;
  onClose: () => void;
  onSave: (balance: number, date: string) => Promise<void>;
}) {
  const [balance, setBalance] = useState(formatCurrencyInput(account.balance));
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const parsedBalance = parseCurrencyInput(balance);
  const difference = parsedBalance - account.balance;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (parsedBalance < 0) {
      setError('Informe um saldo válido.');
      return;
    }

    if (!date) {
      setError('Informe a data da conferência.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(parsedBalance, date);
    } catch {
      setError('Não foi possível atualizar o saldo. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <form onSubmit={handleSubmit} className="premium-card w-full max-w-md rounded-t-[28px] p-5 shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Conta corrente</p>
            <h2 className="truncate font-display text-lg font-bold text-white">Atualizar saldo</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertCircle size={16} />
            {error}
          </p>
        ) : null}

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <BankLogo account={account} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{account.name}</p>
              <p className="text-xs text-slate-500">{account.institution} - saldo atual {formatCurrency(account.balance)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Saldo real conferido
            <CurrencyInput value={balance} onChange={setBalance} />
          </label>

          <label className="grid gap-1 text-xs font-semibold text-slate-400">
            Data da conferência
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pr-11 text-white outline-none focus:border-sky-400"
              />
              <Calendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            </div>
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Diferença da conferência</p>
          <p className={`mt-1 font-mono text-sm font-bold ${difference >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {difference >= 0 ? '+' : '-'}{formatCurrency(Math.abs(difference))}
          </p>
          <p className="mt-1 text-xs text-slate-500">Isso atualiza só a conta corrente. Caixinhas e reservas continuam separadas.</p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black transition hover:bg-slate-200 disabled:opacity-60"
        >
          <Check size={18} />
          {isSaving ? 'Salvando...' : 'Salvar saldo'}
        </button>
      </form>
    </div>
  );
}
