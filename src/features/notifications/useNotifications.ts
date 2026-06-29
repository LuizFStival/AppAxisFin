import { useEffect, useMemo, useState } from 'react';
import type { AppNotification, Card, Transaction } from '../../types';
import { formatLocalDate } from '../../lib/utils/date';
import { buildOperationalNotifications } from '../../lib/utils/notifications';
import { notificationRepository } from './notificationRepository';

interface UseNotificationsOptions {
  cards: Card[];
  enabled: boolean;
  reimbursementsEnabled: boolean;
  transactions: Transaction[];
}

export function useNotifications({ cards, enabled, reimbursementsEnabled, transactions }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [error, setError] = useState('');
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.readAt).length, [notifications]);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      return;
    }
    let active = true;
    const candidates = buildOperationalNotifications(transactions, cards, formatLocalDate(new Date()), reimbursementsEnabled);
    notificationRepository.sync(candidates)
      .then((loaded) => {
        if (!active) return;
        setNotifications(loaded);
        setError('');
      })
      .catch(() => {
        if (active) setError('Não foi possível atualizar as notificações.');
      });
    return () => {
      active = false;
    };
  }, [cards, enabled, reimbursementsEnabled, transactions]);

  async function markRead(id: string) {
    await notificationRepository.markRead(id);
    setNotifications((current) => current.map((notification) =>
      notification.id === id ? { ...notification, readAt: new Date().toISOString() } : notification,
    ));
  }

  async function markAllRead() {
    await notificationRepository.markAllRead();
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt })));
  }

  return { error, markAllRead, markRead, notifications, unreadCount };
}
