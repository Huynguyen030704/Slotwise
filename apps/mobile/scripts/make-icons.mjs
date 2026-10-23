// Draws the app icon (a calendar with a check, white on the accent colour) into public/icons/.
// The glyph stays inside the central 60% so the same files work as "maskable" icons, which
// Android crops to a circle or squircle. No dependencies: the PNG is encoded by hand.
// Run once after changing the design: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const ACCENT = [0x2f, 0x3f, 0xa0];
const SS = 3; // samples per pixel side, for smooth edges

/** Distance from point (px, py) to the segment a-b. */
function segment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Signed distance to a rounded rectangle (negative inside). */
function roundRect(px, py, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const qx = Math.abs(px - cx) - ((x1 - x0) / 2 - r);
  const qy = Math.abs(py - cy) - ((y1 - y0) / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Is the point on the white glyph? Coordinates are on a 512 x 512 canvas. */
function glyph(x, y) {
  const outline = Math.abs(roundRect(x, y, 136, 150, 376, 386, 30)) <= 10;
  const header = segment(x, y, 136, 214, 376, 214) <= 10;
  const pegs = segment(x, y, 200, 120, 200, 172) <= 11 || segment(x, y, 312, 120, 312, 172) <= 11;
  const check = segment(x, y, 196, 300, 238, 342) <= 12 || segment(x, y, 238, 342, 318, 262) <= 12;
  return outline || header || pegs || check;
}

/** @param {number} size */
function render(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const scale = 512 / size;
  for (let py = 0; py < size; py++) {
    const row = py * (size * 3 + 1);
    raw[row] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          if (glyph((px + (sx + 0.5) / SS) * scale, (py + (sy + 0.5) / SS) * scale)) hit++;
        }
      }
      const a = hit / (SS * SS);
      for (let c = 0; c < 3; c++) {
        raw[row + 1 + px * 3 + c] = Math.round(ACCENT[c] + (255 - ACCENT[c]) * a);
      }
    }
  }
  return raw;
}

/** @param {string} type @param {Buffer} data */
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), out.length - 4);
  return out;
}

/** @param {number} size */
function png(size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(render(size), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(`public/icons/${name}`, png(size));
  console.log(`public/icons/${name}`);
}
