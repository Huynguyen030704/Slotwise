# 0008. Ẩn nhóm

Trạng thái: đã chấp nhận (2026-11-03)

## Bối cảnh

Khi dùng thật, có những nhóm mà người dùng đã xem xong phần thông tin cần xem và không muốn thấy ở giao diện nữa, nhưng cũng chưa muốn xóa vì có thể cần lại. Thu gọn nhóm không đủ vì dòng nhóm vẫn nằm đó, còn việc trong nhóm vẫn hiện ở lịch và màn Hôm nay.

## Quyết định

- **Dữ liệu:** `TreeNode.hidden` (boolean, mặc định false), chỉ có ý nghĩa với nhóm. Cột `hidden boolean not null default false` ở SQLite (schema v5) và ở `tree_nodes` (migration `20261103000000_hidden_groups.sql`).
- **Phạm vi:** ẩn khỏi **mọi nơi**. Nhóm và mọi việc trong nó (kể cả việc con) không hiện ở danh sách, lịch ngày, màn Hôm nay, chế độ tập trung, tổng kết và báo cáo, và không còn được xếp lịch. Hiện lại thì mọi thứ trở về như cũ, không mất gì.
- **Cách làm:** `NodesProvider` đưa cho giao diện `nodes` đã loại nhóm ẩn (`withoutHidden` trong `packages/core/src/tree.js`), nên mọi màn hình tự ẩn theo mà không phải sửa từng nơi. `allNodes` giữ đủ nút, dùng cho xuất dữ liệu và danh sách nhóm đã ẩn. Việc sửa, hoàn tác và đồng bộ vẫn làm trên cây đầy đủ.
- **Giao diện:** menu "…" của nhóm có mục "Ẩn nhóm" (có hoàn tác). Khi có nhóm ẩn, thanh công cụ danh sách có nút "Nhóm đã ẩn (N)" mở bảng liệt kê các nhóm đó kèm số việc và nút "Hiện lại"; hiện lại xong danh sách cuộn tới và làm nổi bật nhóm. Nếu mọi nhóm đều ẩn, danh sách nói rõ thay vì hiện lời mời bắt đầu.
- **Đồng bộ:** đồng bộ theo tài khoản, là nhóm trường thứ 12 (`hidden`) của cơ chế theo từng trường (ADR 0005): ẩn ở máy này thì máy khác cũng ẩn, và ẩn với đổi tên ở hai máy offline không đè nhau. Hàm `push_tree_nodes` gộp nhóm này và ghi nhật ký `node_history` khi trạng thái ẩn bị ghi đè.
- **Tương thích với app cũ** (bản web đã cài chưa kịp cập nhật): app cũ không gửi `hidden` và không có khóa `hidden` trong `field_times`; hàm trên máy chủ bỏ qua nhóm đó nên không bỏ ẩn nhóm đã ẩn. Một việc chưa từng có giờ sửa trạng thái ẩn và đang hiện được coi là sửa lần cuối lúc 1970, để một lần đổi tên muộn hơn không thể bỏ ẩn nhóm vừa ẩn ở máy khác (cả trên máy chủ lẫn trong `groupTime` của lõi, giống ghi chú ở ADR 0006).
- **Xuất dữ liệu:** tệp JSON xuất ra vẫn gồm cả nhóm ẩn.

## Thứ tự triển khai

Áp migration lên Supabase **trước**, rồi mới đăng bản web mới. Máy chủ cũ bỏ qua khóa `hidden` lạ nên không lỗi, nhưng trạng thái ẩn sẽ không được lưu lên tài khoản cho tới khi migration được áp.

## Kiểm thử

- Lõi: `tree.test.js` (`hiddenGroups`, `withoutHidden`), `fields.test.js` (nhóm `hidden`, nhóm đổi tên không bỏ ẩn nhóm ở máy khác), `nodeRows.test.js`, `sync.test.js`, độ phủ 100%.
- App: `ListPane.test.js` (ẩn, liệt kê, hiện lại, tìm kiếm không thấy việc trong nhóm ẩn, mọi nhóm đều ẩn), `NodesProvider.test.js` (`nodes` so với `allNodes`, hoàn tác).
- Máy chủ: `supabase/tests/hidden_groups.sql`, chạy trong giao dịch luôn bị hoàn tác sau khi áp migration (app cũ không bỏ ẩn nhóm, bản hiện lại cũ hơn bị bỏ, nhóm mới tạo đã ẩn sẵn). Đã chạy trên dự án thật ngày 2026-11-03 (đạt, cả trước và sau khi áp migration); bài `task_notes.sql` và `push_tree_nodes.sql` cũ cũng vẫn đạt với hàm mới.

## Giới hạn

- Chỉ ẩn được nhóm, chưa ẩn được từng việc riêng lẻ (đã có nút ẩn việc đã xong).
- Việc không thuộc nhóm nào không ẩn được.
- Nhóm ẩn có việc chưa xong thì các việc đó không xuất hiện ở lịch hay Hôm nay cho tới khi hiện lại; người dùng chủ động chọn cách này.
