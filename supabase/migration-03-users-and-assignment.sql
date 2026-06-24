-- =============================================================================
-- Migration 03 — team member profiles + task assignment to users
-- Run once in the Supabase SQL Editor.
-- =============================================================================
-- Supabase keeps login accounts in auth.users, which the app can't list
-- directly. We mirror them into a public "profiles" table so tasks can be
-- assigned to any team member who can sign in.
-- =============================================================================

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "authenticated read profiles" on profiles;
create policy "authenticated read profiles"
  on profiles for select to authenticated using (true);

drop policy if exists "update own profile" on profiles;
create policy "update own profile"
  on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Backfill any users that already exist.
insert into profiles (id, email)
  select id, email from auth.users
  on conflict (id) do nothing;

-- Auto-create a profile whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tasks can now be assigned to a team member (in addition to a contact/contractor).
alter table tasks
  add column if not exists assigned_user_id uuid references profiles(id) on delete set null;
