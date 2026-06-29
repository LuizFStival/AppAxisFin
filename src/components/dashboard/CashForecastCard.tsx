import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarClock, HandCoins, ReceiptText } from 'lucide-react';
import type { Account, Card, Transaction } from '../../types';
import { calculateCashForecast } from '../../lib/utils/cashForecast';
import { formatCurrency } from '../../lib/utils/finance';
import { formatDatePtBr, formatLocalDate } from '../../lib/utils/date';

interface CashForecastCardProps {
  accounts: Account[];
  cards: Card[];
  reimbursementsEnabled: boolean;
  showBalances: boolean;
  transactions: Transaction[];
}

function money(show: boolean, value: number) {
  return show ? formatCurrency(value) : 'R$ *****';
}

const eventIcons = {
  income: ArrowUpRight,
  reimbursement: HandCoins,
  'fixed-expense': ArrowDownRight,
};

export function CashForecastCard({ accounts, cards, reimbursementsEnabled, showBalances, transactions }: CashForecastCardProps) {
  const forecast = useMemo(
    () => calculateCashForecast(accounts, cards, transactions, formatLocalDate(new Date()), 30, reimbursementsEnabled),
    [accounts, cards, reimbursementsEnabled, transactions],
  );
  const hasEvents = forecast.events.length > 0;

  return (
    <section className="mt-3 px-4">
      <div className="rounded-[22px] border border-sky-400/15 bg-gradient-to-br from-sky-500/[0.09] to-violet-500/[0.06] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-300"><CalendarClock size={14} /> Próximos 30 dias</span>
            <h2 className="mt-1 font-display text-base font-bold text-white">Previsão de caixa</h2>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Saldo projetado</p>
            <p className={`mt-1 font-mono text-base font-bold ${forecast.projectedBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{money(showBalances, forecast.projectedBalance)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-500/[0.08] p-2.5"><p className="text-[9px] text-slate-500">Receitas</p><p className="mt-1 truncate font-mono text-[11px] font-bold text-emerald-300">+{money(showBalances, forecast.pendingIncome)}</p></div>
          <div className="rounded-xl bg-amber-500/[0.08] p-2.5"><p className="text-[9px] text-slate-500">Reembolsos</p><p className="mt-1 truncate font-mono text-[11px] font-bold text-amber-300">+{money(showBalances, forecast.pendingReimbursements)}</p></div>
          <div className="rounded-xl bg-rose-500/[0.08] p-2.5"><p className="text-[9px] text-slate-500">Despesas fixas</p><p className="mt-1 truncate font-mono text-[11px] font-bold text-rose-300">-{money(showBalances, forecast.pendingFixedExpenses)}</p></div>
        </div>

        {hasEvents ? (
          <div className="mt-3 space-y-1.5 border-t border-white/8 pt-3">
            {forecast.events.slice(0, 4).map((event) => {
              const Icon = eventIcons[event.kind];
              const positive = event.amount >= 0;
              return (
                <div key={event.id} className="flex items-center gap-2.5 rounded-xl bg-black/10 px-2.5 py-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${positive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}><Icon size={14} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-slate-200">{event.description}</span><span className={`text-[9px] ${event.overdue ? 'text-rose-300' : 'text-slate-500'}`}>{event.overdue ? 'Em atraso · ' : ''}{formatDatePtBr(event.date)}</span></span>
                  <span className={`font-mono text-[10px] font-bold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>{positive ? '+' : '-'}{money(showBalances, Math.abs(event.amount))}</span>
                </div>
              );
            })}
            {forecast.events.length > 4 ? <p className="pt-1 text-center text-[10px] text-slate-500">+ {forecast.events.length - 4} movimentos até {formatDatePtBr(forecast.endDate)}</p> : null}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3 text-xs text-slate-500"><ReceiptText size={15} /> Nenhum movimento previsto nos próximos 30 dias.</div>
        )}
      </div>
    </section>
  );
}
