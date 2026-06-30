create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  monthly_analysis_count integer not null default 0,
  count_period text,
  created_at timestamptz not null default now()
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text,
  row_count integer,
  column_mapping jsonb,
  storage_path text,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  tx_date date,
  merchant text,
  amount numeric(14, 2),
  category text not null check (
    category in (
      'dining',
      'shopping',
      'grocery',
      'cafe',
      'transport',
      'utilities',
      'leisure',
      'medical',
      'finance',
      'education',
      'travel',
      'etc'
    )
  )
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid not null references public.uploads(id) on delete cascade,
  total numeric(14, 2),
  tx_count integer,
  breakdown jsonb,
  summary text,
  created_at timestamptz not null default now()
);

create index uploads_user_id_created_at_idx on public.uploads(user_id, created_at desc);
create index transactions_user_id_upload_id_idx on public.transactions(user_id, upload_id);
create index insights_user_id_upload_id_idx on public.insights(user_id, upload_id);

alter table public.profiles enable row level security;
alter table public.uploads enable row level security;
alter table public.transactions enable row level security;
alter table public.insights enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.prevent_profile_tier_update()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' and new.tier is distinct from old.tier then
    raise exception 'profiles.tier is managed by Polar webhook only';
  end if;

  return new;
end;
$$;

create trigger prevent_profile_tier_update
  before update on public.profiles
  for each row
  execute function public.prevent_profile_tier_update();

comment on column public.profiles.tier is
  'Managed only by Polar webhook using service-role; authenticated users cannot change it.';

create policy "uploads_select_own"
  on public.uploads
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "uploads_insert_own"
  on public.uploads
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "uploads_update_own"
  on public.uploads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "uploads_delete_own"
  on public.uploads
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "transactions_select_own"
  on public.transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.uploads
      where uploads.id = transactions.upload_id
        and uploads.user_id = auth.uid()
    )
  );

create policy "transactions_update_own"
  on public.transactions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.uploads
      where uploads.id = transactions.upload_id
        and uploads.user_id = auth.uid()
    )
  );

create policy "transactions_delete_own"
  on public.transactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "insights_select_own"
  on public.insights
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "insights_insert_own"
  on public.insights
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.uploads
      where uploads.id = insights.upload_id
        and uploads.user_id = auth.uid()
    )
  );

create policy "insights_update_own"
  on public.insights
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.uploads
      where uploads.id = insights.upload_id
        and uploads.user_id = auth.uid()
    )
  );

create policy "insights_delete_own"
  on public.insights
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, tier, monthly_analysis_count, count_period)
  values (new.id, new.email, 'free', 0, to_char(now(), 'YYYY-MM'))
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('card-statements', 'card-statements', false)
on conflict (id) do update
set public = excluded.public;

-- storage.objects already has RLS enabled by Supabase; `alter table ... enable
-- row level security` here fails with "must be owner of table objects" on hosted
-- projects and aborts the migration, so we only declare the policies.
drop policy if exists "card_statements_select_own" on storage.objects;
create policy "card_statements_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'card-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "card_statements_insert_own" on storage.objects;
create policy "card_statements_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'card-statements'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
