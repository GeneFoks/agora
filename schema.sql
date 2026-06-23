-- ============================================================
-- AGORA — Supabase schema
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent): uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------

-- Public profile / gamification state, one row per auth user.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  email         text,
  xp            integer not null default 0,
  points        integer not null default 0,
  contributions integer not null default 0,
  referrals     integer not null default 0,
  referred_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Contributions submitted by users (reviewed by admins).
create table if not exists public.contributions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  type        text,
  link        text,
  xp          integer not null default 0,
  status      text not null default 'pending',  -- pending | approved | rejected
  created_at  timestamptz not null default now()
);

-- Reward redemptions (fulfilled manually by the team).
create table if not exists public.reward_claims (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  reward_title text not null,
  cost         integer not null,
  status       text not null default 'pending',
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- ----------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.contributions enable row level security;
alter table public.reward_claims enable row level security;

-- profiles: everyone signed in can read (needed for the leaderboard);
-- a user may insert/update only their own row.
drop policy if exists "profiles_select_all"  on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- contributions: a user can read and create only their own.
drop policy if exists "contrib_select_own" on public.contributions;
drop policy if exists "contrib_insert_own" on public.contributions;
create policy "contrib_select_own" on public.contributions
  for select using (auth.uid() = user_id);
create policy "contrib_insert_own" on public.contributions
  for insert with check (auth.uid() = user_id);

-- reward_claims: a user can read and create only their own.
drop policy if exists "claims_select_own" on public.reward_claims;
drop policy if exists "claims_insert_own" on public.reward_claims;
create policy "claims_select_own" on public.reward_claims
  for select using (auth.uid() = user_id);
create policy "claims_insert_own" on public.reward_claims
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 3. AUTO-CREATE PROFILE ON SIGNUP (+ referral bonus)
--    Reads `name` and `referred_by` from the signup metadata.
-- ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref uuid;
begin
  insert into public.profiles (id, name, email, referred_by)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data->>'referred_by','')::uuid
  )
  on conflict (id) do nothing;

  ref := nullif(new.raw_user_meta_data->>'referred_by','')::uuid;
  if ref is not null then
    update public.profiles
      set referrals = referrals + 1,
          points    = points + 100,
          xp        = xp + 50
      where id = ref;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
