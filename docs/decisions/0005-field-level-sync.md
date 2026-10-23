# 0005. Đồng bộ theo từng trường và nhật ký khôi phục

Trạng thái: đã chấp nhận (2026-10-23). Thay thế phần "ghi sau cùng thắng theo từng dòng" của ADR 0003.

## Bối cảnh

CLAUDE.md yêu cầu ghi sau cùng thắng **theo từng trường** và có nhật ký để khôi phục. Bản trước chỉ có một dấu thời gian cho cả dòng, nên hai thiết bị sửa hai trường khác nhau của cùng một việc lúc offline thì một bên bị mất.

## Quyết định

- **Nhóm trường.** Các trường luôn thay đổi cùng nhau được gom thành một nhóm, mỗi nhóm có giờ sửa riêng (`fieldTimes`, cột `field_times` jsonb):

  | Nhóm | Trường |
  |---|---|
  | `title` | `title` |
  | `place` | `parentId`, `position` (một lần di chuyển đổi cả hai) |
  | `collapsed` | `collapsed` |
  | `done` | `status`, `doneAt`, `doneDate`, `doneStartMin` |
  | `duration` | `durationMin` |
  | `energy` | `energy` |
  | `doLast` | `doLast` |
  | `date` | `scheduledDate` |
  | `pin` | `pinnedStartMin` |
  | `deleted` | `deletedAt` |

  `id`, `kind`, `createdAt` không bao giờ đổi nên không có nhóm.
- **Đóng dấu khi sửa.** `stampFieldTimes` (lõi) so sánh trước và sau mỗi lần sửa, chỉ đóng dấu giờ sửa (`updatedAt` của lần sửa đó) cho nhóm thật sự đổi. Việc mới được đóng dấu mọi nhóm lúc tạo.
- **Gộp ở thiết bị.** `mergeNode` và `mergeRemote` chọn theo từng nhóm: bản sửa sau thắng. Nếu gộp ra một dòng vừa có giá trị của máy chủ vừa có giá trị cục bộ mới hơn thì dòng đó được lưu **dirty** để lần đẩy sau gửi phần cục bộ.
- **Gộp ở máy chủ.** Hàm `push_tree_nodes` làm đúng phép gộp đó cho từng nhóm bằng `group_is_newer`, khóa dòng (`for update`) nên hai thiết bị đẩy cùng lúc cũng không mất trường nào. Sau khi đẩy, thiết bị kéo lại một lần để nhận phần máy chủ đã gộp.
- **Hòa giờ.** Cùng giờ nhưng khác giá trị thì giá trị của **máy chủ** thắng (máy chủ giữ giá trị đang lưu, thiết bị nhận giá trị của máy chủ), nên mọi thiết bị hội tụ về cùng một giá trị.
- **Tương thích ngược.** Dòng chưa có `field_times` (viết trước khi có tính năng này) coi mọi nhóm sửa lần cuối lúc `updatedAt`, tức là đúng cách cũ. Khi sửa lần đầu, các giờ được ghi đầy đủ.
- **Nhật ký `node_history`.** Mỗi lần một nhóm bị ghi đè bởi giá trị **khác** (trừ `collapsed`, chỉ là trạng thái hiển thị), giá trị cũ được lưu: người dùng, việc, tên nhóm, giá trị cũ (jsonb), thời điểm. RLS chỉ cho người sở hữu đọc.
- **Giữ 30 ngày.** Mỗi lần đẩy, hàm xóa nhật ký quá 30 ngày của chính người đó. Người ngừng dùng thì phần cũ của họ ở lại cho tới lần đẩy sau; chưa dùng `pg_cron`.
- SQLite cục bộ lên schema v3 (cột `field_times` dạng JSON).

## Kiểm thử

- Lõi: `packages/core/test/fields.test.js` và `sync.test.js` (tạo, sửa, di chuyển, hoàn thành, dòng cũ, hòa giờ, gộp hai bên), độ phủ 100%.
- App: `NodesProvider.test.js` kiểm tra mỗi thao tác chỉ đóng dấu đúng nhóm.
- Máy chủ: `supabase/tests/push_tree_nodes.sql` chạy trên dự án thật trong một giao dịch **luôn bị hoàn tác** (tạo người dùng tạm, đẩy từ hai "thiết bị", kiểm tra gộp, nhật ký, đẩy lại, hòa giờ, dòng cũ, dọn 30 ngày, RLS). Chạy bằng `npx supabase db query --linked -f supabase/tests/push_tree_nodes.sql`; kết quả đạt là thông báo lỗi có chủ ý `TEST_OK`.

## Giới hạn

- Chưa có giao diện xem hoặc khôi phục nhật ký; dữ liệu đã được ghi, màn "Lịch sử thay đổi" là việc sau.
- Thứ tự giữa hai thiết bị vẫn dựa vào đồng hồ thiết bị (`updatedAt`): máy sai giờ có thể thắng hoặc thua không công bằng.
- Thiết lập (`user_settings`) vẫn đồng bộ theo từng dòng (một dòng cho mỗi người, ít xung đột).
- Chưa thử với hai thiết bị thật và tài khoản thật.
