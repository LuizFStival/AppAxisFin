import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarCheck2, CheckCircle2, Clock3, CreditCard, HandCoins, ListChecks, ReceiptText, WalletCards } from 'lucide-react';
import { Account, Card, DashboardSummary, ReimbursementPerson, Transaction } from '../../types';
import {
  formatCurrency,
  formatMonthLabel,
  getCardInvoiceTransactions,
  getPendingInvoiceSummaries,
  getTransactionCompetenceMonth,
  getTransactionReimbursementAmount,
  isPendingAccountExpense,
  roundMoney,
} from '../../lib/utils/finance';
import { formatDatePtBr, formatLocalDate, parseLocalDate } from '../../lib/utils/date';
import { getReimbursementDueDate, getReimbursementMonthKey, isReimbursementOverdue } from '../../lib/utils/reimbursements';
import { MonthNavigator } from '../shared/MonthNavigator';
import { CardInvoiceActions } from '../cards/CardInvoiceActions';

interface MonthCenterViewProps {
  accounts: Account[];
  cards: Card[];
  people: ReimbursementPerson[];
  transactions: Transaction[];
  activeMonth: string;
  summary: DashboardSummary;
  reimbursementsEnabled: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onOpenCards: (cardId?: string) => void;
  onOpenTransactions: () => void;
  onOpenReimbursements: (personId?: string) => void;
  onPayInvoice: (input: { card: Card; accountId: string; paymentDate: string; amount: number; transactions: Transaction[] }) => Promise<void>;
  onMarkReimbursementReceived: (transaction: Transaction, accountId: string) => void | Promise<void>;
}

type CenterTab = 'payments' | 'closing';

function daysBetween(date: string, today: string) {
  return Math.round((parseLocalDate(date).getTime() - parseLocalDate(today).getTime()) / 86400000);
}

function getPersonName(people: ReimbursementPerson[], personId?: string) {
  return people.find((person) => person.id === personId)?.name ?? 'Pessoa removida';
}

function dueBadge(dueDate: string, today: string) {
  const days = daysBetween(dueDate, today);
  if (days < 0) return { label: `${Math.abs(days)} dia${days === -1 ? '' : 's'} atrasado`, className: 'border-rose-400/20 bg-rose-500/15 text-rose-100' };
  if (days === 0) return { label: 'vence hoje', className: 'border-amber-300/25 bg-amber-400/15 text-amber-100' };
  if (days <= 3) return { label: `vence em ${days} dias`, className: 'border-amber-300/25 bg-amber-400/15 text-amber-100' };
  return { label: `vence em ${formatDatePtBr(dueDate)}`, className: 'border-white/10 bg-white/5 text-slate-300' };
}

