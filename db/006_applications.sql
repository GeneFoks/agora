-- ============================================================
-- AGORA — migration 006: applications from /join
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Requires 001 (roles).
--
-- Anyone (even without an account) can SEND an application.
-- Only coordinators and admins can READ them and set status / a note.
-- Spam guard: field length limits, a global cap of 30 applications per
-- hour, and a hidden honeypot field on the page.
-- ============================================================

begin;

create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 120),
  telegram     text not null check (char_length(telegram) between 2 and 64),
  email        text check (email is null or (char_length(email) <= 200
                                             and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  format       text not null check (format in ('visit', 'remote', 'local', 'project', 'other')),
  about        text not null check (char_length(about) between 1 and 3000),
  contribution text check (contribution is null or char_length(contribution) <= 3000),
  lang         text not null default 'ru' check (lang in ('ru', 'en')),
  user_id      uuid references auth.users(id) on delete set null,
  status       text not null default 'new' check (status in ('new', 'in_progress', 'done', 'rejected')),
  note         text check (note is null or char_length(note) <= 2000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists applications_created_idx on public.applications (created_at desc);

-- Server-side defaults the sender can't override + hourly cap.
create or replace function public.agora_application_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.applications where created_at > now() - interval '1 hour') >= 30 then
      raise exception 'too_many_applications';
    end if;
    new.status := 'new';
    new.note := null;
    new.user_id := auth.uid();
    new.created_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.agora_application_guard() from public, anon, authenticated;

drop trigger if exists applications_guard on public.applications;
create trigger applications_guard
  before insert or update on public.applications
  for each row execute function public.agora_application_guard();

alter table public.applications enable row level security;
drop policy if exists applications_insert_any on public.applications;
drop policy if exists applications_select_coord on public.applications;
drop policy if exists applications_update_coord on public.applications;

create policy applications_insert_any on public.applications
  for insert to anon, authenticated
  with check (true);
create policy applications_select_coord on public.applications
  for select to authenticated
  using (public.agora_is_coordinator());
create policy applications_update_coord on public.applications
  for update to authenticated
  using (public.agora_is_coordinator())
  with check (public.agora_is_coordinator());

revoke all on public.applications from anon, authenticated;
grant insert (name, telegram, email, format, about, contribution, lang)
  on public.applications to anon, authenticated;
grant select on public.applications to authenticated;
grant update (status, note) on public.applications to authenticated;

commit;

notify pgrst, 'reload schema';
