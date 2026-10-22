import { describe, expect, it } from 'vitest';
import { addDays } from '../src/dates.js';
import { groupReport, reportToText, rollOver, taskCount, unfinishedOn } from '../src/report.js';

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
  scheduledDate: '2026-10-22',
  pinnedStartMin: 540,
  doneAt: null,
  doneDate: null,
  doneStartMin: null,
  deletedAt: null,
  ...o,
});

const nodes = [
  node('g1', { kind: 'group', position: 'a', scheduledDate: null }),
  node('a', { parentId: 'g1', position: 'a', status: 'done' }),
  node('b', { parentId: 'g1', position: 'b' }),
  node('g2', { kind: 'group', position: 'b', scheduledDate: null }),
  node('empty', { kind: 'group', position: 'c', scheduledDate: null }),
  node('c', { parentId: 'g2', position: 'a', scheduledDate: '2026-10-23' }),
  node('loose', { position: 'z' }),
];

describe('addDays', () => {
  it('crosses month, year and leap boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('groupReport', () => {
  it('reports progress per group and a bucket for ungrouped tasks', () => {
    const r = groupReport(nodes);
    expect(r.map((x) => [x.title, x.done, x.total])).toEqual([
      ['g1', 1, 2],
      ['g2', 0, 1],
      [null, 0, 1],
    ]);
    expect(r[0]).toMatchObject({ doneTitles: ['a'], todoTitles: ['b'] });
  });

  it('omits the ungrouped bucket when there are none', () => {
    expect(groupReport(nodes.filter((n) => n.id !== 'loose')).map((x) => x.title)).toEqual([
      'g1',
      'g2',
    ]);
  });
});

describe('reportToText', () => {
  it('formats groups with done and open tasks', () => {
    const text = reportToText(groupReport(nodes), {
      heading: 'Report',
      noGroup: 'Other',
    });
    expect(text).toBe(
      [
        'Report',
        '',
        'g1: 1/2',
        '  ✓ a',
        '  ○ b',
        '',
        'g2: 0/1',
        '  ○ c',
        '',
        'Other: 0/1',
        '  ○ loose',
      ].join('\n'),
    );
  });
});

describe('rollOver', () => {
  it('lists unfinished tasks of a date', () => {
    expect(unfinishedOn(nodes, '2026-10-22').map((n) => n.id)).toEqual(['b', 'loose']);
  });

  it('moves them to the next day and unpins them', () => {
    const { nodes: next, count } = rollOver(nodes, '2026-10-22', 'T');
    expect(count).toBe(2);
    const b = /** @type {import('../src/types.js').TreeNode} */ (next.find((n) => n.id === 'b'));
    expect(b).toMatchObject({ scheduledDate: '2026-10-23', pinnedStartMin: null, updatedAt: 'T' });
    expect(next.find((n) => n.id === 'a')).toBe(nodes.find((n) => n.id === 'a'));
  });

  it('returns the same array when nothing is open', () => {
    const r = rollOver(nodes, '2030-01-01', 'T');
    expect(r.count).toBe(0);
    expect(r.nodes).toBe(nodes);
  });
});

describe('taskCount', () => {
  it('counts live tasks only', () => {
    expect(taskCount(nodes)).toBe(4);
    expect(taskCount([node('x', { deletedAt: 'd' })])).toBe(0);
  });
});
