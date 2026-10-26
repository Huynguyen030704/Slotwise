-- Kiểm thử ghi chú cho việc (migration 20261026000000_task_notes.sql). Chạy sau khi đã áp migration,
-- trong một giao dịch luôn bị hoàn tác (kết thúc bằng lỗi có chủ ý), không để lại dữ liệu.
-- Gồm cả trường hợp app cũ: bản cũ không gửi ghi chú và không có khóa 'note' trong field_times.
do $$
declare
  uid uuid := '00000000-0000-4000-8000-0000000000dd';
  nid uuid := '00000000-0000-4000-8000-0000000000ee';
  nid2 uuid := '00000000-0000-4000-8000-0000000000ef';
  n integer;
  row_ public.tree_nodes;
  hist integer;
  fails text := '';

  t0 text := '2026-10-22T01:00:00.000Z';
  t1 text := '2026-10-22T02:00:00.000Z';
  t2 text := '2026-10-22T03:00:00.000Z';
  t3 text := '2026-10-22T04:00:00.000Z';
  old_groups jsonb; -- app cũ: mười nhóm, không có note
  new_groups jsonb; -- app mới: mười một nhóm
  epoch text := '1970-01-01T00:00:00.000Z';
begin
  old_groups := jsonb_build_object('title', t0, 'place', t0, 'collapsed', t0, 'done', t0, 'duration', t0,
    'energy', t0, 'doLast', t0, 'date', t0, 'pin', t0, 'deleted', t0);
  new_groups := old_groups || jsonb_build_object('note', epoch);
  insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', 'test-notes@example.invalid');
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. App cũ tạo việc, không gửi ghi chú: ghi chú là chuỗi rỗng.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'A', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t0, 'deleted_at', null,
    'field_times', old_groups)));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.note <> '' then fails := fails || ' [1: việc từ app cũ phải có ghi chú rỗng, được ' || row_.note || ']'; end if;

  -- 2. App mới viết ghi chú lúc t1.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'A', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t1, 'deleted_at', null,
    'note', 'Gọi khách trước', 'field_times', old_groups || jsonb_build_object('note', t1))));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.note <> 'Gọi khách trước' then fails := fails || ' [2: ghi chú phải được lưu, được ' || row_.note || ']'; end if;
  if row_.field_times ->> 'note' <> t1 then fails := fails || ' [3: giờ của note phải là t1]'; end if;
  select count(*) into hist from public.node_history where node_id = nid and group_name = 'note';
  if hist <> 1 then fails := fails || ' [4: phải có 1 dòng nhật ký cho note, được ' || hist || ']'; end if;

  -- 3. App cũ đổi tên lúc t3, không gửi ghi chú: ghi chú đang lưu phải còn nguyên.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'B', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'field_times', old_groups || jsonb_build_object('title', t3))));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.title <> 'B' then fails := fails || ' [5: app cũ đổi tên phải được áp dụng]'; end if;
  if row_.note <> 'Gọi khách trước' then fails := fails || ' [6: app cũ không được xóa ghi chú, được ' || row_.note || ']'; end if;

  -- 4. App mới chưa từng sửa ghi chú (giờ 1970, ghi chú rỗng) đổi thời lượng lúc t3: không xóa ghi chú.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'B', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'note', '', 'field_times', new_groups || jsonb_build_object('duration', t3))));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.duration_min <> 90 then fails := fails || ' [7: thời lượng phải là 90]'; end if;
  if row_.note <> 'Gọi khách trước' then fails := fails || ' [8: ghi chú chưa từng sửa không được xóa ghi chú, được ' || row_.note || ']'; end if;

  -- 5. Bản sửa ghi chú cũ hơn (t0) bị bỏ; bản mới hơn (t3) được áp dụng, và có thể xóa trắng.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'B', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'note', 'Bản cũ', 'field_times', old_groups || jsonb_build_object('note', t0))));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.note <> 'Gọi khách trước' then fails := fails || ' [9: bản ghi chú cũ hơn không được ghi đè, được ' || row_.note || ']'; end if;

  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'B', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'note', '', 'field_times', old_groups || jsonb_build_object('note', t3))));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.note <> '' then fails := fails || ' [10: xóa ghi chú (bản mới hơn) phải được áp dụng, được ' || row_.note || ']'; end if;

  -- 6. Việc mới tạo cùng ghi chú từ app mới.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid2, 'parent_id', null, 'kind', 'task', 'title', 'C', 'position', 'W', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t0, 'deleted_at', null,
    'note', 'Có sẵn ghi chú', 'field_times', old_groups || jsonb_build_object('note', t0))));
  select * into row_ from public.tree_nodes where id = nid2;
  if row_.note <> 'Có sẵn ghi chú' then fails := fails || ' [11: việc mới phải mang theo ghi chú, được ' || row_.note || ']'; end if;

  if fails = '' then
    raise exception 'TEST_OK: tất cả kiểm tra ghi chú đạt (giao dịch đã hoàn tác)';
  else
    raise exception 'TEST_FAIL:%', fails;
  end if;
end $$;
