import { mergeNode } from './fields.js';

/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * Fold rows pulled from the server into the local list, field group by field group (see
 * `mergeNode`). Three outcomes per row:
 * - the server has nothing new for us: nothing happens (local rows still waiting to be pushed stay
 *   dirty);
 * - the merged row equals the server's: it goes to `accepted` and is saved clean;
 * - the merged row mixes server values with newer local ones: it goes to `mixed` and is saved dirty,
 *   so the next push sends the local part.
 * @param {TreeNode[]} local
 * @param {TreeNode[]} remote
 * @returns {{ nodes: TreeNode[], accepted: TreeNode[], mixed: TreeNode[] }}
 */
export function mergeRemote(local, remote) {
  const byId = new Map(local.map((n) => [n.id, n]));
  /** @type {TreeNode[]} */
  const accepted = [];
  /** @type {TreeNode[]} */
  const mixed = [];
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) {
      byId.set(r.id, r);
      accepted.push(r);
      continue;
    }
    const m = mergeNode(l, r);
    if (!m.changed) continue;
    byId.set(r.id, m.node);
    (m.needsPush ? mixed : accepted).push(m.node);
  }
  const touched = accepted.length || mixed.length;
  return { nodes: touched ? [...byId.values()] : local, accepted, mixed };
}
