import React, { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  tone: 'income' | 'expense' | 'info' | 'neutral';
  icon: LucideIcon;
  hint?: React.ReactNode;
  details?: React.ReactNode;
  onClick?: () => void;
}

const toneClasses = {
  income: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/15',
  expense: 'text-rose-300 bg-rose-500/10 border-rose-400/15',
  info: 'text-sky-300 bg-sky-500/10 border-sky-400/15',
  neutral: 'text-violet-300 bg-violet-500/10 border-violet-400/15',
};

export function StatCard({ label, value, tone, icon: Icon, hint, details, onClick }: StatCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="cosmic-card cosmic-card-hover w-full rounded-2xl p-3 text-left">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onClick} disabled={!onClick} className="min-w-0 flex-1 text-left disabled:cursor-default">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-0.5 font-display text-base font-bold leading-tight text-white">{value}</p>
          {hint ? <span className="mt-1.5 block text-[10px] leading-snug text-slate-500">{hint}</span> : null}
        </button>
        {details ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${toneClasses[tone]}`}
            title={expanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          >
            {expanded ? <ChevronDown size={16} className="rotate-180" /> : <Icon size={16} />}
          </button>
        ) : (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${toneClasses[tone]}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      {details && expanded ? (
        <button type="button" onClick={onClick} disabled={!onClick} className="mt-2 block w-full border-t border-white/8 pt-2 text-left text-[9px] font-normal leading-tight text-slate-400 [&_*]:text-[9px] disabled:cursor-default">
          {details}
        </button>
      ) : null}
    </section>
  );
}
