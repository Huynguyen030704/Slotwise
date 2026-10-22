# Slotwise

**Trợ lý lên lịch cho người đi làm.** Bạn ghi việc kèm thời lượng, Slotwise tự xếp việc vào đúng khung giờ trống, đúng lúc bạn tỉnh táo nhất.

> Smart daily planner for office workers and freelancers: auto-schedules tasks around your calendar and energy.

Trạng thái: **giai đoạn đầu (prototype đã xong, chưa có code sản phẩm)**.

---

## Vấn đề

Ứng dụng todo thông thường chỉ là danh sách. Người đi làm vẫn phải tự nhìn lịch họp, tự đoán việc nào làm lúc nào, rồi cuối ngày việc dồn lại và sinh cảm giác tội lỗi. Slotwise đảo ngược cách làm: **lịch là trung tâm, danh sách việc chỉ là nguyên liệu**.

## Tính năng cốt lõi (MVP)

| Tính năng | Mô tả |
|---|---|
| **Tự xếp việc vào lịch** | Việc được xếp vào khoảng trống giữa các cuộc họp, theo thứ tự ưu tiên của bạn. |
| **Theo mức năng lượng** | Việc "cần tập trung" vào giờ tỉnh táo (sáng hoặc chiều tùy bạn), việc "nhẹ nhàng" vào giờ còn lại. |
| **Nhóm → việc → việc con** | Cấu trúc đúng như cách dân văn phòng ghi chú công việc, có tiến độ theo nhóm. |
| **Dán ghi chú từ Notepad/Markdown** | Dòng in đậm là nhóm, đánh số hoặc thụt lề là việc con, `[DONE]` là đã xong, `LÀM CUỐI` là việc làm sau cùng. |
| **Kéo thả** | Kéo việc vào lịch để ghim giờ, kéo trong danh sách để đổi ưu tiên hoặc chuyển nhóm. |
| **Chế độ tập trung** | Mỗi lúc chỉ hiện một việc, kèm đồng hồ 25 phút. |
| **Tổng kết ngày và báo cáo** | Việc chưa xong dời sang mai chỉ một lần bấm. Báo cáo tiến độ theo nhóm để gửi sếp. |

Sau MVP: đồng bộ Google/Outlook Calendar, AI tách việc và trích việc từ ghi chú họp, nhập bằng giọng nói tiếng Việt, theo dõi giờ làm cho freelancer, gói nhóm. Xem [Lộ trình](#lộ-trình).

## Đối tượng

Dân văn phòng và freelancer, ưu tiên thị trường Việt Nam trước (giao diện tiếng Việt mặc định, hiểu cách người Việt ghi chú công việc), có sẵn khung đa ngôn ngữ để mở rộng.

## Prototype

Bản thử nghiệm bấm được nằm ở [`docs/prototype/slotwise-prototype.html`](docs/prototype/slotwise-prototype.html). Mở trực tiếp bằng trình duyệt, không cần cài đặt. Đây là **tài liệu tham chiếu hành vi và giao diện**, không phải mã sản phẩm. Thuật toán xếp lịch và bộ đọc ghi chú trong đó sẽ được viết lại có kiểm thử (xem `CLAUDE.md`).

## Công nghệ (đề xuất)

- **App:** React Native + Expo (TypeScript), chạy iOS, Android và web từ một codebase.
- **Lõi nghiệp vụ:** package TypeScript thuần (`packages/core`) chứa thuật toán xếp lịch và bộ đọc ghi chú, có kiểm thử đơn vị.
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Edge Functions).
- **Dữ liệu cục bộ:** SQLite, hoạt động offline và tự đồng bộ.
- **AI:** Claude API, gọi qua Edge Function (không đặt khóa API trong app).

Đây là đề xuất khởi đầu. Mọi thay đổi lớn về công nghệ cần được ghi lại trong `docs/decisions/`.

## Cấu trúc thư mục (dự kiến)

```
slotwise-app/
├── apps/
│   └── mobile/            # Expo app (iOS, Android, web)
├── packages/
│   └── core/              # Thuật toán xếp lịch, bộ đọc ghi chú, kiểu dữ liệu (TS thuần)
├── supabase/
│   ├── migrations/        # Schema SQL
│   └── functions/         # Edge Functions (proxy AI, đồng bộ lịch)
├── docs/
│   ├── prototype/         # Prototype HTML tham chiếu
│   └── decisions/         # Ghi chép quyết định kỹ thuật (ADR)
├── CLAUDE.md              # Hướng dẫn cho Claude Code
└── README.md
```

## Bắt đầu

Chưa có mã sản phẩm. Các bước đầu tiên nằm trong **Milestone 0** ở `CLAUDE.md`. Cách nhanh nhất để bắt đầu:

```bash
git clone <url-repo-cua-ban> slotwise-app
cd slotwise-app
# Mở Claude Code tại thư mục này, nó sẽ tự đọc CLAUDE.md
claude
```

Sau đó giao cho Claude Code: *"Thực hiện Milestone 0 trong CLAUDE.md"*.

## Lộ trình

- [x] **Nghiên cứu và prototype:** định vị, luồng người dùng, prototype bấm được.
- [ ] **Milestone 0, Nền móng:** khởi tạo monorepo, CI, `packages/core` với thuật toán xếp lịch và bộ đọc ghi chú có kiểm thử.
- [ ] **Milestone 1, Lõi cục bộ:** màn hình danh sách, lịch ngày, kéo thả, chế độ tập trung, lưu offline.
- [ ] **Milestone 2, Tài khoản và đồng bộ:** đăng nhập, đồng bộ đa thiết bị, sao lưu.
- [ ] **Milestone 3, Lịch ngoài:** đồng bộ Google Calendar và Outlook, lấy khoảng trống thật.
- [ ] **Milestone 4, AI và hoàn thiện:** tách việc, trích việc từ ghi chú họp, báo cáo tuần, thanh toán, beta kín.
- [ ] **Ra mắt:** App Store, Google Play, gói Pro.

## Mô hình kinh doanh (dự kiến)

Freemium. Gói miễn phí cho việc cơ bản và một lịch. Gói Pro (khoảng 3 đến 5 USD mỗi tháng) mở khóa AI, xếp lịch tự động nâng cao, nhiều lịch và thống kê. Gói nhóm về sau.

## Giấy phép

Chưa chọn. Mặc định: bảo lưu mọi quyền (proprietary). Cập nhật mục này nếu bạn quyết định mở mã nguồn.
