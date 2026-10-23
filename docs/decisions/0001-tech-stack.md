# 0001. Công nghệ cho Milestone 0

Trạng thái: đã chấp nhận (2026-10-22)

## Bối cảnh

Slotwise cần một lõi nghiệp vụ kiểm thử được (thuật toán xếp lịch và bộ đọc ghi chú) trước khi có giao diện. Chủ dự án chọn JavaScript thay cho TypeScript.

## Quyết định

- Ngôn ngữ: JavaScript (ESM), không có tệp `.ts`.
- An toàn kiểu: chú thích JSDoc `@typedef`, kiểm tra bằng `tsc --checkJs --noEmit` ở chế độ `strict`. `typescript` chỉ là devDependency dùng để kiểm tra.
- Monorepo: pnpm workspaces (`apps/*`, `packages/*`). Node >= 22.
- Kiểm thử: Vitest kèm độ phủ v8, ngưỡng 100% cho các tệp lõi.
- Lint và định dạng: ESLint 9 (flat config) + `eslint-plugin-jsdoc`, Prettier (không áp dụng cho tệp Markdown).
- CI: GitHub Actions chạy lint, typecheck, kiểm tra định dạng và test cho mỗi PR.
- Hoãn lại: app Expo (M1), Supabase (M2), AI (M4). Công nghệ ở mục 3 của `CLAUDE.md` vẫn là kế hoạch cho các phần này.
- Commit message theo quy ước chung của chủ dự án: Conventional Commits, phần mô tả bằng tiếng Việt.
- Ngôn ngữ tài liệu: từ 2026-10-23 tài liệu kỹ thuật viết bằng **tiếng Việt** (xem mục 2 của `CLAUDE.md`). Mã nguồn, tên biến và tên nhánh vẫn bằng tiếng Anh.

## Khác biệt so với bộ đọc ghi chú trong prototype

- Kết quả dùng tên trường của `TreeNode` (`parentId`, `durationMin`, `doLast`, `status`) thay cho tên rút gọn trong prototype.
- Trả về `{ nodes, skippedLines }` để nơi gọi báo được những dòng bị bỏ qua, đúng như đặc tả. Prototype bỏ qua âm thầm.
- `scheduledDate` là `null` sau khi đọc; nơi gọi tự gán ngày.

## Hệ quả

- Không có bước biên dịch, nhưng lỗi kiểu vẫn bị bắt trong CI nhờ `checkJs`.
- Chuyển sang TypeScript sau này khá đơn giản (đổi tên tệp, nâng `typedef` thành kiểu).
