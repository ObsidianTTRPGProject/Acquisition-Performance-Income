-- =============================================================================
-- Migration 01 — structured address fields
-- Run this once in the Supabase SQL Editor if you already created the database
-- from the original schema.sql. (Fresh installs already include these columns.)
-- =============================================================================

alter table properties
  add column if not exists street             text,
  add column if not exists suburb             text,
  add column if not exists state              text,
  add column if not exists postcode           text,
  add column if not exists country            text,
  add column if not exists latitude           double precision,
  add column if not exists longitude          double precision,
  add column if not exists formatted_address  text,
  add column if not exists osm_place_id       text;

-- Helpful indexes for filtering by area.
create index if not exists idx_properties_state    on properties (state);
create index if not exists idx_properties_postcode on properties (postcode);
