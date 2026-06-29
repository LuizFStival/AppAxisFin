import { AlertTriangle, Bell, CheckCheck, ChevronRight, Clock3, CreditCard, ReceiptText, UserRound } from 'lucide-react';
import type { AppNotification, AppView } from '../../types';
import { formatDatePtBr } from '../../lib/utils/date';

interface NotificationsViewProps {
  error: string;
  notifications: AppNotification[];
  onMarkAllRead: () => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
  onNavigate: (view: AppView) => void;
}

const actionIcons = {
  transactions: ReceiptText,
  cards: CreditCard,
  reimbursements: UserRound,
};

export function NotificationsView({ error, notifications, onMarkAllRead, onMarkRead, onNavigate }: NotificationsViewProps) {
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) await onMarkRead(notification.id);
    onNavigate(notification.actionView);
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-8 pt-7">
      <header className="flex items-end justify-between gap-3">
        <div><p className="text-sm text-slate-400">Central</p><h1 className="font-display text-2xl font-bold text-white">Notificações</h1></div>
        {unreadCount > 0 ? (
          <button type="button" onClick={() => void onMarkAllRead()} className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-sky-200">
            <CheckCheck size={15} /> Marcar lidas
          </button>
        ) : null}
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/8 bg-[#101319] p-3"><p className="text-[10px] uppercase tracking-widest text-slate-500">Não lidas</p><p className="mt-1 font-display text-xl font-bold text-white">{unreadCount}</p></div>
        <div className="rounded-2xl border border-white/8 bg-[#101319] p-3"><p className="text-[10px] uppercase tracking-widest text-slate-500">Alertas ativos</p><p className="mt-1 font-display text-xl font-bold text-white">{notifications.length}</p></div>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p> : null}

      <div className="mt-4 space-y-2">
        {notifications.map((notification) => {
          const Icon = actionIcons[notification.actionView];
          const urgent = notification.type === 'danger';
          return (
            <button key={notification.id} type="button" onClick={() => void openNotification(notification)} className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left ${notification.readAt ? 'border-white/8 bg-[#101319] opacity-70' : urgent ? 'border-rose-400/20 bg-rose-500/[0.08]' : 'border-amber-400/20 bg-amber-500/[0.07]'}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${urgent ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>{urgent ? <AlertTriangle size={19} /> : <Icon size={19} />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="truncate text-sm font-bold text-white">{notification.title}</span>{!notification.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" /> : null}</span>
                {notification.body ? <span className="mt-1 block truncate text-xs text-slate-400">{notification.body}</span> : null}
                {notification.scheduledFor ? <span className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500"><Clock3 size={11} /> {formatDatePtBr(notification.scheduledFor)}</span> : null}
              </span>
              <ChevronRight size={17} className="shrink-0 text-slate-600" />
            </button>
          );
        })}
      </div>

      {notifications.length === 0 && !error ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-300"><Bell size={28} /></span>
          <h2 className="mt-4 font-display text-lg font-bold text-white">Tudo em dia</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">Nenhuma despesa, fatura ou reembolso exige atenção agora.</p>
        </div>
      ) : null}
    </div>
  );
}
