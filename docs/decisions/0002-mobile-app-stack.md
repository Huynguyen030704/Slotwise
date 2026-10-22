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

- Drag and drop: blocks on the day timeline drag to pin a time (green/red preview with reason, 15-minute snap, auto-scroll near edges, Escape cancels on web) and drag above or left of the timeline to unpin. Task rows drag by their grip to reorder (insertion line before/after a row, outline when dropping into a group; rules in `dropTargetAt` in core) and, when the list and the day share one screen, drag onto the timeline to pin. The two panes talk through `src/lib/dragBus.js`.
- Layout: from 900dp wide the list and the day sit side by side on the first tab and the Day tab is hidden (`src/lib/layout.js`). On narrow phones the day is a separate tab, so list-to-calendar drag is not possible there; the list menu offers "Pin to a time…", "Move up/down" and "Move into group" instead. The calendar does not auto-scroll while a list row is dragged over it.
- Touch drags start from the grip only; the mouse drags the whole block. The drag uses `react-native-gesture-handler` with JS callbacks (no Reanimated worklets yet). It was exercised on the web target only, not on a physical device.
- Meetings and lunch on the calendar are sample data (`features/calendar/sampleDay.js`) until the Milestone 3 calendar integration.
- Working hours are fixed at 08:00-18:00; only the peak window (morning/afternoon) is configurable, stored in the `user_settings` table.
