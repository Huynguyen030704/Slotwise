# Triển khai bản web (GitHub Pages)

Mục tiêu giai đoạn này: chạy thử bản web trên GitHub khi đã có dữ liệu thật, chưa build app điện thoại. Tài liệu này liệt kê việc còn thiếu. Chưa việc nào trong danh sách được làm sẵn trừ khi có ghi chú.

## Việc phải làm trước khi bản web chạy được trên GitHub

### A. Phía GitHub (bạn làm)

1. **Đẩy mã lên.** Toàn bộ công việc đang nằm ở nhánh `milestone-0` trên máy, chưa push. Cần push và gộp vào `main` (nên qua một Pull Request để CI chạy).
2. **Chế độ riêng tư của kho mã.** GitHub Pages chỉ dùng được với kho **công khai** nếu tài khoản miễn phí (kho riêng tư cần gói trả phí). README ghi giấy phép là "chưa chọn, bảo lưu mọi quyền", nên công khai kho đồng nghĩa mọi người đọc được mã. Hãy quyết định: công khai kho, hay nâng gói, hay dùng nơi lưu trữ khác (xem mục C).
3. **Bật Pages:** Settings > Pages > Source chọn **GitHub Actions**.
4. **Biến cho bản build** (Settings > Secrets and variables > Actions > tab Variables): `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Khóa publishable vốn công khai nên để ở dạng Variable là được.
5. **Secret cho workflow Supabase** nếu muốn migration tự áp: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` (xem `docs/supabase-setup.md`).

### B. Phía Supabase (bạn làm)

1. Thêm **địa chỉ trang Pages** vào URL Configuration: `https://huynguyen030704.github.io/Slotwise/` (và `/**`). Đặt Site URL là địa chỉ này.
2. Bật **Confirm email** (xem `docs/supabase-setup.md` mục 3).
3. Kiểm tra đăng ký bằng email (có thư xác nhận) và đăng nhập trên bản web đã triển khai.

### C. Phía mã nguồn (tôi làm khi bạn đồng ý)

Chưa có sẵn, cần thêm:

1. **Đường dẫn con.** Trang nằm ở `/Slotwise/` chứ không phải gốc, nên cần `experiments.baseUrl` trong `app.json` để mọi tài nguyên và liên kết đúng.
2. **Điều hướng khi tải lại trang.** GitHub Pages không có "SPA fallback". Cần sao chép `index.html` thành `404.html` để tải lại ở `/Slotwise/settings` vẫn vào được app.
3. **Tiêu đề cô lập chéo nguồn (rất quan trọng).** SQLite trên web dùng `SharedArrayBuffer`, trình duyệt chỉ cho phép khi trang gửi `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: credentialless`. Server phát triển đã bật sẵn, nhưng **GitHub Pages không cho đặt tiêu đề tùy ý**. Hai hướng:
   - Dùng `coi-serviceworker` (một service worker nhỏ tự thêm các tiêu đề này; lần đầu vào trang sẽ tải lại một lần).
   - Hoặc dùng nơi lưu trữ tĩnh cho phép đặt tiêu đề (Cloudflare Pages, Netlify, Vercel đều miễn phí, chỉ cần một tệp `_headers`). Nếu muốn dùng GitHub thì cũng có thể để GitHub chỉ chứa mã, còn Cloudflare Pages kéo mã từ GitHub để phát trang.
4. **Workflow triển khai:** `.github/workflows/deploy-web.yml` (cài gói, `expo export --platform web`, đăng lên Pages).
5. Kiểm tra bản build thật (không phải bản phát triển), gồm đồng bộ hai tab/hai máy.

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
