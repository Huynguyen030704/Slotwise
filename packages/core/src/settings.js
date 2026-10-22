/**
 * Per-user defaults for the day: working hours, which half of the day is the sharp one, and
 * recurring blocks (lunch, daily stand-up...) that are busy every day.
 */

/** @typedef {import('./types.js').Block} Block */

/**
 * @typedef {object} FixedBlockDef
 * @property {string} id
 * @property {'meeting' | 'lunch'} kind
 * @property {string} [label] custom name; when empty the UI shows the default for `kind`
 * @property {number} startMin minutes from 00:00
 * @property {number} endMin
 */

/**
 * @typedef {object} DaySettings
 * @property {number} workStartMin
 * @property {number} workEndMin
 * @property {'morning' | 'afternoon'} peak
 * @property {FixedBlockDef[]} fixedBlocks
 * @property {string | null} updatedAt ISO UTC of the last edit, null while untouched
 */

export const GRID = 15;
export const MIN_WORK_SPAN = 120;
export const MAX_FIXED_BLOCKS = 20;
const DAY = 1440;

/** @type {FixedBlockDef[]} */
export const DEFAULT_FIXED_BLOCKS = [{ id: 'lunch', kind: 'lunch', startMin: 720, endMin: 780 }];

/** @type {DaySettings} */
export const DEFAULT_SETTINGS = {
  workStartMin: 480,
  workEndMin: 1080,
  peak: 'morning',
  fixedBlocks: DEFAULT_FIXED_BLOCKS,
  updatedAt: null,
};

const PEAK_WINDOWS = {
  morning: { startMin: 480, endMin: 720 },
  afternoon: { startMin: 780, endMin: 1020 },
};

/**
 * @param {unknown} v
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
function gridInt(v, fallback, min, max) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v / GRID) * GRID));
}

/**
 * @param {unknown} raw
 * @returns {FixedBlockDef[]}
 */
function cleanBlocks(raw) {
  if (!Array.isArray(raw)) return DEFAULT_FIXED_BLOCKS;
  /** @type {FixedBlockDef[]} */
  const out = [];
  for (const b of raw) {
    if (out.length >= MAX_FIXED_BLOCKS) break;
    if (!b || typeof b !== 'object' || typeof b.id !== 'string' || !b.id) continue;
    const startMin = gridInt(b.startMin, -1, 0, DAY);
    const endMin = gridInt(b.endMin, -1, 0, DAY);
    if (startMin < 0 || endMin <= startMin) continue;
    const label = typeof b.label === 'string' ? b.label.trim().slice(0, 40) : '';
    out.push({
      id: b.id,
      kind: b.kind === 'lunch' ? 'lunch' : 'meeting',
      ...(label ? { label } : {}),
      startMin,
      endMin,
    });
  }
  return out;
}

/**
 * Repair any input into valid settings: times on the 15-minute grid, a working day of at least two
 * hours, a known peak, and only well-formed blocks. Never throws.
 * @param {unknown} raw
 * @returns {DaySettings}
 */
export function normalizeSettings(raw) {
  const r = /** @type {Record<string, any>} */ (raw && typeof raw === 'object' ? raw : {});
  let workStartMin = gridInt(r.workStartMin, DEFAULT_SETTINGS.workStartMin, 0, DAY - MIN_WORK_SPAN);
  let workEndMin = gridInt(r.workEndMin, DEFAULT_SETTINGS.workEndMin, MIN_WORK_SPAN, DAY);
  if (workEndMin - workStartMin < MIN_WORK_SPAN) {
    workEndMin = Math.min(DAY, workStartMin + MIN_WORK_SPAN);
    workStartMin = workEndMin - MIN_WORK_SPAN;
  }
  return {
    workStartMin,
    workEndMin,
    peak: r.peak === 'afternoon' ? 'afternoon' : 'morning',
    fixedBlocks: cleanBlocks(r.fixedBlocks),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : null,
  };
}

/**
 * The sharp window, trimmed to the working day. Falls back to the whole working day when the
 * chosen half lies outside it.
 * @param {DaySettings} s
 * @returns {Block}
 */
export function peakWindow(s) {
  const w = PEAK_WINDOWS[s.peak];
  const startMin = Math.max(w.startMin, s.workStartMin);
  const endMin = Math.min(w.endMin, s.workEndMin);
  return endMin > startMin
    ? { startMin, endMin }
    : { startMin: s.workStartMin, endMin: s.workEndMin };
}

/**
 * Settings as the server stores them (`user_settings`).
 * @param {DaySettings} s
 */
export function settingsToRemote(s) {
  return {
    work_start_min: s.workStartMin,
    work_end_min: s.workEndMin,
    peak: s.peak,
    fixed_blocks: s.fixedBlocks,
    updated_at: s.updatedAt ?? new Date(0).toISOString(),
  };
}

/**
 * @param {Record<string, any>} row
 * @returns {DaySettings}
 */
export function settingsFromRemote(row) {
  return normalizeSettings({
    workStartMin: row.work_start_min,
    workEndMin: row.work_end_min,
    peak: row.peak,
    fixedBlocks: row.fixed_blocks,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  });
}

/**
 * Which copy wins when this device and the server disagree. Edits made here and not yet pushed
 * always win (settings rarely conflict and the server row is created with defaults at sign-up, so
 * its timestamp says nothing about intent). Otherwise the newer copy wins.
 * @param {DaySettings} local
 * @param {boolean} localDirty
 * @param {DaySettings} remote
 * @returns {{ settings: DaySettings, source: 'local' | 'remote' }}
 */
export function mergeSettings(local, localDirty, remote) {
  if (localDirty) return { settings: local, source: 'local' };
  const l = local.updatedAt ? Date.parse(local.updatedAt) : 0;
  const r = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
  return r > l ? { settings: remote, source: 'remote' } : { settings: local, source: 'local' };
}
