alter table public.profiles
  add column if not exists savings_goal_mode text not null default 'salary_percentage',
  add column if not exists savings_goal_amount numeric(14,2) not null default 0,
  add column if not exists savings_goal_percentage numeric(5,2) not null default 20,
  add column if not exists include_pending_salary boolean not null default true;

alter table public.profiles
  drop constraint if exists profiles_savings_goal_mode_check,
  add constraint profiles_savings_goal_mode_check check (savings_goal_mode in ('fixed', 'salary_percentage')),
  drop constraint if exists profiles_savings_goal_amount_check,
  add constraint profiles_savings_goal_amount_check check (savings_goal_amount >= 0),
  drop constraint if exists profiles_savings_goal_percentage_check,
  add constraint profiles_savings_goal_percentage_check check (savings_goal_percentage between 0 and 100);
