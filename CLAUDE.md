# CLAUDE.md: Hướng dẫn cho Claude Code

Tệp này mô tả dự án **Slotwise** để bạn làm việc đúng hướng ngay từ đầu. Đọc hết trước khi viết mã. Khi tệp này mâu thuẫn với lời yêu cầu trực tiếp của chủ dự án, hãy làm theo chủ dự án và đề xuất cập nhật tệp này.

## 1. Dự án là gì

Slotwise là app lên lịch cho người đi làm (dân văn phòng, freelancer). Người dùng ghi việc kèm thời lượng và mức năng lượng, app **tự xếp việc vào khung giờ trống** trong ngày, ưu tiên việc cần tập trung vào giờ tỉnh táo.

Điểm khác biệt so với todo thông thường:

1. **Lịch là trung tâm**, danh sách việc chỉ là nguyên liệu.
2. **Xếp theo năng lượng**: việc nặng đầu óc vào giờ tỉnh táo, việc nhẹ vào giờ còn lại.
3. **Cấu trúc nhóm → việc → việc con**, nhập thẳng từ ghi chú Notepad/Markdown.
4. **Kéo thả** để ghim giờ và đổi ưu tiên.
5. **Báo cáo tiến độ** theo nhóm để gửi sếp.

Thị trường đã có các công cụ tự xếp lịch (ví dụ Motion, Reclaim.ai, Sunsama). Chủ dự án nên tự kiểm tra lại tính năng và giá hiện tại của họ. Lợi thế định hướng của Slotwise: tiếng Việt là ngôn ngữ chính, hiểu cách người Việt ghi chú công việc, giá nhẹ, trải nghiệm đơn giản.

**Prototype tham chiếu:** `docs/prototype/slotwise-prototype.html` (mở bằng trình duyệt). Mọi hành vi mô tả dưới đây đã được thể hiện và thử trong prototype. Khi có nghi ngờ về hành vi, prototype là nguồn sự thật. Bộ đọc ghi chú gốc nằm ở `docs/prototype/notes-parser.js`.

## 2. Quy ước làm việc

- **Ngôn ngữ:** trao đổi với chủ dự án bằng **tiếng Việt**. Mã nguồn, tên biến và tên nhánh bằng **tiếng Anh**. **Tài liệu** (README, ADR trong `docs/decisions/`, hướng dẫn trong `docs/`) viết bằng **tiếng Việt**. Commit message dùng Conventional Commits với phần mô tả **tiếng Việt** (xem ADR 0001). Chuỗi hiển thị cho người dùng nằm trong tệp i18n, không viết cứng trong component.
- **Lập kế hoạch trước:** với việc lớn hơn một sửa nhỏ, nêu kế hoạch ngắn và chờ chủ dự án đồng ý trước khi sửa nhiều tệp.
- **Thay đổi nhỏ, rõ ràng:** mỗi commit một ý, mỗi PR một chủ đề. Dùng Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- **Kiểm thử trước với lõi nghiệp vụ:** mọi thay đổi trong `packages/core` phải có kiểm thử đơn vị. Không merge khi test đỏ.
- **Hỏi trước khi:** thêm thư viện lớn, đổi schema cơ sở dữ liệu, đổi công nghệ đã chốt, thêm dịch vụ trả phí, thu thập thêm dữ liệu người dùng.
- **Không bao giờ:** commit khóa API, mật khẩu hay token; đặt khóa Claude API trong app; tắt kiểm tra kiểu hoặc lint để cho qua; xóa dữ liệu người dùng mà không có đường hoàn tác hoặc xác nhận.
- **Khi không chắc:** hỏi chủ dự án một câu cụ thể thay vì đoán rồi làm rộng.
- **Cập nhật tài liệu:** khi thay đổi lệnh chạy, cấu trúc thư mục hay quyết định kỹ thuật, cập nhật mục 4 và `docs/decisions/` trong cùng PR.

## 3. Công nghệ

