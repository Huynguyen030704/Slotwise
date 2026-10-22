import { describe, expect, it } from 'vitest';
import { nodeToRemote, remoteToNode } from '../src/remoteRows.js';
import { mergeRemote } from '../src/sync.js';

/**
 * @param {string} id
 * @param {Partial<import('../src/types.js').TreeNode>} [o]
 * @returns {import('../src/types.js').TreeNode}
 */
const node = (id, o = {}) => ({
  id,
  userId: 'u1',
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
  createdAt: '2026-10-22T01:00:00.000Z',
  updatedAt: '2026-10-22T01:00:00.000Z',
  deletedAt: null,
  ...o,
});

describe('mergeRemote', () => {
  it('adds rows the device has never seen', () => {
    const { nodes, accepted } = mergeRemote([node('a')], [node('b')]);
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(accepted.map((n) => n.id)).toEqual(['b']);
  });

  it('takes a strictly newer remote row', () => {
    const local = node('a', { title: 'old' });
    const remote = node('a', { title: 'new', updatedAt: '2026-10-22T02:00:00.000Z' });
    const { nodes, accepted } = mergeRemote([local], [remote]);
    expect(nodes[0].title).toBe('new');
    expect(accepted).toEqual([remote]);
  });

  it('keeps a newer local row and does not accept the older remote one', () => {
    const local = node('a', { title: 'mine', updatedAt: '2026-10-22T03:00:00.000Z' });
    const remote = node('a', { title: 'theirs' });
    const r = mergeRemote([local], [remote]);
    expect(r.nodes[0].title).toBe('mine');
    expect(r.accepted).toEqual([]);
  });

  it('keeps the local row on a tie', () => {
    const r = mergeRemote([node('a', { title: 'mine' })], [node('a', { title: 'theirs' })]);
    expect(r.nodes[0].title).toBe('mine');
  });

  it('returns the same array when nothing changed', () => {
    const local = [node('a')];
    expect(mergeRemote(local, []).nodes).toBe(local);
  });

  it('propagates a remote soft delete', () => {
    const stamp = '2026-10-22T05:00:00.000Z';
    const remote = node('a', { deletedAt: stamp, updatedAt: stamp });
    expect(mergeRemote([node('a')], [remote]).nodes[0].deletedAt).toBe(stamp);
  });

  it('compares instants, not strings, so +00:00 and Z forms agree', () => {
    const local = node('a', { title: 'mine', updatedAt: '2026-10-22T02:00:00.000Z' });
    const remote = node('a', { title: 'theirs', updatedAt: '2026-10-22T02:00:00+00:00' });
    expect(mergeRemote([local], [remote]).nodes[0].title).toBe('mine');
  });

  it('treats a missing updatedAt as the oldest', () => {
    const local = { ...node('a', { title: 'mine' }), updatedAt: undefined };
    const remote = node('a', { title: 'theirs' });
    expect(mergeRemote([local], [remote]).nodes[0].title).toBe('theirs');
  });
});

describe('remote rows', () => {
  it('round-trips a node through the remote shape', () => {
    const n = node('a', {
      collapsed: true,
      doLast: true,
      status: 'done',
      energy: 'light',
      pinnedStartMin: 540,
      doneAt: '2026-10-22T03:00:00.000Z',
      doneDate: '2026-10-22',
      doneStartMin: 540,
      deletedAt: '2026-10-22T04:00:00.000Z',
      parentId: 'p',
    });
    expect(remoteToNode(nodeToRemote(n), 'u1')).toEqual(n);
  });

  it('normalises Postgres timestamps and unknown enums', () => {
    const row = {
      ...nodeToRemote(node('a')),
      updated_at: '2026-10-22T03:00:00+00:00',
      done_at: '2026-10-22T03:00:00+00:00',
      status: 'weird',
      energy: 'weird',
    };
    expect(remoteToNode(row, 'u1')).toMatchObject({
      updatedAt: '2026-10-22T03:00:00.000Z',
      doneAt: '2026-10-22T03:00:00.000Z',
      status: 'todo',
      energy: 'heavy',
    });
  });

  it('fills defaults for a node missing optional fields', () => {
    const bare = {
      ...node('a'),
      position: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      deletedAt: undefined,
    };
    expect(nodeToRemote(/** @type {any} */ (bare))).toMatchObject({
      position: '',
      deleted_at: null,
      created_at: '1970-01-01T00:00:00.000Z',
      updated_at: '1970-01-01T00:00:00.000Z',
    });
  });
});
