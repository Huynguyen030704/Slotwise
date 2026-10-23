import { act, renderHook, waitFor } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from './SettingsProvider';

jest.mock('./db', () => {
  const mockStore = new Map();
  return {
    __store: mockStore,
    getSetting: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setSetting: jest.fn(async (k, v) => {
      mockStore.set(k, v);
    }),
  };
});

const db = jest.requireMock('./db');

async function setup() {
  const hook = await renderHook(() => useSettings(), { wrapper: SettingsProvider });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(() => db.__store.clear());

describe('SettingsProvider', () => {
  it('starts with the defaults: timeline mode, 08:00-18:00, lunch', async () => {
    const { result } = await setup();
    expect(result.current.mode).toBe('schedule');
    expect(result.current.settings).toMatchObject({
      workStartMin: 480,
      workEndMin: 1080,
      mode: null,
    });
    expect(result.current.settings.fixedBlocks).toHaveLength(1);
    expect(result.current.dirty).toBe(false);
    expect(result.current.welcomeSeen).toBe(false);
  });

  it('an edit is validated, stamped, saved and marked for sync', async () => {
    const { result } = await setup();
    await act(async () => result.current.update({ workStartMin: 543, mode: 'tasks' }));
    expect(result.current.settings.workStartMin).toBe(540);
    expect(result.current.mode).toBe('tasks');
    expect(result.current.settings.updatedAt).toBeTruthy();
    expect(result.current.dirty).toBe(true);
    expect(JSON.parse(db.__store.get('day_settings')).workStartMin).toBe(540);
    expect(db.__store.get('day_settings_dirty')).toBe('1');
  });

  it('repairs impossible hours instead of storing them', async () => {
    const { result } = await setup();
    await act(async () => result.current.update({ workStartMin: 600, workEndMin: 630 }));
    const { workStartMin, workEndMin } = result.current.settings;
    expect(workEndMin - workStartMin).toBeGreaterThanOrEqual(120);
  });

  it('keeps edits across a restart', async () => {
    const first = await setup();
    await act(async () => first.result.current.update({ peak: 'afternoon' }));
    const second = await setup();
    expect(second.result.current.peak).toBe('afternoon');
    expect(second.result.current.dirty).toBe(true);
  });

  it('reads the old "peak" key from before settings existed', async () => {
    db.__store.set('peak', 'afternoon');
    const { result } = await setup();
    expect(result.current.peak).toBe('afternoon');
  });

  it('a mode picked before sign-up is kept without becoming an unpushed edit', async () => {
    const { result } = await setup();
    await act(async () => result.current.presetMode('tasks'));
    expect(result.current.mode).toBe('tasks');
    expect(result.current.dirty).toBe(false);
    expect(result.current.settings.updatedAt).toBeNull();
  });

  it('takes the account copy and then counts as synced', async () => {
    const { result } = await setup();
    await act(async () => result.current.update({ peak: 'afternoon' }));
    await act(async () =>
      result.current.applyRemote({
        workStartMin: 540,
        workEndMin: 1020,
        peak: 'morning',
        fixedBlocks: [],
        mode: 'tasks',
        updatedAt: '2026-10-22T05:00:00.000Z',
      }),
    );
    expect(result.current.settings).toMatchObject({
      workStartMin: 540,
      peak: 'morning',
      mode: 'tasks',
    });
    expect(result.current.dirty).toBe(false);
  });

  it('marks clean after a push', async () => {
    const { result } = await setup();
    await act(async () => result.current.update({ peak: 'afternoon' }));
    await act(async () => result.current.markClean());
    expect(result.current.dirty).toBe(false);
    expect(result.current.peak).toBe('afternoon');
  });

  it('remembers that the welcome screen was passed', async () => {
    const { result } = await setup();
    await act(async () => result.current.markWelcomeSeen());
    expect(result.current.welcomeSeen).toBe(true);
    expect(db.__store.get('welcome_seen')).toBe('1');
  });
});