Trạng thái: **đề xuất khởi đầu**. Xác nhận với chủ dự án ở Milestone 0 trước khi khởi tạo.

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| App | React Native + Expo (Expo Router), JavaScript (ESM) + JSDoc, typecheck bằng `tsc --checkJs` | Một codebase cho iOS, Android, web. |
| Lõi nghiệp vụ | `packages/core`, JavaScript thuần (JSDoc), không phụ thuộc React hay Expo | Dễ kiểm thử, dùng lại ở web và Edge Functions. |
| Kiểm thử | Vitest (core), Jest + jest-expo + React Native Testing Library (giao diện, dữ liệu cục bộ, thiết lập), Maestro hoặc Detox (E2E sau) | Test giao diện đặt trong `apps/mobile/src` (không đặt trong `app/` vì Expo Router coi tệp ở đó là màn hình). |
| Dữ liệu cục bộ | SQLite (`expo-sqlite`) | Offline-first. |
| Backend | Supabase: Postgres, Auth, RLS, Edge Functions | Nhanh dựng, có RLS cho bảo mật theo người dùng. |
| Đồng bộ | Đồng bộ tự viết dựa trên `updated_at` và xóa mềm (MVP). Đánh giá PowerSync hoặc tương đương nếu phức tạp. | Ghi vào `docs/decisions/`. |
| AI | Claude API qua Edge Function. Mô hình hiện hành, ví dụ `claude-sonnet-5-5`. Kiểm tra tên mô hình mới nhất tại https://docs.claude.com. | Không để lộ khóa trong app. |
| Biểu tượng | Lucide (`lucide-react-native`) | Prototype dùng bộ biểu tượng cùng phong cách nét 2px. |
| Phông chữ | Bricolage Grotesque (tiêu đề), Be Vietnam Pro (nội dung) qua `@expo-google-fonts/*` | Cả hai hỗ trợ tiếng Việt đầy đủ. |
| CI | GitHub Actions: lint, typecheck, test cho mỗi PR | |

## 4. Lệnh thường dùng

Giữ mục này luôn đúng. Cần Node >= 22 (xem `.nvmrc`) và pnpm.

```bash
pnpm install
pnpm lint                              # ESLint
pnpm typecheck                         # tsc --checkJs trên JSDoc
pnpm format:check                      # Prettier (tệp .md không bị format)
pnpm --filter @slotwise/core test      # Vitest + coverage, ngưỡng 100% cho schedule và parseNotes
pnpm test                              # toàn bộ test: lõi (Vitest) và giao diện (Jest + Testing Library)
pnpm --filter mobile test              # chỉ test giao diện (apps/mobile/src/**/*.test.js)
pnpm --filter mobile web                  # chạy app trên trình duyệt (cũng có start, android, ios)
cd apps/mobile && npx eas-cli login                         # một lần, cần tài khoản Expo
cd apps/mobile && npx eas-cli build -p android --profile development   # development build (APK) trên đám mây
pnpm --filter mobile start --dev-client                      # chạy Metro cho development build
```

## 5. Cấu trúc thư mục

```
apps/mobile/          Expo app
packages/core/        Thuật toán xếp lịch, bộ đọc ghi chú, kiểu dữ liệu (JS thuần + JSDoc)
supabase/migrations/  Schema SQL
supabase/functions/   Edge Functions (proxy AI, đồng bộ lịch)
docs/prototype/       Prototype HTML tham chiếu (không sửa, không import)
docs/decisions/       ADR: một tệp markdown cho mỗi quyết định kỹ thuật
docs/supabase-setup.md   Thiết lập Supabase (CLI, đăng nhập email)
docs/trien-khai-web.md    Triển khai bản web lên GitHub Pages, danh sách việc còn thiếu
```

## 6. Mô hình dữ liệu

Cây công việc lưu **phẳng**, mỗi nút trỏ tới nút cha. Thứ tự anh em là thứ tự trong cây và **cũng là thứ tự ưu tiên khi xếp lịch**.

Kiểu dưới đây viết bằng cú pháp TypeScript chỉ để mô tả. Mã thật dùng `@typedef` JSDoc trong `packages/core/src/types.js`.

