-- Slotwise M2: accounts and sync.
-- Every table has row level security: a user only sees rows where user_id = auth.uid().

-- Profiles ----------------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'vi',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- User settings -----------------------------------------------------------------------------

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  work_start_min integer not null default 480 check (work_start_min between 0 and 1439),
  work_end_min integer not null default 1080 check (work_end_min between 1 and 1440),
  peak text not null default 'morning' check (peak in ('morning', 'afternoon')),
  buffer_min integer not null default 0 check (buffer_min >= 0),
  grid_min integer not null default 15 check (grid_min > 0),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings: read own" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_settings: insert own" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_settings: update own" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Tree nodes (groups, tasks, notes) -------------------------------------------------------------
-- position is a fractional index: compare it bytewise, hence collate "C".
-- updated_at is the client clock and decides who wins a conflict.
-- synced_at is the server clock and is the cursor devices use to pull what changed.

create table public.tree_nodes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id uuid,
  kind text not null check (kind in ('group', 'task', 'note')),
  title text not null,
  position text collate "C" not null,
  collapsed boolean not null default false,
  status text not null default 'todo' check (status in ('todo', 'done')),
  duration_min integer not null default 60
    check (duration_min between 15 and 180 and duration_min % 15 = 0),
  energy text not null default 'heavy' check (energy in ('heavy', 'light')),
  do_last boolean not null default false,
  scheduled_date date,
  pinned_start_min integer
    check (pinned_start_min is null or (pinned_start_min between 0 and 1439 and pinned_start_min % 15 = 0)),
  done_at timestamptz,
  done_date date,
  done_start_min integer,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default now()
);

create index tree_nodes_user_synced_idx on public.tree_nodes (user_id, synced_at);

alter table public.tree_nodes enable row level security;

create policy "tree_nodes: read own" on public.tree_nodes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tree_nodes: insert own" on public.tree_nodes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tree_nodes: update own" on public.tree_nodes
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tree_nodes: delete own" on public.tree_nodes
  for delete to authenticated using (user_id = (select auth.uid()));

create function public.set_synced_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at = now();
  return new;
end;
$$;

create trigger tree_nodes_set_synced_at
  before insert or update on public.tree_nodes
  for each row execute function public.set_synced_at();

-- Push: last writer wins ----------------------------------------------------------------------
-- Devices send only rows they changed. A row only replaces the stored one when it is newer, so a
-- device that was offline cannot overwrite a later edit made elsewhere. Runs with the caller's
-- rights, so row level security still applies.

create function public.push_tree_nodes(p_rows jsonb) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected integer;
begin
  with incoming as (
    select *
    from jsonb_to_recordset(p_rows) as r(
      id uuid, parent_id uuid, kind text, title text, "position" text, collapsed boolean,
      status text, duration_min integer, energy text, do_last boolean, scheduled_date date,
      pinned_start_min integer, done_at timestamptz, done_date date, done_start_min integer,
      created_at timestamptz, updated_at timestamptz, deleted_at timestamptz
    )
  ),
  upserted as (
    insert into public.tree_nodes as t (
      id, user_id, parent_id, kind, title, "position", collapsed, status, duration_min, energy,
      do_last, scheduled_date, pinned_start_min, done_at, done_date, done_start_min,
      created_at, updated_at, deleted_at
    )
    select
      id, auth.uid(), parent_id, kind, title, "position", collapsed, status, duration_min, energy,
      do_last, scheduled_date, pinned_start_min, done_at, done_date, done_start_min,
      created_at, updated_at, deleted_at
    from incoming
    on conflict (id) do update set
      parent_id = excluded.parent_id,
      kind = excluded.kind,
      title = excluded.title,
      "position" = excluded."position",
      collapsed = excluded.collapsed,
      status = excluded.status,
      duration_min = excluded.duration_min,
      energy = excluded.energy,
      do_last = excluded.do_last,
      scheduled_date = excluded.scheduled_date,
      pinned_start_min = excluded.pinned_start_min,
      done_at = excluded.done_at,
      done_date = excluded.done_date,
      done_start_min = excluded.done_start_min,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
    where t.updated_at < excluded.updated_at
    returning 1
  )
  select count(*) into affected from upserted;
  return affected;
end;
$$;

revoke all on function public.push_tree_nodes(jsonb) from public, anon;
grant execute on function public.push_tree_nodes(jsonb) to authenticated;

-- New accounts get a profile and default settings ---------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
