create table if not exists public.reimbursement_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists is_reimbursable boolean not null default false,
  add column if not exists reimbursement_person_id uuid references public.reimbursement_people(id) on delete set null,
  add column if not exists reimbursement_status text check (reimbursement_status in ('pending', 'received')),
  add column if not exists reimbursement_received_at date;

alter table public.transactions
  drop constraint if exists transactions_reimbursement_check;

alter table public.transactions
  add constraint transactions_reimbursement_check check (
    (
      is_reimbursable = false
      and reimbursement_person_id is null
      and reimbursement_status is null
      and reimbursement_received_at is null
    )
    or
    (
      is_reimbursable = true
      and flow = 'expense'
      and reimbursement_person_id is not null
      and reimbursement_status in ('pending', 'received')
      and (reimbursement_status = 'received' or reimbursement_received_at is null)
    )
  );

create index if not exists reimbursement_people_user_id_idx on public.reimbursement_people(user_id);
create unique index if not exists reimbursement_people_user_id_name_ci_idx on public.reimbursement_people(user_id, lower(trim(name)));
create index if not exists transactions_reimbursement_person_id_idx on public.transactions(reimbursement_person_id);
create index if not exists transactions_user_reimbursement_idx on public.transactions(user_id, is_reimbursable, reimbursement_status);

drop trigger if exists reimbursement_people_set_updated_at on public.reimbursement_people;
create trigger reimbursement_people_set_updated_at
before update on public.reimbursement_people
for each row execute function public.set_updated_at();

alter table public.reimbursement_people enable row level security;

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

grant select, insert, update, delete on public.reimbursement_people to authenticated;

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

create or replace function public.validate_transaction_owner_refs()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_owned_account(new.account_id, new.user_id);
  perform public.assert_owned_account(new.from_account_id, new.user_id);
  perform public.assert_owned_account(new.to_account_id, new.user_id);
  perform public.assert_owned_card(new.card_id, new.user_id);
  perform public.assert_owned_category(new.category_id, new.user_id);
  perform public.assert_owned_reimbursement_person(new.reimbursement_person_id, new.user_id);
  return new;
end;
$$;
