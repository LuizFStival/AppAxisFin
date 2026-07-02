create or replace function public.reset_my_finance_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  delete from public.notifications where user_id = current_user_id;
  delete from public.budgets where user_id = current_user_id;
  delete from public.goals where user_id = current_user_id;
  delete from public.recurring_transactions where user_id = current_user_id;
  delete from public.transactions where user_id = current_user_id;
  delete from public.reimbursement_people where user_id = current_user_id;
  delete from public.cards where user_id = current_user_id;
  delete from public.accounts where user_id = current_user_id;
  delete from public.categories where user_id = current_user_id;
end;
$$;

revoke execute on function public.reset_my_finance_data() from public, anon;
grant execute on function public.reset_my_finance_data() to authenticated;
