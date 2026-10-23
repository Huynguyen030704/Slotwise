/** @typedef {import('./types.js').ScheduleInput} ScheduleInput */
/** @typedef {import('./types.js').ScheduleResult} ScheduleResult */
/** @typedef {import('./types.js').SchedulableTask} SchedulableTask */
/** @typedef {import('./types.js').Block} Block */

/**
 * @param {number} start
 * @param {number} end
 * @param {Block[]} busy
 * @returns {boolean}
 */
function isFree(start, end, busy) {
  return busy.every((b) => end <= b.startMin || start >= b.endMin);
}

/**
 * @param {SchedulableTask} task
 * @param {Block[]} busy
 * @param {ScheduleInput} input
 * @returns {number | null}
 */
function findSlot(task, busy, input) {
  const { workStartMin, workEndMin, gridMin, peak } = input;
  /** @type {number[]} */
  const fits = [];
  for (let s = workStartMin; s + task.durationMin <= workEndMin; s += gridMin) {
    if (isFree(s, s + task.durationMin, busy)) fits.push(s);
  }
  if (!fits.length) return null;
  const end = (/** @type {number} */ s) => s + task.durationMin;
  const inPeak = (/** @type {number} */ s) => s >= peak.startMin && end(s) <= peak.endMin;
  const outPeak = (/** @type {number} */ s) => s >= peak.endMin || end(s) <= peak.startMin;
  const preferred = fits.filter(task.energy === 'heavy' ? inPeak : outPeak);
  const pool = preferred.length ? preferred : fits;
  return task.doLast ? pool[pool.length - 1] : pool[0];
}

/**
 * Pure, deterministic day scheduler.
 * @param {ScheduleInput} input
 * @returns {ScheduleResult}
 */
export function schedule(input) {
  /** @type {Block[]} */
  const busy = [...input.fixed];
  /** @type {Record<string, number>} */
  const slots = {};
  /** @type {string[]} */
  const unplaced = [];

  const free = [];
  for (const t of input.tasks) {
    if (t.pinnedStartMin === null) {
      free.push(t);
    } else {
      slots[t.id] = t.pinnedStartMin;
      busy.push({ startMin: t.pinnedStartMin, endMin: t.pinnedStartMin + t.durationMin });
    }
  }

  const queue = [...free.filter((t) => !t.doLast), ...free.filter((t) => t.doLast)];
  for (const t of queue) {
    const s = findSlot(t, busy, input);
    if (s === null) {
      unplaced.push(t.id);
    } else {
      slots[t.id] = s;
      busy.push({ startMin: s, endMin: s + t.durationMin });
    }
  }
  return { slots, unplaced };
}
