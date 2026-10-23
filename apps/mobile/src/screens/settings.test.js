import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SettingsProvider } from '../data/SettingsProvider';
import { renderThemed } from '../test/render';
import SettingsScreen from '../../app/settings';

jest.mock('../data/db', () => {
  const mockStore = new Map();
  return {
    __store: mockStore,
    getSetting: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setSetting: jest.fn(async (k, v) => {
      mockStore.set(k, v);
    }),
  };
});

const db = jest.requireMock('../data/db');
const saved = () => JSON.parse(db.__store.get('day_settings'));

async function open() {
  db.__store.clear();
  await renderThemed(
    <SettingsProvider>
      <SettingsScreen />
    </SettingsProvider>,
  );
  await screen.findByText('Giờ làm việc');
}

describe('Settings screen', () => {
  it('shows the default hours, sharp half and lunch block', async () => {
    await open();
    expect(screen.getByLabelText('Bắt đầu 08:00')).toBeTruthy();
    expect(screen.getByLabelText('Kết thúc 18:00')).toBeTruthy();
    expect(screen.getByText('Nghỉ trưa')).toBeTruthy();
    expect(screen.getByText(/08:00–12:00/)).toBeTruthy();
  });

  it('moves the start of the working day in 15 and 60 minute steps and saves it', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu +60' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu +15' }));
    await waitFor(() => expect(saved().workStartMin).toBe(555));
    expect(screen.getByLabelText('Bắt đầu 09:15')).toBeTruthy();
  });

  it('will not let the day get shorter than two hours', async () => {
    await open();
    for (let i = 0; i < 12; i++) {
      await fireEvent.press(screen.getByRole('button', { name: 'Kết thúc -60' }));
    }
    await waitFor(() => {
      const s = saved();
      expect(s.workEndMin - s.workStartMin).toBeGreaterThanOrEqual(120);
    });
  });

  it('switches the sharp half of the day', async () => {
    await open();
    await fireEvent.press(screen.getByRole('radio', { name: 'Chiều' }));
    await waitFor(() => expect(saved().peak).toBe('afternoon'));
    expect(screen.getByText(/13:00–17:00/)).toBeTruthy();
  });

  it('adds a recurring block with a name', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Thêm khung giờ' }));
    await fireEvent.changeText(
      await screen.findByLabelText('Tên (không bắt buộc)'),
      'Họp giao ban',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(screen.getByText('Họp giao ban')).toBeTruthy());
    expect(saved().fixedBlocks.map((b) => b.label)).toContain('Họp giao ban');
  });

  it('deleting a block can be undone', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Xóa “Nghỉ trưa”' }));
    await waitFor(() => expect(screen.queryByText('Nghỉ trưa')).toBeNull());
    await fireEvent.press(screen.getByRole('button', { name: 'Hoàn tác' }));
    await waitFor(() => expect(screen.getByText('Nghỉ trưa')).toBeTruthy());
  });

  it('tasks mode hides the clock settings and explains why', async () => {
    await open();
    await fireEvent.press(screen.getByRole('radio', { name: /Chỉ quản lý việc/ }));
    await waitFor(() => expect(screen.queryByText('Giờ làm việc')).toBeNull());
    expect(screen.getByText(/chỉ dùng khi xếp việc theo giờ/)).toBeTruthy();
    expect(saved().mode).toBe('tasks');

    await fireEvent.press(screen.getByRole('radio', { name: /Xếp việc theo giờ/ }));
    await waitFor(() => expect(screen.getByText('Giờ làm việc')).toBeTruthy());
  });
});
