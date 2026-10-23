-- Đồng bộ theo từng trường (ADR 0005).
--
-- Trước đây một dòng chỉ có một dấu thời gian (updated_at), nên hai thiết bị sửa hai trường khác
-- nhau của cùng một việc thì một bên bị mất. Giờ mỗi nhóm trường nhớ giờ sửa gần nhất của nó trong
-- field_times, và hàm push_tree_nodes gộp từng nhóm: nhóm nào được sửa sau thì thắng.
--
-- Các nhóm (khớp FIELD_GROUPS trong packages/core/src/fields.js):
--   title, place (parent_id + position), collapsed, done (status + done_at + done_date +
--   done_start_min), duration, energy, doLast, date, pin, deleted.
--
-- Dòng cũ chưa có field_times thì mọi nhóm tính là sửa lần cuối lúc updated_at, đúng với cách cũ.

-- 1. Giờ sửa từng nhóm -------------------------------------------------------------------------

alter table public.tree_nodes
  add column field_times jsonb not null default '{}'::jsonb
    check (jsonb_typeof(field_times) = 'object');

-- 2. Nhật ký thay đổi (giữ 30 ngày) ---------------------------------------------------------------
-- Mỗi lần một nhóm trường bị ghi đè bởi giá trị khác, giá trị cũ được lưu lại để khôi phục.

create table public.node_history (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  node_id uuid not null,
  group_name text not null,
  old_values jsonb not null,
  changed_at timestamptz not null default now()
);

create index node_history_user_changed_idx on public.node_history (user_id, changed_at desc);
create index node_history_node_idx on public.node_history (node_id, changed_at desc);

alter table public.node_history enable row level security;

create policy "node_history: read own" on public.node_history
  for select to authenticated using (user_id = (select auth.uid()));
create policy "node_history: insert own" on public.node_history
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "node_history: delete own" on public.node_history
  for delete to authenticated using (user_id = (select auth.uid()));

-- 3. Hàm phụ ----------------------------------------------------------------------------------------

-- Giờ dạng ISO 8601 UTC giống JavaScript (2026-10-22T03:00:00.000Z), để app đọc được trên mọi nền tảng.
create function public.iso_ts(t timestamptz) returns text
language sql immutable
set search_path = ''
as $$
  select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- Dữ liệu gửi lên có sửa nhóm g muộn hơn dữ liệu đang lưu không? Nhóm chưa có giờ thì lấy updated_at.
create function public.group_is_newer(
  p_incoming jsonb, p_incoming_updated timestamptz,
  p_current jsonb, p_current_updated timestamptz,
  p_group text
) returns boolean
language sql immutable
set search_path = ''
as $$
  select coalesce((p_incoming ->> p_group)::timestamptz, p_incoming_updated)
       > coalesce((p_current ->> p_group)::timestamptz, p_current_updated);
$$;

-- 4. Đẩy lên: gộp từng nhóm ------------------------------------------------------------------------
-- Chạy với quyền người gọi nên RLS vẫn áp dụng. Trả về số dòng đã thay đổi.

create or replace function public.push_tree_nodes(p_rows jsonb) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r record;
  cur public.tree_nodes;
  nxt public.tree_nodes;
  inc jsonb;
  ft jsonb;
  touched boolean;
  affected integer := 0;
