-- AxisFin - Supabase schema
-- Run in Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text not null default 'BRL',
  reimbursements_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'cash', 'investment')),
  institution text,
  balance numeric(14,2) not null default 0,
  color text not null default '#3B82F6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  network text not null default 'other' check (network in ('mastercard', 'visa', 'elo', 'other')),
  credit_limit numeric(14,2) not null default 0,
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  color text not null default '#8B5CF6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  flow text not null check (flow in ('income', 'expense')),
  icon text,
  color text not null default '#64748B',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, flow)
);

create table if not exists public.reimbursement_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  flow text not null check (flow in ('income', 'expense', 'transfer')),
  status text not null default 'pending' check (status in ('paid', 'pending', 'cancelled')),
  transaction_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  from_account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  is_reimbursable boolean not null default false,
  reimbursement_person_id uuid references public.reimbursement_people(id) on delete set null,
  reimbursement_status text check (reimbursement_status in ('pending', 'received')),
  reimbursement_received_at date,
  reimbursement_received_account_id uuid references public.accounts(id) on delete set null,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_flow_source_check check (
    (
      flow in ('income', 'expense')
      and (account_id is not null or card_id is not null)
      and from_account_id is null
      and to_account_id is null
    )
    or
    (
      flow = 'transfer'
      and from_account_id is not null
      and to_account_id is not null
      and from_account_id <> to_account_id
      and account_id is null
      and card_id is null
      and category_id is null
    )
  ),
  constraint transactions_reimbursement_check check (
    (
      is_reimbursable = false
      and reimbursement_person_id is null
      and reimbursement_status is null
      and reimbursement_received_at is null
      and reimbursement_received_account_id is null
    )
    or
    (
      is_reimbursable = true
      and flow = 'expense'
      and reimbursement_person_id is not null
      and reimbursement_status in ('pending', 'received')
      and (
        (
          reimbursement_status = 'pending'
          and reimbursement_received_at is null
          and reimbursement_received_account_id is null
        )
        or
        (
          reimbursement_status = 'received'
          and reimbursement_received_at is not null
        )
      )
    )
  )
);

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

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  period text not null,
  start_date date not null,
  end_date date not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'closed', 'paid', 'overdue')),
  total_amount numeric(14,2) not null default 0,
  paid_at timestamptz,
  payment_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id, period),
  check (start_date <= end_date)
);

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  installment_number int not null check (installment_number > 0),
  total_installments int not null check (total_installments > 0),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (installment_number <= total_installments)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  category_id uuid references public.categories(id) on delete set null,
  image_path text,
  target_date date,
  color text not null default '#10B981',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals
  add constraint goals_id_user_id_unique unique (id, user_id);

create table if not exists public.goal_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  amount numeric(14,2) not null check (amount <> 0),
  created_at timestamptz not null default now(),
  constraint goal_movements_goal_owner_fk
    foreign key (goal_id, user_id) references public.goals(id, user_id) on delete cascade
);

create or replace function public.apply_goal_movement()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_amount numeric(14,2);
begin
  select current_amount + new.amount into next_amount
  from public.goals
  where id = new.goal_id and user_id = new.user_id
  for update;

  if next_amount is null then raise exception 'Meta não encontrada para o usuário atual.'; end if;
  if next_amount < 0 then raise exception 'O valor retirado é maior que o saldo atual da meta.'; end if;

  update public.goals
  set current_amount = next_amount,
      status = case when next_amount >= target_amount then 'completed' else 'active' end
  where id = new.goal_id and user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists goal_movements_apply_amount on public.goal_movements;
