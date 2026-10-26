import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_SETTINGS, effectiveMode, normalizeSettings } from '@slotwise/core';
import { getSetting, setSetting } from './db';

/** @typedef {import('@slotwise/core/settings.js').DaySettings} DaySettings */
/** @typedef {'morning' | 'afternoon'} Peak */

/**
 * @typedef {object} SettingsApi
 * @property {boolean} ready stored settings have been read
 * @property {DaySettings} settings working hours, sharp half of the day, recurring blocks
 * @property {boolean} dirty edited on this device and not yet pushed to the account
 * @property {(patch: Partial<Omit<DaySettings, 'updatedAt'>>) => void} update validate, save, mark for sync
 * @property {(remote: DaySettings) => void} applyRemote take the account's copy (after a sync)
 * @property {() => void} markClean the account now has this device's copy
 * @property {import('@slotwise/core/settings.js').UsageMode} mode the mode in effect (timeline until the person chooses)
 * @property {(m: import('@slotwise/core/settings.js').UsageMode) => void} presetMode remember a choice made before signing in (welcome screen); an account's own mode still wins
 * @property {Peak} peak shortcut for settings.peak
 * @property {(p: Peak) => void} setPeak
 * @property {boolean} welcomeSeen the user has already passed the welcome / sign-in screen
 * @property {() => void} markWelcomeSeen
 * @property {boolean} hideDone tasks that are done are hidden in the lists (this device only, not synced)
 * @property {(hide: boolean) => void} setHideDone
 */

const SettingsContext = createContext(/** @type {SettingsApi | null} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export function SettingsProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(/** @type {DaySettings} */ (DEFAULT_SETTINGS));
  const [dirty, setDirty] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [hideDone, setHideDoneState] = useState(false);
  const latest = useRef(settings);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getSetting('day_settings'),
      getSetting('day_settings_dirty'),
      getSetting('peak'),
      getSetting('welcome_seen'),
      getSetting('hide_done'),
    ])
      .then(([stored, storedDirty, legacyPeak, welcome, hidden]) => {
        if (!alive) return;
        let parsed = null;
        try {
          parsed = stored ? JSON.parse(stored) : null;
        } catch {
          parsed = null;
        }
        // Before settings existed only the sharp half of the day was stored, under "peak".
        const base = parsed ?? (legacyPeak ? { peak: legacyPeak } : null);
        const next = normalizeSettings(base);
        latest.current = next;
        setSettings(next);
        dirtyRef.current = storedDirty === '1';
        setDirty(storedDirty === '1');
        setWelcomeSeen(welcome === '1');
        setHideDoneState(hidden === '1');
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const store = useCallback((/** @type {DaySettings} */ next, /** @type {boolean} */ isDirty) => {
    latest.current = next;
    dirtyRef.current = isDirty;
    setSettings(next);
    setDirty(isDirty);
    setSetting('day_settings', JSON.stringify(next)).catch(() => {});
    setSetting('day_settings_dirty', isDirty ? '1' : '0').catch(() => {});
  }, []);

  const update = useCallback(
    (/** @type {Partial<Omit<DaySettings, 'updatedAt'>>} */ patch) => {
      const next = normalizeSettings({
        ...latest.current,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      store(next, true);
    },
    [store],
  );

  const applyRemote = useCallback(
    (/** @type {DaySettings} */ remote) => store(normalizeSettings(remote), false),
    [store],
  );

  const markClean = useCallback(() => store(latest.current, false), [store]);

  // A first choice is kept as is: no new timestamp and no dirty flag, so signing in to an account
  // that already has a mode lets the account win, while a brand new account adopts this choice.
  const presetMode = useCallback(
    (/** @type {import('@slotwise/core/settings.js').UsageMode} */ m) => {
      store({ ...latest.current, mode: m }, dirtyRef.current);
    },
    [store],
  );

  const setPeak = useCallback((/** @type {Peak} */ p) => update({ peak: p }), [update]);

  const markWelcomeSeen = useCallback(() => {
    setWelcomeSeen(true);
    setSetting('welcome_seen', '1').catch(() => {});
  }, []);

  const setHideDone = useCallback((/** @type {boolean} */ hide) => {
    setHideDoneState(hide);
    setSetting('hide_done', hide ? '1' : '0').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      ready,
      settings,
      dirty,
      update,
      applyRemote,
      markClean,
      mode: effectiveMode(settings),
      presetMode,
      peak: settings.peak,
      setPeak,
      welcomeSeen,
      markWelcomeSeen,
      hideDone,
      setHideDone,
    }),
    [
      ready,
      settings,
      dirty,
      update,
      applyRemote,
      markClean,
      presetMode,
      setPeak,
      welcomeSeen,
      markWelcomeSeen,
      hideDone,
      setHideDone,
    ],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
