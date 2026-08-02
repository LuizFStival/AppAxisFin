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
  if not found then
    raise exception 'Cartao nao encontrado.';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    signed_amount := round((item->>'signed_amount')::numeric, 2);
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
        current_user_id, item->>'description', round((item->>'amount')::numeric, 2),
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
      or round(transaction_row.amount, 2) <> abs(signed_amount) then
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

  if calculated_amount <= 0 or round(calculated_amount, 2) <> round(p_expected_amount, 2) then
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
