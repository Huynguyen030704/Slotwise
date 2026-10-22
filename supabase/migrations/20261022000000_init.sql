-- Baseline schema as it exists on the Slotwise Supabase project (recorded as version
-- 20261022000000 "init" in the remote migration history). It was created before the sync work, so
-- this file documents it rather than changing it: a fresh database built from the migrations in
-- this folder ends up with the same structure as the hosted one.
-- Sync additions live in 20261022010000_sync.sql.
-- Every table has row level security scoped to auth.uid().

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'vi',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  work_start_min integer not null default 480
    check (work_start_min >= 0 and work_start_min <= 1440 and work_start_min % 15 = 0),
  work_end_min integer not null default 1080
    check (work_end_min >= 0 and work_end_min <= 1440 and work_end_min % 15 = 0),
  peak text not null default 'morning' check (peak in ('morning', 'afternoon')),
  buffer_min integer not null default 0 check (buffer_min >= 0),
  grid_min integer not null default 15 check (grid_min in (5, 10, 15, 30)),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  check (work_end_min > work_start_min)
);

create table public.tree_nodes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id uuid references public.tree_nodes (id) on delete set null,
  kind text not null check (kind in ('group', 'task', 'note')),
  title text not null,
  position text not null,
  collapsed boolean not null default false,
  status text not null default 'todo' check (status in ('todo', 'done')),
  duration_min integer not null default 60
    check (duration_min >= 15 and duration_min <= 180 and duration_min % 15 = 0),
  energy text not null default 'heavy' check (energy in ('heavy', 'light')),
  do_last boolean not null default false,
  scheduled_date date,
  pinned_start_min integer
    check (pinned_start_min is null or (pinned_start_min >= 0 and pinned_start_min <= 1425 and pinned_start_min % 15 = 0)),
  done_at timestamptz,
  done_date date,
  done_start_min integer,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create index tree_nodes_user_sync on public.tree_nodes (user_id, server_updated_at);
create index tree_nodes_parent on public.tree_nodes (parent_id);

create table public.calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  external_account text,
  encrypted_refresh_token text,
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.calendar_accounts (id) on delete cascade,
  external_id text not null,
  start_utc timestamptz not null,
  end_utc timestamptz not null,
  title text,
  is_busy boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (account_id, external_id)
);

create index calendar_events_user_time on public.calendar_events (user_id, start_utc);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.tree_nodes enable row level security;
alter table public.calendar_accounts enable row level security;
alter table public.calendar_events enable row level security;

create policy profiles_own on public.profiles
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_settings_own on public.user_settings
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tree_nodes_own on public.tree_nodes
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy calendar_accounts_read on public.calendar_accounts
  for select using (user_id = (select auth.uid()));
create policy calendar_events_read on public.calendar_events
  for select using (user_id = (select auth.uid()));

create function public.set_server_updated_at() returns trigger
language plpgsql
as $$
begin
  new.server_updated_at = now();
  return new;
end $$;

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (user_id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
