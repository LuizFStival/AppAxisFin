revoke all privileges on table public.budgets from anon;
revoke all privileges on table public.budgets from authenticated;

grant select, insert, update, delete on table public.budgets to authenticated;
