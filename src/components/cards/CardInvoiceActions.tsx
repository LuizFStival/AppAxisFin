import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Check, MoreVertical, Pencil, Trash2, WalletCards, X } from 'lucide-react';
import { Account, Card, Transaction } from '../../types';
import { formatCurrency, isCardInvoicePaid } from '../../lib/utils/finance';
import { formatLocalDate } from '../../lib/utils/date';
import { DateInput } from '../shared/DateInput';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';

interface CardInvoiceActionsProps {
  card: Card;
  accounts: Account[];
  invoiceLabel: string;
  invoiceTotal: number;
  invoiceTransactions: Transaction[];
  onPayInvoice: (input: {
    card: Card;
    accountId: string;
    paymentDate: string;
    amount: number;
    transactions: Transaction[];
  }) => Promise<void>;
  onUpdateClosingDay: (card: Card, closingDay: number) => Promise<void>;
  onEditCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
}

export function CardInvoiceActions({
  card,
  accounts,
  invoiceLabel,
  invoiceTotal,
  invoiceTransactions,
  onPayInvoice,
  onUpdateClosingDay,
  onEditCard,
  onDeleteCard,
}: CardInvoiceActionsProps) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(formatLocalDate(new Date()));
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [closingDay, setClosingDay] = useState(String(card.closingDay));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const paid = isCardInvoicePaid(invoiceTransactions);
  const canPay = invoiceTotal > 0 && invoiceTransactions.length > 0 && !paid;

  useEffect(() => {
    setPaymentAccountId(accounts[0]?.id ?? '');
  }, [accounts]);

  useEffect(() => {
    setClosingDay(String(card.closingDay));
  }, [card.closingDay]);

  async function handlePaySubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!paymentAccountId) {
      setError('Selecione a conta usada para pagar a fatura.');
      return;
    }

    setIsSaving(true);
    try {
      await onPayInvoice({
        card,
        accountId: paymentAccountId,
        paymentDate,
        amount: invoiceTotal,
        transactions: invoiceTransactions,
      });
      setIsPaymentOpen(false);
    } catch (payError) {
      setError(getUserFriendlyError(payError, 'Não foi possível pagar a fatura. Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClosingSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const parsedClosingDay = Number(closingDay);

    if (!Number.isInteger(parsedClosingDay) || parsedClosingDay < 1 || parsedClosingDay > 31) {
      setError('Dia de fechamento deve ser entre 1 e 31.');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateClosingDay(card, parsedClosingDay);
      setIsOptionsOpen(false);
    } catch (saveError) {
      setError(getUserFriendlyError(saveError, 'Não foi possível alterar o fechamento. Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {!paid ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setError('');
              setIsPaymentOpen(true);
            }}
            disabled={!canPay}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-slate-500"
            title="Pagar fatura"
          >
            <WalletCards size={14} />
            Pagar
          </button>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setError('');
            setIsOptionsOpen(true);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          title="Mais opcoes"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {isPaymentOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={(event) => event.stopPropagation()}>
          <form onSubmit={handlePaySubmit} className="w-full max-w-md rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 shadow-2xl sm:rounded-[28px]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-white">Pagar fatura</h2>
                <p className="mt-1 text-xs text-slate-500">{invoiceLabel} de {card.name}</p>
              </div>
              <button type="button" onClick={() => setIsPaymentOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200">Valor da fatura</p>
              <p className="mt-1 font-display text-2xl font-bold text-white">{formatCurrency(invoiceTotal)}</p>
            </div>

            {error ? (
              <p className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                <AlertCircle size={16} />
                {error}
              </p>
            ) : null}

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1 text-xs font-semibold text-slate-400">
                Data do pagamento
                <DateInput value={paymentDate} onChange={setPaymentDate} />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-400">
                Conta usada
                <select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-400">
                  <option value="">Selecione</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" disabled={isSaving || !canPay} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-bold text-white disabled:opacity-60">
              <Check size={18} />
              {isSaving ? 'Pagando...' : 'Confirmar pagamento'}
            </button>
          </form>
        </div>
      ) : null}

      {isOptionsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={(event) => event.stopPropagation()}>
          <form onSubmit={handleClosingSubmit} className="w-full max-w-md rounded-t-[28px] border border-white/10 bg-[#0B0E14] p-5 shadow-2xl sm:rounded-[28px]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-white">Mais opcoes</h2>
                <p className="mt-1 text-xs text-slate-500">{card.name}</p>
              </div>
              <button type="button" onClick={() => setIsOptionsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {error ? (
              <p className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                <AlertCircle size={16} />
                {error}
              </p>
            ) : null}

            <label className="mt-5 grid gap-1 text-xs font-semibold text-slate-400">
              Alterar data de fechamento
              <div className="flex gap-2">
                <input type="number" min={1} max={31} value={closingDay} onChange={(event) => setClosingDay(event.target.value)} className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-sky-400" />
                <button type="submit" disabled={isSaving} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white disabled:opacity-60" title="Salvar fechamento">
                  <CalendarDays size={18} />
                </button>
              </div>
            </label>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsOptionsOpen(false);
                  onEditCard(card);
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/5 font-bold text-white transition hover:bg-white/10"
              >
                <Pencil size={17} />
                Editar cartao
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOptionsOpen(false);
                  onDeleteCard(card);
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 font-bold text-rose-200 transition hover:bg-rose-500/20"
              >
                <Trash2 size={17} />
                Excluir cartao
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
