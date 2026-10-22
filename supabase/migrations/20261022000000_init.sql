-- Slotwise initial schema. Mirrors apps/mobile/src/data/schema.js (SQLite) in snake_case.
-- Every table has RLS: user_id = auth.uid().

create extension if not exists pgcrypto;

-- Cursor for sync pull: set by the server, immune to client clock skew.
create or replace function public.set_server_updated_at()
returns trigger language plpgsql as $$
begin
  new.server_updated_at = now();
  return new;
end $$;

-- profiles --------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'vi',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now()
);

-- user_settings (one row per user; local SQLite stores key/value) --------
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  work_start_min int not null default 480 check (work_start_min between 0 and 1440 and work_start_min % 15 = 0),
  work_end_min int not null default 1080 check (work_end_min between 0 and 1440 and work_end_min % 15 = 0),
  peak text not null default 'morning' check (peak in ('morning', 'afternoon')),
  buffer_min int not null default 0 check (buffer_min >= 0),
  grid_min int not null default 15 check (grid_min in (5, 10, 15, 30)),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  check (work_end_min > work_start_min)
);
create trigger user_settings_server_ts before insert or update on public.user_settings
  for each row execute function public.set_server_updated_at();

-- tree_nodes ------------------------------------------------------------
create table public.tree_nodes (
  id uuid primary key,                                   -- generated on client (offline-first)
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id uuid references public.tree_nodes (id) on delete set null,
  kind text not null check (kind in ('group', 'task', 'note')),
  title text not null,
  position text not null collate "C",                    -- fractional index; byte-wise order
  collapsed boolean not null default false,
  status text not null default 'todo' check (status in ('todo', 'done')),
  duration_min int not null default 60 check (duration_min between 15 and 180 and duration_min % 15 = 0),
  energy text not null default 'heavy' check (energy in ('heavy', 'light')),
  do_last boolean not null default false,
  scheduled_date date,
  pinned_start_min int check (pinned_start_min is null or (pinned_start_min between 0 and 1425 and pinned_start_min % 15 = 0)),
  done_at timestamptz,
  done_date date,
  done_start_min int,
  created_at timestamptz not null,
  updated_at timestamptz not null,                       -- client clock; last-write-wins
  deleted_at timestamptz,                                -- soft delete
  server_updated_at timestamptz not null default now()   -- pull cursor
);
create index tree_nodes_user_sync on public.tree_nodes (user_id, server_updated_at);
create index tree_nodes_parent on public.tree_nodes (parent_id);
create trigger tree_nodes_server_ts before insert or update on public.tree_nodes
  for each row execute function public.set_server_updated_at();

-- calendar_accounts: tokens readable only by Edge Functions (service role) --
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

-- RLS -------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.tree_nodes enable row level security;
alter table public.calendar_accounts enable row level security;
alter table public.calendar_events enable row level security;

create policy profiles_own on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_settings_own on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tree_nodes_own on public.tree_nodes
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Read-only for the app; writes go through Edge Functions (service role bypasses RLS).
create policy calendar_events_read on public.calendar_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy calendar_accounts_read on public.calendar_accounts
  for select to authenticated using (user_id = (select auth.uid()));
-- Hide the token column from the app entirely.
revoke select on public.calendar_accounts from authenticated;
grant select (id, user_id, provider, external_account, created_at) on public.calendar_accounts to authenticated;

-- New user -> profile + default settings ---------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
