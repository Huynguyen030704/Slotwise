# 0004. Usage modes: plan by the clock, or just manage tasks

Status: accepted (2026-10-22)

## Context

Slotwise was built around a timeline: tasks have a duration and an energy level and are placed into free time. Some people want exactly that; others only want task lists and no clock.

## Decision

- A per-account setting `mode`, stored in `user_settings.mode` (`'schedule' | 'tasks' | NULL`) and synced like the rest of the settings, so it follows the person to any device.
- `NULL` means "not chosen yet" and behaves as `schedule`. Keeping it empty lets a choice made on the welcome screen before sign-up be adopted by a brand new account (`adoptLocalMode` in `packages/core/src/settings.js`), while an account that already has a mode always wins when you sign in on a new device.
- **`schedule`** (default): list + day timeline, durations, energy, pinning, working hours, sharp hours and recurring blocks.
- **`tasks`**: list + a **Today** view (`taskBuckets` in core: today, done today, tomorrow, later; tree order is the priority; open tasks from earlier days count as today). Durations, energy, pinning and the clock settings are hidden. Focus mode uses today's list in list order, without planned times. Menus offer "Do today", "Move to tomorrow" and "Do later" instead of the clock actions.
- Task data is not touched when switching: durations, energy and pins stay stored, so switching back loses nothing. "Later" is `scheduledDate = null` (or further out than tomorrow).
- The mode is chosen on the welcome screen (two cards) and can be changed in Settings at any time.
- The database change is `20261022030000_settings_mode.sql`.

## Not included

- Due dates (deadlines) in `tasks` mode: CLAUDE.md keeps them out of the MVP. Buckets are Today / Tomorrow / Later only.
- Dragging a task onto the Today view to change its day (the menu does it).
