# 0006. Ghi chú cho từng việc

Trạng thái: đã chấp nhận (2026-10-26)

## Bối cảnh

Việc chỉ có tên, thời lượng, mức năng lượng và ngày giờ. Người dùng cần chỗ ghi thêm điều cần nhớ hoặc cần báo cáo về một việc (ví dụ "đang chờ báo giá, gọi lại thứ Hai"). Việc con không thay được ghi chú: việc con là một việc nhỏ hơn, có ô tích, được xếp lịch và tính vào tiến độ. Ghi chú là chữ để đọc, không phải việc phải làm.

## Quyết định

- **Dữ liệu:** `TreeNode.note` là chuỗi tự do, tối đa 2000 ký tự trong giao diện. Chuỗi rỗng (hoặc thiếu) nghĩa là không có ghi chú. Cột `note text not null default ''` ở SQLite (schema v4) và ở `tree_nodes` (migration `20261026000000_task_notes.sql`).
- **Không ảnh hưởng xếp lịch và tiến độ:** ghi chú không đổi thuật toán xếp lịch, trạng thái xong hay số liệu của nhóm.
- **Giao diện:** mục "Thêm ghi chú" (hoặc "Sửa ghi chú") trong menu "…" của mọi việc, mở một bảng nhập nhiều dòng; lưu chuỗi rỗng hoặc bấm "Xóa ghi chú" thì bỏ ghi chú. Ghi chú hiện dưới tên việc (tối đa hai dòng, chạm vào để sửa) ở danh sách và màn Hôm nay.
- **Báo cáo:** ghi chú là tùy chọn. Màn Tổng kết có công tắc "Kèm ghi chú vào báo cáo" (mặc định tắt, chỉ hiện khi có việc nào có ghi chú). Tắt thì báo cáo như trước; bật thì mỗi ghi chú nằm trên các dòng thụt vào dưới việc của nó, cả trên màn hình và trong bản sao chép.
- **Đồng bộ:** `note` là nhóm trường thứ 11 trong cơ chế theo từng trường (ADR 0005), nên hai thiết bị sửa ghi chú và tên của cùng một việc offline thì giữ cả hai. Hàm `push_tree_nodes` gộp nhóm này và ghi nhật ký `node_history` khi ghi chú bị ghi đè bởi giá trị khác.
- **Tương thích với app cũ** (bản web đã cài chưa kịp cập nhật): app cũ không gửi `note` và không có khóa `note` trong `field_times`. Hàm trên máy chủ bỏ qua nhóm `note` trong trường hợp đó nên không xóa ghi chú đang lưu. Một việc chưa từng có ghi chú và chưa có giờ sửa ghi chú được coi là sửa ghi chú lần cuối lúc 1970, để một lần đổi tên muộn hơn không thể xóa ghi chú vừa viết ở máy khác (cả trên máy chủ lẫn trong `groupTime` của lõi).
- **Xuất dữ liệu:** tệp JSON xuất ra có `note` vì nó chứa toàn bộ nút.

## Thứ tự triển khai

Áp migration lên Supabase **trước**, rồi mới đăng bản web mới. App mới gửi `note` lên máy chủ; máy chủ cũ bỏ qua khóa lạ nên không lỗi, nhưng ghi chú sẽ không được lưu cho tới khi migration được áp.

## Kiểm thử

- Lõi: `fields.test.js`, `nodeRows.test.js`, `sync.test.js`, `report.test.js` (nhóm `note`, dòng cũ, gộp hai thiết bị, báo cáo có và không có ghi chú), độ phủ 100%.
- App: `ListPane.test.js` (hiện ghi chú, thêm, sửa, xóa), `NodesProvider.test.js` (chỉ nhóm `note` được đóng dấu).
- Máy chủ: `supabase/tests/task_notes.sql`, chạy trong giao dịch luôn bị hoàn tác sau khi áp migration (app cũ không xóa được ghi chú, bản sửa cũ hơn bị bỏ, xóa trắng bằng bản mới hơn, việc mới mang theo ghi chú). Đã chạy trên dự án thật ngày 2026-10-26 (đạt, cả trước và sau khi áp migration); bài `push_tree_nodes.sql` cũ cũng vẫn đạt.

## Giới hạn

- Ghi chú chỉ có chữ thuần, chưa có định dạng, đính kèm hay liên kết bấm được.
- Nhóm (`group`) và ghi chú độc lập (`note` từ bộ đọc ghi chú) chưa có ô ghi chú riêng.
- Bộ đọc ghi chú (`parseNotes`) chưa gắn các dòng ghi chú vào việc phía trên.
