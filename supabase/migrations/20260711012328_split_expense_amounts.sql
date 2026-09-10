alter table public.transactions
  add column if not exists split_mode text not null default 'none',
  add column if not exists personal_amount numeric(14,2),
  add column if not exists reimbursement_amount numeric(14,2);

alter table public.recurring_transactions
  add column if not exists split_mode text not null default 'none',
  add column if not exists personal_amount numeric(14,2),
  add column if not exists reimbursement_amount numeric(14,2);

update public.transactions
set split_mode = case when is_reimbursable then 'third_party_full' else 'none' end,
    personal_amount = case when is_reimbursable then 0 else null end,
    reimbursement_amount = case when is_reimbursable then amount else null end
where is_reimbursable
  and (personal_amount is null or reimbursement_amount is null or split_mode = 'none');

update public.recurring_transactions
set split_mode = case when is_reimbursable then 'third_party_full' else 'none' end,
    personal_amount = case when is_reimbursable then 0 else null end,
    reimbursement_amount = case when is_reimbursable then amount else null end
where is_reimbursable
  and (personal_amount is null or reimbursement_amount is null or split_mode = 'none');

alter table public.transactions
  drop constraint if exists transactions_split_amounts_check,
  add constraint transactions_split_amounts_check check (
    (
      is_reimbursable = false
      and split_mode = 'none'
      and personal_amount is null
      and reimbursement_amount is null
    )
    or
    (
      is_reimbursable = true
      and flow = 'expense'
      and split_mode in ('shared', 'third_party_full')
      and personal_amount is not null
      and reimbursement_amount is not null
      and personal_amount >= 0
      and reimbursement_amount > 0
      and personal_amount + reimbursement_amount = amount
      and (
        (split_mode = 'shared' and personal_amount > 0)
        or (split_mode = 'third_party_full' and personal_amount = 0)
      )
    )
  );

