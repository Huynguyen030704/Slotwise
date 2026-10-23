import { describe, expect, it } from 'vitest';
import { FIELD_GROUPS, GROUP_NAMES, groupTime, mergeNode, stampFieldTimes } from '../src/fields.js';
import { mergeRemote } from '../src/sync.js';

const T0 = '2026-10-22T01:00:00.000Z';
const T1 = '2026-10-22T02:00:00.000Z';
const T2 = '2026-10-22T03:00:00.000Z';
const T3 = '2026-10-22T04:00:00.000Z';

/**
 * @param {string} id
 * @param {Partial<import('../src/types.js').TreeNode>} [o]
 * @returns {import('../src/types.js').TreeNode}
 */
const node = (id, o = {}) => ({
  id,
  userId: 'u',
  parentId: null,
  kind: 'task',
  title: id,
  position: 'V',
  collapsed: false,
  status: 'todo',
  durationMin: 60,
  energy: 'heavy',
  doLast: false,
  scheduledDate: '2026-10-22',
  pinnedStartMin: null,
  doneAt: null,
  doneDate: null,
  doneStartMin: null,
  createdAt: T0,
  updatedAt: T0,
  deletedAt: null,
  ...o,
});

describe('field groups', () => {
  it('cover every editable field exactly once', () => {
    const fields = GROUP_NAMES.flatMap((g) => FIELD_GROUPS[g]);
    expect(new Set(fields).size).toBe(fields.length);
    expect(fields).toEqual(
      expect.arrayContaining([
        'title',
        'parentId',
        'position',
        'collapsed',
        'status',
        'doneAt',
        'doneDate',
        'doneStartMin',
        'durationMin',
        'energy',
        'doLast',
        'scheduledDate',
        'pinnedStartMin',
        'deletedAt',
      ]),
    );
  });

  it('uses updatedAt for a node that has no field times (rows from before this existed)', () => {
    expect(groupTime(node('a', { updatedAt: T1 }), 'title')).toBe(T1);
    expect(groupTime(node('a', { fieldTimes: { title: T2 } }), 'title')).toBe(T2);
    expect(groupTime({ ...node('a'), updatedAt: undefined }, 'title')).toBe(
      '1970-01-01T00:00:00.000Z',
    );
  });
});

describe('stampFieldTimes', () => {
  it('stamps every group on a new node', () => {
    const [n] = stampFieldTimes([], [node('a', { updatedAt: T1 })]);
    expect(Object.keys(n.fieldTimes ?? {}).sort()).toEqual([...GROUP_NAMES].sort());
    expect(Object.values(n.fieldTimes ?? {}).every((t) => t === T1)).toBe(true);
  });

  it('falls back to createdAt, then the epoch, when a new node has no updatedAt', () => {
    const [a] = stampFieldTimes([], [{ ...node('a'), updatedAt: undefined, createdAt: T2 }]);
    expect(a.fieldTimes?.title).toBe(T2);
    const [b] = stampFieldTimes([], [{ ...node('b'), updatedAt: undefined, createdAt: undefined }]);
    expect(b.fieldTimes?.title).toBe('1970-01-01T00:00:00.000Z');
  });

  it('stamps only the group that changed', () => {
    const before = stampFieldTimes([], [node('a')]);
    const edited = { ...before[0], title: 'new', updatedAt: T2 };
    const [n] = stampFieldTimes(before, [edited]);
    expect(n.fieldTimes?.title).toBe(T2);
    expect(n.fieldTimes?.duration).toBe(T0);
    expect(n.fieldTimes?.place).toBe(T0);
  });

  it('treats a move as one change of place and finishing as one change of done', () => {
    const before = stampFieldTimes([], [node('a')]);
    const moved = { ...before[0], parentId: 'g', position: 'W', updatedAt: T1 };
    const finished = {
      ...before[0],
      status: /** @type {const} */ ('done'),
      doneAt: T2,
      doneDate: '2026-10-22',
      updatedAt: T2,
    };
    expect(stampFieldTimes(before, [moved])[0].fieldTimes).toMatchObject({
      place: T1,
      done: T0,
      title: T0,
    });
    expect(stampFieldTimes(before, [finished])[0].fieldTimes).toMatchObject({
      done: T2,
      place: T0,
    });
  });

  it('materialises times for a legacy node on its first edit', () => {
    const legacy = node('a', { updatedAt: T1 });
    const edited = { ...legacy, energy: /** @type {const} */ ('light'), updatedAt: T3 };
    const [n] = stampFieldTimes([legacy], [edited]);
    expect(n.fieldTimes).toMatchObject({ energy: T3, title: T1, place: T1 });
  });

  it('keeps unchanged nodes as they are', () => {
    const list = stampFieldTimes([], [node('a'), node('b')]);
    const out = stampFieldTimes(list, [list[0], { ...list[1], title: 'x', updatedAt: T2 }]);
    expect(out[0]).toBe(list[0]);
    expect(out[1]).not.toBe(list[1]);
  });

  it('keeps times when only updatedAt moved', () => {
    const [a] = stampFieldTimes([], [node('a')]);
    const [b] = stampFieldTimes([a], [{ ...a, updatedAt: T3 }]);
    expect(b.fieldTimes).toEqual(a.fieldTimes);
  });
});

