import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthLabel, getCurrentMonthKey } from '../../lib/utils/finance';

interface MonthNavigatorProps {
  month: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  className?: string;
}

export function MonthNavigator({ month, onPreviousMonth, onNextMonth, onCurrentMonth, className = '' }: MonthNavigatorProps) {
  const isCurrentMonth = month === getCurrentMonthKey();

  return (
    <div className={`flex items-center justify-between gap-2 rounded-2xl border border-white/8 bg-[#101319] p-2 ${className}`}>
      <button
        type="button"
        onClick={onPreviousMonth}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
        title="Mes anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={onCurrentMonth}
        className="min-w-0 flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center transition hover:bg-white/5"
        title="Voltar para o mes atual"
      >
        <CalendarDays size={16} className={isCurrentMonth ? 'text-sky-300' : 'text-slate-500'} />
        <span className="truncate text-sm font-bold capitalize text-white">{formatMonthLabel(month)}</span>
      </button>
      <button
        type="button"
        onClick={onNextMonth}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
        title="Proximo mes"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
