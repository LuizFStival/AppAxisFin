alter table public.profiles
  add column if not exists report_widgets jsonb not null
  default '["income","expenses","savings_rate","average_expenses"]'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_report_widgets_array_check,
  add constraint profiles_report_widgets_array_check
  check (jsonb_typeof(report_widgets) = 'array');
