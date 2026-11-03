-- Kiểm thử ẩn nhóm (migration 20261103000000_hidden_groups.sql). Chạy sau khi đã áp migration,
-- trong một giao dịch luôn bị hoàn tác (kết thúc bằng lỗi có chủ ý), không để lại dữ liệu.
-- Gồm cả trường hợp app cũ: bản cũ không gửi hidden và không có khóa 'hidden' trong field_times.
do $$
declare
  uid uuid := '00000000-0000-4000-8000-0000000000f1';
  gid uuid := '00000000-0000-4000-8000-0000000000f2';
  gid2 uuid := '00000000-0000-4000-8000-0000000000f3';
  row_ public.tree_nodes;
  hist integer;
  fails text := '';

  t0 text := '2026-10-22T01:00:00.000Z';
  t1 text := '2026-10-22T02:00:00.000Z';
  t2 text := '2026-10-22T03:00:00.000Z';
  t3 text := '2026-10-22T04:00:00.000Z';
  old_groups jsonb; -- app cũ: không có hidden
  epoch text := '1970-01-01T00:00:00.000Z';
begin
  old_groups := jsonb_build_object('title', t0, 'place', t0, 'collapsed', t0, 'done', t0, 'duration', t0,
    'energy', t0, 'doLast', t0, 'date', t0, 'pin', t0, 'deleted', t0, 'note', t0);
  insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', 'test-hidden@example.invalid');
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. App cũ tạo nhóm, không gửi hidden: mặc định hiện.
  perform public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', gid, 'parent_id', null, 'kind', 'group', 'title', 'G', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', null, 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t0, 'deleted_at', null,
    'field_times', old_groups)));
  select * into row_ from public.tree_nodes where id = gid;
  if row_.hidden then fails := fails || ' [1: nhóm từ app cũ phải đang hiện]'; end if;

  -- 2. App mới ẩn nhóm lúc t1.
  perform public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', gid, 'parent_id', null, 'kind', 'group', 'title', 'G', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', null, 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t1, 'deleted_at', null,
    'hidden', true, 'field_times', old_groups || jsonb_build_object('hidden', t1))));
  select * into row_ from public.tree_nodes where id = gid;
  if not row_.hidden then fails := fails || ' [2: nhóm phải được ẩn]'; end if;
  if row_.field_times ->> 'hidden' <> t1 then fails := fails || ' [3: giờ của hidden phải là t1]'; end if;
  select count(*) into hist from public.node_history where node_id = gid and group_name = 'hidden';
  if hist <> 1 then fails := fails || ' [4: phải có 1 dòng nhật ký hidden, được ' || hist || ']'; end if;

  -- 3. App cũ đổi tên lúc t3, không gửi hidden: nhóm vẫn ẩn.
  perform public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', gid, 'parent_id', null, 'kind', 'group', 'title', 'G2', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', null, 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'field_times', old_groups || jsonb_build_object('title', t3))));
  select * into row_ from public.tree_nodes where id = gid;
  if row_.title <> 'G2' then fails := fails || ' [5: app cũ đổi tên phải được áp dụng]'; end if;
  if not row_.hidden then fails := fails || ' [6: app cũ không được bỏ ẩn nhóm]'; end if;

  -- 4. App mới chưa từng sửa trạng thái ẩn (giờ 1970, đang hiện) đổi tên lúc t3: không bỏ ẩn.
  perform public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', gid, 'parent_id', null, 'kind', 'group', 'title', 'G3', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', null, 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'hidden', false, 'field_times', old_groups || jsonb_build_object('hidden', epoch, 'title', t3))));
  select * into row_ from public.tree_nodes where id = gid;
  if not row_.hidden then fails := fails || ' [7: nhóm chưa từng sửa trạng thái ẩn không được bỏ ẩn nhóm đang ẩn]'; end if;

  -- 5. Bản hiện lại cũ hơn (t0) bị bỏ; bản mới hơn (t3) được áp dụng.
  perform public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', gid, 'parent_id', null, 'kind', 'group', 'title', 'G3', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', null, 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'hidden', false, 'field_times', old_groups || jsonb_build_object('hidden', t0))));
  select * into row_ from public.tree_nodes where id = gid;
  if not row_.hidden then fails := fails || ' [8: bản hiện lại cũ hơn không được ghi đè]'; end if;

  perform public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', gid, 'parent_id', null, 'kind', 'group', 'title', 'G3', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', null, 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'hidden', false, 'field_times', old_groups || jsonb_build_object('hidden', t3))));
  select * into row_ from public.tree_nodes where id = gid;
  if row_.hidden then fails := fails || ' [9: bản hiện lại mới hơn phải được áp dụng]'; end if;

  -- 6. Nhóm mới tạo đã ẩn sẵn từ app mới.
  perform public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', gid2, 'parent_id', null, 'kind', 'group', 'title', 'H', 'position', 'W', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', null, 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t0, 'deleted_at', null,
    'hidden', true, 'field_times', old_groups || jsonb_build_object('hidden', t0))));
  select * into row_ from public.tree_nodes where id = gid2;
  if not row_.hidden then fails := fails || ' [10: nhóm mới tạo phải mang theo trạng thái ẩn]'; end if;

  if fails = '' then
    raise exception 'TEST_OK: tất cả kiểm tra ẩn nhóm đạt (giao dịch đã hoàn tác)';
  else
    raise exception 'TEST_FAIL:%', fails;
  end if;
end $$;
