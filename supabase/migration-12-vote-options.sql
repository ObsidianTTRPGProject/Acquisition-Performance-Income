-- =============================================================================
-- Migration 12 — vote types: yes/no question OR pre-defined options
-- Run once in the Supabase SQL Editor.
-- =============================================================================
-- A vote is now either:
--   kind = 'question'  → yes / no / abstain on a motion (existing behaviour)
--   kind = 'options'   → members choose from a pre-defined list of options.
-- Option votes are configured when raised: the option list, whether abstaining
-- is allowed, and whether members may select multiple options.
-- =============================================================================

alter table votes add column if not exists kind          text    default 'question';  -- question | options
alter table votes add column if not exists options       jsonb;                       -- ["Option A", "Option B", ...] (kind = options)
alter table votes add column if not exists allow_abstain boolean default true;
alter table votes add column if not exists multi_select  boolean default false;

-- For multi-select votes a ballot can carry several choices; `choice` keeps the
-- first selection (and stays the single source of truth for single-select votes).
alter table vote_ballots add column if not exists choices jsonb;                      -- ["Option A", ...]
