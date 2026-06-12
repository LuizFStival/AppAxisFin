create unique index if not exists categories_user_flow_name_ci_unique
on public.categories (user_id, flow, lower(trim(name)));