create trigger goal_movements_apply_amount
before insert on public.goal_movements
for each row execute function public.apply_goal_movement();

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  period text not null,
  limit_amount numeric(14,2) not null check (limit_amount >= 0),
  alert_percent int not null default 80 check (alert_percent between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info', 'warning', 'success', 'danger')),
  read_at timestamptz,
  scheduled_for timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create unique index if not exists accounts_user_id_name_ci_idx on public.accounts (user_id, lower(trim(name)));
create index if not exists cards_user_id_idx on public.cards(user_id);
create index if not exists cards_account_id_idx on public.cards(account_id);
create unique index if not exists cards_user_id_name_ci_idx on public.cards (user_id, lower(trim(name)));
create index if not exists categories_user_id_idx on public.categories(user_id);
create unique index if not exists categories_user_flow_name_ci_unique
on public.categories (user_id, flow, lower(trim(name)));
create index if not exists reimbursement_people_user_id_idx on public.reimbursement_people(user_id);
create unique index if not exists reimbursement_people_user_id_name_ci_idx on public.reimbursement_people(user_id, lower(trim(name)));
create index if not exists transactions_user_id_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_account_id_idx on public.transactions(account_id);
create index if not exists transactions_card_id_idx on public.transactions(card_id);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists transactions_from_account_id_idx on public.transactions(from_account_id);
create index if not exists transactions_to_account_id_idx on public.transactions(to_account_id);
create index if not exists transactions_reimbursement_person_id_idx on public.transactions(reimbursement_person_id);
create index if not exists transactions_user_reimbursement_idx on public.transactions(user_id, is_reimbursable, reimbursement_status);
create index if not exists transactions_reimbursement_received_account_id_idx on public.transactions(reimbursement_received_account_id);
create index if not exists recurring_transactions_user_id_idx on public.recurring_transactions(user_id);
create index if not exists recurring_transactions_user_active_start_idx on public.recurring_transactions(user_id, is_active, start_date);
create index if not exists recurring_transactions_category_id_idx on public.recurring_transactions(category_id);
create index if not exists recurring_transactions_account_id_idx on public.recurring_transactions(account_id);
create index if not exists recurring_transactions_card_id_idx on public.recurring_transactions(card_id);
create index if not exists recurring_transactions_reimbursement_person_id_idx on public.recurring_transactions(reimbursement_person_id);
create index if not exists invoices_user_id_period_idx on public.invoices(user_id, period);
create index if not exists invoices_card_id_idx on public.invoices(card_id);
create index if not exists installments_user_id_due_date_idx on public.installments(user_id, due_date);
create index if not exists installments_transaction_id_idx on public.installments(transaction_id);
create index if not exists installments_invoice_id_idx on public.installments(invoice_id);
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goal_movements_user_goal_idx on public.goal_movements(user_id, goal_id, created_at desc);
create index if not exists budgets_user_id_period_idx on public.budgets(user_id, period);
create index if not exists budgets_category_id_idx on public.budgets(category_id);
create index if not exists notifications_user_id_created_at_idx on public.notifications(user_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists reimbursement_people_set_updated_at on public.reimbursement_people;
create trigger reimbursement_people_set_updated_at
before update on public.reimbursement_people
for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create or replace function public.sync_account_balance_from_transaction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'paid' then
    if old.flow = 'income' and old.account_id is not null then
      update public.accounts set balance = balance - old.amount where id = old.account_id and user_id = old.user_id;
    elsif old.flow = 'expense' and old.account_id is not null then
      update public.accounts set balance = balance + old.amount where id = old.account_id and user_id = old.user_id;
    elsif old.flow = 'transfer' then
      update public.accounts set balance = balance + old.amount where id = old.from_account_id and user_id = old.user_id;
      update public.accounts set balance = balance - old.amount where id = old.to_account_id and user_id = old.user_id;
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE')
    and old.is_reimbursable
    and old.reimbursement_status = 'received'
    and old.reimbursement_received_account_id is not null then
    update public.accounts
    set balance = balance - old.amount
    where id = old.reimbursement_received_account_id and user_id = old.user_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.status = 'paid' then
    if new.flow = 'income' and new.account_id is not null then
      update public.accounts set balance = balance + new.amount where id = new.account_id and user_id = new.user_id;
    elsif new.flow = 'expense' and new.account_id is not null then
      update public.accounts set balance = balance - new.amount where id = new.account_id and user_id = new.user_id;
    elsif new.flow = 'transfer' then
      update public.accounts set balance = balance - new.amount where id = new.from_account_id and user_id = new.user_id;
      update public.accounts set balance = balance + new.amount where id = new.to_account_id and user_id = new.user_id;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE')
    and new.is_reimbursable
    and new.reimbursement_status = 'received'
    and new.reimbursement_received_account_id is not null then
    update public.accounts
    set balance = balance + new.amount
    where id = new.reimbursement_received_account_id and user_id = new.user_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_sync_account_balance on public.transactions;
create trigger transactions_sync_account_balance
after insert or update or delete on public.transactions
for each row execute function public.sync_account_balance_from_transaction();

drop trigger if exists recurring_transactions_set_updated_at on public.recurring_transactions;
create trigger recurring_transactions_set_updated_at
before update on public.recurring_transactions
for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists installments_set_updated_at on public.installments;
create trigger installments_set_updated_at
before update on public.installments
for each row execute function public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.cards enable row level security;
alter table public.categories enable row level security;
alter table public.reimbursement_people enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.installments enable row level security;
alter table public.goals enable row level security;
alter table public.goal_movements enable row level security;
alter table public.budgets enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own on public.accounts
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists accounts_insert_own on public.accounts;
create policy accounts_insert_own on public.accounts
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists accounts_update_own on public.accounts;
create policy accounts_update_own on public.accounts
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists accounts_delete_own on public.accounts;
create policy accounts_delete_own on public.accounts
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists cards_select_own on public.cards;
create policy cards_select_own on public.cards
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists cards_insert_own on public.cards;
create policy cards_insert_own on public.cards
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists cards_update_own on public.cards;
create policy cards_update_own on public.cards
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists cards_delete_own on public.cards;
create policy cards_delete_own on public.cards
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists categories_select_own on public.categories;
create policy categories_select_own on public.categories
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists categories_insert_own on public.categories;
create policy categories_insert_own on public.categories
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists categories_update_own on public.categories;
create policy categories_update_own on public.categories
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists categories_delete_own on public.categories;
create policy categories_delete_own on public.categories
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reimbursement_people_select_own on public.reimbursement_people;
create policy reimbursement_people_select_own on public.reimbursement_people
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reimbursement_people_insert_own on public.reimbursement_people;
create policy reimbursement_people_insert_own on public.reimbursement_people
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists reimbursement_people_update_own on public.reimbursement_people;
create policy reimbursement_people_update_own on public.reimbursement_people
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists reimbursement_people_delete_own on public.reimbursement_people;
create policy reimbursement_people_delete_own on public.reimbursement_people
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own on public.transactions
for delete to authenticated
using ((select auth.uid()) = user_id);

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

drop policy if exists invoices_select_own on public.invoices;
create policy invoices_select_own on public.invoices
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists invoices_insert_own on public.invoices;
create policy invoices_insert_own on public.invoices
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists invoices_update_own on public.invoices;
create policy invoices_update_own on public.invoices
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists invoices_delete_own on public.invoices;
create policy invoices_delete_own on public.invoices
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists installments_select_own on public.installments;
create policy installments_select_own on public.installments
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists installments_insert_own on public.installments;
create policy installments_insert_own on public.installments
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists installments_update_own on public.installments;
create policy installments_update_own on public.installments
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists installments_delete_own on public.installments;
create policy installments_delete_own on public.installments
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists goals_select_own on public.goals;
create policy goals_select_own on public.goals
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists goals_insert_own on public.goals;
create policy goals_insert_own on public.goals
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists goals_update_own on public.goals;
create policy goals_update_own on public.goals
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists goals_delete_own on public.goals;
create policy goals_delete_own on public.goals
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists goal_movements_select_own on public.goal_movements;
create policy goal_movements_select_own on public.goal_movements
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists goal_movements_insert_own on public.goal_movements;
create policy goal_movements_insert_own on public.goal_movements
for insert to authenticated
with check ((select auth.uid()) = user_id);

grant select, insert on public.goal_movements to authenticated;

drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own on public.budgets
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own on public.budgets
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own on public.budgets
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own on public.budgets
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists notifications_insert_own on public.notifications;
create policy notifications_insert_own on public.notifications
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
for delete to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transaction-attachments',
  'transaction-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists transaction_attachments_select_own on storage.objects;
create policy transaction_attachments_select_own on storage.objects
for select to authenticated
using (
  bucket_id = 'transaction-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists transaction_attachments_insert_own on storage.objects;
create policy transaction_attachments_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'transaction-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists transaction_attachments_update_own on storage.objects;
create policy transaction_attachments_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'transaction-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'transaction-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists transaction_attachments_delete_own on storage.objects;
create policy transaction_attachments_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'transaction-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.assert_owned_account(account_id uuid, owner_id uuid)
returns void
language plpgsql
as $$
begin
  if account_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.accounts
    where id = account_id
      and user_id = owner_id
  ) then
    raise exception 'Conta nao pertence ao usuario autenticado.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_owned_card(card_id uuid, owner_id uuid)
returns void
language plpgsql
as $$
begin
  if card_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.cards
    where id = card_id
      and user_id = owner_id
  ) then
    raise exception 'Cartao nao pertence ao usuario autenticado.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_owned_category(category_id uuid, owner_id uuid)
returns void
language plpgsql
as $$
begin
  if category_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.categories
    where id = category_id
      and user_id = owner_id
  ) then
    raise exception 'Categoria nao pertence ao usuario autenticado.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_owned_reimbursement_person(person_id uuid, owner_id uuid)
