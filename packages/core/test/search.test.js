import { describe, expect, it } from 'vitest';
import { expandAncestors, isDone, setAllCollapsed } from '../src/tree.js';
import { fold, searchRows } from '../src/search.js';

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

const ids = (/** @type {{ node: { id: string } }[]} */ rows) => rows.map((r) => r.node.id);

describe('fold', () => {
  it('drops accents, đ and case', () => {
    expect(fold('Báo CÁO Đặt hàng')).toBe('bao cao dat hang');
    expect(fold('ĐƯỜNG')).toBe('duong');
  });
});

describe('searchRows', () => {
  const tree = [
    node('g1', { kind: 'group', title: 'Dự án Alpha', position: 'a' }),
    node('t1', { parentId: 'g1', title: 'Soạn báo cáo tuần', position: 'a' }),
    node('t2', { parentId: 'g1', title: 'Gọi khách', position: 'b', note: 'Hỏi về báo giá' }),
    node('g2', { kind: 'group', title: 'Dự án Beta', position: 'b', collapsed: true }),
    node('t3', { parentId: 'g2', title: 'Thiết kế logo', position: 'a' }),
    node('t4', { parentId: 't3', title: 'Chọn màu', position: 'a', status: 'done' }),
    node('gone', { parentId: 'g2', title: 'Đã xóa báo cáo', position: 'b', deletedAt: 'd' }),
  ];

  it('returns nothing for an empty query', () => {
    expect(searchRows(tree, '')).toEqual([]);
    expect(searchRows(tree, '   ')).toEqual([]);
  });

  it('finds titles ignoring accents and case, keeping the groups above', () => {
    expect(ids(searchRows(tree, 'BAO CAO'))).toEqual(['g1', 't1']);
  });

  it('also looks in the note', () => {
    expect(ids(searchRows(tree, 'bao gia'))).toEqual(['g1', 't2']);
  });

  it('needs every word to match, in any order', () => {
    expect(ids(searchRows(tree, 'tuan bao'))).toEqual(['g1', 't1']);
    expect(searchRows(tree, 'tuan logo')).toEqual([]);
  });

  it('opens collapsed groups and parents so the match is visible, with its depth', () => {
    const rows = searchRows(tree, 'chon mau');
    expect(ids(rows)).toEqual(['g2', 't3', 't4']);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2]);
    expect(rows[1].hasChildren).toBe(true);
    expect(rows[2].hasChildren).toBe(false);
  });

  it('shows a matching group on its own, not everything inside it', () => {
    expect(ids(searchRows(tree, 'alpha'))).toEqual(['g1']);
  });

  it('ignores deleted nodes', () => {
    expect(ids(searchRows(tree, 'da xoa'))).toEqual([]);
  });

  it('can leave out done tasks like the normal list does', () => {
    const done = (/** @type {import('../src/types.js').TreeNode} */ n) => isDone(tree, n);
    expect(ids(searchRows(tree, 'chon mau', { hideDone: true, isDone: done }))).toEqual([]);
    expect(ids(searchRows(tree, 'logo', { hideDone: true, isDone: done }))).toEqual([]); // t3 is done: its only subtask is
    expect(ids(searchRows(tree, 'goi khach', { hideDone: true, isDone: done }))).toEqual([
      'g1',
      't2',
    ]);
    expect(ids(searchRows(tree, 'chon mau', { hideDone: true }))).toEqual(['g2', 't3', 't4']);
  });
});

describe('setAllCollapsed', () => {
  const tree = [
    node('g', { kind: 'group', position: 'a' }),
    node('a', { parentId: 'g', position: 'a' }),
    node('a1', { parentId: 'a', position: 'a' }),
    node('leaf', { parentId: 'g', position: 'b' }),
    node('g2', { kind: 'group', position: 'b', collapsed: true }),
    node('g2c', { parentId: 'g2', position: 'a' }),
    node('lone', { kind: 'group', position: 'c' }),
    node('gone', { parentId: 'lone', position: 'a', deletedAt: 'd' }),
  ];

  it('collapses every node that has children and leaves the others alone', () => {
    const next = setAllCollapsed(tree, true, 'T');
    const get = (/** @type {string} */ id) => next.find((n) => n.id === id);
    expect(get('g')).toMatchObject({ collapsed: true, updatedAt: 'T' });
    expect(get('a')).toMatchObject({ collapsed: true, updatedAt: 'T' });
    expect(get('leaf')).toBe(tree.find((n) => n.id === 'leaf'));
    expect(get('lone')).toBe(tree.find((n) => n.id === 'lone')); // only a deleted child
    expect(get('g2')).toBe(tree.find((n) => n.id === 'g2')); // already collapsed
  });

  it('expands them again', () => {
    const next = setAllCollapsed(setAllCollapsed(tree, true, 'T'), false, 'U');
    expect(next.filter((n) => n.collapsed)).toEqual([]);
  });
});

describe('expandAncestors', () => {
  const tree = [
    node('g', { kind: 'group', collapsed: true }),
    node('a', { parentId: 'g', collapsed: true }),
    node('b', { parentId: 'a' }),
    node('other', { kind: 'group', collapsed: true }),
  ];

  it('opens every collapsed node above the target and nothing else', () => {
    const next = expandAncestors(tree, 'b', 'T');
    expect(next.find((n) => n.id === 'g')).toMatchObject({ collapsed: false, updatedAt: 'T' });
    expect(next.find((n) => n.id === 'a')).toMatchObject({ collapsed: false, updatedAt: 'T' });
    expect(next.find((n) => n.id === 'other')?.collapsed).toBe(true);
  });

  it('returns the same array when there is nothing to open or the id is unknown', () => {
    expect(expandAncestors(tree, 'g', 'T')).toBe(tree);
    expect(expandAncestors(tree, 'missing', 'T')).toBe(tree);
    const open = tree.map((n) => ({ ...n, collapsed: false }));
    expect(expandAncestors(open, 'b', 'T')).toBe(open);
  });
});
