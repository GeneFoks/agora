-- ============================================================
-- AGORA — migration 002: Agorian questionnaire answers  (stage 3)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Requires 001_accounts.sql.
--
-- answers: one row per (person, block). Each row carries the
-- questionnaire version it was answered on and its own visibility:
--   'all' (every signed-in agorian) / 'coordinators' / 'self'.
-- The database enforces visibility — not just the web page.
-- Questions themselves live in anketa-config.js (versioned in git).
-- ============================================================

begin;

-- Consent check usable inside RLS policies (profiles.consent_at is not
-- readable by the browser role, so policies can't query it directly).
create or replace function public.agora_has_consent()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and consent_at is not null);
$$;
revoke all on function public.agora_has_consent() from public, anon;
grant execute on function public.agora_has_consent() to authenticated;

create table if not exists public.answers (
  user_id    uuid not null references auth.users(id) on delete cascade,
  block_id   text not null check (block_id ~ '^b[0-9]{1,2}$'),
  version    text not null check (char_length(version) between 1 and 20),
  data       jsonb not null default '{}'::jsonb
             check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 32000),
  visibility text not null default 'coordinators'
             check (visibility in ('all', 'coordinators', 'self')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, block_id)
);

alter table public.answers enable row level security;

drop policy if exists answers_select on public.answers;
drop policy if exists answers_insert_own on public.answers;
drop policy if exists answers_update_own on public.answers;
drop policy if exists answers_delete_own on public.answers;

-- Same visibility rule as profile headers.
create policy answers_select on public.answers
  for select to authenticated
  using (
    user_id = auth.uid()
    or visibility = 'all'
    or (visibility = 'coordinators' and public.agora_is_coordinator())
  );

-- Only your own rows, and only after consent was given.
create policy answers_insert_own on public.answers
  for insert to authenticated
  with check (user_id = auth.uid() and public.agora_has_consent());

create policy answers_update_own on public.answers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.agora_has_consent());

create policy answers_delete_own on public.answers
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.answers from anon;
grant select, insert, update, delete on public.answers to authenticated;

-- updated_at is set by the server, not trusted from the browser.
create or replace function public.agora_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists answers_touch on public.answers;
create trigger answers_touch
  before insert or update on public.answers
  for each row execute function public.agora_touch_updated_at();

create index if not exists answers_block_idx on public.answers (block_id);

-- Where the person stopped in the questionnaire (resume on return).
alter table public.profiles
  add column if not exists anketa_progress jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_anketa_progress_chk;
alter table public.profiles add constraint profiles_anketa_progress_chk
  check (jsonb_typeof(anketa_progress) = 'object' and pg_column_size(anketa_progress) < 2000);

grant select (anketa_progress), update (anketa_progress) on public.profiles to authenticated;

commit;

notify pgrst, 'reload schema';
