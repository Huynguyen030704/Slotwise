// Builds the web app into dist/ for a static host (GitHub Pages) served under EXPO_BASE_URL:
//  - adds the cross-origin isolation service worker (public/coi-sw.js) to index.html, because
//    SQLite on the web needs headers a static host cannot send;
//  - writes the web app manifest and links it, so the site can be installed to the home screen
//    or desktop (PWA) without building a store app;
//  - copies index.html to 404.html so a reload on a deep link still opens the app.
import { spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const base = process.env.EXPO_BASE_URL ?? '';
const THEME = '#2F3FA0'; // accent
const BACKGROUND = '#12171D'; // dark bg, shown while the installed app starts

const build = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'], {
  stdio: 'inherit',
  shell: true,
});
if (build.status !== 0) process.exit(build.status ?? 1);

const manifest = {
  id: `${base}/`,
  name: 'Slotwise',
  short_name: 'Slotwise',
  description:
    'Tự xếp việc vào khung giờ trống trong ngày, ưu tiên việc cần tập trung vào giờ tỉnh táo.',
  lang: 'vi',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'any',
  theme_color: THEME,
  background_color: BACKGROUND,
  icons: [
    { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync('dist/manifest.webmanifest', `${JSON.stringify(manifest, null, 2)}\n`);

const head = [
  `<script src="${base}/coi-sw.js"></script>`,
  `<link rel="manifest" href="${base}/manifest.webmanifest">`,
  `<meta name="theme-color" content="${THEME}">`,
  `<link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Slotwise">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
].join('');

const file = 'dist/index.html';
const html = readFileSync(file, 'utf8');
if (!html.includes('<head>')) throw new Error('index.html has no <head> to add the tags to');
writeFileSync(file, html.replace('<head>', `<head>${head}`));
copyFileSync(file, 'dist/404.html');
console.log(`Added service worker, manifest and icons under ${base || '/'}, and 404.html`);
