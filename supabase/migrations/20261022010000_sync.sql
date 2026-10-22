-- Slotwise M2: what the app needs on top of the baseline to sync tree_nodes.

-- 1. The pull cursor (server_updated_at) must move on every write. The baseline had the column and
--    the trigger function but no trigger, so updates kept their old value and other devices would
--    never see them.
create trigger tree_nodes_set_server_updated_at
  before insert or update on public.tree_nodes
  for each row execute function public.set_server_updated_at();

create trigger user_settings_set_server_updated_at
  before insert or update on public.user_settings
  for each row execute function public.set_server_updated_at();

-- 2. Devices push rows in batches in any order, so a child can arrive before its parent. A foreign
--    key on parent_id would reject that. The tree is rebuilt on the device from parent_id, and a
--    missing parent simply leaves the child at the root.
alter table public.tree_nodes drop constraint tree_nodes_parent_id_fkey;

-- 3. Push: last writer wins, per row. A row only replaces the stored one when its updated_at (the
--    device clock) is newer, so a device that was offline cannot overwrite a later edit made
--    elsewhere. Runs with the caller's rights, so row level security still applies.
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
