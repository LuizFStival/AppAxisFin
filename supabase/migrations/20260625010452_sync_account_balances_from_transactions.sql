create or replace function public.sync_account_balance_from_transaction()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'paid' then
    if old.flow = 'income' and old.account_id is not null then
      update public.accounts
      set balance = balance - old.amount
      where id = old.account_id and user_id = old.user_id;
    elsif old.flow = 'expense' and old.account_id is not null then
      update public.accounts
      set balance = balance + old.amount
      where id = old.account_id and user_id = old.user_id;
    elsif old.flow = 'transfer' then
      update public.accounts
      set balance = balance + old.amount
      where id = old.from_account_id and user_id = old.user_id;

      update public.accounts
      set balance = balance - old.amount
      where id = old.to_account_id and user_id = old.user_id;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.status = 'paid' then
    if new.flow = 'income' and new.account_id is not null then
      update public.accounts
      set balance = balance + new.amount
      where id = new.account_id and user_id = new.user_id;
    elsif new.flow = 'expense' and new.account_id is not null then
      update public.accounts
      set balance = balance - new.amount
      where id = new.account_id and user_id = new.user_id;
    elsif new.flow = 'transfer' then
      update public.accounts
      set balance = balance - new.amount
      where id = new.from_account_id and user_id = new.user_id;

      update public.accounts
      set balance = balance + new.amount
      where id = new.to_account_id and user_id = new.user_id;
    end if;
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
