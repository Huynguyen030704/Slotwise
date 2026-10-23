// Builds the web app into dist/ for a static host (GitHub Pages) served under EXPO_BASE_URL:
//  - adds the cross-origin isolation service worker (public/coi-sw.js) to index.html, because
//    SQLite on the web needs headers a static host cannot send;
//  - copies index.html to 404.html so a reload on a deep link still opens the app.
import { spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const base = process.env.EXPO_BASE_URL ?? '';
const build = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'], {
  stdio: 'inherit',
  shell: true,
});
if (build.status !== 0) process.exit(build.status ?? 1);

const file = 'dist/index.html';
const html = readFileSync(file, 'utf8');
if (!html.includes('<head>')) throw new Error('index.html has no <head> to add the script to');
writeFileSync(file, html.replace('<head>', `<head><script src="${base}/coi-sw.js"></script>`));
copyFileSync(file, 'dist/404.html');
console.log(`Added ${base}/coi-sw.js and 404.html`);