begin
  -- Nhật ký chỉ giữ 30 ngày: dọn phần cũ của chính người này mỗi lần đẩy.
  delete from public.node_history
  where user_id = auth.uid() and changed_at < now() - interval '30 days';

  for r in
    select *
    from jsonb_to_recordset(p_rows) as x(
      id uuid, parent_id uuid, kind text, title text, "position" text, collapsed boolean,
      status text, duration_min integer, energy text, do_last boolean, scheduled_date date,
      pinned_start_min integer, done_at timestamptz, done_date date, done_start_min integer,
      created_at timestamptz, updated_at timestamptz, deleted_at timestamptz, field_times jsonb
    )
  loop
    inc := coalesce(r.field_times, '{}'::jsonb);

    select * into cur from public.tree_nodes where id = r.id for update;

    if not found then
      insert into public.tree_nodes (
        id, user_id, parent_id, kind, title, "position", collapsed, status, duration_min, energy,
        do_last, scheduled_date, pinned_start_min, done_at, done_date, done_start_min,
        created_at, updated_at, deleted_at, field_times
      ) values (
        r.id, auth.uid(), r.parent_id, r.kind, r.title, r."position", r.collapsed, r.status,
        r.duration_min, r.energy, r.do_last, r.scheduled_date, r.pinned_start_min, r.done_at,
        r.done_date, r.done_start_min, r.created_at, r.updated_at, r.deleted_at, inc
      );
      affected := affected + 1;
      continue;
    end if;

    nxt := cur;
    ft := cur.field_times;
    touched := false;

    -- title
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'title') then
      ft := ft || jsonb_build_object('title', coalesce(inc ->> 'title', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.title is distinct from r.title then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'title', jsonb_build_object('title', cur.title));
        nxt.title := r.title;
      end if;
    end if;

    -- place: parent_id + position
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'place') then
      ft := ft || jsonb_build_object('place', coalesce(inc ->> 'place', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.parent_id is distinct from r.parent_id or nxt."position" is distinct from r."position" then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'place', jsonb_build_object('parent_id', cur.parent_id, 'position', cur."position"));
        nxt.parent_id := r.parent_id;
        nxt."position" := r."position";
      end if;
    end if;

    -- collapsed (không ghi nhật ký: chỉ là trạng thái hiển thị)
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'collapsed') then
      ft := ft || jsonb_build_object('collapsed', coalesce(inc ->> 'collapsed', public.iso_ts(r.updated_at)));
      touched := true;
      nxt.collapsed := r.collapsed;
    end if;

    -- done: status + done_at + done_date + done_start_min
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'done') then
      ft := ft || jsonb_build_object('done', coalesce(inc ->> 'done', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.status is distinct from r.status
         or nxt.done_at is distinct from r.done_at
         or nxt.done_date is distinct from r.done_date
         or nxt.done_start_min is distinct from r.done_start_min then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'done', jsonb_build_object(
          'status', cur.status, 'done_at', cur.done_at,
          'done_date', cur.done_date, 'done_start_min', cur.done_start_min));
        nxt.status := r.status;
        nxt.done_at := r.done_at;
        nxt.done_date := r.done_date;
        nxt.done_start_min := r.done_start_min;
      end if;
    end if;

    -- duration
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'duration') then
      ft := ft || jsonb_build_object('duration', coalesce(inc ->> 'duration', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.duration_min is distinct from r.duration_min then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'duration', jsonb_build_object('duration_min', cur.duration_min));
        nxt.duration_min := r.duration_min;
      end if;
    end if;

    -- energy
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'energy') then
      ft := ft || jsonb_build_object('energy', coalesce(inc ->> 'energy', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.energy is distinct from r.energy then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'energy', jsonb_build_object('energy', cur.energy));
        nxt.energy := r.energy;
      end if;
    end if;

    -- doLast
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'doLast') then
      ft := ft || jsonb_build_object('doLast', coalesce(inc ->> 'doLast', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.do_last is distinct from r.do_last then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'doLast', jsonb_build_object('do_last', cur.do_last));
        nxt.do_last := r.do_last;
      end if;
    end if;

    -- date
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'date') then
      ft := ft || jsonb_build_object('date', coalesce(inc ->> 'date', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.scheduled_date is distinct from r.scheduled_date then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'date', jsonb_build_object('scheduled_date', cur.scheduled_date));
        nxt.scheduled_date := r.scheduled_date;
      end if;
    end if;

    -- pin
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'pin') then
      ft := ft || jsonb_build_object('pin', coalesce(inc ->> 'pin', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.pinned_start_min is distinct from r.pinned_start_min then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'pin', jsonb_build_object('pinned_start_min', cur.pinned_start_min));
        nxt.pinned_start_min := r.pinned_start_min;
      end if;
    end if;

    -- deleted
    if public.group_is_newer(inc, r.updated_at, cur.field_times, cur.updated_at, 'deleted') then
      ft := ft || jsonb_build_object('deleted', coalesce(inc ->> 'deleted', public.iso_ts(r.updated_at)));
      touched := true;
      if nxt.deleted_at is distinct from r.deleted_at then
        insert into public.node_history (node_id, group_name, old_values)
        values (cur.id, 'deleted', jsonb_build_object('deleted_at', cur.deleted_at));
        nxt.deleted_at := r.deleted_at;
      end if;
    end if;

    if touched then
      update public.tree_nodes set
        title = nxt.title,
        parent_id = nxt.parent_id,
        "position" = nxt."position",
        collapsed = nxt.collapsed,
        status = nxt.status,
        done_at = nxt.done_at,
        done_date = nxt.done_date,
        done_start_min = nxt.done_start_min,
        duration_min = nxt.duration_min,
        energy = nxt.energy,
        do_last = nxt.do_last,
        scheduled_date = nxt.scheduled_date,
        pinned_start_min = nxt.pinned_start_min,
        deleted_at = nxt.deleted_at,
        field_times = ft,
        updated_at = greatest(cur.updated_at, r.updated_at)
      where id = cur.id;
      affected := affected + 1;
    end if;
  end loop;

  return affected;
end;
$$;

revoke all on function public.push_tree_nodes(jsonb) from public, anon;
grant execute on function public.push_tree_nodes(jsonb) to authenticated;
