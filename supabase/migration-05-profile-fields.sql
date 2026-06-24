-- =============================================================================
-- Migration 05 — profile contact details + self-service editing
-- Run once in the Supabase SQL Editor.
-- =============================================================================

alter table profiles
  add column if not exists phone text;

-- Allow a signed-in user to create their own profile row if it doesn't exist
-- yet (so the profile editor can upsert). They can already update their own row.
drop policy if exists "insert own profile" on profiles;
create policy "insert own profile"
  on profiles for insert to authenticated
  with check (auth.uid() = id);
