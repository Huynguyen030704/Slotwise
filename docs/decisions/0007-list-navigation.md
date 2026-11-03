# 0007. Điều hướng trong danh sách dài

Trạng thái: đã chấp nhận (2026-11-03)

## Bối cảnh

Khi dùng thật, một người có nhiều nhóm lớn (mỗi nhóm hàng chục việc). Nhóm hay việc mới luôn được thêm vào **cuối** danh sách và mọi nhóm đều mở sẵn, nên tạo xong phải cuộn rất lâu mới thấy cái vừa tạo; tìm một nhóm cũ cũng vậy.

## Quyết định

- **Tự cuộn tới và làm nổi bật** việc hoặc nhóm vừa thêm (nền sáng khoảng 2 giây). Nếu nó nằm trong một nhóm đang thu gọn thì nhóm đó được mở ra trước. `addGroup` và `addTask` trả về id của nút vừa tạo để làm việc này. Ô nhập vẫn giữ focus nên nhập liên tiếp không bị gián đoạn.
- **Thu gọn tất cả / Mở tất cả:** một nút, chữ đổi theo trạng thái. Thao tác này không ghi vào hoàn tác (giống bấm thu gọn từng nhóm) và đồng bộ như nhóm trường `collapsed`.
- **Đến nhóm…:** bảng liệt kê mọi nhóm kèm tiến độ, có ô lọc khi có hơn 6 nhóm. Chọn một nhóm thì mở nó, cuộn tới và làm nổi bật. Nút chỉ hiện khi có từ hai nhóm.
- **Tìm kiếm:** ô tìm theo tên và ghi chú, **không phân biệt dấu và hoa thường** (gõ "bao cao" ra "Báo cáo", "dat" ra "Đặt"), mọi từ gõ vào đều phải khớp. Kết quả giữ nhóm và việc cha phía trên để còn ngữ cảnh, tự mở các nhóm đang thu gọn. Nhóm khớp chỉ hiện tiêu đề, không kéo cả nhóm ra. Tôn trọng nút ẩn việc đã xong.
- Logic thuần nằm ở `packages/core` (`search.js`, `setAllCollapsed`, `expandAncestors`, có kiểm thử, độ phủ 100%); giao diện ở `ListToolbar`, `GroupJumpSheet`, `ListPane`.
- Dãy chip chọn nhóm khi thêm việc lấy nhóm từ cây (không phụ thuộc vào kết quả tìm kiếm hay việc đang thu gọn).

## Giới hạn và việc để sau

- Danh sách vẫn dùng `FlatList` thường: với hàng nghìn dòng nên thêm cắt dòng ảo hóa chặt hơn.
- Chưa có nhóm "ghim lên đầu", chưa cho chọn thêm nhóm mới vào đầu hay cuối danh sách, chưa thu gọn sẵn khi nhập ghi chú hàng loạt.
- Cuộn tới dòng dựa vào chiều cao dòng ước lượng rồi thử lại; trên danh sách rất dài có thể mất một nhịp ngắn để tới đúng chỗ.
