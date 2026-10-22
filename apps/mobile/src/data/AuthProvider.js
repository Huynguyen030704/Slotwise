import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

// Lets the auth popup close itself when the OAuth redirect lands back in the app (web).
WebBrowser.maybeCompleteAuthSession();

/**
 * @typedef {object} AuthApi
 * @property {boolean} configured Supabase keys are present
 * @property {boolean} loading the stored session is still being read
 * @property {import('@supabase/supabase-js').Session | null} session
 * @property {() => Promise<string | null>} signInWithGoogle returns an error message, or null
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

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return 'not-configured';
    if (Platform.OS === 'web') {
      // Full-page redirect; the session is picked up from the URL when the page loads again.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      return error ? error.message : null;
    }
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return error?.message ?? 'no-url';
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return null; // cancelled
    const code = new URL(result.url).searchParams.get('code');
    if (!code) return 'no-code';
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    return exchangeError ? exchangeError.message : null;
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
      const { error } = await supabase.auth.signUp({ email, password });
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
      signInWithGoogle,
      signInWithPassword,
      signUp,
      signOut,
      deleteAccount,
    }),
    [loading, session, signInWithGoogle, signInWithPassword, signUp, signOut, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
