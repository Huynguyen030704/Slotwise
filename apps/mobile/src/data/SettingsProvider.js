import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSetting, setSetting } from './db';

/** @typedef {'morning' | 'afternoon'} Peak */

/**
 * @typedef {object} SettingsApi
 * @property {boolean} ready stored settings have been read
 * @property {Peak} peak
 * @property {(p: Peak) => void} setPeak
 * @property {boolean} welcomeSeen the user has already passed the welcome / sign-in screen
 * @property {() => void} markWelcomeSeen
 */

const SettingsContext = createContext(/** @type {SettingsApi | null} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export function SettingsProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [peak, setPeakState] = useState(/** @type {Peak} */ ('morning'));
  const [welcomeSeen, setWelcomeSeen] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getSetting('peak'), getSetting('welcome_seen')])
      .then(([p, w]) => {
        if (!alive) return;
        if (p === 'morning' || p === 'afternoon') setPeakState(p);
        setWelcomeSeen(w === '1');
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setPeak = useCallback((/** @type {Peak} */ p) => {
    setPeakState(p);
    setSetting('peak', p).catch(() => {});
  }, []);

  const markWelcomeSeen = useCallback(() => {
    setWelcomeSeen(true);
    setSetting('welcome_seen', '1').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ ready, peak, setPeak, welcomeSeen, markWelcomeSeen }),
    [ready, peak, setPeak, welcomeSeen, markWelcomeSeen],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
