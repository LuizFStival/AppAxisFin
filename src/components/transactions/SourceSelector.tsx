import { CalendarClock } from 'lucide-react';
import { Account, Card, MoneyFlow } from '../../types';
import { CardInvoiceInfo } from '../../lib/utils/cardInvoices';
import { formatDatePtBr } from '../../lib/utils/date';
import { PaymentSourceType } from './addEntryRules';

interface SourceSelectorProps {
  accounts: Account[];
  cards: Card[];
  flow: MoneyFlow;
  lockedSourceType: PaymentSourceType | null;
  sourceType: PaymentSourceType;
  accountId: string;
  cardId: string;
  status: 'paid' | 'pending';
  isInstallmentExpense: boolean;
  isInvoiceCredit: boolean;
  invoiceInfo: CardInvoiceInfo | null;
  isEditingClosedInvoice: boolean;
  onSourceTypeChange: (sourceType: PaymentSourceType) => void;
  onAccountChange: (accountId: string) => void;
  onCardChange: (cardId: string) => void;
  onStatusChange: (status: 'paid' | 'pending') => void;
}

export function SourceSelector({
  accounts,
  cards,
  flow,
  lockedSourceType,
  sourceType,
  accountId,
  cardId,
  status,
  isInstallmentExpense,
  isInvoiceCredit,
  invoiceInfo,
  isEditingClosedInvoice,
  onSourceTypeChange,
  onAccountChange,
  onCardChange,
  onStatusChange,
}: SourceSelectorProps) {
  return (
    <>
      {flow === 'expense' ? (
        <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200 md:col-span-6">
          {lockedSourceType === 'card' ? 'Cartão' : lockedSourceType === 'account' ? 'Conta' : 'Origem'}
          {lockedSourceType ? null : (
            <div className="grid min-w-0 grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
              <button
                type="button"
                onClick={() => onSourceTypeChange('account')}
                disabled={isInstallmentExpense || isInvoiceCredit}
                className={`h-10 rounded-xl text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${sourceType === 'account' ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5'}`}
              >
                Conta
              </button>
              <button
                type="button"
                onClick={() => onSourceTypeChange('card')}
                className={`h-10 rounded-xl text-xs font-bold transition ${sourceType === 'card' ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5'}`}
              >
                Cartão
              </button>
            </div>
          )}
          {sourceType === 'account' ? (
            <select value={accountId} onChange={(event) => onAccountChange(event.target.value)} className="h-12 min-w-0 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition focus:border-violet-300">
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          ) : (
            <select value={cardId} onChange={(event) => onCardChange(event.target.value)} className="h-12 min-w-0 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition focus:border-violet-300">
              <option value="">Selecione</option>
              {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
            </select>
          )}
        </div>
      ) : (
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200 md:col-span-6">
          Conta
          <select value={accountId} onChange={(event) => onAccountChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-white outline-none transition focus:border-violet-300">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      )}

      {flow === 'expense' && sourceType === 'card' && cards.length === 0 ? (
        <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-100 md:col-span-12">
          Cadastre um cartão antes de criar uma despesa no cartão.
        </p>
      ) : null}

      {!(flow === 'expense' && (sourceType === 'card' || isInvoiceCredit)) ? (
        <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-12">
          Estado
          <select value={status} onChange={(event) => onStatusChange(event.target.value as 'paid' | 'pending')} className="h-12 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-white outline-none transition focus:border-violet-300">
            <option value="paid">Confirmado</option>
            <option value="pending">Pendente</option>
          </select>
        </label>
      ) : null}

      {invoiceInfo ? (
        <div className={`rounded-2xl border p-4 text-xs md:col-span-12 ${isEditingClosedInvoice ? 'border-amber-400/25 bg-amber-400/10 text-amber-100' : 'border-sky-400/20 bg-sky-400/10 text-sky-100'}`}>
          <div className="flex items-center gap-2 font-bold text-white">
            <CalendarClock size={16} />
            <span>{invoiceInfo.label}</span>
            <span className="ml-auto capitalize">{invoiceInfo.status}</span>
          </div>
          <p className="mt-2 text-slate-300">Consumo de {formatDatePtBr(invoiceInfo.startDate)} a {formatDatePtBr(invoiceInfo.endDate)}. Vencimento em {formatDatePtBr(invoiceInfo.dueDate)}.</p>
          {isEditingClosedInvoice ? <p className="mt-2 font-semibold">Esta fatura já fechou ou venceu. Edite com cuidado para não alterar meses passados por engano.</p> : null}
        </div>
      ) : null}
    </>
  );
}
