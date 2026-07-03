-- =============================================================================
-- Migration 14 — per-property documents (contracts, warranties, etc.)
-- Run once in the Supabase SQL Editor.
-- =============================================================================
-- Documents are stored in the existing private 'property-docs' bucket and
-- described here: title, tags, description, a document date, and an optional
-- link to a Contact (e.g. the builder a contract is with).
-- =============================================================================

create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid references properties(id) on delete cascade,
  contact_id   uuid references contacts(id) on delete set null,  -- optional
  title        text not null,
  description  text,
  tags         jsonb,                    -- ["contract", "warranty", ...]
  doc_date     date,                     -- document / added date
  storage_path text not null,            -- path within the 'property-docs' bucket
  file_name    text,
  file_type    text,
  file_size    bigint,
  created_at   timestamptz default now()
);
alter table documents enable row level security;
drop policy if exists documents_auth on documents;
create policy documents_auth on documents for all to authenticated using (true) with check (true);
