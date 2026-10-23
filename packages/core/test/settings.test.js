import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  MAX_FIXED_BLOCKS,
  adoptLocalMode,
  blocksForDate,
  describeDays,
  effectiveMode,
  isoWeekday,
  mergeSettings,
  normalizeSettings,
  peakWindow,
  settingsFromRemote,
  settingsToRemote,
} from '../src/settings.js';

describe('normalizeSettings', () => {
  it('returns the defaults for anything that is not an object', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and snaps times to the 15-minute grid', () => {
    const s = normalizeSettings({
      workStartMin: 543,
      workEndMin: 1031,
      peak: 'afternoon',
      updatedAt: '2026-10-22T01:00:00.000Z',
    });
    expect(s).toMatchObject({
      workStartMin: 540,
      workEndMin: 1035,
      peak: 'afternoon',
      updatedAt: '2026-10-22T01:00:00.000Z',
    });
  });

  it('clamps to the day and keeps a working day of at least two hours', () => {
    expect(normalizeSettings({ workStartMin: -50, workEndMin: 5000 })).toMatchObject({
      workStartMin: 0,
      workEndMin: 1440,
    });
    const tight = normalizeSettings({ workStartMin: 600, workEndMin: 630 });
    expect(tight.workEndMin - tight.workStartMin).toBe(120);
    const late = normalizeSettings({ workStartMin: 1430, workEndMin: 1440 });
    expect(late.workEndMin).toBe(1440);
    expect(late.workEndMin - late.workStartMin).toBe(120);
  });

  it('falls back on non-numeric times and unknown peak', () => {
    expect(normalizeSettings({ workStartMin: 'a', workEndMin: NaN, peak: 'night' })).toMatchObject({
      workStartMin: 480,
      workEndMin: 1080,
      peak: 'morning',
    });
  });

  it('keeps well-formed blocks and drops broken ones', () => {
    const s = normalizeSettings({
      fixedBlocks: [
        { id: 'a', kind: 'lunch', startMin: 720, endMin: 780 },
        { id: 'b', kind: 'weird', label: '  Họp giao ban  ', startMin: 541, endMin: 570 },
        { id: 'c', kind: 'meeting', startMin: 900, endMin: 900 },
        { id: '', kind: 'meeting', startMin: 100, endMin: 200 },
        { id: 'd', kind: 'meeting', startMin: 'x', endMin: 200 },
        { id: 'e', kind: 'meeting', startMin: 600, endMin: 660, label: 5 },
        null,
        'x',
      ],
    });
    expect(s.fixedBlocks).toEqual([
      { id: 'a', kind: 'lunch', startMin: 720, endMin: 780 },
      { id: 'b', kind: 'meeting', label: 'Họp giao ban', startMin: 540, endMin: 570 },
      { id: 'e', kind: 'meeting', startMin: 600, endMin: 660 },
    ]);
  });

  it('truncates long labels and caps the number of blocks', () => {
    const many = Array.from({ length: MAX_FIXED_BLOCKS + 5 }, (_, i) => ({
      id: `b${i}`,
      kind: 'meeting',
      label: 'x'.repeat(100),
      startMin: 480,
      endMin: 495,
    }));
    const s = normalizeSettings({ fixedBlocks: many });
    expect(s.fixedBlocks).toHaveLength(MAX_FIXED_BLOCKS);
    expect(s.fixedBlocks[0].label).toHaveLength(40);
  });

  it('uses the default blocks when blocks are not an array', () => {
    expect(normalizeSettings({ fixedBlocks: 'nope' }).fixedBlocks).toEqual(
      DEFAULT_SETTINGS.fixedBlocks,
    );
    expect(normalizeSettings({ fixedBlocks: [] }).fixedBlocks).toEqual([]);
  });
});

describe('peakWindow', () => {
  it('returns the morning and afternoon windows inside normal hours', () => {
    expect(peakWindow(DEFAULT_SETTINGS)).toEqual({ startMin: 480, endMin: 720 });
    expect(peakWindow({ ...DEFAULT_SETTINGS, peak: 'afternoon' })).toEqual({
      startMin: 780,
      endMin: 1020,
    });
  });

  it('trims the window to the working day', () => {
    expect(peakWindow({ ...DEFAULT_SETTINGS, workStartMin: 600 })).toEqual({
      startMin: 600,
      endMin: 720,
    });
  });

  it('uses the whole working day when the chosen half lies outside it', () => {
    expect(
      peakWindow({ ...DEFAULT_SETTINGS, peak: 'morning', workStartMin: 780, workEndMin: 1080 }),
    ).toEqual({ startMin: 780, endMin: 1080 });
  });
});

describe('remote shape', () => {
  it('round-trips', () => {
    const s = normalizeSettings({
      workStartMin: 540,
      workEndMin: 1050,
      peak: 'afternoon',
      fixedBlocks: [{ id: 'a', kind: 'meeting', label: 'Họp', startMin: 600, endMin: 630 }],
      updatedAt: '2026-10-22T01:00:00.000Z',
    });
    expect(settingsFromRemote(settingsToRemote(s))).toEqual(s);
  });

  it('sends the epoch when untouched and reads Postgres timestamps', () => {
    expect(settingsToRemote(DEFAULT_SETTINGS).updated_at).toBe('1970-01-01T00:00:00.000Z');
    expect(
      settingsFromRemote({
        work_start_min: 480,
        work_end_min: 1080,
        peak: 'morning',
        fixed_blocks: [],
        updated_at: '2026-10-22T03:00:00+00:00',
      }).updatedAt,
    ).toBe('2026-10-22T03:00:00.000Z');
    expect(settingsFromRemote({}).updatedAt).toBeNull();
  });
});

