import { act, renderHook, waitFor } from '@testing-library/react-native';
import { childrenOf, leaves } from '@slotwise/core';
import { NodesProvider, useNodes } from './NodesProvider';
import { loadNodes, saveNodes } from './db';
import { nowIso } from './time';

// A clock that moves one minute per call, so every edit gets its own timestamp.
jest.mock('./time', () => {
  let mockMinute = 0;
  return {
    ...jest.requireActual('./time'),
    nowIso: jest.fn(() => new Date(Date.UTC(2026, 9, 22, 1, ++mockMinute)).toISOString()),
  };
});

// An in-memory stand-in for the SQLite layer.
jest.mock('./db', () => {
  const mockRows = new Map();
  return {
    __rows: mockRows,
    loadNodes: jest.fn(async () => [...mockRows.values()]),
    saveNodes: jest.fn(async (nodes) => {
      for (const n of nodes) mockRows.set(n.id, n);
    }),
  };
});

const db = jest.requireMock('./db');

async function setup() {
  const hook = await renderHook(() => useNodes(), { wrapper: NodesProvider });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

const live = (nodes) => nodes.filter((n) => !n.deletedAt);

beforeEach(() => {
  db.__rows.clear();
  loadNodes.mockClear();
  saveNodes.mockClear();
});

describe('NodesProvider', () => {
  it('starts empty and ready', async () => {
    const { result } = await setup();
    expect(result.current.nodes).toEqual([]);
    expect(result.current.canUndo).toBe(false);
  });

  it('adds a group and tasks in order, and saves only what changed', async () => {
    const { result } = await setup();
    await act(async () => result.current.addGroup('  Tuần này  '));
    const group = result.current.nodes[0];
    expect(group).toMatchObject({ kind: 'group', title: 'Tuần này', parentId: null });

    await act(async () => result.current.addTask('Việc 1', group.id));
    await act(async () => result.current.addTask('Việc 2', group.id));
    await act(async () => result.current.flush());

    const kids = childrenOf(result.current.nodes, group.id);
    expect(kids.map((n) => n.title)).toEqual(['Việc 1', 'Việc 2']);
    expect(kids[0].position < kids[1].position).toBe(true);
    expect(db.__rows.size).toBe(3);
    // The last save wrote just the new task, not the whole list.
    expect(saveNodes.mock.calls.at(-1)[0]).toHaveLength(1);
  });

  it('ignores blank titles', async () => {
    const { result } = await setup();
    await act(async () => result.current.addTask('   ', null));
    await act(async () => result.current.addGroup(''));
    expect(result.current.nodes).toEqual([]);
  });

  it('ticks a task, records the day, and undo brings it back', async () => {
    const { result } = await setup();
    await act(async () => result.current.addTask('A', null));
    const id = result.current.nodes[0].id;

    await act(async () => result.current.setTaskDone(id, true, 540));
    expect(result.current.nodes[0]).toMatchObject({ status: 'done', doneStartMin: 540 });
    expect(result.current.nodes[0].doneDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.canUndo).toBe(true);

    await act(async () => result.current.undo());
    expect(result.current.nodes.find((n) => n.id === id).status).toBe('todo');
  });

  it('deletes softly and undo restores the row', async () => {
    const { result } = await setup();
    await act(async () => result.current.addTask('A', null));
    const id = result.current.nodes[0].id;
    await act(async () => result.current.remove(id));
    expect(live(result.current.nodes)).toHaveLength(0);
    expect(result.current.nodes[0].deletedAt).toBeTruthy();

    await act(async () => result.current.undo());
    expect(live(result.current.nodes)).toHaveLength(1);
  });

  it('imports notes into groups and tasks scheduled for today', async () => {
    const { result } = await setup();
    let outcome;
    await act(async () => {
      outcome = result.current.importNotes(
        '**Tuần này**\n1. Soạn báo cáo\n   - Thu số liệu\n- [x] Đã xong\n\n- *',
      );
    });
    expect(outcome.added).toBe(4);
    expect(outcome.skipped).toBe(1);
    const nodes = result.current.nodes;
    expect(nodes.filter((n) => n.kind === 'group')).toHaveLength(1);
    expect(
      leaves(nodes)
        .map((n) => n.title)
        .sort(),
    ).toEqual(['Thu số liệu', 'Đã xong']);
    const done = nodes.find((n) => n.title === 'Đã xong');
    expect(done.status).toBe('done');
    expect(nodes.filter((n) => n.kind === 'task').every((n) => n.scheduledDate)).toBe(true);
  });

  it('reports nothing added for text it cannot read', async () => {
    const { result } = await setup();
    let outcome;
    await act(async () => {
      outcome = result.current.importNotes('- *');
    });
    expect(outcome.added).toBe(0);
    expect(result.current.nodes).toEqual([]);
  });

  it('moves a task into a group as its first child', async () => {
    const { result } = await setup();
    await act(async () => result.current.addGroup('G'));
    const group = result.current.nodes[0];
    await act(async () => result.current.addTask('A', group.id));
    await act(async () => result.current.addTask('Loose', null));
    const loose = result.current.nodes.find((n) => n.title === 'Loose');

    await act(async () => result.current.move(loose.id, { kind: 'into', id: group.id }));
    expect(childrenOf(result.current.nodes, group.id).map((n) => n.title)).toEqual(['Loose', 'A']);
  });

  it('moves unfinished tasks to the next day in one step', async () => {
    const { result } = await setup();
    await act(async () => result.current.addTask('A', null));
    await act(async () => result.current.addTask('B', null));
    const today = result.current.nodes[0].scheduledDate;
    let count;
    await act(async () => {
      count = result.current.rollOver(today);
    });
    expect(count).toBe(2);
    expect(result.current.nodes.every((n) => n.scheduledDate > today)).toBe(true);
  });

  it('refresh reloads what is in the database', async () => {
    const { result } = await setup();
    db.__rows.set('x', {
      id: 'x',
      parentId: null,
      kind: 'task',
      title: 'From sync',
      position: 'V',
      status: 'todo',
      durationMin: 60,
      energy: 'heavy',
      doLast: false,
      scheduledDate: null,
      pinnedStartMin: null,
      deletedAt: null,
    });
    await act(async () => result.current.refresh());
    expect(result.current.nodes.map((n) => n.title)).toEqual(['From sync']);
    expect(result.current.canUndo).toBe(false);
  });

  it('exposes an error and can retry when the database will not open', async () => {
    loadNodes.mockRejectedValueOnce(new Error('locked'));
    const hook = await renderHook(() => useNodes(), { wrapper: NodesProvider });
    await waitFor(() => expect(hook.result.current.loadError).toBeTruthy());
    expect(hook.result.current.ready).toBe(false);

    await act(async () => hook.result.current.reload());
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    expect(hook.result.current.loadError).toBeNull();
  });

  describe('field times (field-level sync)', () => {
    const times = (n) => n.fieldTimes;

    it('stamps every group when a task is created', async () => {
      const { result } = await setup();
      await act(async () => result.current.addTask('A', null));
      const n = result.current.nodes[0];
      expect(Object.keys(times(n)).length).toBeGreaterThanOrEqual(10);
      expect(new Set(Object.values(times(n))).size).toBe(1);
      expect(db.__rows.get(n.id).fieldTimes).toEqual(times(n));
    });

    it('a rename touches only the title group', async () => {
      const { result } = await setup();
      await act(async () => result.current.addTask('A', null));
      const created = result.current.nodes[0];
      await act(async () => result.current.rename(created.id, 'B'));
      const n = result.current.nodes[0];
      expect(times(n).title).toBe(n.updatedAt);
      expect(times(n).title).not.toBe(times(created).title);
      expect(times(n).duration).toBe(times(created).duration);
      expect(times(n).place).toBe(times(created).place);
      expect(times(n).done).toBe(times(created).done);
    });

    it('finishing a task touches only the done group', async () => {
      const { result } = await setup();
      await act(async () => result.current.addTask('A', null));
      const created = result.current.nodes[0];
      await act(async () => result.current.setTaskDone(created.id, true, 540));
      const n = result.current.nodes[0];
      expect(times(n).done).toBe(n.updatedAt);
      expect(times(n).title).toBe(times(created).title);
    });

    it('moving a task touches only its place', async () => {
      const { result } = await setup();
      await act(async () => result.current.addGroup('G'));
      await act(async () => result.current.addTask('A', null));
      const group = result.current.nodes.find((x) => x.kind === 'group');
      const created = result.current.nodes.find((x) => x.kind === 'task');
      await act(async () => result.current.move(created.id, { kind: 'into', id: group.id }));
      const n = result.current.nodes.find((x) => x.id === created.id);
      expect(times(n).place).toBe(n.updatedAt);
      expect(times(n).title).toBe(times(created).title);
    });

    it('changing the duration and the pin are separate edits', async () => {
      const { result } = await setup();
      await act(async () => result.current.addTask('A', null));
      const id = result.current.nodes[0].id;
      await act(async () => result.current.update(id, { durationMin: 90 }));
      const afterDuration = result.current.nodes[0];
      await act(async () => result.current.update(id, { pinnedStartMin: 600 }));
      const n = result.current.nodes[0];
      expect(times(n).pin).toBe(n.updatedAt);
      expect(times(n).duration).toBe(times(afterDuration).duration);
      expect(times(n).duration).not.toBe(times(n).pin);
    });

    it('the clock mock is in use', () => {
      expect(nowIso).toHaveBeenCalled();
    });
  });
});
