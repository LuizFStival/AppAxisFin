-- Impede contas e cartoes com o mesmo nome (ignorando maiusculas/minusculas e espacos extras)

alter table public.accounts drop constraint if exists accounts_user_id_name_key;
create unique index if not exists accounts_user_id_name_ci_idx on public.accounts (user_id, lower(trim(name)));

alter table public.cards drop constraint if exists cards_user_id_name_key;
create unique index if not exists cards_user_id_name_ci_idx on public.cards (user_id, lower(trim(name)));
