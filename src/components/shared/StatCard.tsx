import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  tone: 'income' | 'expense' | 'info' | 'neutral';
  icon: LucideIcon;
  hint?: string;
}

const toneClasses = {
  income: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/15',
  expense: 'text-rose-300 bg-rose-500/10 border-rose-400/15',
  info: 'text-sky-300 bg-sky-500/10 border-sky-400/15',
  neutral: 'text-violet-300 bg-violet-500/10 border-violet-400/15',
};

export function StatCard({ label, value, tone, icon: Icon, hint }: StatCardProps) {
  return (
    <section className="cosmic-card cosmic-card-hover rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneClasses[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </section>
  );
}
