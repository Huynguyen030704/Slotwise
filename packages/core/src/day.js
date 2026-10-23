import { schedule } from './schedule.js';
import { leaves } from './tree.js';

/** @typedef {import('./types.js').TreeNode} TreeNode */
/** @typedef {import('./types.js').Block} Block */

export const DEFAULT_WORK_START = 480;
export const DEFAULT_WORK_END = 1080;
export const DEFAULT_GRID = 15;

/** Peak (most alert) windows: morning 08:00-12:00, afternoon 13:00-17:00. */
export const PEAKS = {
  morning: { startMin: 480, endMin: 720 },
  afternoon: { startMin: 780, endMin: 1020 },
};

/**
 * @param {number} min
 * @param {number} [gridMin]
 * @returns {number}
 */
export function snapToGrid(min, gridMin = DEFAULT_GRID) {
  return Math.round(min / gridMin) * gridMin;
}

/**
 * @typedef {{ ok: true } | { ok: false, reason: 'outside' } | { ok: false, reason: 'conflict', with: Block & { id?: string, label?: string } }} Placement
 */

/**
 * Can a block of `durationMin` start at `startMin`? Used for the drag preview (green or red
 * with a reason) and for the "pin to time" sheet.
 * @param {{
 *   startMin: number,
 *   durationMin: number,
 *   workStartMin?: number,
 *   workEndMin?: number,
 *   busy: (Block & { id?: string, label?: string })[],
 * }} p
 * @returns {Placement}
 */
export function checkPlacement({
  startMin,
  durationMin,
  workStartMin = DEFAULT_WORK_START,
  workEndMin = DEFAULT_WORK_END,
  busy,
}) {
  const endMin = startMin + durationMin;
  if (startMin < workStartMin || endMin > workEndMin) return { ok: false, reason: 'outside' };
  const hit = busy.find((b) => startMin < b.endMin && endMin > b.startMin);
  return hit ? { ok: false, reason: 'conflict', with: hit } : { ok: true };
}

/**
 * @typedef {object} DayPlan
 * @property {Record<string, number>} slots start minute for every todo task placed that day
 * @property {string[]} unplaced
 * @property {Record<string, number>} doneSlots start minute kept for tasks finished that day
 * @property {TreeNode[]} tasks the leaf tasks planned for the day, in tree order
 * @property {TreeNode[]} doneTasks
 */

/**
 * Plan one day from the tree. When `date` is `today`, open tasks left over from earlier days are
 * planned too, so nothing slips out of the calendar. Finished tasks that remember their start time keep their place,
 * pinned tasks keep theirs, the rest are auto-scheduled.
 * @param {TreeNode[]} nodes
 * @param {{
 *   date: string,
 *   today?: string,
 *   peak: Block,
 *   fixed: Block[],
 *   workStartMin?: number,
 *   workEndMin?: number,
 *   gridMin?: number,
 * }} opts
 * @returns {DayPlan}
 */
export function planDay(nodes, opts) {
  const { date, peak, fixed } = opts;
  const ls = leaves(nodes);
  const doneTasks = ls.filter(
    (l) => l.status === 'done' && l.doneDate === date && typeof l.doneStartMin === 'number',
  );
  const overdue = opts.today === date;
  const tasks = ls.filter(
    (l) =>
      l.status !== 'done' &&
      (l.scheduledDate === date || (overdue && !!l.scheduledDate && l.scheduledDate < date)),
  );
  /** @type {Record<string, number>} */
  const doneSlots = {};
  for (const d of doneTasks) doneSlots[d.id] = /** @type {number} */ (d.doneStartMin);

  const result = schedule({
    workStartMin: opts.workStartMin ?? DEFAULT_WORK_START,
    workEndMin: opts.workEndMin ?? DEFAULT_WORK_END,
    gridMin: opts.gridMin ?? DEFAULT_GRID,
    peak,
    fixed: [
      ...fixed,
      ...doneTasks.map((d) => ({
        startMin: doneSlots[d.id],
        endMin: doneSlots[d.id] + d.durationMin,
      })),
    ],
    tasks: tasks.map((t) => ({
      id: t.id,
      durationMin: t.durationMin,
      energy: t.energy,
      doLast: t.doLast,
      pinnedStartMin: t.pinnedStartMin ?? null,
    })),
  });
  return { slots: result.slots, unplaced: result.unplaced, doneSlots, tasks, doneTasks };
}