describe('mergeNode', () => {
  it('keeps both sides when different groups were edited', () => {
    const base = stampFieldTimes([], [node('a')])[0];
    const mine = stampFieldTimes([base], [{ ...base, title: 'mine', updatedAt: T1 }])[0];
    const theirs = stampFieldTimes([base], [{ ...base, durationMin: 90, updatedAt: T2 }])[0];
    const { node: merged, changed, needsPush } = mergeNode(mine, theirs);
    expect(merged).toMatchObject({ title: 'mine', durationMin: 90 });
    expect(changed).toBe(true);
    expect(needsPush).toBe(true);
    expect(merged.updatedAt).toBe(T2);
    expect(merged.fieldTimes).toMatchObject({ title: T1, duration: T2 });
  });

  it('the newer edit of the same group wins, on either side', () => {
    const base = stampFieldTimes([], [node('a')])[0];
    const older = stampFieldTimes([base], [{ ...base, title: 'older', updatedAt: T1 }])[0];
    const newer = stampFieldTimes([base], [{ ...base, title: 'newer', updatedAt: T2 }])[0];
    expect(mergeNode(older, newer).node.title).toBe('newer');
    const kept = mergeNode(newer, older);
    expect(kept.node.title).toBe('newer');
    expect(kept.changed).toBe(false);
    expect(kept.needsPush).toBe(true);
  });

  it('on an exact tie the server value wins so devices converge', () => {
    const base = stampFieldTimes([], [node('a')])[0];
    const a = stampFieldTimes([base], [{ ...base, title: 'A', updatedAt: T1 }])[0];
    const b = stampFieldTimes([base], [{ ...base, title: 'B', updatedAt: T1 }])[0];
    expect(mergeNode(a, b).node.title).toBe('B');
    expect(mergeNode(a, b).needsPush).toBe(false);
  });

  it('does nothing when the values already agree, and keeps the later time', () => {
    const a = stampFieldTimes([], [node('a')])[0];
    const b = { ...a, fieldTimes: { ...a.fieldTimes, title: T3 } };
    const r = mergeNode(a, b);
    expect(r.changed).toBe(false);
    expect(r.needsPush).toBe(false);
    expect(r.node.fieldTimes?.title).toBe(T3);
  });

  it('merges a move on one device with a rename on the other', () => {
    const base = stampFieldTimes([], [node('a')])[0];
    const moved = stampFieldTimes(
      [base],
      [{ ...base, parentId: 'g', position: 'X', updatedAt: T1 }],
    )[0];
    const renamed = stampFieldTimes([base], [{ ...base, title: 'renamed', updatedAt: T2 }])[0];
    expect(mergeNode(moved, renamed).node).toMatchObject({
      parentId: 'g',
      position: 'X',
      title: 'renamed',
    });
  });

  it('a delete and a later rename both survive (the node stays deleted)', () => {
    const base = stampFieldTimes([], [node('a')])[0];
    const deleted = stampFieldTimes([base], [{ ...base, deletedAt: T1, updatedAt: T1 }])[0];
    const renamed = stampFieldTimes([base], [{ ...base, title: 'renamed', updatedAt: T2 }])[0];
    const m = mergeNode(deleted, renamed).node;
    expect(m.deletedAt).toBe(T1);
    expect(m.title).toBe('renamed');
  });

  it('behaves like whole-row last-writer-wins for rows without field times', () => {
    const local = node('a', { title: 'old', updatedAt: T1 });
    const remote = node('a', { title: 'new', updatedAt: T2, durationMin: 30 });
    expect(mergeNode(local, remote).node).toMatchObject({ title: 'new', durationMin: 30 });
    const kept = mergeNode(remote, local);
    expect(kept.node).toMatchObject({ title: 'new', durationMin: 30 });
    expect(kept.changed).toBe(false);
  });
});

describe('mergeRemote with field groups', () => {
  it('saves a row clean when the server fully wins and dirty when it is mixed', () => {
    const base = stampFieldTimes([], [node('a'), node('b')]);
    const [a, b] = base;
    const localA = stampFieldTimes([a], [{ ...a, title: 'mine', updatedAt: T1 }])[0];
    const localB = stampFieldTimes([b], [{ ...b, title: 'mine', updatedAt: T1 }])[0];
    const remoteA = stampFieldTimes([a], [{ ...a, durationMin: 90, updatedAt: T2 }])[0];
    const remoteB = stampFieldTimes([b], [{ ...b, title: 'theirs', updatedAt: T2 }])[0];
    const r = mergeRemote([localA, localB], [remoteA, remoteB]);
    expect(r.mixed.map((n) => n.id)).toEqual(['a']);
    expect(r.accepted.map((n) => n.id)).toEqual(['b']);
    expect(r.nodes.find((n) => n.id === 'a')).toMatchObject({ title: 'mine', durationMin: 90 });
    expect(r.nodes.find((n) => n.id === 'b')?.title).toBe('theirs');
  });

  it('leaves everything alone when the server has nothing newer', () => {
    const [a] = stampFieldTimes([], [node('a')]);
    const local = [a];
    const r = mergeRemote(local, [a]);
    expect(r.nodes).toBe(local);
    expect(r.accepted).toEqual([]);
    expect(r.mixed).toEqual([]);
  });
});
