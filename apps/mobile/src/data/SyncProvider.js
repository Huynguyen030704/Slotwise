import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  mergeRemote,
  mergeSettings,
  nodeToRemote,
  remoteToNode,
  settingsFromRemote,
  settingsToRemote,
} from '@slotwise/core';
import { useAuth } from './AuthProvider';
import { useNodes } from './NodesProvider';
import { useSettings } from './SettingsProvider';
import {
  clearLocalData,
  getSetting,
  loadDirtyNodes,
  loadNodes,
  markClean,
  saveNodes,
  setSetting,
} from './db';
import { supabase } from './supabase';

const PAGE = 500;
const BATCH = 200;
const DEBOUNCE_MS = 3000;
const EPOCH = '1970-01-01T00:00:00+00:00';

/** @typedef {'signedOut' | 'idle' | 'syncing' | 'offline' | 'error' | 'conflict'} SyncState */

/**
 * @typedef {object} SyncApi
 * @property {SyncState} state
 * @property {number | null} lastSyncAt epoch ms of the last successful sync
 * @property {string | null} error
 * @property {() => Promise<void>} syncNow
 * @property {() => Promise<void>} replaceLocalWithAccount after the user confirmed: drop this device's data and use the account's
 */

const SyncContext = createContext(/** @type {SyncApi | null} */ (null));

/**
 * Pull what changed on the server since the last cursor, merge by `updatedAt`, then push the rows
 * edited on this device. Returns how many pulled rows replaced local data.
 * @param {string} uid
 */
async function pull(uid) {
  if (!supabase) return 0;
  let cursor = (await getSetting('sync_cursor')) ?? EPOCH;
  let changed = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('tree_nodes')
      .select('*')
      .gte('server_updated_at', cursor)
      .order('server_updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    if (!data.length) break;
    const { accepted } = mergeRemote(
      await loadNodes(),
      data.map((r) => remoteToNode(r, uid)),
    );
    await saveNodes(accepted, { dirty: false });
    changed += accepted.length;
    const last = data[data.length - 1].server_updated_at;
    const advanced = last !== cursor;
    cursor = last;
    await setSetting('sync_cursor', cursor);
    if (data.length < PAGE || !advanced) break;
  }
  return changed;
}

async function push() {
  if (!supabase) return;
  const dirty = await loadDirtyNodes();
  for (let i = 0; i < dirty.length; i += BATCH) {
    const batch = dirty.slice(i, i + BATCH);
    const { error } = await supabase.rpc('push_tree_nodes', { p_rows: batch.map(nodeToRemote) });
    if (error) throw error;
    await markClean(batch);
  }
}

/**
 * Settings are one row per user: a copy edited here and not yet pushed wins, otherwise the newer
 * copy wins (see `mergeSettings`).
 * @param {string} uid
 * @param {() => import('./SettingsProvider').SettingsApi} get latest settings state
 */
async function syncSettings(uid, get) {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  const mine = get();
  if (data) {
    const remote = settingsFromRemote(data);
    if (mergeSettings(mine.settings, mine.dirty, remote).source === 'remote') {
      mine.applyRemote(remote);
      return;
    }
  }
  if (!mine.dirty) return;
  const { error: pushError } = await supabase
    .from('user_settings')
    .upsert({ user_id: uid, ...settingsToRemote(mine.settings) }, { onConflict: 'user_id' });
  if (pushError) throw pushError;
  // Only mark clean if nothing was edited while the request was in flight.
  if (get().settings.updatedAt === mine.settings.updatedAt) get().markClean();
}

/** @param {unknown} e */
function isNetworkError(e) {
  const msg = String(/** @type {any} */ (e)?.message ?? e);
  return /network|fetch|timeout|offline/i.test(msg);
}

/** @param {{ children: import('react').ReactNode }} props */
export function SyncProvider({ children }) {
  const { session } = useAuth();
  const nodesApi = useNodes();
  const apiRef = useRef(nodesApi);
  apiRef.current = nodesApi;
  const settingsApi = useSettings();
  const settingsRef = useRef(settingsApi);
  settingsRef.current = settingsApi;

  const [state, setState] = useState(/** @type {SyncState} */ ('signedOut'));
  const [lastSyncAt, setLastSyncAt] = useState(/** @type {number | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const running = useRef(false);
  const queued = useRef(false);
  const uid = session?.user.id ?? null;

  const syncNow = useCallback(async () => {
    if (!supabase || !uid) return;
    if (running.current) {
      queued.current = true;
      return;
    }
    running.current = true;
    setState('syncing');
    setError(null);
    try {
      await apiRef.current.flush();
      const bound = await getSetting('sync_user');
      if (bound && bound !== uid) {
        setState('conflict');
        return;
      }
      if (!bound) await setSetting('sync_user', uid);
      const pulled = await pull(uid);
      await push();
      await syncSettings(uid, () => settingsRef.current);
      if (pulled > 0) await apiRef.current.refresh();
      setLastSyncAt(Date.now());
      setState('idle');
    } catch (e) {
      setError(String(/** @type {any} */ (e)?.message ?? e));
      setState(isNetworkError(e) ? 'offline' : 'error');
    } finally {
      running.current = false;
      if (queued.current) {
        queued.current = false;
        setTimeout(() => syncNow(), 0);
      }
    }
  }, [uid]);

  // Sign in / out, and once the local data has loaded.
  useEffect(() => {
    if (!uid) {
      setState('signedOut');
      return;
    }
    if (nodesApi.ready) syncNow();
  }, [uid, nodesApi.ready, syncNow]);

  // After local edits, sync shortly after the last one.
  useEffect(() => {
    if (!uid || !nodesApi.ready) return undefined;
    const id = setTimeout(() => syncNow(), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [uid, nodesApi.ready, nodesApi.nodes, settingsApi.settings.updatedAt, syncNow]);

  // Back in the foreground or back online.
  useEffect(() => {
    if (!uid) return undefined;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncNow();
    });
    /** @type {(() => void) | null} */
    let offWeb = null;
    if (Platform.OS === 'web') {
      const onOnline = () => syncNow();
      window.addEventListener('online', onOnline);
      offWeb = () => window.removeEventListener('online', onOnline);
    }
    return () => {
      sub.remove();
      offWeb?.();
    };
  }, [uid, syncNow]);

  const replaceLocalWithAccount = useCallback(async () => {
    await apiRef.current.flush();
    await clearLocalData();
    await apiRef.current.refresh();
    await syncNow();
  }, [syncNow]);

  const value = useMemo(
    () => ({ state, lastSyncAt, error, syncNow, replaceLocalWithAccount }),
    [state, lastSyncAt, error, syncNow, replaceLocalWithAccount],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}
