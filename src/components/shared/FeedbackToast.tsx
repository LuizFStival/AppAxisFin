import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from './visualTokens';

export type FeedbackToastTone = 'success' | 'warning' | 'info';

export interface FeedbackToastRequest {
  title: string;
  description?: string;
  tone?: FeedbackToastTone;
}

interface FeedbackToastProps {
  toast: FeedbackToastRequest;
  onClose: () => void;
}

const toneClass = {
  success: 'border-emerald-300/25 bg-emerald-500/15 text-emerald-100 shadow-emerald-950/30',
  warning: 'border-amber-300/25 bg-amber-500/15 text-amber-100 shadow-amber-950/30',
  info: 'border-cyan-300/25 bg-cyan-500/15 text-cyan-100 shadow-cyan-950/30',
};

function ToastIcon({ tone }: { tone: FeedbackToastTone }) {
  if (tone === 'success') return <CheckCircle2 size={18} />;
  if (tone === 'warning') return <AlertTriangle size={18} />;
  return <Info size={18} />;
}

export function FeedbackToast({ toast, onClose }: FeedbackToastProps) {
  const tone = toast.tone ?? 'success';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[95] flex justify-center px-4 md:bottom-6">
      <div className={cx('pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl', toneClass[tone])}>
        <span className="mt-0.5 shrink-0">
          <ToastIcon tone={tone} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">{toast.title}</p>
          {toast.description ? <p className="mt-1 text-xs font-semibold leading-relaxed opacity-80">{toast.description}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white" aria-label="Fechar aviso">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
