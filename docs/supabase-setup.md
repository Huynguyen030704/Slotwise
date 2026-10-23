# Thiết lập Supabase

Việc cần làm một lần cho tài khoản và đồng bộ (Milestone 2). Mã dự án: `jqagldnizixhiwdgofdf`.

## 1. Cấu hình app

Tạo `apps/mobile/.env.local` (không bao giờ commit) chỉ với **địa chỉ gốc**, không có đường dẫn phía sau:

```
EXPO_PUBLIC_SUPABASE_URL=https://jqagldnizixhiwdgofdf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<khóa publishable lấy ở Project Settings > API Keys>
```

App tự cắt đuôi `/rest/v1/` nếu bạn dán nhầm địa chỉ REST, nhưng nên để tệp cho gọn. Khóa publishable an toàn khi để trong app vì RLS bảo vệ dữ liệu. Tuyệt đối không đặt khóa `service_role` hay khóa bí mật vào app.

Mẫu có sẵn ở `apps/mobile/.env.example`.

## 2. Áp schema và triển khai hàm (Supabase CLI)

```bash
npx supabase login
npx supabase link --project-ref jqagldnizixhiwdgofdf
npx supabase db push
npx supabase functions deploy delete-account
```

`db push` áp các tệp `supabase/migrations/*.sql`. Trạng thái ngày 2026-10-23: dự án đã được link, cả bốn migration đã áp và hàm `delete-account` đã triển khai (điểm vào đặt trong `supabase/config.toml`). `delete-account` dùng khóa bí mật mà Supabase tự cấp cho Edge Function.

Có thêm workflow `.github/workflows/supabase-deploy.yml` tự chạy `db push` khi có commit đổi `supabase/migrations/**` trên nhánh `main`. Workflow cần 3 secret trong GitHub (Settings > Secrets and variables > Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.

## 3. Đăng nhập bằng Google

1. Trong Google Cloud Console, tạo OAuth client loại **Web application**. Thêm URI chuyển hướng được phép: `https://jqagldnizixhiwdgofdf.supabase.co/auth/v1/callback`.
2. Trong bảng điều khiển Supabase mở Authentication > Providers > Google, bật lên và dán client ID cùng secret.
3. Trong Authentication > URL Configuration thêm các URL chuyển hướng:
   - `slotwise://auth/callback` (app điện thoại)
   - `http://localhost:8081` và `http://localhost:8081/**` (web khi phát triển)
   - địa chỉ web thật khi đã triển khai (ví dụ trang GitHub Pages, xem `docs/trien-khai-web.md`)
4. Đặt Site URL là địa chỉ web thật của bạn (hoặc `http://localhost:8081` khi đang phát triển).

## 4. Trước khi mở cho người dùng

- Bật **Confirm email** trong Authentication > Providers > Email.
- Xem lại giới hạn tần suất trong Authentication > Rate Limits.
