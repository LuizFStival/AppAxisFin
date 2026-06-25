alter table public.transactions
  add column if not exists reimbursement_received_account_id uuid references public.accounts(id) on delete set null;

create index if not exists transactions_reimbursement_received_account_id_idx
  on public.transactions(reimbursement_received_account_id);

alter table public.transactions
  drop constraint if exists transactions_reimbursement_check;

alter table public.transactions
  add constraint transactions_reimbursement_check check (
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
  );

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
