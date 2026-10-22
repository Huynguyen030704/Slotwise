-- How a person uses the app, stored per account so it follows them across devices.
--   'schedule': tasks are placed on a timeline with clock times (the original behaviour)
--   'tasks':    plain task lists (today / tomorrow / later) with no clock
-- NULL means "not chosen yet" and is treated as 'schedule'. Keeping it NULL lets a choice made on
-- the welcome screen before sign-up be adopted by the new account instead of being overwritten by
-- a default.

alter table public.user_settings
  add column mode text
    check (mode in ('schedule', 'tasks'));