```ts
type NodeKind = 'group' | 'task' | 'note';
type Energy = 'heavy' | 'light';       // UI: "Cần tập trung" | "Nhẹ nhàng"

interface TreeNode {
  id: string;                  // uuid
  userId: string;
  parentId: string | null;     // null: nút gốc
  kind: NodeKind;              // group: tiêu đề nhóm; task: việc; note: ghi chú không xếp lịch
  title: string;
  position: string;            // fractional index (ví dụ lexorank) để đổi thứ tự không phải ghi lại cả danh sách
  collapsed: boolean;

  // Chỉ dùng cho task
  status: 'todo' | 'done';
  durationMin: number;         // bội số của 15, từ 15 đến 180
  energy: Energy;
  doLast: boolean;             // "Làm cuối": xếp sau cùng, ưu tiên cuối ngày
  scheduledDate: string | null;// 'YYYY-MM-DD' theo múi giờ người dùng
  pinnedStartMin: number | null;// phút từ 00:00, bội của 15; null: để app tự chọn
  doneAt: string | null;       // ISO UTC
  doneDate: string | null;     // 'YYYY-MM-DD', ngày hoàn thành
  doneStartMin: number | null; // giờ bắt đầu lúc hoàn thành, để giữ chỗ trên lịch

  createdAt: string; updatedAt: string; deletedAt: string | null; // xóa mềm
}
```

Quy tắc nghiệp vụ trên cây:

- **Việc lá** là `task` không có con kiểu `task`. Chỉ việc lá được xếp lịch.
- **Việc cha** (task có con) không xếp lịch. Trạng thái xong của nó **suy ra**: xong khi mọi việc lá bên dưới đã xong. Bấm ô tích của việc cha sẽ đánh dấu cả nhánh.
- **Nhóm** (`group`) chỉ là tiêu đề, luôn ở gốc, hiển thị tiến độ `đã xong / tổng việc lá`.
- Khi cha đánh dấu xong tường minh (ví dụ `[DONE]` trong ghi chú), các con chưa đánh dấu **kế thừa** trạng thái xong.
- Khi con cuối cùng của một task cha bị xóa hoặc chuyển đi, cha trở thành việc lá và **giữ trạng thái xong đã suy ra**, không tự thành việc chưa xong.
- Thả một việc lên **tên nhóm**: đưa vào làm con đầu tiên của nhóm. Thả lên **nửa trên hoặc nửa dưới một dòng**: chèn trước hoặc sau dòng đó, cùng cha với dòng đó.

Các bảng Supabase (phác thảo, mọi bảng có RLS `user_id = auth.uid()`):

- `profiles(user_id, display_name, locale, timezone)`
- `user_settings(user_id, work_start_min, work_end_min, peak ('morning'|'afternoon'), buffer_min, grid_min, fixed_blocks jsonb, mode ('schedule'|'tasks'|null))`: `fixed_blocks` là danh sách khung giờ cố định mỗi ngày `{id, kind: 'lunch'|'meeting', label?, startMin, endMin, days?}` (`days`: thứ trong tuần 1 = Thứ Hai đến 7 = Chủ nhật, thiếu nghĩa là mọi ngày). Người dùng chỉnh trong màn Thiết lập (giờ làm việc, giờ tỉnh táo, khung giờ cố định), đồng bộ theo tài khoản. `mode` là cách dùng: `schedule` (xếp việc theo giờ, mặc định) hoặc `tasks` (chỉ quản lý việc: danh sách + màn Hôm nay/Ngày mai/Sau này, không giờ giấc), xem ADR 0004.
- `tree_nodes(...)` như kiểu `TreeNode` ở trên, thêm `field_times jsonb` (giờ sửa gần nhất của từng nhóm trường, xem ADR 0005).
- `node_history(user_id, node_id, group_name, old_values jsonb, changed_at)`: nhật ký giá trị cũ khi một nhóm trường bị ghi đè, giữ 30 ngày.
- `calendar_accounts(id, user_id, provider, encrypted_refresh_token, ...)`: token mã hóa, chỉ Edge Function đọc được.
- `calendar_events(id, user_id, account_id, external_id, start_utc, end_utc, title_hash_or_title, is_busy, updated_at)`: cache sự kiện.

## 7. Thuật toán xếp lịch

Viết thành **hàm thuần, xác định** trong `packages/core/src/schedule.js`. Cùng đầu vào luôn cho cùng kết quả. Không đọc giờ hệ thống bên trong hàm.

