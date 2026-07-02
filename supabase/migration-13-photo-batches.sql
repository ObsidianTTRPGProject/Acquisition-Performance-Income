-- =============================================================================
-- Migration 13 — photo import batches
-- Run once in the Supabase SQL Editor.
-- =============================================================================
-- Photos uploaded together in one import share a batch_id, so the gallery can
-- group them (along with their shared date / status / description tags).
-- =============================================================================

alter table photos add column if not exists batch_id uuid;
