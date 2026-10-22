import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSetting, setSetting } from './db';

/** @typedef {'morning' | 'afternoon'} Peak */

const SettingsContext = createContext(
  /** @type {{ peak: Peak, setPeak: (p: Peak) => void } | null} */ (null),
);

/** @param {{ children: import('react').ReactNode }} props */
export function SettingsProvider({ children }) {
  const [peak, setPeakState] = useState(/** @type {Peak} */ ('morning'));

  useEffect(() => {
    let alive = true;
    getSetting('peak')
      .then((v) => {
        if (alive && (v === 'morning' || v === 'afternoon')) setPeakState(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setPeak = useCallback((/** @type {Peak} */ p) => {
    setPeakState(p);
    setSetting('peak', p).catch(() => {});
  }, []);

  const value = useMemo(() => ({ peak, setPeak }), [peak, setPeak]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
