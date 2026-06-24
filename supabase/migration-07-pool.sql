-- =============================================================================
-- Migration 07 — shared contributions pool
-- Run once in the Supabase SQL Editor.
-- =============================================================================
-- The team pays money into a shared pool (e.g. weekly), and the pool is used to
-- pay for shared costs. Balance = total contributions − total spending.
-- =============================================================================

create table if not exists pool_contributions (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid references profiles(id) on delete set null,
  member_name     text,                          -- display name (kept even if profile removed)
  amount          numeric(12,2) not null,
  contributed_on  date default current_date,
  note            text,
  created_at      timestamptz default now()
);

create table if not exists pool_expenses (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  amount       numeric(12,2) not null,
  spent_on     date default current_date,
  property_id  uuid references properties(id) on delete set null,  -- optional link
  note         text,
  created_at   timestamptz default now()
);

alter table pool_contributions enable row level security;
alter table pool_expenses enable row level security;

drop policy if exists pool_contributions_auth on pool_contributions;
create policy pool_contributions_auth on pool_contributions for all to authenticated using (true) with check (true);
drop policy if exists pool_expenses_auth on pool_expenses;
create policy pool_expenses_auth on pool_expenses for all to authenticated using (true) with check (true);
