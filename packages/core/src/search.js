import { childrenOf, liveNodes } from './tree.js';

/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * Lower-case text with accents removed, so "bao cao" finds "Báo cáo" and "dat" finds "Đặt".
 * @param {string} text
 * @returns {string}
 */
export function fold(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Rows of the tree that match a search, in tree order. A row matches when every word of the query
 * appears in its title or note (accents and case ignored). The groups and parents above a match
 * are kept so it stays in context, and collapsed nodes are opened so nothing is hidden.
 * @param {TreeNode[]} nodes
 * @param {string} query
 * @param {{ hideDone?: boolean, isDone?: (node: TreeNode) => boolean }} [options] with `hideDone`,
 *   tasks for which `isDone` is true are left out like in the normal list
 * @returns {{ node: TreeNode, depth: number, hasChildren: boolean }[]}
 */
export function searchRows(nodes, query, { hideDone = false, isDone = () => false } = {}) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const live = liveNodes(nodes);
  const byId = new Map(live.map((n) => [n.id, n]));
  const shown = new Set();
  for (const n of live) {
    if (hideDone && n.kind === 'task' && isDone(n)) continue;
    const haystack = fold(`${n.title} ${n.note ?? ''}`);
    if (!words.every((w) => haystack.includes(w))) continue;
    for (
      let cur = /** @type {TreeNode | undefined} */ (n);
      cur;
      cur = byId.get(cur.parentId ?? '')
    ) {
      shown.add(cur.id);
    }
  }
  /** @type {{ node: TreeNode, depth: number, hasChildren: boolean }[]} */
  const out = [];
  /** @param {string | null} parentId @param {number} depth */
  const walk = (parentId, depth) => {
    for (const n of childrenOf(nodes, parentId)) {
      if (!shown.has(n.id)) continue;
      out.push({
        node: n,
        depth,
        hasChildren: childrenOf(nodes, n.id).some((c) => c.kind === 'task'),
      });
      walk(n.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
