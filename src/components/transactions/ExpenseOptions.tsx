import { Card, EditSeriesScope, ExpenseEntryMode, Transaction } from '../../types';
import { expenseModes, parseEntryCount, PaymentSourceType } from './addEntryRules';

interface ExpenseOptionsProps {
  cards: Card[];
  cardId: string;
  lockedSourceType: PaymentSourceType | null;
  expenseMode: ExpenseEntryMode;
  installmentCount: string;
  installmentPreview?: string | null;
  transaction?: Transaction | null;
  isGroupedTransaction: boolean;
  isRecurringOccurrence: boolean;
  isInvoiceCredit: boolean;
  canEditForwardEntries: boolean;
  editScope: EditSeriesScope;
  onExpenseModeChange: (mode: ExpenseEntryMode) => void;
  onCardChange: (cardId: string) => void;
  onInstallmentCountChange: (count: string) => void;
  onEditScopeChange: (scope: EditSeriesScope) => void;
  onSkipFixedOccurrence?: (transaction: Transaction) => boolean | void | Promise<boolean | void>;
  onClose: () => void;
}

export function ExpenseOptions({
  cards,
  cardId,
  lockedSourceType,
  expenseMode,
  installmentCount,
  installmentPreview,
  transaction,
  isGroupedTransaction,
  isRecurringOccurrence,
  isInvoiceCredit,
  canEditForwardEntries,
  editScope,
  onExpenseModeChange,
  onCardChange,
  onInstallmentCountChange,
  onEditScopeChange,
  onSkipFixedOccurrence,
  onClose,
}: ExpenseOptionsProps) {
  if (isInvoiceCredit && !canEditForwardEntries) return null;

  return (
    <>
      {!isInvoiceCredit ? (
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] p-1.5 md:col-span-7">
          <p className="col-span-3 px-2 pb-0.5 pt-1 text-xs font-semibold text-slate-300">Tipo de lançamento</p>
          {expenseModes.map((option) => {
            const Icon = option.icon;
            const isDisabled = (lockedSourceType === 'account' && option.id === 'installment')
              || (Boolean(transaction) && (
                isGroupedTransaction
                  ? option.id !== expenseMode
                  : isRecurringOccurrence
                    ? option.id === 'installment'
                    : option.id !== expenseMode
              ));
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onExpenseModeChange(option.id);
                  if (option.id === 'installment' && cards[0] && !cardId) onCardChange(cards[0].id);
                }}
                disabled={isDisabled}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  expenseMode === option.id ? 'premium-metal text-white' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{option.label}</span>
              </button>
            );
          })}
          {expenseMode === 'installment' && !transaction ? (
            <label className="col-span-3 grid gap-1 px-2 pb-2 pt-1 text-xs font-semibold text-slate-400">
              Número de parcelas
              <input
                type="number"
                min={2}
                max={60}
                value={installmentCount}
                onChange={(event) => onInstallmentCountChange(event.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-violet-300"
              />
              <span className="text-[11px] font-medium text-slate-500">
                {`${parseEntryCount(installmentCount, 2)} parcelas serão criadas.`}
              </span>
              {installmentPreview ? (
                <span className="text-[11px] font-bold text-violet-200">
                  {installmentPreview}
                </span>
              ) : null}
            </label>
          ) : null}
        </div>
      ) : null}

      {canEditForwardEntries ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-2 md:col-span-12">
          <p className="col-span-2 px-2 pb-1 text-xs font-bold text-amber-100">
            {expenseMode === 'installment' ? 'Parcelas desta compra' : 'Aplicar alteração'}
          </p>
          <button type="button" onClick={() => onEditScopeChange('single')} className={`h-11 rounded-xl text-xs font-bold ${editScope === 'single' ? 'bg-amber-400 text-slate-950' : 'text-amber-100'}`}>
            {expenseMode === 'installment' ? 'Só esta parcela' : 'Apenas esta'}
          </button>
          <button type="button" onClick={() => onEditScopeChange('forward')} className={`h-11 rounded-xl text-xs font-bold ${editScope === 'forward' ? 'bg-amber-400 text-slate-950' : 'text-amber-100'}`}>
            Esta e próximas
          </button>
          {expenseMode === 'installment' ? (
            <p className="col-span-2 px-2 pt-1 text-[11px] font-semibold leading-relaxed text-amber-100/80">
              Use “esta e próximas” para corrigir valor, categoria ou título das parcelas restantes.
            </p>
          ) : null}
          {isRecurringOccurrence ? (
            <>
              <p className="col-span-2 px-2 pt-1 text-[11px] font-semibold leading-relaxed text-amber-100/80">
                Para despesas fixas, alterações começam em “esta e próximas” para atualizar os próximos meses.
              </p>
              {transaction && onSkipFixedOccurrence ? (
                <button
                  type="button"
                  onClick={async () => {
                    const didSkip = await onSkipFixedOccurrence(transaction);
                    if (didSkip !== false) onClose();
                  }}
                  className="col-span-2 h-10 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-200 transition hover:border-amber-300/30 hover:bg-amber-500/15 hover:text-amber-100"
                >
                  Não usei este mês
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