alter table public.recurring_transactions
  drop constraint if exists recurring_transactions_split_amounts_check,
  add constraint recurring_transactions_split_amounts_check check (
    (
      is_reimbursable = false
      and split_mode = 'none'
      and personal_amount is null
      and reimbursement_amount is null
    )
    or
    (
      is_reimbursable = true
      and flow = 'expense'
      and split_mode in ('shared', 'third_party_full')
      and personal_amount is not null
      and reimbursement_amount is not null
      and personal_amount >= 0
      and reimbursement_amount > 0
      and personal_amount + reimbursement_amount = amount
      and reimbursement_status = 'pending'
      and (
        (split_mode = 'shared' and personal_amount > 0)
        or (split_mode = 'third_party_full' and personal_amount = 0)
      )
    )
  );

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
    set balance = balance - coalesce(old.reimbursement_amount, old.amount)
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
    set balance = balance + coalesce(new.reimbursement_amount, new.amount)
    where id = new.reimbursement_received_account_id and user_id = new.user_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.pay_card_invoice(
  p_account_id uuid,
  p_card_id uuid,
  p_payment_date date,
  p_expected_amount numeric,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  item jsonb;
  transaction_row public.transactions%rowtype;
  payment_row public.transactions%rowtype;
  account_row public.accounts%rowtype;
  card_name text;
  transaction_ids uuid[] := array[]::uuid[];
  calculated_amount numeric(14,2) := 0;
  signed_amount numeric(14,2);
  result_transactions jsonb;
  payment_meta jsonb;
  encoded_meta text;
  existing_meta jsonb;
begin
  if current_user_id is null then raise exception 'Usuario nao autenticado.'; end if;
  if p_payment_date is null then raise exception 'Informe a data do pagamento.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Esta fatura nao possui lancamentos para pagamento.';
  end if;

  select * into account_row from public.accounts
  where id = p_account_id and user_id = current_user_id for update;
  if not found then raise exception 'Conta de pagamento nao encontrada.'; end if;

  select name into card_name from public.cards
  where id = p_card_id and user_id = current_user_id;
  if not found then raise exception 'Cartao nao encontrado.'; end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    signed_amount := (item->>'signed_amount')::numeric;
    if signed_amount = 0 then raise exception 'A fatura contem um lancamento com valor invalido.'; end if;

    if coalesce((item->>'is_projected')::boolean, false) then
      insert into public.transactions (
        user_id, description, amount, flow, status, transaction_date,
        category_id, account_id, card_id, from_account_id, to_account_id, notes,
        is_reimbursable, split_mode, personal_amount, reimbursement_amount,
        reimbursement_person_id, reimbursement_status,
        reimbursement_received_at, reimbursement_received_account_id
      )
      values (
        current_user_id, item->>'description', (item->>'amount')::numeric,
        item->>'flow', 'pending', (item->>'transaction_date')::date,
        nullif(item->>'category_id', '')::uuid, null, p_card_id, null, null,
        nullif(item->>'notes', ''), coalesce((item->>'is_reimbursable')::boolean, false),
        coalesce(nullif(item->>'split_mode', ''), case when coalesce((item->>'is_reimbursable')::boolean, false) then 'third_party_full' else 'none' end),
        nullif(item->>'personal_amount', '')::numeric,
        nullif(item->>'reimbursement_amount', '')::numeric,
        nullif(item->>'reimbursement_person_id', '')::uuid,
        nullif(item->>'reimbursement_status', ''),
        nullif(item->>'reimbursement_received_at', '')::date,
        nullif(item->>'reimbursement_received_account_id', '')::uuid
      )
      returning * into transaction_row;
    else
      select * into transaction_row from public.transactions
      where id = (item->>'id')::uuid and user_id = current_user_id for update;
      if not found then
        raise exception 'Um lancamento da fatura nao foi encontrado. Recarregue os dados e tente novamente.';
      end if;
    end if;

    if transaction_row.card_id is distinct from p_card_id
      or transaction_row.flow <> 'expense'
      or transaction_row.status = 'cancelled'
      or transaction_row.amount <> abs(signed_amount) then
      raise exception 'A fatura mudou durante o pagamento. Recarregue os dados e tente novamente.';
    end if;

    existing_meta := '{}'::jsonb;
    encoded_meta := substring(coalesce(transaction_row.notes, '') from '\[axisfin-meta:([A-Za-z0-9+/=]+)\]');
    if encoded_meta is not null then
      begin
        existing_meta := convert_from(decode(encoded_meta, 'base64'), 'UTF8')::jsonb;
      exception when others then
        existing_meta := '{}'::jsonb;
      end;
    end if;

    if transaction_row.status = 'paid'
      and existing_meta ? 'paidAt'
      and existing_meta ? 'paidFromAccountId' then
      raise exception 'Esta fatura ja possui lancamentos pagos. Recarregue os dados antes de tentar novamente.';
    end if;

    update public.transactions set status = 'paid', notes = nullif(item->>'paid_notes', '')
    where id = transaction_row.id;
    transaction_ids := array_append(transaction_ids, transaction_row.id);
    calculated_amount := calculated_amount + signed_amount;
  end loop;

  if calculated_amount <= 0 or calculated_amount <> p_expected_amount then
    raise exception 'O valor da fatura mudou. Recarregue os dados e tente novamente.';
  end if;

  payment_meta := jsonb_build_object(
    'invoicePaymentCardId', p_card_id::text,
    'invoicePaymentPeriod', p_items->0->>'invoice_period',
    'paidAt', p_payment_date::text,
    'paidFromAccountId', p_account_id::text
  );

  insert into public.transactions (
    user_id, description, amount, flow, status, transaction_date,
    account_id, notes, is_reimbursable
  )
  values (
    current_user_id, 'Pagamento da fatura ' || card_name, calculated_amount,
    'expense', 'paid', p_payment_date, p_account_id,
    '[axisfin-meta:'
      || replace(encode(convert_to(payment_meta::text, 'UTF8'), 'base64'), chr(10), '')
      || ']',
    false
  )
  returning * into payment_row;

  transaction_ids := array_append(transaction_ids, payment_row.id);

  select * into account_row from public.accounts
  where id = p_account_id and user_id = current_user_id;

  select coalesce(jsonb_agg(to_jsonb(transaction_result)), '[]'::jsonb)
  into result_transactions
  from (
    select * from public.transactions
    where id = any(transaction_ids) and user_id = current_user_id
    order by transaction_date, created_at
  ) transaction_result;

  return jsonb_build_object('account', to_jsonb(account_row), 'transactions', result_transactions);
end;
$$;

revoke execute on function public.pay_card_invoice(uuid, uuid, date, numeric, jsonb) from public, anon;
grant execute on function public.pay_card_invoice(uuid, uuid, date, numeric, jsonb) to authenticated;
