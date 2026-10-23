-- Kiểm thử push_tree_nodes theo từng trường. Toàn bộ chạy trong một giao dịch và luôn bị hoàn tác
-- (kết thúc bằng một lỗi có chủ ý), nên không để lại dữ liệu nào trên dự án.
do $$
declare
  uid uuid := '00000000-0000-4000-8000-0000000000aa';
  nid uuid := '00000000-0000-4000-8000-0000000000bb';
  n integer;
  row_ public.tree_nodes;
  hist integer;
  fails text := '';

  t0 text := '2026-10-22T01:00:00.000Z';
  t1 text := '2026-10-22T02:00:00.000Z';
  t2 text := '2026-10-22T03:00:00.000Z';
  t3 text := '2026-10-22T04:00:00.000Z';
  -- Thiết bị thật luôn gửi giờ của đủ mười nhóm.
  base jsonb;

begin
  base := jsonb_build_object('title', t0, 'place', t0, 'collapsed', t0, 'done', t0, 'duration', t0,
    'energy', t0, 'doLast', t0, 'date', t0, 'pin', t0, 'deleted', t0);
  insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', 'test-push@example.invalid');
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. Thiết bị A tạo việc.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'A', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t0, 'deleted_at', null,
    'field_times', base)));
  if n <> 1 then fails := fails || ' [1: tạo mới phải trả 1, được ' || n || ']'; end if;

  -- 2. Thiết bị B đổi tên lúc t2. Thiết bị A (offline) đổi thời lượng lúc t3 và còn giữ tên cũ lúc t0.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'B', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 60, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t2, 'deleted_at', null,
    'field_times', base || jsonb_build_object('title', t2))));
  if n <> 1 then fails := fails || ' [2: đổi tên phải trả 1, được ' || n || ']'; end if;

  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'A', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'field_times', base || jsonb_build_object('duration', t3))));
  if n <> 1 then fails := fails || ' [3: đổi thời lượng phải trả 1, được ' || n || ']'; end if;

  select * into row_ from public.tree_nodes where id = nid;
  if row_.title <> 'B' then fails := fails || ' [4: tên phải là B (sửa muộn hơn), được ' || row_.title || ']'; end if;
  if row_.duration_min <> 90 then fails := fails || ' [5: thời lượng phải là 90, được ' || row_.duration_min || ']'; end if;
  if row_.field_times ->> 'title' <> t2 then fails := fails || ' [6: giờ của title phải là t2, được ' || (row_.field_times ->> 'title') || ']'; end if;
  if row_.field_times ->> 'duration' <> t3 then fails := fails || ' [7: giờ của duration phải là t3]'; end if;
  if row_.updated_at <> t3::timestamptz then fails := fails || ' [8: updated_at phải là giá trị lớn nhất]'; end if;

  -- 3. Nhật ký: tên cũ "A" và thời lượng cũ 60 phải được lưu.
  select count(*) into hist from public.node_history
    where node_id = nid and group_name = 'title' and old_values ->> 'title' = 'A';
  if hist <> 1 then fails := fails || ' [9: thiếu nhật ký của title, có ' || hist || ']'; end if;
  select count(*) into hist from public.node_history
    where node_id = nid and group_name = 'duration' and (old_values ->> 'duration_min')::int = 60;
  if hist <> 1 then fails := fails || ' [10: thiếu nhật ký của duration, có ' || hist || ']'; end if;

  -- 4. Đẩy lại đúng dữ liệu cũ (thiết bị A thử lại): không thay đổi gì, không ghi thêm nhật ký.
  select count(*) into hist from public.node_history where node_id = nid;
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'A', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'field_times', base || jsonb_build_object('duration', t3))));
  if n <> 0 then fails := fails || ' [11: đẩy lại phải trả 0, được ' || n || ']'; end if;
  if (select count(*) from public.node_history where node_id = nid) <> hist then
    fails := fails || ' [12: đẩy lại không được ghi thêm nhật ký]'; end if;

  -- 5. Đúng lúc hòa (cùng giờ, giá trị khác): giữ giá trị đang lưu.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'C', 'position', 'V', 'collapsed', false,
    'status', 'todo', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t2, 'deleted_at', null,
    'field_times', base || jsonb_build_object('title', t2))));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.title <> 'B' then fails := fails || ' [13: hòa giờ phải giữ giá trị đang lưu B, được ' || row_.title || ']'; end if;

  -- 6. Hoàn thành (nhóm done có bốn trường) và di chuyển (nhóm place có hai trường) cùng lúc, từ hai nơi.
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'B', 'position', 'V', 'collapsed', false,
    'status', 'done', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', t3, 'done_date', '2026-10-22',
    'done_start_min', 540, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'field_times', base || jsonb_build_object('done', t3))));
  n := n + public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'B', 'position', 'W', 'collapsed', false,
    'status', 'todo', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', null, 'done_date', null,
    'done_start_min', null, 'created_at', t0, 'updated_at', t3, 'deleted_at', null,
    'field_times', base || jsonb_build_object('place', t3))));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.status <> 'done' or row_.done_start_min <> 540 or row_."position" <> 'W' then
    fails := fails || ' [14: done và place phải cùng giữ, được ' || row_.status || '/' || coalesce(row_.done_start_min::text,'null') || '/' || row_."position" || ']'; end if;

  -- 7. Dòng cũ chưa có field_times (đẩy bằng hàm cũ) vẫn gộp theo updated_at.
  update public.tree_nodes set field_times = '{}'::jsonb where id = nid;
  n := public.push_tree_nodes(jsonb_build_array(jsonb_build_object(
    'id', nid, 'parent_id', null, 'kind', 'task', 'title', 'Cũ', 'position', 'W', 'collapsed', false,
    'status', 'done', 'duration_min', 90, 'energy', 'heavy', 'do_last', false,
    'scheduled_date', '2026-10-22', 'pinned_start_min', null, 'done_at', t3, 'done_date', '2026-10-22',
    'done_start_min', 540, 'created_at', t0, 'updated_at', t1, 'deleted_at', null,
    'field_times', '{}'::jsonb)));
  select * into row_ from public.tree_nodes where id = nid;
  if row_.title <> 'B' then fails := fails || ' [15: dòng cũ, bản gửi lên cũ hơn không được ghi đè, được ' || row_.title || ']'; end if;

  -- 8. Nhật ký quá 30 ngày bị dọn khi đẩy.
  insert into public.node_history (node_id, group_name, old_values, changed_at)
    values (nid, 'title', '{"title":"quá cũ"}', now() - interval '31 days');
  perform public.push_tree_nodes('[]'::jsonb);
  if exists (select 1 from public.node_history where old_values ->> 'title' = 'quá cũ') then
    fails := fails || ' [16: nhật ký quá 30 ngày phải bị xóa]'; end if;

  -- 9. Người khác không thấy dữ liệu này (RLS).
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-8000-0000000000cc', 'role', 'authenticated')::text, true);
  if (select count(*) from public.tree_nodes where id = nid) <> 0 then fails := fails || ' [17: RLS để lộ dòng]'; end if;
  if (select count(*) from public.node_history where node_id = nid) <> 0 then fails := fails || ' [18: RLS để lộ nhật ký]'; end if;

  if fails = '' then
    raise exception 'TEST_OK: tất cả kiểm tra đạt (giao dịch đã hoàn tác)';
  else
    raise exception 'TEST_FAIL:%', fails;
  end if;
end $$;
