import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { NodesProvider } from '../../data/NodesProvider';
import { SettingsProvider } from '../../data/SettingsProvider';
import { localDate } from '../../data/time';
import { renderThemed } from '../../test/render';
import { ListPane } from './ListPane';

jest.mock('../../data/db', () => {
  const mockRows = new Map();
  const mockStore = new Map();
  return {
    __rows: mockRows,
    __store: mockStore,
    loadNodes: jest.fn(async () => [...mockRows.values()]),
    saveNodes: jest.fn(async (nodes) => {
      for (const n of nodes) mockRows.set(n.id, n);
    }),
    getSetting: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setSetting: jest.fn(async (k, v) => {
      mockStore.set(k, v);
    }),
  };
});

const db = jest.requireMock('../../data/db');
const today = localDate();

const node = (id, title, o = {}) => ({
  id,
  userId: 'local',
  parentId: null,
  kind: 'task',
  title,
  position: id,
  collapsed: false,
  status: 'todo',
  durationMin: 60,
  energy: 'heavy',
  doLast: false,
  scheduledDate: today,
  pinnedStartMin: null,
  doneAt: null,
  doneDate: null,
  doneStartMin: null,
  deletedAt: null,
  ...o,
});

async function open(rows = [], settings = {}) {
  db.__rows.clear();
  db.__store.clear();
  for (const r of rows) db.__rows.set(r.id, r);
  for (const [k, v] of Object.entries(settings)) db.__store.set(k, v);
  await renderThemed(
    <SettingsProvider>
      <NodesProvider>
        <ListPane embedded />
      </NodesProvider>
    </SettingsProvider>,
  );
  await waitFor(() => expect(screen.queryByLabelText('loading')).toBeNull());
}

const addBox = () => screen.getByLabelText('Thêm việc mới');

describe('ListPane', () => {
  it('invites the first task when empty', async () => {
    await open();
    expect(screen.getByText('Bắt đầu bằng việc đầu tiên của bạn')).toBeTruthy();
  });

  it('adds a task by typing and pressing Enter, then clears the box', async () => {
    await open();
    await fireEvent.changeText(addBox(), 'Soạn báo cáo');
    await fireEvent(addBox(), 'submitEditing');
    await waitFor(() => expect(screen.getByText('Soạn báo cáo')).toBeTruthy());
    expect(addBox().props.value).toBe('');
    expect([...db.__rows.values()].map((n) => n.title)).toContain('Soạn báo cáo');
  });

  it('adds under the group picked in the chips', async () => {
    await open([node('g', 'Nhóm A', { kind: 'group', scheduledDate: null })]);
    await fireEvent.press(screen.getByRole('radio', { name: 'Nhóm A' }));
    await fireEvent.changeText(addBox(), 'Việc con');
    await fireEvent(addBox(), 'submitEditing');
    await waitFor(() => expect(screen.getByText('Việc con')).toBeTruthy());
    const added = [...db.__rows.values()].find((n) => n.title === 'Việc con');
    expect(added.parentId).toBe('g');
  });

  it('shows group progress and updates it when a task is ticked', async () => {
    await open([
      node('g', 'Nhóm A', { kind: 'group', scheduledDate: null }),
      node('a', 'Việc 1', { parentId: 'g' }),
      node('b', 'Việc 2', { parentId: 'g' }),
    ]);
    expect(screen.getByText('0/2 việc')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Đánh dấu xong “Việc 1”/ }));
    await waitFor(() => expect(screen.getByText('1/2 việc')).toBeTruthy());
  });

  it('collapsing a group hides its tasks', async () => {
    await open([
      node('g', 'Nhóm A', { kind: 'group', scheduledDate: null }),
      node('a', 'Việc 1', { parentId: 'g' }),
    ]);
    expect(screen.getByText('Việc 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Thu gọn “Nhóm A”' }));
    await waitFor(() => expect(screen.queryByText('Việc 1')).toBeNull());
  });

  it('renames a task from its menu', async () => {
    await open([node('a', 'Tên cũ')]);
    await fireEvent.press(screen.getByRole('button', { name: /Thao tác với “Tên cũ”/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Đổi tên' }));
    const input = await screen.findByLabelText('Đổi tên');
    await fireEvent.changeText(input, 'Tên mới');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(db.__rows.get('a').title).toBe('Tên mới'));
  });

  it('delete shows an undo that restores the task', async () => {
    await open([node('a', 'Xóa thử')]);
    await fireEvent.press(screen.getByRole('button', { name: /Thao tác với “Xóa thử”/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(screen.queryByText('Xóa thử')).toBeNull());
    await fireEvent.press(screen.getByRole('button', { name: 'Hoàn tác' }));
    await waitFor(() => expect(screen.getByText('Xóa thử')).toBeTruthy());
  });

  it('offers move up and move down as the keyboard alternative to dragging', async () => {
    await open([node('a', 'Một'), node('b', 'Hai')]);
    await fireEvent.press(screen.getByRole('button', { name: /Thao tác với “Hai”/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Đưa lên trên' }));
    await waitFor(() =>
      expect(db.__rows.get('b').position < db.__rows.get('a').position).toBe(true),
    );
  });

  it('shows time details in clock mode but not in tasks mode', async () => {
    await open([node('a', 'Việc có giờ')]);
    expect(screen.getByText(/Cần tập trung · 1 giờ/)).toBeTruthy();
  });

  it('hides time details and clock actions in tasks mode', async () => {
    await open([node('a', 'Việc không giờ')], { day_settings: JSON.stringify({ mode: 'tasks' }) });
    expect(screen.queryByText(/Cần tập trung · 1 giờ/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /Thao tác với “Việc không giờ”/ }));
    await screen.findByRole('button', { name: 'Đổi tên' });
    expect(screen.queryByRole('button', { name: 'Ghim vào giờ…' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Sửa thời lượng/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Để sau' })).toBeTruthy();
  });

  describe('task notes', () => {
    it('shows a note under the task and nothing for a task without one', async () => {
      await open([
        node('a', 'Việc có ghi chú', { note: 'Gọi khách trước' }),
        node('b', 'Việc trơn'),
      ]);
      expect(screen.getByText('Gọi khách trước')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: /Sửa ghi chú của/ })).toHaveLength(1);
    });

    it('adds a note from the actions menu and saves it', async () => {
      await open([node('a', 'Việc A')]);
      await fireEvent.press(screen.getByRole('button', { name: /Thao tác với “Việc A”/ }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Thêm ghi chú' }));
      await fireEvent.changeText(await screen.findByLabelText('Ghi chú'), '  Hỏi lại kế toán  ');
      await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));
      await waitFor(() => expect(screen.getByText('Hỏi lại kế toán')).toBeTruthy());
      await waitFor(() => expect(db.__rows.get('a').note).toBe('Hỏi lại kế toán'));
    });

    it('edits and deletes an existing note', async () => {
      await open([node('a', 'Việc A', { note: 'Bản cũ' })]);
      await fireEvent.press(screen.getByRole('button', { name: /Sửa ghi chú của “Việc A”/ }));
      await fireEvent.changeText(await screen.findByLabelText('Ghi chú'), 'Bản mới');
      await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));
      await waitFor(() => expect(screen.getByText('Bản mới')).toBeTruthy());

      await fireEvent.press(screen.getByRole('button', { name: /Sửa ghi chú của “Việc A”/ }));
      await fireEvent.press(await screen.findByRole('button', { name: 'Xóa ghi chú' }));
      await waitFor(() => expect(screen.queryByText('Bản mới')).toBeNull());
      await waitFor(() => expect(db.__rows.get('a').note).toBe(''));
    });
  });
});
