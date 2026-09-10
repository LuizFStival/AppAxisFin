alter table public.accounts
  add column if not exists last_balance_update date not null default current_date;
