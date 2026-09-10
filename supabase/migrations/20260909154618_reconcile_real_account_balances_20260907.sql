do $$
declare
  reconciled_on constant date := date '2026-09-07';
begin
  update public.accounts
  set
    name = 'Nubank',
    institution = 'Nubank',
    balance = 3073.83,
    last_balance_update = reconciled_on,
    is_active = true
  where lower(trim(name)) in ('nubank', 'nuconta')
    and coalesce(institution, '') ilike '%nubank%';

  update public.accounts
  set
    name = 'Mercado Pago',
    institution = 'Mercado Pago',
    balance = 10666.00,
    last_balance_update = reconciled_on,
    is_active = true
  where lower(trim(name)) = 'mercado pago'
    or coalesce(institution, '') ilike '%mercado pago%';

  update public.accounts
  set
    name = '99Pay',
    institution = '99Pay',
    balance = 792.05,
    last_balance_update = reconciled_on,
    is_active = true
  where lower(trim(name)) in ('99pay', '99 pay')
    or coalesce(institution, '') ilike '%99%';

  update public.accounts
  set
    name = 'Itaú',
    institution = 'Itaú',
    balance = 708.92,
    last_balance_update = reconciled_on,
    color = '#EC7000',
    is_active = true
  where lower(trim(name)) in ('itaú', 'itau')
    or coalesce(institution, '') ilike '%itaú%'
    or coalesce(institution, '') ilike '%itau%';

  update public.accounts as account
  set
    name = 'Itaú',
    institution = 'Itaú',
    balance = 708.92,
    last_balance_update = reconciled_on,
    color = '#EC7000',
    is_active = true
  where lower(trim(account.name)) in ('c6conta', 'c6 conta', 'c6 bank')
    and not exists (
      select 1
      from public.accounts as existing
      where existing.user_id = account.user_id
        and lower(trim(existing.name)) in ('itaú', 'itau')
    );

  update public.accounts
  set is_active = false
  where lower(trim(name)) in ('conta principal', 'carteira', 'reserva', 'c6conta', 'c6 conta', 'c6 bank');
end;
$$;