export function MonthCenterView({
  accounts,
  cards,
  people,
  transactions,
  activeMonth,
  summary,
  reimbursementsEnabled,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onOpenCards,
  onOpenTransactions,
  onOpenReimbursements,
  onPayInvoice,
  onMarkReimbursementReceived,
}: MonthCenterViewProps) {
  const [tab, setTab] = useState<CenterTab>('payments');
  const [receivingTransaction, setReceivingTransaction] = useState<Transaction | null>(null);
  const [receivingAccountId, setReceivingAccountId] = useState('');
  const today = formatLocalDate(new Date());

  const pendingInvoices = useMemo(() => (
    getPendingInvoiceSummaries(cards, transactions, activeMonth)
      .sort((left, right) => left.invoice.dueDate.localeCompare(right.invoice.dueDate))
  ), [activeMonth, cards, transactions]);

  const pendingAccountExpenses = useMemo(() => (
    transactions
      .filter((transaction) => isPendingAccountExpense(transaction, activeMonth))
      .sort((left, right) => left.date.localeCompare(right.date))
  ), [activeMonth, transactions]);

  const pendingReimbursements = useMemo(() => (
    transactions
      .filter((transaction) => transaction.isReimbursable && transaction.reimbursementStatus !== 'received')
      .filter((transaction) => getReimbursementMonthKey(transaction, cards) <= activeMonth)
      .sort((left, right) => {
        const leftDue = getReimbursementDueDate(left, cards) ?? left.date;
        const rightDue = getReimbursementDueDate(right, cards) ?? right.date;
        return leftDue.localeCompare(rightDue);
      })
  ), [activeMonth, cards, transactions]);

  const reimbursementPeopleSummaries = useMemo(() => {
    const summaries = new Map<string, {
      personId?: string;
      personName: string;
      total: number;
      count: number;
      overdueCount: number;
      oldestDueDate?: string;
      hasPreviousMonth: boolean;
    }>();

    pendingReimbursements.forEach((transaction) => {
      const key = transaction.reimbursementPersonId ?? 'unknown';
      const dueDate = getReimbursementDueDate(transaction, cards) ?? transaction.date;
      const current = summaries.get(key) ?? {
        personId: transaction.reimbursementPersonId,
        personName: getPersonName(people, transaction.reimbursementPersonId),
        total: 0,
        count: 0,
        overdueCount: 0,
        oldestDueDate: undefined,
        hasPreviousMonth: false,
      };

      current.total = roundMoney(current.total + getTransactionReimbursementAmount(transaction));
      current.count += 1;
      if (isReimbursementOverdue(transaction, cards, today)) current.overdueCount += 1;
      if (!current.oldestDueDate || dueDate < current.oldestDueDate) current.oldestDueDate = dueDate;
      if (getReimbursementMonthKey(transaction, cards) < activeMonth) current.hasPreviousMonth = true;
      summaries.set(key, current);
    });

    return Array.from(summaries.values()).sort((left, right) => {
      if (left.overdueCount !== right.overdueCount) return right.overdueCount - left.overdueCount;
      return right.total - left.total;
    });
  }, [activeMonth, cards, pendingReimbursements, people, today]);

  const invoiceTotal = roundMoney(pendingInvoices.reduce((sum, item) => sum + item.total, 0));
  const accountExpenseTotal = roundMoney(pendingAccountExpenses.reduce((sum, item) => sum + item.amount, 0));
  const reimbursementTotal = roundMoney(pendingReimbursements.reduce((sum, item) => sum + getTransactionReimbursementAmount(item), 0));
  const availableBalance = roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0));
  const totalToPay = roundMoney(invoiceTotal + accountExpenseTotal);
  const balanceAfterPayments = roundMoney(availableBalance - totalToPay);
  const monthTransactions = transactions.filter((transaction) => getTransactionCompetenceMonth(transaction, cards) === activeMonth);
  const oldPendingReimbursements = pendingReimbursements.filter((transaction) => getReimbursementMonthKey(transaction, cards) < activeMonth);
  const overdueReimbursements = pendingReimbursements.filter((transaction) => isReimbursementOverdue(transaction, cards, today));
  const paidInvoices = cards.length - pendingInvoices.length;

  const closingItems = [
    {
      id: 'invoices',
      done: pendingInvoices.length === 0,
      title: 'Faturas do mês',
      detail: pendingInvoices.length === 0 ? 'Todas as faturas com lançamento ativo estão quitadas.' : `${pendingInvoices.length} fatura${pendingInvoices.length === 1 ? '' : 's'} ainda em aberto.`,
      action: 'Ver cartões',
      onClick: () => onOpenCards(),
    },
    {
      id: 'account-expenses',
      done: pendingAccountExpenses.length === 0,
      title: 'Despesas fora do cartão',
      detail: pendingAccountExpenses.length === 0 ? 'Nenhuma despesa de conta pendente neste mês.' : `${pendingAccountExpenses.length} despesa${pendingAccountExpenses.length === 1 ? '' : 's'} pendente${pendingAccountExpenses.length === 1 ? '' : 's'} para resolver.`,
      action: 'Ver transações',
      onClick: onOpenTransactions,
    },
    {
      id: 'reimbursements',
      done: !reimbursementsEnabled || pendingReimbursements.length === 0,
      title: 'Reembolsos e terceiros',
      detail: !reimbursementsEnabled
        ? 'Reembolsos desativados no perfil.'
        : pendingReimbursements.length === 0
          ? 'Nada pendente de terceiros.'
          : `${formatCurrency(reimbursementTotal)} ainda a receber. ${oldPendingReimbursements.length > 0 ? 'Há pendências de meses anteriores.' : 'Você pode receber ou manter em acompanhamento.'}`,
      action: 'Ver reembolsos',
      onClick: () => onOpenReimbursements(),
    },
    {
      id: 'review',
      done: monthTransactions.length > 0,
      title: 'Lançamentos revisados',
      detail: monthTransactions.length > 0 ? `${monthTransactions.length} lançamento${monthTransactions.length === 1 ? '' : 's'} encontrado${monthTransactions.length === 1 ? '' : 's'} no mês.` : 'Ainda não há lançamentos neste mês para conferir.',
      action: 'Ver transações',
      onClick: onOpenTransactions,
    },
  ];

  const canCloseMonth = closingItems.every((item) => item.done);

  return (
    <div className="premium-scroll app-page-gutters flex h-full min-h-0 flex-col overflow-y-auto pb-8 pt-4 text-white md:pt-6">
      <header className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200/60">Central do mês</p>
        <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight text-white">Pagamentos e fechamento</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">Veja o que precisa sair da conta, o que falta receber de terceiros e se o mês já pode ser encerrado.</p>
          </div>
          <MonthNavigator month={activeMonth} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} onCurrentMonth={onCurrentMonth} className="lg:w-[360px]" />
        </div>
      </header>

      <section className="mt-4 grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="premium-card rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preciso pagar</p>
          <p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(totalToPay)}</p>
          <p className="mt-1 text-xs text-slate-500">{pendingInvoices.length} fatura(s) + {pendingAccountExpenses.length} conta(s)</p>
        </div>
        <div className="premium-card rounded-2xl border-amber-400/15 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100/80">A receber</p>
          <p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(reimbursementTotal)}</p>
          <p className="mt-1 text-xs text-slate-500">{pendingReimbursements.length} reembolso(s) pendente(s)</p>
        </div>
        <div className={`premium-card rounded-2xl p-4 ${balanceAfterPayments < 0 ? 'border-rose-400/20' : 'border-emerald-400/15'}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo após pagar</p>
          <p className={`mt-2 font-display text-2xl font-black ${balanceAfterPayments < 0 ? 'text-rose-200' : 'text-white'}`}>{formatCurrency(balanceAfterPayments)}</p>
          <p className="mt-1 text-xs text-slate-500">saldo atual {formatCurrency(availableBalance)}</p>
        </div>
        <div className="premium-card rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-100/80">Resultado do mês</p>
          <p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(summary.income - summary.expenses)}</p>
          <p className="mt-1 text-xs text-slate-500">{formatMonthLabel(activeMonth)}</p>
        </div>
      </section>

      <div className="premium-card-soft mt-4 grid shrink-0 grid-cols-2 gap-1 rounded-2xl p-1">
        <button type="button" onClick={() => setTab('payments')} className={`h-11 rounded-xl text-sm font-black transition ${tab === 'payments' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Pagamentos</button>
        <button type="button" onClick={() => setTab('closing')} className={`h-11 rounded-xl text-sm font-black transition ${tab === 'closing' ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>Fechamento</button>
      </div>

      {tab === 'payments' ? (
        <section className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <WalletCards size={18} className="text-violet-200" />
              <h2 className="font-display text-lg font-bold">Ordem de pagamento</h2>
            </div>
            {pendingInvoices.length === 0 && pendingAccountExpenses.length === 0 ? (
              <div className="premium-card-soft rounded-2xl border-emerald-400/20 p-6 text-center">
                <CheckCircle2 size={28} className="mx-auto text-emerald-200" />
                <p className="mt-3 font-bold text-white">Nada pendente para pagar neste mês.</p>
                <p className="mt-1 text-sm text-slate-500">Hora boa de conferir reembolsos e fechar o mês.</p>
              </div>
            ) : null}
            {pendingInvoices.map((item) => {
              const badge = dueBadge(item.invoice.dueDate, today);
              const invoiceTransactions = getCardInvoiceTransactions(item.card, transactions, item.invoice.period);
              return (
                <article key={`${item.card.id}:${item.invoice.period}`} className="premium-card rounded-2xl p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-100"><CreditCard size={17} /></span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-bold text-white">{item.card.name}</h3>
                          <p className="text-xs text-slate-500">{item.invoice.label}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}>{badge.label}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{item.itemCount} lançamento{item.itemCount === 1 ? '' : 's'} no ciclo. Prioridade por vencimento: {formatDatePtBr(item.invoice.dueDate)}.</p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-display text-xl font-black text-white">{formatCurrency(item.total)}</p>
                      <div className="mt-2 flex items-center gap-2 sm:justify-end">
                        <CardInvoiceActions
                          card={item.card}
                          accounts={accounts}
                          invoiceLabel={item.invoice.label}
                          invoiceTotal={item.total}
                          invoiceTransactions={invoiceTransactions}
                          onPayInvoice={onPayInvoice}
                        />
                        <button type="button" onClick={() => onOpenCards(item.card.id)} className="flex h-9 items-center gap-1 rounded-xl bg-white/5 px-3 text-xs font-bold text-slate-200 hover:bg-white/10">
                          Abrir <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {pendingAccountExpenses.map((transaction) => {
              const badge = dueBadge(transaction.date, today);
              return (
                <article key={transaction.id} className="premium-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-100"><ReceiptText size={17} /></span>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-bold text-white">{transaction.description}</h3>
                          <p className="text-xs text-slate-500">Despesa de conta</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}>{badge.label}</span>
                      </div>
                    </div>
                    <p className="shrink-0 font-display text-lg font-black text-white">{formatCurrency(transaction.amount)}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="space-y-3">
            <div className="flex items-center gap-2">
              <HandCoins size={18} className="text-amber-200" />
              <h2 className="font-display text-lg font-bold">Reembolsos em aberto</h2>
            </div>
            {reimbursementPeopleSummaries.length === 0 ? (
              <div className="premium-card-soft rounded-2xl p-5 text-center">
                <CheckCircle2 size={24} className="mx-auto text-emerald-200" />
                <p className="mt-2 text-sm font-bold text-white">Sem pendências de terceiros.</p>
              </div>
            ) : reimbursementPeopleSummaries.slice(0, 6).map((person) => {
              const overdue = person.overdueCount > 0;
              return (
                <article key={person.personId ?? 'unknown'} className={`premium-card rounded-2xl p-3 ${overdue ? 'border-rose-400/20 bg-rose-500/10' : 'border-amber-400/10'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{person.personName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {person.count} item{person.count === 1 ? '' : 's'} em aberto
                        {person.oldestDueDate ? ` · mais antigo ${formatDatePtBr(person.oldestDueDate)}` : ''}
                      </p>
                      {person.hasPreviousMonth ? (
                        <p className="mt-1 text-[11px] font-semibold text-amber-100">Tem valor carregado de mês anterior. Se passar do dia 10, trate como prioridade de cobrança.</p>
                      ) : null}
                      {overdue ? (
                        <p className="mt-1 text-[11px] font-semibold text-rose-100">{person.overdueCount} pendência{person.overdueCount === 1 ? '' : 's'} atrasada{person.overdueCount === 1 ? '' : 's'}.</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-mono text-sm font-black text-amber-100">{formatCurrency(person.total)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => onOpenReimbursements(person.personId)} className="h-9 flex-1 rounded-xl bg-white/5 text-xs font-bold text-slate-200 hover:bg-white/10">Ver pessoa</button>
                  </div>
                </article>
              );
            })}
            {reimbursementPeopleSummaries.length > 6 ? (
              <button type="button" onClick={() => onOpenReimbursements()} className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-white">Ver todas as {reimbursementPeopleSummaries.length} pessoas</button>
            ) : null}
          </aside>
        </section>
      ) : (
        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="premium-card rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <ListChecks size={18} className="text-violet-200" />
              <h2 className="font-display text-lg font-bold">Checklist de {formatMonthLabel(activeMonth)}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {closingItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.done ? 'bg-emerald-500/15 text-emerald-100' : 'bg-amber-500/15 text-amber-100'}`}>
                      {item.done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.detail}</p>
                    </div>
                    <button type="button" onClick={item.onClick} className="hidden h-8 shrink-0 rounded-xl bg-white/5 px-3 text-xs font-bold text-slate-200 hover:bg-white/10 sm:block">{item.action}</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="premium-card rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <CalendarCheck2 size={18} className="text-cyan-200" />
              <h2 className="font-display text-lg font-bold">Resumo para decidir</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Faturas quitadas</p><p className="mt-2 font-display text-2xl font-black text-white">{paidInvoices}/{cards.length}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Reembolsos atrasados</p><p className="mt-2 font-display text-2xl font-black text-white">{overdueReimbursements.length}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pendente a pagar</p><p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(totalToPay)}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pendente a receber</p><p className="mt-2 font-display text-2xl font-black text-white">{formatCurrency(reimbursementTotal)}</p></div>
            </div>
            <div className={`mt-4 rounded-2xl border p-4 ${canCloseMonth ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-amber-400/20 bg-amber-500/10'}`}>
              {canCloseMonth ? (
                <p className="text-sm font-bold text-emerald-100">Mês pronto para fechar. Nada crítico ficou pendente.</p>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-100" />
                  <p className="text-sm font-semibold leading-relaxed text-amber-100">Ainda existem pontos em aberto. Resolva, receba ou deixe conscientemente carregado para o próximo mês.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {receivingTransaction ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="premium-card w-full rounded-t-[28px] p-5 sm:max-w-sm sm:rounded-[28px]">
            <h2 className="font-display text-lg font-bold text-white">Registrar reembolso</h2>
            <p className="mt-1 text-xs text-slate-500">{receivingTransaction.description} · {formatCurrency(getTransactionReimbursementAmount(receivingTransaction))}</p>
            <label className="mt-4 grid gap-1 text-xs font-semibold text-slate-400">
              Conta onde o dinheiro entrou
              <select value={receivingAccountId} onChange={(event) => setReceivingAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-emerald-300">
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
              Nesta primeira versão, o botão registra o valor total como recebido. O recebimento parcial entra na próxima etapa com campo próprio de valor recebido para não distorcer seu saldo.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setReceivingTransaction(null)} className="h-11 rounded-xl bg-white/5 text-sm font-bold text-slate-300">Cancelar</button>
              <button
                type="button"
                disabled={!receivingAccountId}
                onClick={async () => {
                  await onMarkReimbursementReceived(receivingTransaction, receivingAccountId);
                  setReceivingTransaction(null);
                }}
                className="h-11 rounded-xl bg-white text-sm font-bold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
