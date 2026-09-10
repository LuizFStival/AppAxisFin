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
  income: 'text-emerald-200 bg-emerald-400/10 border-emerald-300/18',
  expense: 'text-rose-200 bg-rose-400/10 border-rose-300/18',
  info: 'text-sky-200 bg-sky-400/10 border-sky-300/18',
  neutral: 'text-violet-200 bg-violet-400/10 border-violet-300/18',
};

export function StatCard({ label, value, tone, icon: Icon, hint, details, onClick }: StatCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="cosmic-card cosmic-card-hover w-full rounded-2xl p-3.5 text-left">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onClick} disabled={!onClick} className="min-w-0 flex-1 text-left disabled:cursor-default">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-1 font-display text-lg font-bold leading-tight text-white">{value}</p>
          {hint ? <span className="mt-1.5 block text-[10px] leading-snug text-slate-400">{hint}</span> : null}
        </button>
        {details ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition ${toneClasses[tone]}`}
            title={expanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          >
            {expanded ? <ChevronDown size={16} className="rotate-180" /> : <Icon size={16} />}
          </button>
        ) : (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${toneClasses[tone]}`}>
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
