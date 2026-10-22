/** @typedef {import('./types.js').TreeNode} TreeNode */

/** @param {string | null | undefined} s */
const time = (s) => (s ? Date.parse(s) : 0);

/**
 * Fold rows pulled from the server into the local list. A remote row wins only when it is strictly
 * newer (`updatedAt`); on a tie the local row stays. Local rows that are newer stay dirty, so the
 * next push sends them.
 * @param {TreeNode[]} local
 * @param {TreeNode[]} remote
 * @returns {{ nodes: TreeNode[], accepted: TreeNode[] }} `accepted` are the remote rows to save locally
 */
export function mergeRemote(local, remote) {
  const byId = new Map(local.map((n) => [n.id, n]));
  /** @type {TreeNode[]} */
  const accepted = [];
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l || time(r.updatedAt) > time(l.updatedAt)) {
      byId.set(r.id, r);
      accepted.push(r);
    }
  }
  return { nodes: accepted.length ? [...byId.values()] : local, accepted };
}
