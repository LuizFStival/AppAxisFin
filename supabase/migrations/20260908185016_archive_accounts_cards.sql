alter table public.accounts
add column if not exists is_active boolean not null default true;

alter table public.cards
add column if not exists is_active boolean not null default true;

drop index if exists public.accounts_user_id_name_ci_idx;
create unique index if not exists accounts_user_id_name_ci_idx
on public.accounts (user_id, lower(trim(name)))
where is_active;

drop index if exists public.cards_user_id_name_ci_idx;
create unique index if not exists cards_user_id_name_ci_idx
on public.cards (user_id, lower(trim(name)))
where is_active;
