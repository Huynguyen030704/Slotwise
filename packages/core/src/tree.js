import { positionBetween } from './position.js';

/** @typedef {import('./types.js').TreeNode} TreeNode */

/**
 * @typedef {{ kind: 'into', id: string } | { kind: 'before', id: string } | { kind: 'after', id: string }} DropTarget
 */

/** @param {TreeNode} a @param {TreeNode} b */
const byPosition = (a, b) => {
  const pa = a.position ?? '';
  const pb = b.position ?? '';
  if (pa !== pb) return pa < pb ? -1 : 1;
  return a.id.localeCompare(b.id);
};

/** @param {TreeNode | undefined} n @returns {string | null} */
const pos = (n) => n?.position ?? null;

/**
 * Live (not soft-deleted) nodes only.
 * @param {TreeNode[]} nodes
 * @returns {TreeNode[]}
 */
export function liveNodes(nodes) {
  return nodes.filter((n) => !n.deletedAt);
}

/**
 * Ordered live children of a parent (null = roots).
 * @param {TreeNode[]} nodes
 * @param {string | null} parentId
 * @returns {TreeNode[]}
 */
export function childrenOf(nodes, parentId) {
  return liveNodes(nodes)
    .filter((n) => n.parentId === parentId)
    .sort(byPosition);
}

/**
 * Depth-first order = scheduling priority order.
 * @param {TreeNode[]} nodes
 * @returns {TreeNode[]}
 */
export function flatten(nodes) {
  /** @type {TreeNode[]} */
  const out = [];
  /** @param {string | null} parentId */
  const walk = (parentId) => {
    for (const n of childrenOf(nodes, parentId)) {
      out.push(n);
      walk(n.id);
    }
  };
  walk(null);
  return out;
}

/**
 * A leaf is a live task with no live task children.
 * @param {TreeNode[]} nodes
 * @param {TreeNode} node
 * @returns {boolean}
 */
export function isLeaf(nodes, node) {
  return node.kind === 'task' && !childrenOf(nodes, node.id).some((c) => c.kind === 'task');
}

/**
 * Leaf tasks below a node (the node itself when it is a leaf), in tree order.
 * @param {TreeNode[]} nodes
 * @param {TreeNode} node
 * @returns {TreeNode[]}
 */
export function leavesUnder(nodes, node) {
  if (node.kind === 'task' && isLeaf(nodes, node)) return [node];
  return childrenOf(nodes, node.id).flatMap((c) => leavesUnder(nodes, c));
}

/**
 * All leaf tasks in scheduling order.
 * @param {TreeNode[]} nodes
 * @returns {TreeNode[]}
 */
export function leaves(nodes) {
  return flatten(nodes).filter((n) => isLeaf(nodes, n));
}

/**
 * Parent tasks are done when every leaf below is done. Leaves use their own status.
 * @param {TreeNode[]} nodes
 * @param {TreeNode} node
 * @returns {boolean}
 */
export function isDone(nodes, node) {
  const ls = leavesUnder(nodes, node);
  if (ls.length === 0) return node.status === 'done';
  return ls.every((l) => l.status === 'done');
}

/**
 * Progress of a group: done leaves over total leaves.
 * @param {TreeNode[]} nodes
 * @param {TreeNode} group
 * @returns {{ done: number, total: number }}
 */
export function progress(nodes, group) {
  const ls = leavesUnder(nodes, group);
  return { done: ls.filter((l) => l.status === 'done').length, total: ls.length };
}

/**
 * @param {TreeNode[]} nodes
 * @param {string} id
 * @returns {string[]} ids of the node and all live descendants
 */
function subtreeIds(nodes, id) {
  /** @type {string[]} */
  const ids = [id];
  for (const c of childrenOf(nodes, id)) ids.push(...subtreeIds(nodes, c.id));
  return ids;
}

/**
 * Keep every stored parent status equal to its derived status.
 * @param {TreeNode[]} nodes
 * @returns {TreeNode[]}
 */
function syncParents(nodes) {
  return nodes.map((n) => {
    if (n.kind !== 'task' || n.deletedAt || isLeaf(nodes, n)) return n;
    const status = isDone(nodes, n) ? 'done' : 'todo';
    return status === n.status ? n : { ...n, status };
  });
}

