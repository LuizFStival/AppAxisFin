do $$
declare
  table_name text;
  finance_tables constant text[] := array[
    'profiles',
    'accounts',
    'cards',
    'categories',
    'reimbursement_people',
    'transactions',
    'recurring_transactions',
    'invoices',
    'installments',
    'goals',
    'goal_movements',
    'budgets',
    'notifications'
  ];
begin
  foreach table_name in array finance_tables loop
    execute format('revoke all privileges on table public.%I from anon', table_name);
    execute format('revoke all privileges on table public.%I from authenticated', table_name);
  end loop;
end;
$$;

grant select, insert, update, delete on table
  public.profiles,
  public.accounts,
  public.cards,
  public.categories,
  public.reimbursement_people,
  public.transactions,
  public.recurring_transactions,
  public.invoices,
  public.installments,
  public.goals,
  public.budgets,
  public.notifications
to authenticated;

grant select, insert on table public.goal_movements to authenticated;
