import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * @typedef {object} AuthApi
 * @property {boolean} configured Supabase keys are present
 * @property {boolean} loading the stored session is still being read
 * @property {import('@supabase/supabase-js').Session | null} session
 * @property {(email: string, password: string) => Promise<string | null>} signInWithPassword
 * @property {(email: string, password: string) => Promise<string | null>} signUp
 * @property {() => Promise<void>} signOut
 * @property {() => Promise<string | null>} deleteAccount
 */

const AuthContext = createContext(/** @type {AuthApi | null} */ (null));

/** @param {{ children: import('react').ReactNode }} props */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(
    /** @type {import('@supabase/supabase-js').Session | null} */ (null),
  );
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(
    /** @param {string} email @param {string} password */
    async (email, password) => {
      if (!supabase) return 'not-configured';
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    [],
  );

  const signUp = useCallback(
    /** @param {string} email @param {string} password */
    async (email, password) => {
      if (!supabase) return 'not-configured';
      // The confirmation link brings the person back to the web app; on phones it opens the Site URL.
      const options =
        Platform.OS === 'web' ? { emailRedirectTo: window.location.origin } : undefined;
      const { error } = await supabase.auth.signUp({ email, password, options });
      return error ? error.message : null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase) return 'not-configured';
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return error.message;
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }, []);

  const value = useMemo(
    () => ({
      configured: !!supabase,
      loading,
      session,
      signInWithPassword,
      signUp,
      signOut,
      deleteAccount,
    }),
    [loading, session, signInWithPassword, signUp, signOut, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