returns void
language plpgsql
as $$
begin
  if person_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.reimbursement_people
    where id = person_id
      and user_id = owner_id
  ) then
    raise exception 'Pessoa de reembolso nao pertence ao usuario autenticado.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_owned_transaction(transaction_id uuid, owner_id uuid)
returns void
language plpgsql
as $$
begin
  if transaction_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.transactions
    where id = transaction_id
      and user_id = owner_id
  ) then
    raise exception 'Lancamento nao pertence ao usuario autenticado.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_owned_invoice(invoice_id uuid, owner_id uuid)
returns void
language plpgsql
as $$
begin
  if invoice_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.invoices
    where id = invoice_id
      and user_id = owner_id
  ) then
    raise exception 'Fatura nao pertence ao usuario autenticado.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.validate_card_owner_refs()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_owned_account(new.account_id, new.user_id);
  return new;
end;
$$;

create or replace function public.validate_transaction_owner_refs()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_owned_account(new.account_id, new.user_id);
  perform public.assert_owned_account(new.from_account_id, new.user_id);
  perform public.assert_owned_account(new.to_account_id, new.user_id);
  perform public.assert_owned_account(new.reimbursement_received_account_id, new.user_id);
  perform public.assert_owned_card(new.card_id, new.user_id);
  perform public.assert_owned_category(new.category_id, new.user_id);
  perform public.assert_owned_reimbursement_person(new.reimbursement_person_id, new.user_id);
  return new;
