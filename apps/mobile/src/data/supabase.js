import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';

/**
 * The project URL must be the origin only. People often paste the REST endpoint from the dashboard
 * (`.../rest/v1/`), so strip any path.
 * @param {string | undefined} raw
 */
function normalizeUrl(raw) {
  if (!raw) return null;
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return null;
  }
}

const url = normalizeUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** Null when the project is not configured: the app then works fully offline without accounts. */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',
          autoRefreshToken: true,
          persistSession: true,
          // Web keeps the session in localStorage and reads the OAuth redirect from the URL.
          // Native keeps it in the local SQLite key-value store.
          storage: Platform.OS === 'web' ? undefined : Storage,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

export const SUPABASE_CONFIGURED = supabase !== null;
