# 0003. Tài khoản và đồng bộ (Milestone 2)

Trạng thái: đã chấp nhận (2026-10-22)

## Quyết định

- **Backend:** Supabase (Postgres, Auth, RLS, Edge Functions). Schema nằm trong `supabase/migrations/` và được áp bằng Supabase CLI (`db push`).
- **Đăng nhập:** email + mật khẩu, **bắt buộc xác nhận email**. Ban đầu có Google (OAuth PKCE) nhưng đã gỡ ngày 2026-10-23 vì chưa cần; cần thì thêm lại sau cùng Apple.
- **Bảng:** `profiles`, `user_settings`, `tree_nodes` (cùng `calendar_accounts`, `calendar_events` cho M3), đều có RLS `user_id = auth.uid()`. Dự án trên Supabase đã có sẵn schema nền (cột con trỏ kéo là `server_updated_at`); `20261022000000_init.sql` ghi lại schema đó, còn `20261022010000_sync.sql` thêm những gì đồng bộ cần: các trigger `server_updated_at` còn thiếu, bỏ khóa ngoại `parent_id` (các lô đến không theo thứ tự) và hàm `push_tree_nodes`. Người dùng mới tự có hồ sơ và thiết lập mặc định nhờ trigger. `tree_nodes` và `user_settings` đều được đồng bộ.
- **Mô hình đồng bộ (offline-first):** SQLite vẫn là nơi giao diện đọc và ghi. Mỗi dòng cục bộ có cờ `dirty` (schema SQLite v2). Một lần đồng bộ gồm:
  1. **Kéo:** các dòng có `server_updated_at >= con trỏ` (giờ máy chủ, do trigger đặt), theo thứ tự, chia trang. Gộp bằng `mergeRemote` trong `packages/core`: dòng từ máy chủ chỉ thay dòng cục bộ nếu `updated_at` mới hơn hẳn; ngược lại giữ dòng cục bộ.
  2. **Đẩy:** mọi dòng `dirty` theo lô qua hàm `push_tree_nodes`, hàm này chỉ ghi đè dòng đã lưu khi `updated_at` gửi lên mới hơn. Sau đó xóa cờ `dirty` cho các dòng không bị sửa lại trong lúc đó.
  3. Nếu lần kéo có thay đổi, giao diện nạp lại từ SQLite.
- **Thời điểm đồng bộ:** khi đăng nhập, sau mỗi lần sửa cục bộ (chờ 3 giây), khi app quay lại màn hình, khi có mạng lại (web).
- **Xóa:** xóa mềm (`deleted_at`), đồng bộ như mọi thay đổi khác.
- **Lần đăng nhập đầu:** dữ liệu cục bộ được gộp vào tài khoản (toàn bộ đều `dirty` nên được đẩy lên). Thiết bị gắn với tài khoản qua thiết lập `sync_user`. Nếu đăng nhập tài khoản khác trên thiết bị còn dữ liệu của tài khoản cũ, app hỏi xác nhận trước khi xóa dữ liệu cục bộ.
- **Xuất dữ liệu và xóa tài khoản:** xuất tạo tệp JSON gồm mọi nút cục bộ (web tải về, điện thoại mở bảng chia sẻ). Xóa tài khoản gọi Edge Function `delete-account`, hàm này xác định người gọi từ JWT và xóa người dùng; các dòng đi theo (`on delete cascade`). Dữ liệu trên thiết bị vẫn còn.
- **Lưu phiên đăng nhập:** web dùng `localStorage`, điện thoại dùng kho khóa-giá trị của `expo-sqlite`.

## Khác biệt so với CLAUDE.md và các giới hạn

- Việc gộp `tree_nodes` đã nâng lên **theo từng trường** và có nhật ký khôi phục 30 ngày: xem ADR 0005. Phần mô tả "gộp theo từng dòng" ở trên là bản đầu tiên, nay được thay thế.
- Việc phân xử xung đột dựa vào đồng hồ thiết bị (`updated_at`). Máy sai giờ có thể thắng hoặc thua không công bằng. Giờ máy chủ (`server_updated_at`) chỉ dùng làm con trỏ kéo.
- Token đăng nhập trên điện thoại đang lưu không mã hóa trong SQLite. Dự kiến chuyển sang `expo-secure-store` trước khi phát hành.
- Thiết lập (`user_settings`: giờ làm việc, nửa ngày tỉnh táo, khung giờ cố định `fixed_blocks`, cách dùng `mode`) đồng bộ theo một dòng cho mỗi người. Bản sửa trên thiết bị này mà chưa đẩy lên luôn thắng; nếu không thì bản có `updated_at` mới hơn thắng. Dòng trên máy chủ được tạo với giá trị mặc định lúc đăng ký nên dấu thời gian của nó không nói lên ý định của người dùng; đó là lý do bản sửa cục bộ chưa đẩy được ưu tiên. Mỗi khung giờ cố định có thể áp dụng cho một số thứ trong tuần (`days`, thứ Hai = 1 đến Chủ nhật = 7; không có `days` nghĩa là mọi ngày). Trường này nằm trong cột `fixed_blocks` kiểu jsonb nên không cần đổi schema.
- Nhật ký khôi phục đã được ghi ở máy chủ (ADR 0005); chưa có giao diện để xem hoặc khôi phục.
- Xác nhận email là thiết lập phía Supabase (Authentication > Providers > Email > Confirm email), không phải mã trong app: phải bật trong bảng điều khiển. App đã xử lý sẵn: sau khi đăng ký hiện thông báo kiểm tra email, và đăng nhập khi chưa xác nhận báo "Email chưa được xác nhận".
