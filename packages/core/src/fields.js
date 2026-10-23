/**
 * Field-level change tracking. Every editable property of a node belongs to a group, and each group
 * remembers when it was last edited (`node.fieldTimes[group]`). Two devices that edit different
 * groups of the same task offline both keep their change when they sync.
 *
 * A node written before this existed has no `fieldTimes`: every group then counts as last edited
 * at `updatedAt`, which is exactly the old whole-row behaviour.
 */

/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * Fields that always change together stay together: a move changes both the parent and the
 * position, finishing a task changes four fields.
 * @type {Record<string, (keyof TreeNode)[]>}
 */
export const FIELD_GROUPS = {
  title: ['title'],
  place: ['parentId', 'position'],
  collapsed: ['collapsed'],
  done: ['status', 'doneAt', 'doneDate', 'doneStartMin'],
  duration: ['durationMin'],
  energy: ['energy'],
  doLast: ['doLast'],
  date: ['scheduledDate'],
  pin: ['pinnedStartMin'],
  deleted: ['deletedAt'],
};

export const GROUP_NAMES = Object.keys(FIELD_GROUPS);

const EPOCH = new Date(0).toISOString();

/** @param {string | null | undefined} s */
const ms = (s) => (s ? Date.parse(s) : 0);

/**
 * When a group of this node was last edited.
 * @param {TreeNode} node
 * @param {string} group
 * @returns {string}
 */
export function groupTime(node, group) {
  return node.fieldTimes?.[group] ?? node.updatedAt ?? EPOCH;
}

/**
 * @param {TreeNode} a
 * @param {TreeNode} b
 * @param {string} group
 */
function sameGroup(a, b, group) {
  return FIELD_GROUPS[group].every((f) => (a[f] ?? null) === (b[f] ?? null));
}

/**
 * Every group at one time.
 * @param {string} at
 * @returns {Record<string, string>}
 */
function allGroupsAt(at) {
  return Object.fromEntries(GROUP_NAMES.map((g) => [g, at]));
}

/**
 * After an edit, record which groups changed. `updatedAt` of the edited node is the edit time.
 * New nodes get every group stamped at creation. Nodes that did not change keep their identity.
 * @param {TreeNode[]} prev
 * @param {TreeNode[]} next
 * @returns {TreeNode[]}
 */
export function stampFieldTimes(prev, next) {
  const before = new Map(prev.map((n) => [n.id, n]));
  return next.map((n) => {
    const p = before.get(n.id);
    if (p === n) return n;
    const at = n.updatedAt ?? n.createdAt ?? EPOCH;
    if (!p) return { ...n, fieldTimes: allGroupsAt(at) };
    /** @type {Record<string, string>} */
    const times = {};
    for (const g of GROUP_NAMES) times[g] = sameGroup(p, n, g) ? groupTime(p, g) : at;
    return { ...n, fieldTimes: times };
  });
}

/**
 * Merge this device's copy of a node with the server's, group by group. The newer edit of each
 * group wins. On an exact tie the server's value wins, so every device ends up with the same value.
 * @param {TreeNode} local
 * @param {TreeNode} remote
 * @returns {{ node: TreeNode, changed: boolean, needsPush: boolean }}
 *   `changed`: something from the server replaced a local value.
 *   `needsPush`: the merged node still holds a local value the server does not have.
 */
export function mergeNode(local, remote) {
  /** @type {Record<string, any>} */
  const merged = { ...local };
  /** @type {Record<string, string>} */
  const times = {};
  let changed = false;
  let needsPush = false;
  for (const g of GROUP_NAMES) {
    const lt = groupTime(local, g);
    const rt = groupTime(remote, g);
    if (sameGroup(local, remote, g)) {
      times[g] = ms(rt) > ms(lt) ? rt : lt;
    } else if (ms(rt) >= ms(lt)) {
      for (const f of FIELD_GROUPS[g]) merged[f] = remote[f];
      times[g] = rt;
      changed = true;
    } else {
      times[g] = lt;
      needsPush = true;
    }
  }
  const updatedAt = ms(remote.updatedAt) > ms(local.updatedAt) ? remote.updatedAt : local.updatedAt;
  return {
    node: /** @type {TreeNode} */ ({ ...merged, updatedAt, fieldTimes: times }),
    changed,
    needsPush,
  };
}
