alter table public.goals
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists image_path text;

alter table public.goals
  add constraint goals_id_user_id_unique unique (id, user_id);

create table if not exists public.goal_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  amount numeric(14,2) not null check (amount <> 0),
  created_at timestamptz not null default now(),
  constraint goal_movements_goal_owner_fk
    foreign key (goal_id, user_id)
    references public.goals(id, user_id)
    on delete cascade
);

create index if not exists goal_movements_user_goal_idx
  on public.goal_movements(user_id, goal_id, created_at desc);

create or replace function public.apply_goal_movement()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_amount numeric(14,2);
begin
  select current_amount + new.amount
    into next_amount
  from public.goals
  where id = new.goal_id
    and user_id = new.user_id
  for update;

  if next_amount is null then
    raise exception 'Meta não encontrada para o usuário atual.';
  end if;

  if next_amount < 0 then
    raise exception 'O valor retirado é maior que o saldo atual da meta.';
  end if;

  update public.goals
  set
    current_amount = next_amount,
    status = case when next_amount >= target_amount then 'completed' else 'active' end
  where id = new.goal_id
    and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists goal_movements_apply_amount on public.goal_movements;
create trigger goal_movements_apply_amount
before insert on public.goal_movements
for each row execute function public.apply_goal_movement();

alter table public.goal_movements enable row level security;

create policy goal_movements_select_own on public.goal_movements
for select to authenticated
using ((select auth.uid()) = user_id);

create policy goal_movements_insert_own on public.goal_movements
for insert to authenticated
with check ((select auth.uid()) = user_id);

grant select, insert on public.goal_movements to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'goal-images',
  'goal-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "goal_images_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'goal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "goal_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'goal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "goal_images_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'goal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'goal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "goal_images_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'goal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
