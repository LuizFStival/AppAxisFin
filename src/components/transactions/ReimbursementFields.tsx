import { AlertCircle, ChevronDown, Plus } from 'lucide-react';
import { Account, ExpenseSplitMode, ReimbursementPerson } from '../../types';
import { formatCurrencyInput } from '../../lib/utils/currency';
import { CurrencyInput } from '../shared/CurrencyInput';
import { PaymentSourceType, splitModeOptions } from './addEntryRules';

interface ReimbursementFieldsProps {
  accounts: Account[];
  reimbursementPeople: ReimbursementPerson[];
  accountId: string;
  lockedSourceType: PaymentSourceType | null;
  canUseReimbursements: boolean;
  isInvoiceCredit: boolean;
  isQuickOptionsOpen: boolean;
  splitMode: ExpenseSplitMode;
  splitType: 'percent' | 'fixed';
  splitPercent: string;
  splitFixedAmount: string;
  personalAmount: number;
  reimbursementAmount: number;
  isReimbursable: boolean;
  reimbursementPersonId: string;
  reimbursementStatus: 'pending' | 'received';
  reimbursementReceivedAccountId: string;
  newPersonName: string;
  isCreatingPerson: boolean;
  personError: string;
  onInvoiceCreditChange: (enabled: boolean) => void | Promise<void>;
  onQuickOptionsOpenChange: (open: boolean | ((current: boolean) => boolean)) => void;
  onSplitModeChange: (mode: ExpenseSplitMode) => void | Promise<void>;
  onSplitTypeChange: (type: 'percent' | 'fixed') => void;
  onSplitPercentChange: (percent: string) => void;
  onSplitFixedAmountChange: (amount: string) => void;
  onReimbursementPersonChange: (personId: string) => void;
  onReimbursementStatusChange: (status: 'pending' | 'received') => void;
  onReimbursementReceivedAccountChange: (accountId: string) => void;
  onNewPersonNameChange: (name: string) => void;
  onCreatePerson: () => void;
}

