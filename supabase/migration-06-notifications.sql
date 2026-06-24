-- =============================================================================
-- Migration 06 — notification read-state
-- Run once in the Supabase SQL Editor.
-- =============================================================================
-- Notifications themselves are derived live in the app (unpaid bills near/over
-- due, tasks assigned to you). This table just remembers which ones each user
-- has marked as read.
-- =============================================================================

create table if not exists notification_reads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  notification_key  text not null,
  read_at           timestamptz default now(),
  unique (user_id, notification_key)
);

alter table notification_reads enable row level security;

drop policy if exists "manage own notification reads" on notification_reads;
create policy "manage own notification reads"
  on notification_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
