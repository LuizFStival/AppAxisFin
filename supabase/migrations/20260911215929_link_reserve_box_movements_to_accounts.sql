do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_id_user_id_unique'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_id_user_id_unique unique (id, user_id);
  end if;
end;
$$;

alter table public.reserve_box_movements
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists reserve_box_movements_account_id_idx
on public.reserve_box_movements(account_id);

create or replace function public.apply_reserve_box_movement()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_box_balance numeric(14,2);
  next_box_balance numeric(14,2);
  current_account_balance numeric(14,2);
  next_account_balance numeric(14,2);
begin
  select current_balance into current_box_balance
  from public.reserve_boxes
  where id = new.reserve_box_id
    and user_id = new.user_id
  for update;

  if current_box_balance is null then
    raise exception 'Caixinha nao encontrada para o usuario atual.';
  end if;

  if new.account_id is not null and new.movement_type not in ('deposit', 'withdrawal') then
    raise exception 'Conta so pode ser vinculada a aplicacao ou resgate de caixinha.';
  end if;

  next_box_balance := case new.movement_type
    when 'deposit' then current_box_balance + new.amount
    when 'yield' then current_box_balance + new.amount
    when 'withdrawal' then current_box_balance - new.amount
    when 'balance_update' then new.amount
    else current_box_balance
  end;

  if next_box_balance < 0 then
    raise exception 'O valor retirado e maior que o saldo atual da caixinha.';
  end if;

  if new.account_id is not null then
    select balance into current_account_balance
    from public.accounts
    where id = new.account_id
      and user_id = new.user_id
    for update;

    if current_account_balance is null then
      raise exception 'Conta nao encontrada para o usuario atual.';
    end if;

    next_account_balance := case new.movement_type
      when 'deposit' then current_account_balance - new.amount
      when 'withdrawal' then current_account_balance + new.amount
      else current_account_balance
    end;

    update public.accounts
    set balance = next_account_balance,
        last_balance_update = new.movement_date
    where id = new.account_id
      and user_id = new.user_id;
  end if;

  update public.reserve_boxes
  set current_balance = next_box_balance,
      last_balance_update = new.movement_date
  where id = new.reserve_box_id
    and user_id = new.user_id;

  return new;
end;
$$;

revoke execute on function public.apply_reserve_box_movement() from public, anon, authenticated;
