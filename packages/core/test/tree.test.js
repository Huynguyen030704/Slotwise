import { describe, expect, it } from 'vitest';
import {
  childrenOf,
  flatten,
  isDone,
  isLeaf,
  leaves,
  leavesUnder,
  liveNodes,
  moveNode,
  progress,
  restore,
  setDone,
  softDelete,
} from '../src/tree.js';

/**
 * @param {string} id
 * @param {Partial<import('../src/types.js').TreeNode>} [o]
 * @returns {import('../src/types.js').TreeNode}
 */
const node = (id, o = {}) => ({
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
  scheduledDate: null,
  pinnedStartMin: null,
  doneAt: null,
  doneDate: null,
  doneStartMin: null,
  deletedAt: null,
  ...o,
});

const CTX = { now: '2026-10-22T03:00:00.000Z', today: '2026-10-22' };

/** G1 { a { a1, a2 }, b }  G2 { c }  */
const sample = () => [
  node('g1', { kind: 'group', position: 'a' }),
  node('a', { parentId: 'g1', position: 'a' }),
  node('a1', { parentId: 'a', position: 'a' }),
  node('a2', { parentId: 'a', position: 'b' }),
  node('b', { parentId: 'g1', position: 'b' }),
  node('g2', { kind: 'group', position: 'b' }),
  node('c', { parentId: 'g2', position: 'a' }),
  node('n', { parentId: 'g2', kind: 'note', position: 'b' }),
];

/** @param {import('../src/types.js').TreeNode[]} nodes @param {string} id */
const get = (nodes, id) =>
  /** @type {import('../src/types.js').TreeNode} */ (nodes.find((n) => n.id === id));

describe('reading the tree', () => {
  it('orders siblings by position then id, and skips deleted nodes', () => {
    const nodes = [
      node('x', { position: 'b' }),
      node('y', { position: 'a' }),
      node('z', { position: 'a' }),
      node('d', { position: 'a0', deletedAt: 'now' }),
    ];
    expect(childrenOf(nodes, null).map((n) => n.id)).toEqual(['y', 'z', 'x']);
    expect(liveNodes(nodes)).toHaveLength(3);
  });

  it('flattens depth-first as scheduling priority', () => {
    expect(flatten(sample()).map((n) => n.id)).toEqual([
      'g1',
      'a',
      'a1',
      'a2',
      'b',
      'g2',
      'c',
      'n',
    ]);
  });

  it('finds leaves: tasks without task children', () => {
    const nodes = sample();
    expect(isLeaf(nodes, get(nodes, 'a'))).toBe(false);
    expect(isLeaf(nodes, get(nodes, 'a1'))).toBe(true);
    expect(isLeaf(nodes, get(nodes, 'g1'))).toBe(false);
    expect(isLeaf(nodes, get(nodes, 'n'))).toBe(false);
    expect(leaves(nodes).map((n) => n.id)).toEqual(['a1', 'a2', 'b', 'c']);
    expect(leavesUnder(nodes, get(nodes, 'g1')).map((n) => n.id)).toEqual(['a1', 'a2', 'b']);
    expect(leavesUnder(nodes, get(nodes, 'b')).map((n) => n.id)).toEqual(['b']);
  });

  it('derives parent done state from leaves', () => {
    const nodes = sample();
    expect(isDone(nodes, get(nodes, 'a'))).toBe(false);
    const half = nodes.map((n) =>
      n.id === 'a1' ? { ...n, status: /** @type {const} */ ('done') } : n,
    );
    expect(isDone(half, get(half, 'a'))).toBe(false);
    const all = half.map((n) =>
      n.id === 'a2' ? { ...n, status: /** @type {const} */ ('done') } : n,
    );
    expect(isDone(all, get(all, 'a'))).toBe(true);
  });

  it('falls back to own status when a node has no leaves', () => {
    const n = node('n', { kind: 'note', status: 'done' });
    expect(isDone([n], n)).toBe(true);
  });

  it('counts group progress as done leaves over total leaves', () => {
    const nodes = sample().map((n) =>
      n.id === 'b' ? { ...n, status: /** @type {const} */ ('done') } : n,
    );
    expect(progress(nodes, get(nodes, 'g1'))).toEqual({ done: 1, total: 3 });
    expect(progress(nodes, get(nodes, 'g2'))).toEqual({ done: 0, total: 1 });
  });
});

describe('setDone', () => {
  it('ticks a whole branch and its derived parent', () => {
    const next = setDone(sample(), 'a', true, CTX);
    expect(get(next, 'a1')).toMatchObject({
      status: 'done',
      doneDate: '2026-10-22',
      doneAt: CTX.now,
    });
    expect(get(next, 'a2').status).toBe('done');
    expect(get(next, 'a').status).toBe('done');
    expect(get(next, 'b').status).toBe('todo');
  });

  it('unticking a child unticks the derived parent', () => {
    const done = setDone(sample(), 'a', true, CTX);
    const next = setDone(done, 'a2', false, CTX);
    expect(get(next, 'a').status).toBe('todo');
    expect(get(next, 'a1').status).toBe('done');
    expect(get(next, 'a2')).toMatchObject({ doneAt: null, doneDate: null });
  });

  it('ignores unknown ids and non-tasks', () => {
    const nodes = sample();
    expect(setDone(nodes, 'nope', true, CTX)).toBe(nodes);
    expect(setDone(nodes, 'g1', true, CTX)).toBe(nodes);
    expect(setDone(nodes, 'n', true, CTX)).toBe(nodes);
  });
});

