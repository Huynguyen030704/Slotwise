# 0004. Hai cách dùng: xếp việc theo giờ, hoặc chỉ quản lý việc

Trạng thái: đã chấp nhận (2026-10-22)

## Bối cảnh

Slotwise được xây quanh một dòng thời gian: mỗi việc có thời lượng và mức năng lượng, rồi được đặt vào khung giờ trống. Có người muốn đúng như vậy, có người chỉ muốn danh sách việc và không cần giờ giấc.

## Quyết định

- Một thiết lập theo tài khoản là `mode`, lưu ở `user_settings.mode` (`'schedule' | 'tasks' | NULL`) và đồng bộ như các thiết lập khác, nên đi theo người dùng sang mọi thiết bị.
- `NULL` nghĩa là "chưa chọn" và hoạt động như `schedule`. Để trống giúp lựa chọn ở màn chào **trước khi đăng ký** được tài khoản mới nhận (`adoptLocalMode` trong `packages/core/src/settings.js`), còn tài khoản đã có chế độ thì luôn thắng khi đăng nhập trên máy mới.
- **`schedule`** (mặc định): danh sách + lịch ngày, thời lượng, năng lượng, ghim giờ, giờ làm việc, giờ tỉnh táo và khung giờ cố định.
- **`tasks`**: danh sách + màn **Hôm nay** (`taskBuckets` trong core: hôm nay, đã xong hôm nay, ngày mai, sau này; thứ tự trong cây là mức ưu tiên; việc chưa xong từ ngày trước tính là hôm nay). Ẩn thời lượng, năng lượng, ghim giờ và các thiết lập giờ giấc. Chế độ tập trung lấy việc hôm nay theo thứ tự danh sách, không có giờ dự kiến. Menu có "Làm hôm nay", "Dời sang ngày mai" và "Để sau" thay cho các thao tác theo giờ.
- Dữ liệu việc không bị đổi khi chuyển chế độ: thời lượng, năng lượng và giờ ghim vẫn được lưu, nên chuyển lại không mất gì. "Sau này" là `scheduledDate = null` (hoặc xa hơn ngày mai).
- Chế độ được chọn ở màn chào (hai thẻ) và đổi được bất cứ lúc nào trong Thiết lập.
- Thay đổi cơ sở dữ liệu là `20261022030000_settings_mode.sql`.

## Chưa làm

- Ngày đến hạn (deadline) ở chế độ `tasks`: CLAUDE.md để ngoài phạm vi MVP. Các nhóm chỉ có Hôm nay / Ngày mai / Sau này.
- Kéo việc sang màn Hôm nay để đổi ngày (hiện đổi qua menu).
