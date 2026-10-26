import { addDays } from './dates.js';
import { childrenOf, leaves, leavesUnder, liveNodes } from './tree.js';

/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * @typedef {object} GroupReport
 * @property {string | null} title null for tasks that belong to no group
 * @property {number} done
 * @property {number} total
 * @property {string[]} doneTitles
 * @property {string[]} todoTitles
 * @property {string[]} doneNotes note of each done task, same order as doneTitles ('' if none)
 * @property {string[]} todoNotes note of each open task, same order as todoTitles
 */

/**
 * Progress per group, in tree order. Tasks outside any group come last.
 * @param {TreeNode[]} nodes
 * @returns {GroupReport[]}
 */
export function groupReport(nodes) {
  /** @param {string | null} title @param {TreeNode[]} ls @returns {GroupReport} */
  const make = (title, ls) => ({
    title,
    done: ls.filter((l) => l.status === 'done').length,
    total: ls.length,
    doneTitles: ls.filter((l) => l.status === 'done').map((l) => l.title),
    todoTitles: ls.filter((l) => l.status !== 'done').map((l) => l.title),
    doneNotes: ls.filter((l) => l.status === 'done').map((l) => l.note?.trim() ?? ''),
    todoNotes: ls.filter((l) => l.status !== 'done').map((l) => l.note?.trim() ?? ''),
  });
  const groups = childrenOf(nodes, null).filter((n) => n.kind === 'group');
  const out = groups.map((g) => make(g.title, leavesUnder(nodes, g))).filter((r) => r.total > 0);
  const grouped = new Set(groups.flatMap((g) => leavesUnder(nodes, g).map((l) => l.id)));
  const loose = leaves(nodes).filter((l) => !grouped.has(l.id));
  return loose.length ? [...out, make(null, loose)] : out;
}

/**
 * Plain-text report to paste into chat or email. Notes are left out unless `withNotes` is set; a
 * note goes on indented lines under its task.
 * @param {GroupReport[]} report
 * @param {{ heading: string, noGroup: string }} labels
 * @param {{ withNotes?: boolean }} [options]
 * @returns {string}
 */
export function reportToText(report, labels, { withNotes = false } = {}) {
  const lines = [labels.heading, ''];
  /** @param {string} mark @param {string[]} titles @param {string[]} notes */
  const items = (mark, titles, notes) =>
    titles.forEach((title, i) => {
      lines.push(`  ${mark} ${title}`);
      if (withNotes && notes[i]) for (const row of notes[i].split('\n')) lines.push(`      ${row}`);
    });
  for (const r of report) {
    lines.push(`${r.title ?? labels.noGroup}: ${r.done}/${r.total}`);
    items('✓', r.doneTitles, r.doneNotes);
    items('○', r.todoTitles, r.todoNotes);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/**
 * Tasks planned for `date` or earlier that are still open.
 * @param {TreeNode[]} nodes
 * @param {string} date
 * @returns {TreeNode[]}
 */
export function unfinishedOn(nodes, date) {
  return leaves(nodes).filter(
    (l) => l.status !== 'done' && !!l.scheduledDate && l.scheduledDate <= date,
  );
}

/**
 * Move every unfinished task of `date` to the next day and drop its pin.
 * @param {TreeNode[]} nodes
 * @param {string} date
 * @param {string} now ISO UTC
 * @returns {{ nodes: TreeNode[], count: number }}
 */
export function rollOver(nodes, date, now) {
  const ids = new Set(unfinishedOn(nodes, date).map((l) => l.id));
  if (!ids.size) return { nodes, count: 0 };
  const next = addDays(date, 1);
  return {
    count: ids.size,
    nodes: nodes.map((n) =>
      ids.has(n.id) ? { ...n, scheduledDate: next, pinnedStartMin: null, updatedAt: now } : n,
    ),
  };
}

/**
 * Count of live task leaves (used for empty-state checks).
 * @param {TreeNode[]} nodes
 * @returns {number}
 */
export function taskCount(nodes) {
  return liveNodes(nodes).filter((n) => n.kind === 'task').length;
}
