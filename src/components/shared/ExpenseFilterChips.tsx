import React from 'react';
import { ExpenseViewFilter, expenseViewFilterOptions } from '../../lib/utils/expenseFilters';

interface ExpenseFilterChipsProps {
  value: ExpenseViewFilter;
  onChange: (value: ExpenseViewFilter) => void;
  className?: string;
}

export function ExpenseFilterChips({ value, onChange, className = '' }: ExpenseFilterChipsProps) {
  return (
    <div
      className={`no-scrollbar flex shrink-0 gap-2 overflow-x-auto pb-1 ${className}`}
      role="group"
      aria-label="Filtrar despesas"
    >
      {expenseViewFilterOptions.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={selected}
            className={`h-8 shrink-0 rounded-full border px-3 text-[11px] font-bold transition ${
              selected
                ? 'border-sky-400/40 bg-sky-500 text-white'
                : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
