import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_SETTINGS, normalizeSettings } from '@slotwise/core';
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
 * @property {Peak} peak shortcut for settings.peak
 * @property {(p: Peak) => void} setPeak
 * @property {boolean} welcomeSeen the user has already passed the welcome / sign-in screen
 * @property {() => void} markWelcomeSeen
 */

const SettingsContext = createContext(/** @type {SettingsApi | null} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export function SettingsProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(/** @type {DaySettings} */ (DEFAULT_SETTINGS));
  const [dirty, setDirty] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const latest = useRef(settings);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getSetting('day_settings'),
      getSetting('day_settings_dirty'),
      getSetting('peak'),
      getSetting('welcome_seen'),
    ])
      .then(([stored, storedDirty, legacyPeak, welcome]) => {
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
        setDirty(storedDirty === '1');
        setWelcomeSeen(welcome === '1');
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

  const setPeak = useCallback((/** @type {Peak} */ p) => update({ peak: p }), [update]);

  const markWelcomeSeen = useCallback(() => {
    setWelcomeSeen(true);
    setSetting('welcome_seen', '1').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      ready,
      settings,
      dirty,
      update,
      applyRemote,
      markClean,
      peak: settings.peak,
      setPeak,
      welcomeSeen,
      markWelcomeSeen,
    }),
    [ready, settings, dirty, update, applyRemote, markClean, setPeak, welcomeSeen, markWelcomeSeen],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
