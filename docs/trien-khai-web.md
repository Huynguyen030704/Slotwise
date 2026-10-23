# Triển khai bản web (GitHub Pages)

Mục tiêu giai đoạn này: chạy thử bản web trên GitHub khi đã có dữ liệu thật, chưa build app điện thoại. Tài liệu này liệt kê việc còn thiếu. Chưa việc nào trong danh sách được làm sẵn trừ khi có ghi chú.

## Việc phải làm trước khi bản web chạy được trên GitHub

### A. Phía GitHub (bạn làm)

1. **Đẩy mã lên.** Toàn bộ công việc đang nằm ở nhánh `milestone-0` trên máy, chưa push. Cần push và gộp vào `main` (nên qua một Pull Request để CI chạy).
2. **Chế độ riêng tư của kho mã.** GitHub Pages chỉ dùng được với kho **công khai** nếu tài khoản miễn phí (kho riêng tư cần gói trả phí). README ghi giấy phép là "chưa chọn, bảo lưu mọi quyền", nên công khai kho đồng nghĩa mọi người đọc được mã. Hãy quyết định: công khai kho, hay nâng gói, hay dùng nơi lưu trữ khác (xem mục C).
3. **Bật Pages:** Settings > Pages > Source chọn **GitHub Actions**.
4. **Biến cho bản build** (Settings > Secrets and variables > Actions > tab Variables): `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Khóa publishable vốn công khai nên để ở dạng Variable là được.
5. **Secret cho workflow Supabase** nếu muốn migration tự áp: `SUPABASE_DB_URL` (xem `docs/supabase-setup.md`).

### B. Phía Supabase (bạn làm)

1. Thêm **địa chỉ trang Pages** vào URL Configuration: `https://huynguyen030704.github.io/Slotwise/` (và `/**`). Đặt Site URL là địa chỉ này.
2. Bật **Confirm email** (xem `docs/supabase-setup.md` mục 3).
3. Kiểm tra đăng ký bằng email (có thư xác nhận) và đăng nhập trên bản web đã triển khai.

### C. Phía mã nguồn (đã làm)

1. **Đường dẫn con.** `apps/mobile/app.config.js` đọc biến `EXPO_BASE_URL` (workflow đặt thành `/Slotwise`) và gán vào `experiments.baseUrl`. Chạy máy phát triển hay build điện thoại thì biến này trống nên không ảnh hưởng.
2. **Tải lại trang.** `scripts/export-web.mjs` sao chép `index.html` thành `404.html`, nên tải lại ở `/Slotwise/settings` vẫn vào được app.
3. **Cô lập chéo nguồn.** SQLite trên web cần `SharedArrayBuffer`, tức là cần hai tiêu đề COOP và COEP mà GitHub Pages không cho đặt. `public/coi-sw.js` là một service worker nhỏ tự thêm hai tiêu đề này, và script xuất web chèn nó vào `index.html`. Lần đầu vào trang, trình duyệt tải lại một lần. Nếu sau này gặp rắc rối, đổi sang Cloudflare Pages hoặc Netlify với tệp `_headers` là cách bỏ service worker.
4. **Workflow:** `.github/workflows/deploy-web.yml` chạy khi đẩy lên `main` hoặc bấm tay (Actions > Deploy web > Run workflow).
5. Đã kiểm tra bản build dưới `/Slotwise/`: trang và tài nguyên tải đúng. **Chưa kiểm chứng được service worker** (khung xem trước của Claude chặn đăng ký service worker), nên cần thử trên Chrome thật sau khi triển khai: mở trang, tải lại một lần, rồi gõ `crossOriginIsolated` ở Console, kết quả phải là `true`.

Chạy thử bản build ở máy: `EXPO_BASE_URL=/Slotwise pnpm --filter mobile export:web`, kết quả nằm ở `apps/mobile/dist`.

### D. Việc còn thiếu trước khi mở cho người khác dùng

| Việc | Ghi chú |
|---|---|
| Điều khoản dịch vụ và chính sách bảo mật | Chưa có trang nào. CLAUDE.md yêu cầu có trước khi ra mắt |
| Bật xác nhận email | Hiện đăng ký tự xác nhận |
| Báo lỗi (Sentry) và thống kê dùng | Chưa tích hợp |
| Lưu token đăng nhập an toàn trên điện thoại | Chỉ liên quan khi build app |
| Lịch ngoài thật (Google Calendar, Outlook) | Milestone 3; cần đăng ký OAuth |
| Đồng bộ theo từng trường, nhật ký khôi phục | Hiện theo từng dòng |
| Kiểm tra trên thiết bị thật | Cảm ứng, kéo thả, offline |
| Giấy phép của kho mã | Câu hỏi mở ở mục 15 của CLAUDE.md |
| Tên miền | Có thể dùng `github.io` tạm |
