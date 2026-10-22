# Supabase setup & mapping

## 1. Tạo project
1. https://supabase.com/dashboard → New project (region gần VN: Singapore). Lưu database password vào password manager.
2. Settings → API: lấy `Project URL` và `anon public key` → `apps/mobile/.env.local` (xem `.env.example`). **Không** dùng `service_role` trong app.
3. Authentication → Providers: bật Email (Google/Apple sau). Authentication → URL Configuration: thêm redirect `slotwise://auth/callback`.

## 2. Chạy schema
```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```
Hoặc dán `supabase/migrations/20261022000000_init.sql` vào SQL Editor.

## 3. Map SQLite ↔ Postgres (`tree_nodes`)
| SQLite (local) | Postgres | Ghi chú |
|---|---|---|
| id TEXT | uuid | client tự sinh uuid v4 |
| user_id TEXT | uuid | mặc định `auth.uid()`; RLS ép bằng chính nó |
| parent_id TEXT | uuid | FK tự tham chiếu |
| collapsed, do_last INTEGER 0/1 | boolean | `!!v` / `v ? 1 : 0` |
| scheduled_date, done_date TEXT | date | `YYYY-MM-DD` |
| done_at, created_at, updated_at, deleted_at TEXT (ISO) | timestamptz | ISO UTC |
| position TEXT | text collate "C" | fractional index, so sánh theo byte |
| (không có) | server_updated_at | server đặt, dùng làm cursor pull |

`user_settings`: local là key/value, server là một hàng/người dùng với cột `work_start_min, work_end_min, peak, buffer_min, grid_min`. Khi đồng bộ, gộp key → cột.
camelCase của `TreeNode` ↔ snake_case: map ở lớp sync (`toRow` / `fromRow`).

## 4. Quy tắc đồng bộ (MVP)
- **Push:** `upsert` hàng local có `updated_at > lastPushAt` (`onConflict: 'id'`). Xóa = set `deleted_at`, không `DELETE`.
- **Pull:** `select * where server_updated_at > lastPullCursor order by server_updated_at`. Dùng `server_updated_at` (không phải `updated_at`) để tránh lệch đồng hồ.
- **Xung đột:** hàng có `updated_at` mới hơn thắng. Chỉ ghi đè local nếu `remote.updated_at >= local.updated_at`. Theo từng trường là bước sau (ghi `docs/decisions/`).
- Push theo thứ tự cha trước con (FK `parent_id`), hoặc gửi một batch upsert duy nhất.

## 5. Client
```js
// pnpm --filter mobile add @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);
```

## 6. Bảo mật
- RLS bật mọi bảng; test bằng 2 tài khoản: A không đọc/ghi được hàng của B.
- `calendar_accounts.encrypted_refresh_token`: app bị thu quyền `select` cột này; chỉ Edge Function (service role) đọc/ghi.
- Khóa Claude API: `npx supabase secrets set ANTHROPIC_API_KEY=...`, chỉ dùng trong Edge Function.
- Xóa tài khoản: Edge Function gọi `auth.admin.deleteUser` (cascade xóa toàn bộ dữ liệu).
