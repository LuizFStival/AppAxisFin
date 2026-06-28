alter table public.profiles
  add column if not exists reimbursements_enabled boolean not null default false;

-- Preserve the feature for every existing account. New accounts start with it disabled.
update public.profiles
set reimbursements_enabled = true;
