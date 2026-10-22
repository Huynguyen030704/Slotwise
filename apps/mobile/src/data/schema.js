/** Local SQLite schema. Mirrors `tree_nodes` and `user_settings` planned for Supabase. */

export const SCHEMA_VERSION = 2;

export const MIGRATIONS = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS tree_nodes (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    parent_id TEXT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    position TEXT NOT NULL,
    collapsed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'todo',
    duration_min INTEGER NOT NULL DEFAULT 60,
    energy TEXT NOT NULL DEFAULT 'heavy',
    do_last INTEGER NOT NULL DEFAULT 0,
    scheduled_date TEXT,
    pinned_start_min INTEGER,
    done_at TEXT,
    done_date TEXT,
    done_start_min INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_tree_nodes_parent ON tree_nodes(parent_id);
  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // v2: sync. Existing rows have never been pushed, so they start dirty.
  `
  ALTER TABLE tree_nodes ADD COLUMN dirty INTEGER NOT NULL DEFAULT 0;
  UPDATE tree_nodes SET dirty = 1;
  CREATE INDEX IF NOT EXISTS idx_tree_nodes_dirty ON tree_nodes(dirty);
  `,
];