```ts
interface Block { startMin: number; endMin: number }         // họp, nghỉ trưa, việc đã xong có giữ chỗ
interface SchedulableTask {
  id: string; durationMin: number; energy: Energy; doLast: boolean;
  pinnedStartMin: number | null;
}
interface ScheduleInput {
  workStartMin: number;   // mặc định 480 (08:00)
  workEndMin: number;     // mặc định 1080 (18:00)
  gridMin: number;        // 15
  peak: Block;            // giờ tỉnh táo: sáng 08:00–12:00 hoặc chiều 13:00–17:00
  fixed: Block[];         // họp, nghỉ trưa, việc đã xong có giữ chỗ
  tasks: SchedulableTask[]; // đã sắp theo thứ tự cây (thứ tự ưu tiên)
}
interface ScheduleResult { slots: Record<string, number>; unplaced: string[] }
```

Các bước (khớp prototype):

1. `busy` = `fixed` + mọi việc **đã ghim** (đặt chỗ đúng `pinnedStartMin`, có trong `slots`).
2. Việc chưa ghim: giữ thứ tự cây, nhưng việc `doLast` được đưa xuống **cuối hàng đợi**.
3. Với mỗi việc, tìm mọi vị trí bắt đầu thuộc lưới `gridMin` mà `[start, start+duration)` nằm trong giờ làm việc và không chạm `busy`.
4. Chọn vị trí:
   - `heavy`: ưu tiên vị trí nằm **trọn trong** `peak`.
   - `light`: ưu tiên vị trí nằm **hoàn toàn ngoài** `peak`.
   - Nếu không có vị trí ưu tiên: dùng vị trí hợp lệ bất kỳ.
   - Việc thường: lấy vị trí **sớm nhất**. Việc `doLast`: lấy vị trí **muộn nhất**.
5. Không có vị trí hợp lệ: đưa vào `unplaced`. UI hiển thị cảnh báo và gợi ý rút ngắn, bỏ ghim hoặc dời sang ngày khác.
6. Đặt chỗ cho việc vừa xếp vào `busy`, tiếp tục việc kế tiếp.

Bộ kiểm thử tối thiểu cho `schedule`:

- Việc `heavy` vào giờ tỉnh táo, việc `light` tránh giờ tỉnh táo.
- Đổi `peak` từ sáng sang chiều làm việc dời chỗ tương ứng.
- Việc `doLast` nhận vị trí muộn nhất.
- Việc đã ghim giữ nguyên vị trí và các việc khác xếp quanh nó.
- Không việc nào chồng lên họp, nghỉ trưa hay nhau.
- Không đủ chỗ thì vào `unplaced`, không ném lỗi.
- Hai lần chạy cùng đầu vào cho kết quả giống hệt.
- Thứ tự cây quyết định ai được chọn chỗ trước khi cạnh tranh.
- Mọi vị trí đều là bội của `gridMin`.

**Việc chưa làm trong MVP (đừng tự thêm):** tách một việc ra nhiều khung giờ, đệm giữa các việc, ràng buộc deadline. Ghi vào `docs/decisions/` khi bắt đầu làm.

## 8. Bộ đọc ghi chú (Notes import)

`packages/core/src/parseNotes.js`. Chuyển văn bản Notepad hoặc Markdown thành danh sách `TreeNode` (chưa có `userId`, `position`). Tham chiếu: `docs/prototype/notes-parser.js`. Quy tắc:

