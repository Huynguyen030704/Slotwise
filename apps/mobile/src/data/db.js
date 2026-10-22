import * as SQLite from 'expo-sqlite';
import { nodeToRow, rowToNode } from '@slotwise/core';
import { MIGRATIONS } from './schema';

/** @typedef {import('@slotwise/core/types.js').TreeNode} TreeNode */

// Kept on globalThis so a hot reload (which re-evaluates this module) reuses the open database.
// On web the file lives in OPFS, where only one connection may hold it at a time.
const GLOBAL_KEY = '__slotwiseDb';
const g = /** @type {Record<string, any>} */ (globalThis);

/** @param {unknown} e */
export function isLockedError(e) {
  return /Access Handle|createSyncAccessHandle/i.test(String(/** @type {any} */ (e)?.message ?? e));
}

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function open() {
  const db = await SQLite.openDatabaseAsync('slotwise.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync('PRAGMA user_version');
  const current = /** @type {{ user_version: number } | null} */ (row)?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return db;
}

/** A page that was just reloaded may still be releasing the file: retry before giving up. */
async function openWithRetry() {
  let last;
  for (let i = 0; i < 6; i++) {
    try {
      return await open();
    } catch (e) {
      last = e;
      if (!isLockedError(e)) throw e;
      await sleep(300 * (i + 1));
    }
  }
  throw last;
}

/** @returns {Promise<SQLite.SQLiteDatabase>} */
function getDb() {
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = openWithRetry().catch((e) => {
      g[GLOBAL_KEY] = null; // allow a retry from the UI
      throw e;
    });
  }
  return g[GLOBAL_KEY];
}

const COLS = [
  'id',
  'user_id',
  'parent_id',
  'kind',
  'title',
  'position',
  'collapsed',
  'status',
  'duration_min',
  'energy',
  'do_last',
  'scheduled_date',
  'pinned_start_min',
  'done_at',
  'done_date',
  'done_start_min',
  'created_at',
  'updated_at',
  'deleted_at',
];

/** All nodes, including soft-deleted ones (so undo and future sync keep working). */
export async function loadNodes() {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM tree_nodes');
  return /** @type {import('@slotwise/core/nodeRows.js').NodeRow[]} */ (rows).map(rowToNode);
}

/** @param {TreeNode[]} nodes */
export async function saveNodes(nodes) {
  if (!nodes.length) return;
  const db = await getDb();
  const sql = `INSERT OR REPLACE INTO tree_nodes (${COLS.join(',')}) VALUES (${COLS.map(() => '?').join(',')})`;
  await db.withTransactionAsync(async () => {
    for (const n of nodes) {
      const row = /** @type {Record<string, any>} */ (nodeToRow(n));
      await db.runAsync(
        sql,
        COLS.map((c) => row[c]),
      );
    }
  });
}

/** @param {string} key */
export async function getSetting(key) {
  const db = await getDb();
  const row = /** @type {{ value: string } | null} */ (
    await db.getFirstAsync('SELECT value FROM user_settings WHERE key = ?', [key])
  );
  return row ? row.value : null;
}

/** @param {string} key @param {string} value */
export async function setSetting(key, value) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', [
    key,
    value,
  ]);
}
