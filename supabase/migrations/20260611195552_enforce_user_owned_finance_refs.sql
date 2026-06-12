-- Enforce that every cross-table finance reference belongs to the same user.
-- RLS controls row visibility; these triggers protect writes from linking one
-- user's records to another user's account, card, category, invoice, or transaction.

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
  perform public.assert_owned_card(new.card_id, new.user_id);
  perform public.assert_owned_category(new.category_id, new.user_id);
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
