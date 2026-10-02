import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cx, surface } from './visualTokens';

export type ActionDialogTone = 'default' | 'warning' | 'danger' | 'success';

export interface ActionDialogChoice {
  value: string;
  label: string;
  description?: string;
  tone?: ActionDialogTone;
}

export type ActionDialogResult = boolean | string | null;

export interface ActionDialogRequest {
  title: string;
  description: string;
  details?: string;
  tone?: ActionDialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  choices?: ActionDialogChoice[];
}

interface ActionDialogProps {
  dialog: ActionDialogRequest;
  onResolve: (result: ActionDialogResult) => void;
}

const toneClass = {
  default: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100',
  warning: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
  danger: 'border-rose-300/25 bg-rose-500/12 text-rose-100',
  success: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
};

const actionClass = {
  default: 'bg-white text-black hover:bg-slate-200',
  warning: 'bg-amber-300 text-black hover:bg-amber-200',
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
  success: 'bg-emerald-400 text-black hover:bg-emerald-300',
};

function DialogIcon({ tone }: { tone: ActionDialogTone }) {
  if (tone === 'danger' || tone === 'warning') return <AlertTriangle size={18} />;
  if (tone === 'success') return <CheckCircle2 size={18} />;
  return <Info size={18} />;
}

export function ActionDialog({ dialog, onResolve }: ActionDialogProps) {
  const tone = dialog.tone ?? 'default';
  const cancelLabel = dialog.cancelLabel ?? 'Cancelar';
  const confirmLabel = dialog.confirmLabel ?? 'Confirmar';
  const hasChoices = Boolean(dialog.choices?.length);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        aria-describedby="action-dialog-description"
        className={cx(surface.modal, 'w-full max-w-md rounded-t-[28px] p-5 sm:rounded-[28px]')}
      >
        <div className="flex items-start gap-3">
          <span className={cx('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border', toneClass[tone])}>
            <DialogIcon tone={tone} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="action-dialog-title" className="font-display text-lg font-black text-white">{dialog.title}</h2>
            <p id="action-dialog-description" className="mt-2 text-sm leading-relaxed text-slate-400">{dialog.description}</p>
          </div>
        </div>

        {dialog.details ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-relaxed text-slate-400">
            {dialog.details}
          </p>
        ) : null}

        {hasChoices ? (
          <div className="mt-5 space-y-2">
            {dialog.choices!.map((choice) => {
              const choiceTone = choice.tone ?? tone;
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => onResolve(choice.value)}
                  className={cx('w-full rounded-2xl border p-3 text-left transition hover:bg-white/[0.055]', toneClass[choiceTone])}
                >
                  <span className="block text-sm font-black">{choice.label}</span>
                  {choice.description ? <span className="mt-1 block text-xs leading-relaxed opacity-80">{choice.description}</span> : null}
                </button>
              );
            })}
            <button type="button" onClick={() => onResolve(null)} className="h-11 w-full rounded-xl bg-white/5 text-sm font-bold text-slate-300 transition hover:bg-white/10">
              {cancelLabel}
            </button>
          </div>
        ) : (
          <div className={cx('mt-5 grid gap-2', dialog.hideCancel ? 'grid-cols-1' : 'grid-cols-2')}>
            {dialog.hideCancel ? null : (
              <button type="button" onClick={() => onResolve(false)} className="h-11 rounded-xl bg-white/5 text-sm font-bold text-slate-300 transition hover:bg-white/10">
                {cancelLabel}
              </button>
            )}
            <button type="button" onClick={() => onResolve(true)} className={cx('h-11 rounded-xl text-sm font-black transition', actionClass[tone])}>
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
