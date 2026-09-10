create table if not exists public.reserve_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution text not null default 'Outro',
  cdi_percent numeric(6,2) not null default 100 check (cdi_percent >= 0 and cdi_percent <= 300),
  initial_balance numeric(14,2) not null default 0 check (initial_balance >= 0),
  current_balance numeric(14,2) not null default 0 check (current_balance >= 0),
  created_on date not null default current_date,
  goal text,
  color text not null default '#8B5CF6',
  icon text not null default 'PiggyBank',
  last_balance_update date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.reserve_box_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reserve_box_id uuid not null,
  movement_type text not null check (movement_type in ('deposit', 'withdrawal', 'yield', 'balance_update')),
  amount numeric(14,2) not null check (amount >= 0),
  movement_date date not null default current_date,
  description text,
  created_at timestamptz not null default now(),
  constraint reserve_box_movements_box_owner_fk
    foreign key (reserve_box_id, user_id) references public.reserve_boxes(id, user_id) on delete cascade,
  constraint reserve_box_movements_positive_check check (
    (movement_type = 'balance_update' and amount >= 0)
    or
    (movement_type <> 'balance_update' and amount > 0)
  )
);

create index if not exists reserve_boxes_user_id_idx on public.reserve_boxes(user_id);
create index if not exists reserve_boxes_user_active_idx on public.reserve_boxes(user_id, is_active);
create index if not exists reserve_boxes_user_institution_idx on public.reserve_boxes(user_id, institution);
create unique index if not exists reserve_boxes_user_id_name_ci_idx
on public.reserve_boxes(user_id, lower(trim(name)))
where is_active;
create index if not exists reserve_box_movements_user_box_idx
on public.reserve_box_movements(user_id, reserve_box_id, movement_date desc, created_at desc);

drop trigger if exists reserve_boxes_set_updated_at on public.reserve_boxes;
create trigger reserve_boxes_set_updated_at
before update on public.reserve_boxes
for each row execute function public.set_updated_at();

create or replace function public.apply_reserve_box_movement()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_amount numeric(14,2);
  next_amount numeric(14,2);
begin
  select current_balance into current_amount
  from public.reserve_boxes
  where id = new.reserve_box_id
    and user_id = new.user_id
  for update;

  if current_amount is null then
    raise exception 'Caixinha nao encontrada para o usuario atual.';
  end if;

  next_amount := case new.movement_type
    when 'deposit' then current_amount + new.amount
    when 'yield' then current_amount + new.amount
    when 'withdrawal' then current_amount - new.amount
    when 'balance_update' then new.amount
    else current_amount
  end;

  if next_amount < 0 then
    raise exception 'O valor retirado e maior que o saldo atual da caixinha.';
  end if;

  update public.reserve_boxes
  set current_balance = next_amount,
      last_balance_update = new.movement_date
  where id = new.reserve_box_id
    and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists reserve_box_movements_apply_amount on public.reserve_box_movements;
create trigger reserve_box_movements_apply_amount
before insert on public.reserve_box_movements
for each row execute function public.apply_reserve_box_movement();

alter table public.reserve_boxes enable row level security;
alter table public.reserve_box_movements enable row level security;

drop policy if exists reserve_boxes_select_own on public.reserve_boxes;
create policy reserve_boxes_select_own on public.reserve_boxes
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reserve_boxes_insert_own on public.reserve_boxes;
create policy reserve_boxes_insert_own on public.reserve_boxes
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists reserve_boxes_update_own on public.reserve_boxes;
create policy reserve_boxes_update_own on public.reserve_boxes
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists reserve_boxes_delete_own on public.reserve_boxes;
create policy reserve_boxes_delete_own on public.reserve_boxes
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reserve_box_movements_select_own on public.reserve_box_movements;
create policy reserve_box_movements_select_own on public.reserve_box_movements
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reserve_box_movements_insert_own on public.reserve_box_movements;
create policy reserve_box_movements_insert_own on public.reserve_box_movements
for insert to authenticated
with check ((select auth.uid()) = user_id);

revoke all privileges on table public.reserve_boxes from anon;
revoke all privileges on table public.reserve_boxes from authenticated;
revoke all privileges on table public.reserve_box_movements from anon;
revoke all privileges on table public.reserve_box_movements from authenticated;
grant select, insert, update, delete on table public.reserve_boxes to authenticated;
grant select, insert on table public.reserve_box_movements to authenticated;
revoke execute on function public.apply_reserve_box_movement() from public, anon, authenticated;

create or replace function public.reset_my_finance_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  delete from public.notifications where user_id = current_user_id;
  delete from public.budgets where user_id = current_user_id;
  delete from public.reserve_boxes where user_id = current_user_id;
  delete from public.commitments where user_id = current_user_id;
  delete from public.goals where user_id = current_user_id;
  delete from public.recurring_transactions where user_id = current_user_id;
  delete from public.transactions where user_id = current_user_id;
  delete from public.reimbursement_people where user_id = current_user_id;
  delete from public.cards where user_id = current_user_id;
  delete from public.accounts where user_id = current_user_id;
  delete from public.categories where user_id = current_user_id;
end;
$$;