| Cú pháp | Ý nghĩa |
|---|---|
| Dòng chỉ gồm `**Tiêu đề**` (không đánh số) | Nhóm mới. Bỏ dấu `:` cuối. |
| Dòng bắt đầu `1.`, `2)`, `-`, `+` | Việc. |
| Thụt lề sâu hơn dòng trước | Việc con của dòng trước đó. |
| `[DONE]` hoặc `[x]` | Đã xong. `[ ]` bị bỏ. |
| `LÀM CUỐI` (không phân biệt hoa thường) | `doLast = true`, bỏ cụm này khỏi tiêu đề. |
| Dòng không đánh số, không `[DONE]`, không thụt lề | Ghi chú (`note`), không xếp lịch. |
| Ký tự `*` | Bị loại khỏi tiêu đề. Ký tự escape kiểu `\[`, `\*`, `\_` được bỏ dấu `\`. |

Yêu cầu:

- Chuẩn hóa Unicode về NFC trước khi so khớp (tiếng Việt).
- Thụt lề bằng tab được tính là 4 khoảng trắng.
- Việc đã xong rồi thì các con **kế thừa** đã xong.
- Không bao giờ ném lỗi vì định dạng lạ: bỏ qua dòng không hiểu và báo số dòng bị bỏ.
- Thời lượng mặc định của việc nhập vào: 60 phút, `heavy`. Người dùng chỉnh sau.
- Kiểm thử bằng văn bản **tự dựng** (ghi chú giả), không dùng dữ liệu công việc thật của chủ dự án làm fixture.

## 9. Tương tác kéo thả (phải giống prototype)

- Dùng **pointer events**, không dùng HTML5 drag and drop (không chạy trên cảm ứng). Trên React Native dùng `react-native-gesture-handler` và `react-native-reanimated`.
- **Chạm: chỉ kéo được ở biểu tượng chấm (grip)** để không cản việc cuộn danh sách. Chuột: kéo được cả khối trên lịch.
- Ngưỡng bắt đầu kéo: khoảng 6px.
- Kéo việc **vào lịch**: hiện khung xem trước bám lưới 15 phút. Xanh nếu vị trí trống, đỏ kèm lý do nếu chạm họp hoặc việc khác đã ghim. Thả ở vị trí đỏ: không làm gì, hiện thông báo. Thả ở vị trí xanh: ghim (`pinnedStartMin`), các việc chưa ghim tự xếp lại.
- Kéo khối đã ghim **ra khỏi lịch về danh sách**: bỏ ghim.
- Kéo trong danh sách: chèn trước hoặc sau dòng, hoặc vào nhóm khi thả lên tên nhóm. Đây cũng là cách đổi ưu tiên.
- `Esc` hoặc hủy con trỏ: hủy kéo, dọn mọi dấu hiệu tạm.
- Kéo gần mép trên hoặc dưới màn hình thì tự cuộn.
- Mọi thao tác kéo phải có **cách làm khác bằng bàn phím hoặc nút** (ví dụ menu "Ghim vào giờ…") để đạt chuẩn khả năng tiếp cận.

## 10. Hệ thống thiết kế

Nguồn: prototype. Đưa thành token dùng chung, không viết cứng màu trong component.

| Token | Sáng | Tối |
|---|---|---|
| `bg` | `#EDF0F2` | `#12171D` |
| `surface` | `#FFFFFF` | `#1B222A` |
| `ink` | `#16202A` | `#E8EDF2` |
| `muted` | `#5B6874` | `#9AA7B4` |
| `line` | `#D3DAE1` | `#2C3640` |
| `accent` / `heavy` | `#2F3FA0` | `#8A97FF` |
| `accentInk` | `#FFFFFF` | `#0E1230` |
| `light` (việc nhẹ) | `#F3D27A` | `#E7B84A` |
| `danger` | `#B3261E` | `#FF8A80` |
| `ok` | `#1F7A4D` | `#6FD3A0` |
| `busy` (họp, nghỉ) | `#DDE2E8` | `#26303A` |

- **Hướng thị giác:** phẳng, đường viền mảnh thay cho đổ bóng, một màu nhấn chàm. Giữ bản sắc này, đừng thêm gradient hay đổ bóng đồng loạt.
- **Khối trên lịch:** việc tập trung màu `heavy`, việc nhẹ màu `light`, họp và nghỉ trưa gạch chéo màu `busy`. Vùng giờ tỉnh táo là dải nền nhạt có viền trái. **Luôn kèm biểu tượng** (tia chớp cho tập trung, gió cho nhẹ nhàng, nhóm người cho họp, tách cà phê cho nghỉ) để không chỉ dựa vào màu.
- **Chế độ tối** bắt buộc, theo hệ thống và có nút chuyển.
- **Chạm tối thiểu** 44×44 pt cho mọi điều khiển trên điện thoại. Nút chỉ có biểu tượng phải có nhãn truy cập.
- **Tương phản** đạt WCAG AA. Có thể chọn cỡ chữ lớn. Hỗ trợ trình đọc màn hình (VoiceOver, TalkBack) cho mọi thao tác, kể cả kéo thả (xem mục 9).
- **Chuyển động:** chỉ dùng để phản hồi thao tác. Tôn trọng "giảm chuyển động" của hệ thống.

