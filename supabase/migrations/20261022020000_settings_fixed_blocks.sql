-- Per-user recurring blocks that are busy every day (lunch, daily stand-up...). Working hours and
-- the sharp half of the day already live in user_settings (work_start_min, work_end_min, peak).
--
-- fixed_blocks is a JSON array of { id, kind: 'lunch' | 'meeting', label?, startMin, endMin }.
-- The app validates and repairs it (packages/core/src/settings.js); the database only guards the
-- shape so a bad client cannot store something that is not a list.

alter table public.user_settings
  add column fixed_blocks jsonb not null
    default '[{"id":"lunch","kind":"lunch","startMin":720,"endMin":780}]'::jsonb;

alter table public.user_settings
  add constraint user_settings_fixed_blocks_is_array
    check (jsonb_typeof(fixed_blocks) = 'array' and jsonb_array_length(fixed_blocks) <= 20);
