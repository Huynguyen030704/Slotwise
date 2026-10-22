import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colors } from './tokens';

/** @typedef {'system' | 'light' | 'dark'} ThemeMode */

const ThemeContext = createContext(
  /** @type {{ scheme: 'light' | 'dark', mode: ThemeMode, colors: typeof colors.light, setMode: (m: ThemeMode) => void, toggle: () => void } | null} */ (
    null
  ),
);

/** @param {{ children: import('react').ReactNode }} props */
export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setMode] = useState(/** @type {ThemeMode} */ ('system'));
  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const toggle = useCallback(() => setMode(scheme === 'dark' ? 'light' : 'dark'), [scheme]);
  const value = useMemo(
    () => ({ scheme, mode, colors: colors[scheme], setMode, toggle }),
    [scheme, mode, toggle],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