**Giọng văn giao diện (tiếng Việt):** chữ thường theo câu, động từ chủ động, gọi đúng tên thứ người dùng hiểu. Nút nói rõ việc sẽ xảy ra ("Dời 3 việc sang ngày mai", không phải "OK"). Lỗi giải thích chuyện gì xảy ra và cách sửa, không xin lỗi chung chung. Trạng thái rỗng là lời mời hành động. Không dùng ngôn ngữ gây tội lỗi cho việc chưa xong.

## 11. Yêu cầu chất lượng để thương mại hóa

- **Hiệu năng:** khởi động nguội dưới 2 giây trên máy tầm trung. Lịch ngày hiển thị mượt khi có hàng trăm việc.
- **Offline-first:** mọi thao tác chạy không cần mạng, tự đồng bộ khi có mạng lại. Không mất dữ liệu khi đồng bộ xung đột (MVP: ghi sau cùng thắng theo từng trường, giữ nhật ký để khôi phục).
- **Hoàn tác:** xóa luôn có hoàn tác. Dời việc và nhập ghi chú nên có hoàn tác.
- **Ổn định:** tỷ lệ crash dưới 1%. Tích hợp báo lỗi (ví dụ Sentry) và phân tích sử dụng có chọn lọc, tôn trọng quyền riêng tư.
- **Bảo mật:** mã hóa khi truyền và lưu trữ. RLS cho mọi bảng. Token lịch ngoài được mã hóa, chỉ phía máy chủ đọc. Không ghi nội dung việc của người dùng vào log.
- **Quyền riêng tư và pháp lý:** chính sách bảo mật, điều khoản dịch vụ, chức năng **xuất dữ liệu** và **xóa tài khoản** ngay trong app, đồng ý rõ ràng trước khi gửi nội dung cho AI.
- **Trải nghiệm:** onboarding dưới 1 phút, thêm một việc trong tối đa 2 chạm, hỗ trợ khuyết tật.
- **Đa ngôn ngữ:** tiếng Việt mặc định, khung i18n sẵn cho tiếng Anh. Định dạng ngày giờ theo locale. Múi giờ lưu rõ, không ngầm định.
- **Chỉ số theo dõi:** giữ chân ngày 7 và ngày 30, tỷ lệ chuyển sang trả phí, đánh giá trên cửa hàng.

## 12. Tích hợp AI (từ Milestone 4)

- Mọi lệnh gọi Claude đi qua **Edge Function** của Supabase. App không bao giờ giữ khóa API.
- Hai tính năng đầu: (1) **tách việc**: nhập "Tổ chức sinh nhật", nhận danh sách việc con có thể sửa; (2) **trích việc từ ghi chú họp**: ra danh sách việc, người phụ trách, hạn chót.
- Yêu cầu mô hình trả **JSON theo schema cố định**, kiểm tra schema trước khi dùng. Mọi kết quả AI chỉ là **gợi ý**: người dùng xem và xác nhận trước khi thêm vào danh sách.
- Giới hạn tần suất theo người dùng và theo gói. Có chế độ dự phòng khi AI lỗi (app vẫn dùng bình thường).
- Báo rõ cho người dùng khi nội dung được gửi đi xử lý.

## 13. Lộ trình và định nghĩa hoàn thành

### Milestone 0: Nền móng
- [x] Xác nhận công nghệ với chủ dự án, ghi ADR đầu tiên.
- [x] Khởi tạo monorepo (pnpm workspaces), JavaScript (ESM) + JSDoc, typecheck bằng `tsc --checkJs`, ESLint, Prettier.
- [x] CI GitHub Actions: lint, typecheck, test.
- [x] `packages/core`: kiểu dữ liệu, `schedule`, `parseNotes`, kiểm thử theo mục 7 và 8. Độ phủ của hai hàm này gần 100%.
- [x] Điền mục 4 (lệnh thường dùng) trong tệp này.

