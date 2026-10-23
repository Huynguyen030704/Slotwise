# 0002. Công nghệ cho app (Milestone 1)

Trạng thái: đã chấp nhận (2026-10-22)

## Quyết định

- Expo SDK 58, Expo Router (định tuyến theo tệp trong `apps/mobile/app`), React Native 0.88, JavaScript + JSDoc.
- Kiểu dáng: `StyleSheet` của React Native, dùng token thiết kế trong `src/theme/tokens.js` (mục 10 của CLAUDE.md). Không dùng Ant Design hay Tailwind vì chúng nhắm tới DOM của web, còn app này ưu tiên React Native.
- Giao diện sáng/tối: `ThemeProvider` với `system | light | dark`, theo hệ điều hành và có nút chuyển.
- Đa ngôn ngữ: `i18next` + `react-i18next`, mặc định tiếng Việt, sẵn tiếng Anh. Chuỗi hiển thị nằm trong `src/i18n/*.js`.
- Biểu tượng: `lucide-react-native`, nhập từng biểu tượng qua `src/ui/icons.js` (nhập từ gói gốc sẽ kéo cả ~1900 biểu tượng vào bản dev). Phông chữ: Bricolage Grotesque (tiêu đề), Be Vietnam Pro (nội dung).
- Dữ liệu cục bộ: `expo-sqlite`. Cử chỉ: `react-native-gesture-handler`.
- pnpm dùng `node-linker=hoisted` (`.npmrc`) vì Metro không xử lý ổn định cấu trúc liên kết tượng trưng của pnpm.
- Kiểm thử giao diện: Jest + `jest-expo` + React Native Testing Library 14 (hàm `render` và `fireEvent` bất đồng bộ). Lớp SQLite được thay bằng bộ nhớ trong ở từng test; biểu tượng Lucide được thay bằng một thành phần giả (`src/test/iconStub.js`) vì chúng là mô-đun ES. Giao diện trong test là tiếng Việt. Các test nằm cạnh mã (`*.test.js` trong `apps/mobile/src`).
- Kiểm tra giai đoạn đầu chạy trên web (`pnpm --filter mobile web`).

## Giới hạn hiện tại

- **Kéo thả:** khối trên lịch kéo để ghim giờ (xem trước xanh/đỏ kèm lý do, bám lưới 15 phút, tự cuộn gần mép, Esc để hủy trên web) và kéo lên trên hoặc sang trái lịch để bỏ ghim. Dòng việc kéo bằng biểu tượng chấm để đổi thứ tự (vạch chèn trước/sau dòng, khung viền khi thả vào nhóm; luật nằm trong `dropTargetAt` ở core), và khi danh sách và lịch cùng một màn hình thì kéo được việc sang lịch để ghim. Hai khung giao tiếp qua `src/lib/dragBus.js`.
- **Bố cục:** từ độ rộng 900dp danh sách và lịch nằm cạnh nhau ở tab đầu, tab Lịch bị ẩn (`src/lib/layout.js`). Trên điện thoại hẹp, lịch là tab riêng nên không kéo từ danh sách sang lịch được; thay vào đó dùng menu "Ghim vào giờ…", "Đưa lên/xuống" và "Chuyển vào nhóm". Lịch chưa tự cuộn khi kéo dòng việc qua.
- Cảm ứng kéo từ biểu tượng chấm; chuột kéo được cả khối. Việc kéo dùng `react-native-gesture-handler` với hàm gọi lại chạy ở luồng JS. Mới thử trên web, chưa thử trên thiết bị thật.
- Họp trên lịch chưa lấy từ lịch ngoài (Milestone 3). Giờ làm việc, giờ tỉnh táo và khung giờ cố định do người dùng tự cấu hình trong Thiết lập (lưu ở bảng `user_settings`, đồng bộ theo tài khoản).
- **Web:** SQLite trên web dùng `SharedArrayBuffer`, nên nơi lưu trữ phải gửi hai tiêu đề `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: credentialless`. Server phát triển đã bật sẵn trong `metro.config.js`; khi triển khai thật phải cấu hình tương đương (xem `docs/trien-khai-web.md`).
