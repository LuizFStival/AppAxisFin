create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_value numeric(14,2) not null check (total_value > 0),
  my_share_percent numeric(5,2) not null default 50 check (my_share_percent > 0 and my_share_percent <= 100),
  partner_person_id uuid references public.reimbursement_people(id) on delete set null,
  monthly_amount numeric(14,2) check (monthly_amount is null or monthly_amount > 0),
  installment_count int check (installment_count is null or installment_count > 0),
  start_date date,
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  color text not null default '#8B5CF6',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commitments_user_id_idx on public.commitments(user_id);
create index if not exists commitments_partner_person_id_idx on public.commitments(partner_person_id);
create index if not exists commitments_user_status_idx on public.commitments(user_id, status);

drop trigger if exists commitments_set_updated_at on public.commitments;
create trigger commitments_set_updated_at
before update on public.commitments
for each row execute function public.set_updated_at();

create or replace function public.validate_commitment_owner_refs()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_owned_reimbursement_person(new.partner_person_id, new.user_id);
  return new;
end;
$$;

drop trigger if exists commitments_validate_owner_refs on public.commitments;
create trigger commitments_validate_owner_refs
before insert or update on public.commitments
for each row execute function public.validate_commitment_owner_refs();

alter table public.commitments enable row level security;

drop policy if exists commitments_select_own on public.commitments;
create policy commitments_select_own on public.commitments
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists commitments_insert_own on public.commitments;
create policy commitments_insert_own on public.commitments
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists commitments_update_own on public.commitments;
create policy commitments_update_own on public.commitments
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists commitments_delete_own on public.commitments;
create policy commitments_delete_own on public.commitments
for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.commitments to authenticated;

alter function public.validate_commitment_owner_refs() set search_path = public, pg_temp;

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
