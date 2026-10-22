# 0003. Accounts and sync (Milestone 2)

Status: accepted (2026-10-22)

## Decision

- **Backend:** Supabase (Postgres, Auth, RLS, Edge Functions). Schema lives in `supabase/migrations/` and is applied with the Supabase CLI (`db push`).
- **Sign-in:** Google first (OAuth with PKCE), email + password as a second option. Apple later.
- **Tables:** `profiles`, `user_settings`, `tree_nodes`, all with RLS `user_id = auth.uid()`. New users get a profile and default settings from a trigger. Only `tree_nodes` is synced in M2; `user_settings` exists on the server for later (the peak window is still local).
- **Sync model (offline-first):** SQLite stays the source the UI reads and writes. Each local row has a `dirty` flag (SQLite schema v2). A sync does:
  1. **Pull:** rows with `synced_at >= cursor` (server clock, set by a trigger), ordered, in pages. Merge with `mergeRemote` in `packages/core`: a remote row replaces the local one only if its `updated_at` is strictly newer; otherwise the local row stays.
  2. **Push:** all dirty rows in batches through the `push_tree_nodes` RPC, which upserts and only overwrites a stored row when the incoming `updated_at` is newer. Then `dirty` is cleared for rows not edited again meanwhile.
  3. If the pull changed anything, the UI reloads from SQLite.
- **Triggers:** sign-in, local edits (debounced 3 s), app back to the foreground, network back (web).
- **Deletes:** soft deletes (`deleted_at`) sync like any other change.
- **First sign-in:** local data on the device is merged into the account (it is all dirty, so it gets pushed). The device is bound to the account in the `sync_user` setting. Signing in with a different account on a device that still holds another account's data asks for confirmation before the local data is removed.
- **Export and delete account:** export builds a JSON file of all local nodes (web downloads it, native uses the share sheet). Deleting an account calls the `delete-account` Edge Function, which identifies the caller from the JWT and deletes the auth user; rows go with it (`on delete cascade`). Data on the device stays.
- **Session storage:** web uses `localStorage`, native uses the `expo-sqlite` key-value store.

## Differences from CLAUDE.md and known limits

- CLAUDE.md asks for last-writer-wins **per field**. This implementation is **per row**: two devices editing different fields of the same task offline will keep only the newer whole row. Per-field merge needs per-field timestamps and a change log; it is a candidate for a later milestone.
- Conflict resolution trusts device clocks (`updated_at`). A device with a wrong clock can win or lose unfairly. The server clock (`synced_at`) is only used as the pull cursor.
- The auth token on native is stored unencrypted in SQLite. Moving it to `expo-secure-store` is planned before release.
- `user_settings` (work hours, peak) is not synced yet.
- There is no sync change log for recovery yet (CLAUDE.md section 11 mentions one).
- Email sign-up currently auto-confirms (project setting). Turn email confirmation on in the Supabase dashboard before launch.