describe('mergeSettings', () => {
  const older = { ...DEFAULT_SETTINGS, updatedAt: '2026-10-22T01:00:00.000Z' };
  const newer = {
    ...DEFAULT_SETTINGS,
    peak: /** @type {const} */ ('afternoon'),
    updatedAt: '2026-10-22T02:00:00.000Z',
  };

  it('local edits not yet pushed always win', () => {
    expect(mergeSettings(older, true, newer).source).toBe('local');
  });

  it('otherwise the newer copy wins', () => {
    expect(mergeSettings(older, false, newer)).toEqual({ settings: newer, source: 'remote' });
    expect(mergeSettings(newer, false, older)).toEqual({ settings: newer, source: 'local' });
  });

  it('treats a missing timestamp as the oldest', () => {
    expect(mergeSettings(DEFAULT_SETTINGS, false, older).source).toBe('remote');
    expect(mergeSettings(older, false, DEFAULT_SETTINGS).source).toBe('local');
  });
});

describe('usage mode', () => {
  it('is empty until chosen and acts as the timeline', () => {
    expect(DEFAULT_SETTINGS.mode).toBeNull();
    expect(effectiveMode(DEFAULT_SETTINGS)).toBe('schedule');
    expect(effectiveMode({ ...DEFAULT_SETTINGS, mode: 'tasks' })).toBe('tasks');
  });

  it('accepts the two known modes and drops anything else', () => {
    expect(normalizeSettings({ mode: 'tasks' }).mode).toBe('tasks');
    expect(normalizeSettings({ mode: 'schedule' }).mode).toBe('schedule');
    expect(normalizeSettings({ mode: 'weird' }).mode).toBeNull();
    expect(normalizeSettings({}).mode).toBeNull();
  });

  it('round-trips through the remote shape, including null', () => {
    const s = normalizeSettings({ mode: 'tasks', updatedAt: '2026-10-22T01:00:00.000Z' });
    expect(settingsToRemote(s).mode).toBe('tasks');
    expect(settingsFromRemote(settingsToRemote(s)).mode).toBe('tasks');
    expect(settingsFromRemote({ mode: null }).mode).toBeNull();
  });

  it('keeps a local choice when the account has none, and never overrides the account', () => {
    const local = { ...DEFAULT_SETTINGS, mode: /** @type {const} */ ('tasks') };
    const empty = { ...DEFAULT_SETTINGS, mode: null };
    const chosen = { ...DEFAULT_SETTINGS, mode: /** @type {const} */ ('schedule') };
    expect(adoptLocalMode(empty, local).mode).toBe('tasks');
    expect(adoptLocalMode(chosen, local).mode).toBe('schedule');
    expect(adoptLocalMode(empty, DEFAULT_SETTINGS).mode).toBeNull();
  });
});

describe('weekdays for recurring blocks', () => {
  it('knows the ISO weekday of a date', () => {
    expect(isoWeekday('2026-10-19')).toBe(1); // Monday
    expect(isoWeekday('2026-10-23')).toBe(5); // Friday
    expect(isoWeekday('2026-10-25')).toBe(7); // Sunday
  });

  it('keeps a clean sorted list of days and treats none or all as every day', () => {
    const block = (/** @type {unknown} */ days) => ({
      id: 'a',
      kind: 'meeting',
      startMin: 600,
      endMin: 660,
      days,
    });
    const get = (/** @type {unknown} */ days) =>
      normalizeSettings({ fixedBlocks: [block(days)] }).fixedBlocks[0];
    expect(get([5, 1, 1, 3]).days).toEqual([1, 3, 5]);
    expect(get([0, 8, 2.5, 'x', 2]).days).toEqual([2]);
    expect(get([]).days).toBeUndefined();
    expect(get([1, 2, 3, 4, 5, 6, 7]).days).toBeUndefined();
    expect(get('mon').days).toBeUndefined();
    expect(get(undefined).days).toBeUndefined();
  });

  it('applies a block only on its days', () => {
    const blocks = normalizeSettings({
      fixedBlocks: [
        { id: 'every', kind: 'lunch', startMin: 720, endMin: 780 },
        { id: 'mon', kind: 'meeting', startMin: 540, endMin: 570, days: [1] },
      ],
    }).fixedBlocks;
    expect(blocksForDate(blocks, '2026-10-19').map((b) => b.id)).toEqual(['every', 'mon']);
    expect(blocksForDate(blocks, '2026-10-20').map((b) => b.id)).toEqual(['every']);
  });

  it('describes common patterns', () => {
    expect(describeDays(undefined)).toEqual({ kind: 'all' });
    expect(describeDays([1, 2, 3, 4, 5])).toEqual({ kind: 'workdays' });
    expect(describeDays([6, 7])).toEqual({ kind: 'weekend' });
    expect(describeDays([1, 3])).toEqual({ kind: 'list', days: [1, 3] });
    expect(describeDays([1, 2, 3, 4])).toEqual({ kind: 'list', days: [1, 2, 3, 4] });
  });
});
