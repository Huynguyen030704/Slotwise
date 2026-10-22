import { describe, expect, it } from 'vitest';
import { nodeToRow, rowToNode } from '../src/nodeRows.js';

/** @type {import('../src/types.js').TreeNode} */
const full = {
  id: 'a',
  userId: 'u1',
  parentId: 'p',
  kind: 'task',
  title: 'Viết báo cáo',
  position: 'V',
  collapsed: true,
  status: 'done',
  durationMin: 90,
  energy: 'light',
  doLast: true,
  scheduledDate: '2026-10-22',
  pinnedStartMin: 540,
  doneAt: '2026-10-22T03:00:00.000Z',
  doneDate: '2026-10-22',
  doneStartMin: 540,
  createdAt: 'c',
  updatedAt: 'u',
  deletedAt: 'd',
};

describe('node rows', () => {
  it('round-trips a full node', () => {
    expect(rowToNode(nodeToRow(full))).toEqual(full);
  });

  it('stores booleans as 0/1', () => {
    const row = nodeToRow(full);
    expect(row.collapsed).toBe(1);
    expect(row.do_last).toBe(1);
    expect(nodeToRow({ ...full, collapsed: false, doLast: false })).toMatchObject({
      collapsed: 0,
      do_last: 0,
    });
  });

  it('fills defaults for optional fields', () => {
    const row = nodeToRow({
      ...full,
      userId: undefined,
      position: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      deletedAt: undefined,
    });
    expect(row).toMatchObject({
      user_id: 'local',
      position: '',
      created_at: '',
      updated_at: '',
      deleted_at: null,
    });
  });

  it('falls back to safe values for unknown enum text', () => {
    const row = { ...nodeToRow(full), status: 'weird', energy: 'weird' };
    expect(rowToNode(row)).toMatchObject({ status: 'todo', energy: 'heavy' });
  });
});
