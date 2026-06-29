alter table public.notifications
  add column if not exists source_key text,
  add column if not exists action_view text
    check (action_view in ('transactions', 'cards', 'reimbursements'));

create unique index if not exists notifications_user_source_key_unique
on public.notifications (user_id, source_key);

create index if not exists notifications_user_unread_idx
on public.notifications (user_id, created_at desc)
where read_at is null;
