-- AxisFin - cleanup after early demo seed
-- Use only in this fresh development project.
-- It removes fake financial data and adds uniqueness guards against duplicate seeds.

truncate table
  public.installments,
  public.invoices,
  public.transactions,
  public.cards,
  public.accounts
restart identity cascade;

alter table public.accounts
drop constraint if exists accounts_user_id_name_key;

alter table public.accounts
add constraint accounts_user_id_name_key unique (user_id, name);

alter table public.cards
drop constraint if exists cards_user_id_name_key;

alter table public.cards
add constraint cards_user_id_name_key unique (user_id, name);
