import { addDays } from './dates.js';
import { leaves } from './tree.js';

/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * Task-first view of the work, with no clock: what to do today, tomorrow and later. Tree order is
 * the priority inside each bucket. Anything still open from an earlier day counts as today, so
 * nothing slips out of sight.
 * @typedef {object} TaskBuckets
 * @property {TreeNode[]} today open tasks planned for today or earlier
 * @property {TreeNode[]} doneToday tasks finished today
 * @property {TreeNode[]} tomorrow
 * @property {TreeNode[]} later planned further out, or not planned at all
 */

/**
 * @param {TreeNode[]} nodes
 * @param {string} today 'YYYY-MM-DD'
 * @returns {TaskBuckets}
 */
export function taskBuckets(nodes, today) {
  const tomorrow = addDays(today, 1);
  /** @type {TaskBuckets} */
  const out = { today: [], doneToday: [], tomorrow: [], later: [] };
  for (const l of leaves(nodes)) {
    if (l.status === 'done') {
      if (l.doneDate === today) out.doneToday.push(l);
    } else if (l.scheduledDate && l.scheduledDate <= today) {
      out.today.push(l);
    } else if (l.scheduledDate === tomorrow) {
      out.tomorrow.push(l);
    } else {
      out.later.push(l);
    }
  }
  return out;
}
