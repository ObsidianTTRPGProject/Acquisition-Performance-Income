-- =============================================================================
-- Migration 02 — property cover photo
-- Run once in the Supabase SQL Editor (fresh installs already include this).
-- =============================================================================

alter table properties
  add column if not exists cover_photo_path text;
