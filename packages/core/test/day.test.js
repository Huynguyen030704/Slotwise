import { describe, expect, it } from 'vitest';
import { PEAKS, checkPlacement, planDay, snapToGrid } from '../src/day.js';

/**
 * @param {string} id
 * @param {Partial<import('../src/types.js').TreeNode>} [o]
 * @returns {import('../src/types.js').TreeNode}
 */
const task = (id, o = {}) => ({
  id,
  parentId: null,
  kind: 'task',
  title: id,
  position: id,
  collapsed: false,
  status: 'todo',
  durationMin: 60,
  energy: 'heavy',
  doLast: false,
  scheduledDate: '2026-10-22',
  pinnedStartMin: null,
  doneAt: null,
  doneDate: null,
  doneStartMin: null,
  deletedAt: null,
  ...o,
});

const DAY = '2026-10-22';
const LUNCH = { startMin: 720, endMin: 780 };

describe('snapToGrid', () => {
  it('rounds to the nearest grid step', () => {
    expect(snapToGrid(487)).toBe(480);
    expect(snapToGrid(488)).toBe(495);
    expect(snapToGrid(100, 30)).toBe(90);
  });
});

describe('checkPlacement', () => {
  const busy = [{ id: 'm', label: 'Họp', startMin: 600, endMin: 660 }];

  it('accepts a free slot', () => {
    expect(checkPlacement({ startMin: 480, durationMin: 60, busy })).toEqual({ ok: true });
  });

  it('allows touching edges', () => {
    expect(checkPlacement({ startMin: 540, durationMin: 60, busy }).ok).toBe(true);
    expect(checkPlacement({ startMin: 660, durationMin: 60, busy }).ok).toBe(true);
  });

  it('rejects overlap and names the blocker', () => {
    const r = checkPlacement({ startMin: 570, durationMin: 60, busy });
    expect(r).toMatchObject({ ok: false, reason: 'conflict', with: { id: 'm', label: 'Họp' } });
  });

  it('rejects slots outside working hours', () => {
    expect(checkPlacement({ startMin: 450, durationMin: 60, busy })).toEqual({
      ok: false,
      reason: 'outside',
    });
    expect(checkPlacement({ startMin: 1050, durationMin: 60, busy })).toEqual({
      ok: false,
      reason: 'outside',
    });
    expect(
      checkPlacement({
        startMin: 100,
        durationMin: 30,
        workStartMin: 60,
        workEndMin: 200,
        busy: [],
      }).ok,
    ).toBe(true);
  });
});

describe('planDay', () => {
  const base = { date: DAY, peak: PEAKS.morning, fixed: [LUNCH] };

  it('schedules only todo leaves of that date, in tree order', () => {
    const nodes = [
      task('a'),
      task('other', { scheduledDate: '2026-10-23' }),
      task('p'),
      task('c1', { parentId: 'p' }),
    ];
    const plan = planDay(nodes, base);
    expect(plan.tasks.map((t) => t.id)).toEqual(['a', 'c1']);
    expect(Object.keys(plan.slots)).toEqual(['a', 'c1']);
    expect(plan.unplaced).toEqual([]);
  });

  it('keeps pinned tasks where they are', () => {
    const plan = planDay([task('a'), task('b', { pinnedStartMin: 480 })], base);
    expect(plan.slots.b).toBe(480);
    expect(plan.slots.a).toBe(540);
  });

  it('done tasks hold their slot and block others', () => {
    const nodes = [
      task('d', { status: 'done', doneDate: DAY, doneStartMin: 480 }),
      task('x', { status: 'done', doneDate: DAY, doneStartMin: null }),
      task('y', { status: 'done', doneDate: '2026-10-21', doneStartMin: 480 }),
      task('a'),
    ];
    const plan = planDay(nodes, base);
    expect(plan.doneSlots).toEqual({ d: 480 });
    expect(plan.doneTasks.map((t) => t.id)).toEqual(['d']);
    expect(plan.slots.a).toBe(540);
  });

  it('honours custom working hours and grid', () => {
    const plan = planDay([task('a', { durationMin: 30 })], {
      ...base,
      workStartMin: 600,
      workEndMin: 660,
      gridMin: 30,
      fixed: [],
      peak: { startMin: 600, endMin: 660 },
    });
    expect(plan.slots.a).toBe(600);
  });

  it('reports tasks that do not fit', () => {
    const nodes = Array.from({ length: 12 }, (_, i) => task(`t${String(i).padStart(2, '0')}`));
    const plan = planDay(nodes, base);
    expect(plan.unplaced.length).toBeGreaterThan(0);
  });

  it('treats a missing pin as unpinned', () => {
    const t = { ...task('a'), pinnedStartMin: undefined };
    expect(planDay([/** @type {any} */ (t)], base).slots.a).toBe(480);
  });
});

describe('planDay with overdue tasks', () => {
  const base = { date: DAY, peak: PEAKS.morning, fixed: [LUNCH] };
  const nodes = [
    task('old', { scheduledDate: '2026-10-20' }),
    task('now'),
    task('later', { scheduledDate: '2026-10-25' }),
    task('none', { scheduledDate: null }),
    task('done', { scheduledDate: '2026-10-20', status: 'done', doneDate: '2026-10-20' }),
  ];

  it('plans open tasks from earlier days when viewing today', () => {
    const plan = planDay(nodes, { ...base, today: DAY });
    expect(plan.tasks.map((t) => t.id)).toEqual(['now', 'old']);
  });

  it('keeps past days and future days to their own tasks', () => {
    expect(planDay(nodes, { ...base, today: '2026-10-25' }).tasks.map((t) => t.id)).toEqual([
      'now',
    ]);
    expect(planDay(nodes, base).tasks.map((t) => t.id)).toEqual(['now']);
  });
});
