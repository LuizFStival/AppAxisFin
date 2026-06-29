-- Corrige alertas de segurança do Database Advisor e impede referências
-- de metas a categorias pertencentes a outro usuário.

alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.assert_owned_account(uuid, uuid) set search_path = public, pg_temp;
alter function public.assert_owned_card(uuid, uuid) set search_path = public, pg_temp;
alter function public.assert_owned_category(uuid, uuid) set search_path = public, pg_temp;
alter function public.assert_owned_transaction(uuid, uuid) set search_path = public, pg_temp;
alter function public.assert_owned_invoice(uuid, uuid) set search_path = public, pg_temp;
alter function public.assert_owned_reimbursement_person(uuid, uuid) set search_path = public, pg_temp;
alter function public.validate_card_owner_refs() set search_path = public, pg_temp;
alter function public.validate_transaction_owner_refs() set search_path = public, pg_temp;
alter function public.validate_recurring_transaction_owner_refs() set search_path = public, pg_temp;
alter function public.validate_invoice_owner_refs() set search_path = public, pg_temp;
alter function public.validate_installment_owner_refs() set search_path = public, pg_temp;
alter function public.validate_budget_owner_refs() set search_path = public, pg_temp;
alter function public.sync_account_balance_from_transaction() set search_path = public, pg_temp;

revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create or replace function public.validate_goal_owner_refs()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform public.assert_owned_category(new.category_id, new.user_id);
  return new;
end;
$$;

drop trigger if exists goals_validate_owner_refs on public.goals;
create trigger goals_validate_owner_refs
before insert or update of user_id, category_id on public.goals
for each row execute function public.validate_goal_owner_refs();

revoke execute on function public.validate_goal_owner_refs() from public, anon, authenticated;
