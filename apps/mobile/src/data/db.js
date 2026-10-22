import * as SQLite from 'expo-sqlite';
import { nodeToRow, rowToNode } from '@slotwise/core';
import { MIGRATIONS } from './schema';

/** @typedef {import('@slotwise/core/types.js').TreeNode} TreeNode */

/** @type {Promise<SQLite.SQLiteDatabase> | null} */
let dbPromise = null;

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

function getDb() {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
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
