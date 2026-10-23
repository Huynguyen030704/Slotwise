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

`db push` áp các tệp `supabase/migrations/*.sql`. Trạng thái ngày 2026-10-23: dự án đã được link, cả năm migration đã áp và hàm `delete-account` đã triển khai (điểm vào đặt trong `supabase/config.toml`). `delete-account` dùng khóa bí mật mà Supabase tự cấp cho Edge Function.

Kiểm thử hàm gộp trên máy chủ (chạy trong giao dịch luôn hoàn tác, không để lại dữ liệu): `npx supabase db query --linked -f supabase/tests/push_tree_nodes.sql`. Kết quả đạt là thông báo `TEST_OK`.

Có thêm workflow `.github/workflows/supabase-deploy.yml` tự chạy `db push` khi có commit đổi `supabase/migrations/**` trên nhánh `main`. Workflow cần 1 secret trong GitHub (Settings > Secrets and variables > Actions): `SUPABASE_DB_URL`, là chuỗi kết nối Postgres của dự án (Project Settings > Database > Connection string, loại Session pooler, đã điền mật khẩu). Cũng bấm tay được ở tab Actions.

## 3. Đăng nhập bằng email

App chỉ đăng nhập bằng email và mật khẩu (đã gỡ nút Google, xem ADR 0003). Cấu hình trong bảng điều khiển Supabase:

1. Authentication > Providers > Email: bật **Confirm email**. Người mới phải bấm liên kết trong email mới đăng nhập được.
2. Authentication > Providers > Google: để **tắt**.
3. Authentication > URL Configuration:
   - **Site URL**: địa chỉ web của app (`http://localhost:8081` khi đang phát triển). Liên kết trong email xác nhận dẫn về đây.
   - **Redirect URLs**: `http://localhost:8081` và `http://localhost:8081/**`, thêm địa chỉ web thật khi đã triển khai (xem `docs/trien-khai-web.md`). `slotwise://auth/callback` chỉ cần nếu sau này làm lại đăng nhập mạng xã hội.
4. Email gửi mặc định của Supabase bị giới hạn vài thư mỗi giờ, đủ để thử. Trước khi mở cho người dùng, cấu hình SMTP riêng ở Authentication > SMTP Settings.

## 4. Trước khi mở cho người dùng

- Kiểm tra lại **Confirm email** đã bật và đã có SMTP riêng (mục 3).
- Xem lại giới hạn tần suất trong Authentication > Rate Limits.
