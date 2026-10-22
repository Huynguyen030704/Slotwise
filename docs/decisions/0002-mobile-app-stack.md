# 0002. Mobile app stack (Milestone 1)

Status: accepted (2026-10-22)

## Decision

- Expo SDK 58, Expo Router (file-based routing in `apps/mobile/app`), React Native 0.88, JavaScript + JSDoc.
- Styling: React Native `StyleSheet` driven by design tokens in `src/theme/tokens.js` (CLAUDE.md section 10). No Ant Design or Tailwind: they target the web DOM, and this app is React Native first.
- Theme: `ThemeProvider` with `system | light | dark`, follows the OS and has a manual toggle.
- i18n: `i18next` + `react-i18next`, Vietnamese default, English ready. Strings live in `src/i18n/*.js`.
- Icons: `lucide-react-native`. Fonts: Bricolage Grotesque (headings), Be Vietnam Pro (body).
- Local data: `expo-sqlite`. Gestures: `react-native-gesture-handler` + `react-native-reanimated`.
- pnpm uses `node-linker=hoisted` (`.npmrc`) because Metro does not resolve pnpm's symlinked layout reliably.
- Development check runs on the web target first (`pnpm --filter mobile web`).

## Known limits at the end of Milestone 1

- Drag and drop: blocks on the day timeline can be dragged to pin a time (green/red preview with reason, snap to 15 minutes, auto-scroll near edges, Escape cancels on web) and dragged above the timeline to unpin. Dragging a task from the list into the calendar and reordering inside the list by drag are not built; the list menu offers "Move up/down", "Move into group" and "Pin to a time…" instead.
- Touch drags start from the grip only; the mouse drags the whole block. The drag uses `react-native-gesture-handler` with JS callbacks (no Reanimated worklets yet). It was exercised on the web target only, not on a physical device.
- Meetings and lunch on the calendar are sample data (`features/calendar/sampleDay.js`) until the Milestone 3 calendar integration.
- Working hours are fixed at 08:00-18:00; only the peak window (morning/afternoon) is configurable, stored in the `user_settings` table.