/**
 * Tick a task (or a whole branch when it has children).
 * @param {TreeNode[]} nodes
 * @param {string} id
 * @param {boolean} done
 * @param {{ now: string, today: string }} ctx ISO UTC time and local 'YYYY-MM-DD'
 * @returns {TreeNode[]}
 */
export function setDone(nodes, id, done, ctx) {
  const target = nodes.find((n) => n.id === id);
  if (!target || target.kind !== 'task') return nodes;
  const ids = new Set(subtreeIds(nodes, id));
  const next = nodes.map((n) => {
    if (!ids.has(n.id) || n.kind !== 'task') return n;
    return /** @type {TreeNode} */ ({
      ...n,
      status: done ? 'done' : 'todo',
      doneAt: done ? ctx.now : null,
      doneDate: done ? ctx.today : null,
      doneStartMin: done ? n.doneStartMin : null,
      updatedAt: ctx.now,
    });
  });
  return syncParents(next);
}

/**
 * Soft delete a node and everything below it. If this removes the last task child of a parent,
 * the parent keeps the done state it had derived.
 * @param {TreeNode[]} nodes
 * @param {string} id
 * @param {string} now ISO UTC
 * @returns {TreeNode[]}
 */
export function softDelete(nodes, id, now) {
  const settled = syncParents(nodes);
  const ids = new Set(subtreeIds(settled, id));
  return settled.map((n) => (ids.has(n.id) ? { ...n, deletedAt: now, updatedAt: now } : n));
}

/**
 * Undo `softDelete` for a node and its subtree.
 * @param {TreeNode[]} nodes
 * @param {string} id
 * @param {string} now ISO UTC
 * @returns {TreeNode[]}
 */
export function restore(nodes, id, now) {
  const target = nodes.find((n) => n.id === id);
  if (!target || !target.deletedAt) return nodes;
  const stamp = target.deletedAt;
  /** @param {string} rootId @returns {Set<string>} */
  const collect = (rootId) => {
    const set = new Set([rootId]);
    for (const n of nodes)
      if (n.parentId === rootId && n.deletedAt === stamp) {
        for (const x of collect(n.id)) set.add(x);
      }
    return set;
  };
  const ids = collect(id);
  return syncParents(
    nodes.map((n) => (ids.has(n.id) ? { ...n, deletedAt: null, updatedAt: now } : n)),
  );
}

/**
 * Move a node. Dropping on a group name makes it the group's first child. Dropping on the top
 * or bottom half of a row inserts before or after that row, under the row's parent.
 * Returns the same array when the move is not allowed.
 * @param {TreeNode[]} nodes
 * @param {string} id
 * @param {DropTarget} target
 * @param {string} now ISO UTC
 * @returns {TreeNode[]}
 */
export function moveNode(nodes, id, target, now) {
  const moving = nodes.find((n) => n.id === id && !n.deletedAt);
  const anchor = nodes.find((n) => n.id === target.id && !n.deletedAt);
  if (!moving || !anchor) return nodes;
  if (subtreeIds(nodes, id).includes(anchor.id)) return nodes;

  /** @type {string | null} */
  let parentId;
  /** @type {'first' | 'before' | 'after'} */
  let placement;
  if (moving.kind === 'group') {
    if (anchor.kind !== 'group' || target.kind === 'into') return nodes;
    parentId = null;
    placement = target.kind;
  } else if (anchor.kind === 'group') {
    parentId = anchor.id;
    placement = 'first';
  } else if (target.kind === 'into') {
    parentId = anchor.id;
    placement = 'first';
  } else {
    parentId = anchor.parentId;
    placement = target.kind;
  }

  nodes = syncParents(nodes);
  const siblings = childrenOf(nodes, parentId).filter((n) => n.id !== id);
  /** @type {string | null} */
  let lo = null;
  /** @type {string | null} */
  let hi = null;
  if (placement === 'first') {
    hi = pos(siblings[0]);
  } else {
    const i = siblings.findIndex((n) => n.id === anchor.id);
    const at = placement === 'before' ? i - 1 : i;
    lo = pos(siblings[at]);
    hi = pos(siblings[at + 1]);
  }
  const position = positionBetween(lo, hi);
  return syncParents(
    nodes.map((n) => (n.id === id ? { ...n, parentId, position, updatedAt: now } : n)),
  );
}