describe('softDelete and restore', () => {
  it('deletes the subtree and can restore it', () => {
    const del = softDelete(sample(), 'a', 'T1');
    expect(get(del, 'a').deletedAt).toBe('T1');
    expect(get(del, 'a1').deletedAt).toBe('T1');
    expect(get(del, 'b').deletedAt).toBeNull();
    const back = restore(del, 'a', 'T2');
    expect(back.every((n) => n.deletedAt === null)).toBe(true);
    expect(get(back, 'a1').updatedAt).toBe('T2');
  });

  it('keeps an already deleted child deleted when restoring a parent', () => {
    const first = softDelete(sample(), 'a1', 'T1');
    const second = softDelete(first, 'a', 'T2');
    const back = restore(second, 'a', 'T3');
    expect(get(back, 'a1').deletedAt).toBe('T1');
    expect(get(back, 'a2').deletedAt).toBeNull();
  });

  it('parent keeps its derived done state when its last task child is removed', () => {
    const done = setDone(sample(), 'a1', true, CTX).map((n) =>
      n.id === 'a2' ? { ...n, status: /** @type {const} */ ('done') } : n,
    );
    // stored parent status is stale ('todo') on purpose: only derived state says done
    let next = softDelete(done, 'a1', 'T1');
    next = softDelete(next, 'a2', 'T1');
    const a = get(next, 'a');
    expect(isLeaf(next, a)).toBe(true);
    expect(isDone(next, a)).toBe(true);
  });

  it('restore does nothing for live or unknown nodes', () => {
    const nodes = sample();
    expect(restore(nodes, 'a', 'T')).toBe(nodes);
    expect(restore(nodes, 'zzz', 'T')).toBe(nodes);
  });
});

describe('moveNode', () => {
  const ids = (
    /** @type {import('../src/types.js').TreeNode[]} */ nodes,
    /** @type {string|null} */ p,
  ) => childrenOf(nodes, p).map((n) => n.id);

  it('dropping a task on a group name makes it the first child', () => {
    const next = moveNode(sample(), 'c', { kind: 'into', id: 'g1' }, 'T');
    expect(ids(next, 'g1')).toEqual(['c', 'a', 'b']);
    expect(get(next, 'c').updatedAt).toBe('T');
  });

  it('dropping on a group row from above or below also goes into the group', () => {
    expect(ids(moveNode(sample(), 'c', { kind: 'before', id: 'g1' }, 'T'), 'g1')[0]).toBe('c');
    expect(ids(moveNode(sample(), 'c', { kind: 'after', id: 'g1' }, 'T'), 'g1')[0]).toBe('c');
  });

  it('inserts before or after a row under the same parent', () => {
    expect(ids(moveNode(sample(), 'c', { kind: 'before', id: 'b' }, 'T'), 'g1')).toEqual([
      'a',
      'c',
      'b',
    ]);
    expect(ids(moveNode(sample(), 'c', { kind: 'after', id: 'b' }, 'T'), 'g1')).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(ids(moveNode(sample(), 'b', { kind: 'before', id: 'a' }, 'T'), 'g1')).toEqual([
      'b',
      'a',
    ]);
  });

  it('can nest a task under another task with into', () => {
    const next = moveNode(sample(), 'b', { kind: 'into', id: 'a1' }, 'T');
    expect(get(next, 'b').parentId).toBe('a1');
    expect(isLeaf(next, get(next, 'a1'))).toBe(false);
  });

  it('reorders groups relative to each other only', () => {
    const next = moveNode(sample(), 'g2', { kind: 'before', id: 'g1' }, 'T');
    expect(ids(next, null)).toEqual(['g2', 'g1']);
    expect(ids(moveNode(sample(), 'g1', { kind: 'after', id: 'g2' }, 'T'), null)).toEqual([
      'g2',
      'g1',
    ]);
    const nodes = sample();
    expect(moveNode(nodes, 'g1', { kind: 'into', id: 'g2' }, 'T')).toBe(nodes);
    expect(moveNode(nodes, 'g1', { kind: 'before', id: 'b' }, 'T')).toBe(nodes);
  });

  it('refuses to move into its own subtree or with unknown ids', () => {
    const nodes = sample();
    expect(moveNode(nodes, 'a', { kind: 'into', id: 'a1' }, 'T')).toBe(nodes);
    expect(moveNode(nodes, 'a', { kind: 'before', id: 'a' }, 'T')).toBe(nodes);
    expect(moveNode(nodes, 'zzz', { kind: 'into', id: 'g1' }, 'T')).toBe(nodes);
    expect(moveNode(nodes, 'a', { kind: 'into', id: 'zzz' }, 'T')).toBe(nodes);
  });

  it('moving the last child away leaves the parent done if it was derived done', () => {
    const nodes = setDone(sample(), 'a', true, CTX);
    const stale = nodes.map((n) =>
      n.id === 'a' ? { ...n, status: /** @type {const} */ ('todo') } : n,
    );
    const one = moveNode(stale, 'a1', { kind: 'into', id: 'g2' }, 'T');
    const two = moveNode(one, 'a2', { kind: 'into', id: 'g2' }, 'T');
    expect(isLeaf(two, get(two, 'a'))).toBe(true);
    expect(get(two, 'a').status).toBe('done');
  });

  it('moving into an empty group works', () => {
    const nodes = [node('g', { kind: 'group' }), node('t', { position: 'z' })];
    const next = moveNode(nodes, 't', { kind: 'into', id: 'g' }, 'T');
    expect(get(next, 't').parentId).toBe('g');
  });

  it('handles siblings that have no position yet', () => {
    const nodes = [
      node('g', { kind: 'group', position: undefined }),
      node('t1', { parentId: 'g', position: undefined }),
      node('t2', { parentId: 'g', position: undefined }),
    ];
    const next = moveNode(nodes, 't2', { kind: 'before', id: 't1' }, 'T');
    expect(get(next, 't2').position).toBeTruthy();
  });
});
