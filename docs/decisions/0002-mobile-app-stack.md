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