**Hoàn thành khi:** CI xanh, `pnpm --filter @slotwise/core test` chạy qua mọi trường hợp ở mục 7 và 8.

### Milestone 1: Lõi cục bộ
- [x] Khung app Expo, điều hướng, token thiết kế, chế độ sáng tối, i18n.
- [x] SQLite và lớp truy cập dữ liệu, lưu cây việc.
- [x] Màn hình danh sách (cây nhóm, việc, việc con, tiến độ, thu gọn, sửa tên, xóa có hoàn tác).
- [x] Màn hình lịch ngày. Họp mẫu đã bỏ: giờ làm việc, giờ tỉnh táo và khung giờ cố định do người dùng cấu hình trong Thiết lập (lịch ngoài thật ở Milestone 3).
- [x] Kéo thả theo mục 9: kéo khối trong lịch để ghim, kéo ra khỏi lịch để bỏ ghim, kéo trong danh sách (trước/sau dòng, vào nhóm), kéo việc từ danh sách vào lịch (màn hình rộng từ 900dp, danh sách và lịch cạnh nhau). Điện thoại hẹp dùng menu "Ghim vào giờ…" và "Đưa lên/xuống". Chưa thử trên thiết bị thật.
- [x] Nhập ghi chú, chế độ tập trung, tổng kết ngày và sao chép báo cáo.

**Hoàn thành khi:** dùng trọn một ngày làm việc được hoàn toàn offline, không mất dữ liệu khi tắt mở app.

### Milestone 2: Tài khoản và đồng bộ
- [x] Migration `supabase/migrations/` (profiles, user_settings, tree_nodes, RLS, `push_tree_nodes`). Đã link và `db push` lên dự án Slotwise (migration `20261022010000_sync.sql`).
- [x] Đăng nhập bằng email trong app, bắt buộc xác nhận email (mã đã viết, **chưa thử với Supabase thật**). Đã gỡ Google; Apple để sau.
- [x] Đồng bộ đa thiết bị: kéo/đẩy theo `updated_at`, xóa mềm, gộp dữ liệu cục bộ lần đầu (logic gộp có test trong core). Ghi sau cùng thắng **theo từng trường** (nhóm trường, `field_times`), kèm nhật ký `node_history` giữ 30 ngày (xem ADR 0005).
- [x] Xuất dữ liệu JSON, xóa tài khoản (Edge Function `delete-account`, đã deploy).
- [ ] Bật Confirm email trong Supabase (`docs/supabase-setup.md` mục 3), thử đồng bộ thật trên hai thiết bị.

### Milestone 3: Lịch ngoài
- [ ] Google Calendar, Microsoft Outlook: lấy sự kiện làm khối bận, làm mới định kỳ.
- [ ] Màn hình thiết lập giờ làm việc, giờ tỉnh táo, lịch nào được đọc.

### Milestone 4: AI, hoàn thiện, ra mắt
- [ ] Tách việc và trích việc từ ghi chú họp (mục 12).
- [ ] Báo cáo tuần, thanh toán (gói Pro), onboarding, beta kín 50 đến 200 người.
- [ ] Hồ sơ cửa hàng ứng dụng, trang landing, chính sách pháp lý.

## 14. Ngoài phạm vi MVP

Giao việc và làm việc nhóm, nhập bằng giọng nói, theo dõi giờ làm cho freelancer, nhắc nợ thanh toán, widget, ứng dụng đồng hành trên đồng hồ. Đừng làm trước khi chủ dự án yêu cầu.

## 15. Câu hỏi còn mở (hỏi chủ dự án khi tới lúc)

- Tên miền và tài khoản cửa hàng ứng dụng đã đăng ký chưa? Có trùng tên "Slotwise" không?
- Giờ làm việc mặc định 08:00–18:00 có phù hợp, hay cho cấu hình ngay từ đầu?
- Ưu tiên iOS hay Android trước ở beta?
- Giấy phép của repo: để riêng tư (proprietary) hay mở mã nguồn một phần?