export function ReimbursementFields({
  accounts,
  reimbursementPeople,
  accountId,
  lockedSourceType,
  canUseReimbursements,
  isInvoiceCredit,
  isQuickOptionsOpen,
  splitMode,
  splitType,
  splitPercent,
  splitFixedAmount,
  personalAmount,
  reimbursementAmount,
  isReimbursable,
  reimbursementPersonId,
  reimbursementStatus,
  reimbursementReceivedAccountId,
  newPersonName,
  isCreatingPerson,
  personError,
  onInvoiceCreditChange,
  onQuickOptionsOpenChange,
  onSplitModeChange,
  onSplitTypeChange,
  onSplitPercentChange,
  onSplitFixedAmountChange,
  onReimbursementPersonChange,
  onReimbursementStatusChange,
  onReimbursementReceivedAccountChange,
  onNewPersonNameChange,
  onCreatePerson,
}: ReimbursementFieldsProps) {
  const hasQuickOptions = isInvoiceCredit || splitMode !== 'none';

  if (!canUseReimbursements && lockedSourceType === 'account') return null;

  return (
    <div className="grid gap-2 md:col-span-12">
      <div className="flex flex-wrap gap-2">
        {lockedSourceType !== 'account' ? (
          <button
            type="button"
            onClick={() => {
              void onInvoiceCreditChange(!isInvoiceCredit);
              onQuickOptionsOpenChange(true);
            }}
            className={`h-8 rounded-full border px-3 text-[11px] font-bold transition ${isInvoiceCredit ? 'border-emerald-300 bg-emerald-400 text-slate-950' : 'border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/10'}`}
          >
            Estorno fatura
          </button>
        ) : null}
        {canUseReimbursements ? (
          <button
            type="button"
            onClick={() => {
              onQuickOptionsOpenChange(true);
              if (splitMode === 'none') {
                void onSplitModeChange('shared');
              } else {
                void onSplitModeChange('none');
              }
            }}
            disabled={isInvoiceCredit}
            className={`h-8 rounded-full border px-3 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${splitMode !== 'none' ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/10'}`}
          >
            Terceiro/reembolso
          </button>
        ) : null}
      </div>

      {hasQuickOptions ? (
        <button
          type="button"
          onClick={() => onQuickOptionsOpenChange((current) => !current)}
          className="flex h-8 w-fit items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-3 text-[11px] font-bold text-slate-400 transition hover:bg-white/5"
        >
          {isQuickOptionsOpen ? 'Ocultar detalhes' : 'Ajustar detalhes'}
          <ChevronDown size={13} className={`transition ${isQuickOptionsOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : null}

      {isInvoiceCredit && isQuickOptionsOpen ? (
        <p className="mt-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-medium text-emerald-100/80">Use para devoluções e créditos do cartão. O valor reduz a fatura e não vira receita.</p>
      ) : null}

      {splitMode !== 'none' && isQuickOptionsOpen ? (
        <div className="mt-2 grid gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-black/15 p-1">
            {splitModeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  void onSplitModeChange(option.id);
                }}
                className={`min-h-10 rounded-xl px-2 text-[11px] font-bold transition ${splitMode === option.id ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {splitMode === 'shared' ? (
            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/15 p-1">
                <button type="button" onClick={() => onSplitTypeChange('percent')} className={`h-10 rounded-xl text-xs font-bold ${splitType === 'percent' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}>
                  Percentual
                </button>
                <button type="button" onClick={() => onSplitTypeChange('fixed')} className={`h-10 rounded-xl text-xs font-bold ${splitType === 'fixed' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}>
                  Valor fixo
                </button>
              </div>
              {splitType === 'percent' ? (
                <label className="grid gap-1 text-xs font-semibold text-slate-400">
                  Parte de terceiro (%)
                  <input
                    type="number"
                    min={1}
                    max={99}
                    step={1}
                    value={splitPercent}
                    onChange={(event) => onSplitPercentChange(event.target.value)}
                    className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-amber-300"
                  />
                </label>
              ) : (
                <label className="grid gap-1 text-xs font-semibold text-slate-400">
                  Parte de terceiro (R$)
                  <CurrencyInput
                    value={splitFixedAmount}
                    onChange={onSplitFixedAmountChange}
                    className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-amber-300"
                  />
                </label>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <p className="text-[10px] font-bold uppercase text-emerald-100">Minha parte</p>
                  <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrencyInput(personalAmount)}</p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                  <p className="text-[10px] font-bold uppercase text-amber-100">Reembolso</p>
                  <p className="mt-1 font-mono text-sm font-bold text-white">{formatCurrencyInput(reimbursementAmount)}</p>
                </div>
              </div>
            </div>
          ) : null}
          {isReimbursable ? (
            <div className="mt-3 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-slate-400">
                  Quem deve
                  <select value={reimbursementPersonId} onChange={(event) => onReimbursementPersonChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-amber-300">
                    <option value="">Selecione</option>
                    {reimbursementPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-400">
                  Status
                  <select
                    value={reimbursementStatus}
                    onChange={(event) => {
                      const nextStatus = event.target.value as 'pending' | 'received';
                      onReimbursementStatusChange(nextStatus);
                      if (nextStatus === 'received' && !reimbursementReceivedAccountId) {
                        onReimbursementReceivedAccountChange(accountId || accounts[0]?.id || '');
                      }
                      if (nextStatus === 'pending') {
                        onReimbursementReceivedAccountChange('');
                      }
                    }}
                    className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-amber-300"
                  >
                    <option value="pending">A receber</option>
                    <option value="received">Recebido</option>
                  </select>
                </label>
              </div>
              {reimbursementStatus === 'received' ? (
                <label className="grid gap-1 text-xs font-semibold text-slate-400">
                  Conta onde o dinheiro entrou
                  <select
                    value={reimbursementReceivedAccountId}
                    onChange={(event) => onReimbursementReceivedAccountChange(event.target.value)}
                    className="h-12 rounded-2xl border border-white/10 bg-[#0B0E14] px-3 text-white outline-none focus:border-emerald-300"
                  >
                    <option value="">Selecione</option>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
              ) : null}
              <div className="flex gap-2">
                <input
                  value={newPersonName}
                  onChange={(event) => onNewPersonNameChange(event.target.value)}
                  placeholder="Nova pessoa"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:border-amber-300"
                />
                <button
                  type="button"
                  onClick={onCreatePerson}
                  disabled={isCreatingPerson}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 disabled:opacity-60"
                  title="Cadastrar pessoa"
                >
                  <Plus size={17} />
                </button>
              </div>
              {personError ? (
                <p className="flex items-center gap-2 text-xs text-rose-200">
                  <AlertCircle size={14} />
                  {personError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
