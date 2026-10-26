import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { NodesProvider } from '../../data/NodesProvider';
import { SettingsProvider } from '../../data/SettingsProvider';
import { localDate } from '../../data/time';
import { addDays } from '../../lib/dates';
import { renderThemed } from '../../test/render';
import { TodayPane } from './TodayPane';

jest.mock('../../data/db', () => {
  const mockRows = new Map();
  const mockStore = new Map();
  return {
    __rows: mockRows,
    __store: mockStore,
    getSetting: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setSetting: jest.fn(async (k, v) => {
      mockStore.set(k, v);
    }),
    loadNodes: jest.fn(async () => [...mockRows.values()]),
    saveNodes: jest.fn(async (nodes) => {
      for (const n of nodes) mockRows.set(n.id, n);
    }),
  };
});

const db = jest.requireMock('../../data/db');
const today = localDate();

const task = (id, title, o = {}) => ({
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

async function open(rows) {
  db.__rows.clear();
  db.__store.clear();
  for (const r of rows) db.__rows.set(r.id, r);
  await renderThemed(
    <SettingsProvider>
      <NodesProvider>
        <TodayPane embedded />
      </NodesProvider>
    </SettingsProvider>,
  );
  await waitFor(() => expect(screen.getByText('Việc hôm nay')).toBeTruthy());
}

const section = (name) => screen.getByRole('header', { name });

describe('TodayPane (tasks mode)', () => {
  it('shows an invitation when there is nothing to do', async () => {
    db.__rows.clear();
    db.__store.clear();
    await renderThemed(
      <SettingsProvider>
        <NodesProvider>
          <TodayPane embedded />
        </NodesProvider>
      </SettingsProvider>,
    );
    await waitFor(() => expect(screen.getByText(/Hôm nay chưa có việc nào/)).toBeTruthy());
  });

  it('puts tasks under Today, Tomorrow and Later and finished ones under Done', async () => {
    await open([
      task('a', 'Việc hôm nay'),
      task('late', 'Việc trễ', { scheduledDate: addDays(today, -2) }),
      task('b', 'Việc ngày mai', { scheduledDate: addDays(today, 1) }),
      task('c', 'Việc sau này', { scheduledDate: null }),
      task('d', 'Việc đã xong', { status: 'done', doneDate: today }),
    ]);
    for (const name of ['Đã xong hôm nay', 'Ngày mai', 'Sau này']) {
      expect(section(name)).toBeTruthy();
    }
    expect(screen.getAllByRole('header', { name: 'Hôm nay' })).toHaveLength(2);
    expect(screen.getByText('Việc trễ')).toBeTruthy();
    expect(screen.getByText('Việc ngày mai')).toBeTruthy();
    expect(screen.getByText('Việc sau này')).toBeTruthy();
    expect(screen.getByText('Việc đã xong')).toBeTruthy();
  });

  it('ticking a task moves it to Done today', async () => {
    await open([task('a', 'Việc hôm nay'), task('x', 'Việc khác')]);
    await fireEvent.press(screen.getByRole('checkbox', { name: /Đánh dấu xong “Việc hôm nay”/ }));
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: /Bỏ đánh dấu xong “Việc hôm nay”/ }),
      ).toBeTruthy(),
    );
  });

  it('offers "Làm hôm nay" for a task planned for tomorrow and moves it', async () => {
    await open([
      task('a', 'Việc hôm nay'),
      task('b', 'Việc ngày mai', { scheduledDate: addDays(today, 1) }),
    ]);
    await fireEvent.press(screen.getByRole('button', { name: /Thao tác với “Việc ngày mai”/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Làm hôm nay' }));
    await waitFor(() => {
      const row = db.__rows.get('b');
      expect(row.scheduledDate).toBe(today);
    });
  });

  it('"Để sau" clears the planned day and "Dời sang ngày mai" is hidden when already tomorrow', async () => {
    await open([
      task('a', 'Việc hôm nay'),
      task('b', 'Việc ngày mai', { scheduledDate: addDays(today, 1) }),
    ]);
    await fireEvent.press(screen.getByRole('button', { name: /Thao tác với “Việc ngày mai”/ }));
    expect(screen.queryByRole('button', { name: 'Dời sang ngày mai' })).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: 'Để sau' }));
    await waitFor(() => expect(db.__rows.get('b').scheduledDate).toBeNull());
  });

  it('deleting a task offers undo', async () => {
    await open([task('a', 'Việc hôm nay')]);
    await fireEvent.press(screen.getByRole('button', { name: /Thao tác với “Việc hôm nay”/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(screen.getByText(/Đã xóa “Việc hôm nay”/)).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Hoàn tác' }));
    await waitFor(() => expect(screen.getByText('Việc hôm nay')).toBeTruthy());
  });

  it('hides the finished tasks with the toggle and shows them again', async () => {
    await open([
      task('a', 'Việc hôm nay'),
      task('d', 'Việc đã xong', { status: 'done', doneDate: today }),
    ]);
    expect(screen.getByText('Việc đã xong')).toBeTruthy();
    await fireEvent.press(screen.getByRole('switch', { name: 'Ẩn 1 việc đã xong' }));
    await waitFor(() => expect(screen.queryByText('Việc đã xong')).toBeNull());
    expect(screen.getByText('Việc hôm nay')).toBeTruthy();
    expect(db.__store.get('hide_done')).toBe('1');
    await fireEvent.press(screen.getByRole('switch', { name: 'Hiện 1 việc đã xong' }));
    await waitFor(() => expect(screen.getByText('Việc đã xong')).toBeTruthy());
    expect(db.__store.get('hide_done')).toBe('0');
  });
});
