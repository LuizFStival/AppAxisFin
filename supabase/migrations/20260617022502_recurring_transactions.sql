create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  flow text not null default 'expense' check (flow in ('income', 'expense')),
  status text not null default 'pending' check (status in ('paid', 'pending')),
  start_date date not null,
  end_date date,
  interval_months int not null default 1 check (interval_months > 0 and interval_months <= 12),
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  notes text,
  is_reimbursable boolean not null default false,
  reimbursement_person_id uuid references public.reimbursement_people(id) on delete set null,
  reimbursement_status text check (reimbursement_status in ('pending', 'received')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  constraint recurring_transactions_flow_source_check check (
    (account_id is not null or card_id is not null)
    and not (account_id is not null and card_id is not null)
  ),
  constraint recurring_transactions_reimbursement_check check (
    (
      is_reimbursable = false
      and reimbursement_person_id is null
      and reimbursement_status is null
    )
    or
    (
      is_reimbursable = true
      and flow = 'expense'
      and reimbursement_person_id is not null
      and reimbursement_status = 'pending'
    )
  )
);

create index if not exists recurring_transactions_user_id_idx on public.recurring_transactions(user_id);
create index if not exists recurring_transactions_user_active_start_idx on public.recurring_transactions(user_id, is_active, start_date);
create index if not exists recurring_transactions_category_id_idx on public.recurring_transactions(category_id);
create index if not exists recurring_transactions_account_id_idx on public.recurring_transactions(account_id);
create index if not exists recurring_transactions_card_id_idx on public.recurring_transactions(card_id);
create index if not exists recurring_transactions_reimbursement_person_id_idx on public.recurring_transactions(reimbursement_person_id);

drop trigger if exists recurring_transactions_set_updated_at on public.recurring_transactions;
create trigger recurring_transactions_set_updated_at
before update on public.recurring_transactions
for each row execute function public.set_updated_at();

alter table public.recurring_transactions enable row level security;

drop policy if exists recurring_transactions_select_own on public.recurring_transactions;
create policy recurring_transactions_select_own on public.recurring_transactions
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists recurring_transactions_insert_own on public.recurring_transactions;
create policy recurring_transactions_insert_own on public.recurring_transactions
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists recurring_transactions_update_own on public.recurring_transactions;
create policy recurring_transactions_update_own on public.recurring_transactions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists recurring_transactions_delete_own on public.recurring_transactions;
create policy recurring_transactions_delete_own on public.recurring_transactions
for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.recurring_transactions to authenticated;

create or replace function public.validate_recurring_transaction_owner_refs()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_owned_account(new.account_id, new.user_id);
  perform public.assert_owned_card(new.card_id, new.user_id);
  perform public.assert_owned_category(new.category_id, new.user_id);
  perform public.assert_owned_reimbursement_person(new.reimbursement_person_id, new.user_id);
  return new;
end;
$$;

drop trigger if exists recurring_transactions_validate_owner_refs on public.recurring_transactions;
create trigger recurring_transactions_validate_owner_refs
before insert or update on public.recurring_transactions
for each row execute function public.validate_recurring_transaction_owner_refs();
