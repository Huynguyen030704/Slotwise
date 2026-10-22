import { describe, expect, it } from 'vitest';
import { taskBuckets } from '../src/buckets.js';

/**
 * @param {string} id
 * @param {Partial<import('../src/types.js').TreeNode>} [o]
 * @returns {import('../src/types.js').TreeNode}
 */
const task = (id, o = {}) => ({
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
  scheduledDate: '2026-10-22',
  pinnedStartMin: null,
  doneAt: null,
  doneDate: null,
  doneStartMin: null,
  deletedAt: null,
  ...o,
});

describe('taskBuckets', () => {
  const nodes = [
    task('a'),
    task('late', { scheduledDate: '2026-10-20' }),
    task('b', { scheduledDate: '2026-10-23' }),
    task('c', { scheduledDate: '2026-10-30' }),
    task('none', { scheduledDate: null }),
    task('d', { status: 'done', doneDate: '2026-10-22' }),
    task('old', { status: 'done', doneDate: '2026-10-20' }),
    task('p'),
    task('child', { parentId: 'p', scheduledDate: '2026-10-23' }),
    { ...task('g'), kind: /** @type {const} */ ('group'), scheduledDate: null },
  ];

  it('splits open tasks into today, tomorrow and later in tree order', () => {
    const r = taskBuckets(nodes, '2026-10-22');
    expect(r.today.map((n) => n.id)).toEqual(['a', 'late']);
    expect(r.tomorrow.map((n) => n.id)).toEqual(['b', 'child']);
    expect(r.later.map((n) => n.id)).toEqual(['c', 'none']);
  });

  it('keeps finished tasks of today only, and ignores parents and groups', () => {
    const r = taskBuckets(nodes, '2026-10-22');
    expect(r.doneToday.map((n) => n.id)).toEqual(['d']);
    const all = [...r.today, ...r.tomorrow, ...r.later, ...r.doneToday].map((n) => n.id);
    expect(all).not.toContain('p');
    expect(all).not.toContain('g');
  });

  it('moves with the date', () => {
    const r = taskBuckets(nodes, '2026-10-23');
    expect(r.today.map((n) => n.id)).toEqual(['a', 'b', 'late', 'child']);
    expect(r.tomorrow).toEqual([]);
  });
});
