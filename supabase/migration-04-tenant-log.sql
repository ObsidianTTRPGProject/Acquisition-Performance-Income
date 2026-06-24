-- =============================================================================
-- Migration 04 — tenant log (feedback / concerns per tenancy)
-- Run once in the Supabase SQL Editor.
-- =============================================================================

create table if not exists tenant_logs (
  id          uuid primary key default gen_random_uuid(),
  tenancy_id  uuid references tenancies(id) on delete cascade,
  note        text not null,
  created_at  timestamptz default now()
);

alter table tenant_logs enable row level security;

drop policy if exists tenant_logs_auth_all on tenant_logs;
create policy tenant_logs_auth_all
  on tenant_logs for all to authenticated using (true) with check (true);
