import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import type { AppNotification } from '../../types';
import type { NotificationCandidate } from '../../lib/utils/notifications';
import { assertCurrentUserId } from '../finance/financeStore';

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: AppNotification['type'];
  read_at: string | null;
  scheduled_for: string | null;
  source_key: string;
  action_view: AppNotification['actionView'];
  created_at: string;
};

const fields = 'id, title, body, type, read_at, scheduled_for, source_key, action_view, created_at';

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? undefined,
    type: row.type,
    readAt: row.read_at ?? undefined,
    scheduledFor: row.scheduled_for?.slice(0, 10),
    sourceKey: row.source_key,
    actionView: row.action_view,
    createdAt: row.created_at,
  };
}

async function list(): Promise<AppNotification[]> {
  const userId = await assertCurrentUserId();
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from('notifications')
    .select(fields)
    .eq('user_id', userId)
    .not('source_key', 'is', null)
    .order('read_at', { ascending: true, nullsFirst: true })
    .order('scheduled_for', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapNotification(row as NotificationRow));
}

export const notificationRepository = {
  list,

  async sync(candidates: NotificationCandidate[]): Promise<AppNotification[]> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const existing = await list();
    const activeKeys = new Set(candidates.map((candidate) => candidate.sourceKey));
    const staleIds = existing.filter((notification) => !activeKeys.has(notification.sourceKey)).map((notification) => notification.id);

    if (candidates.length > 0) {
      const { error } = await client.from('notifications').upsert(
        candidates.map((candidate) => ({
          user_id: userId,
          source_key: candidate.sourceKey,
          title: candidate.title,
          body: candidate.body ?? null,
          type: candidate.type,
          scheduled_for: candidate.scheduledFor ?? null,
          action_view: candidate.actionView,
        })),
        { onConflict: 'user_id,source_key' },
      );
      if (error) throw error;
    }

    if (staleIds.length > 0) {
      const { error } = await client.from('notifications').delete().eq('user_id', userId).in('id', staleIds);
      if (error) throw error;
    }

    return list();
  },

  async markRead(id: string): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).eq('id', id);
    if (error) throw error;
  },

  async markAllRead(): Promise<void> {
    const userId = await assertCurrentUserId();
    const client = assertSupabaseConfigured();
    const { error } = await client.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
    if (error) throw error;
  },
};