end;
$$;

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

create or replace function public.validate_invoice_owner_refs()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_owned_card(new.card_id, new.user_id);
  perform public.assert_owned_account(new.payment_account_id, new.user_id);
  return new;
end;
$$;

create or replace function public.validate_installment_owner_refs()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_owned_transaction(new.transaction_id, new.user_id);
  perform public.assert_owned_invoice(new.invoice_id, new.user_id);
  return new;
end;
$$;

create or replace function public.validate_budget_owner_refs()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_owned_category(new.category_id, new.user_id);
  return new;
end;
$$;

drop trigger if exists cards_validate_owner_refs on public.cards;
create trigger cards_validate_owner_refs
before insert or update on public.cards
for each row execute function public.validate_card_owner_refs();

drop trigger if exists transactions_validate_owner_refs on public.transactions;
create trigger transactions_validate_owner_refs
before insert or update on public.transactions
for each row execute function public.validate_transaction_owner_refs();

drop trigger if exists recurring_transactions_validate_owner_refs on public.recurring_transactions;
create trigger recurring_transactions_validate_owner_refs
before insert or update on public.recurring_transactions
for each row execute function public.validate_recurring_transaction_owner_refs();

drop trigger if exists invoices_validate_owner_refs on public.invoices;
create trigger invoices_validate_owner_refs
before insert or update on public.invoices
for each row execute function public.validate_invoice_owner_refs();

drop trigger if exists installments_validate_owner_refs on public.installments;
create trigger installments_validate_owner_refs
before insert or update on public.installments
for each row execute function public.validate_installment_owner_refs();

drop trigger if exists budgets_validate_owner_refs on public.budgets;
create trigger budgets_validate_owner_refs
before insert or update on public.budgets
for each row execute function public.validate_budget_owner_refs();
