-- ============================================================
-- AGORA — migration 008: events and registrations  (events step 1)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Requires 001–002.
--
--   • profiles.phone — the member can set it; only admins can read
--     other people's phones (through admin functions in a later step).
--   • events — public events with their own link /e/<slug>.
--   • event_registrations — who is coming: registered / cancelled
--     (set by the member) and attended / no_show (set by organisers).
--   • agora_event_public(slug) — event card + how many are going,
--     without revealing who.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Phone (private)
-- ------------------------------------------------------------
alter table public.profiles add column if not exists phone text;
alter table public.profiles drop constraint if exists profiles_phone_chk;
alter table public.profiles add constraint profiles_phone_chk
  check (phone is null or phone ~ '^\+?[0-9 ()\-]{7,25}$');
-- Write own phone; NO select grant on this column for the browser role.
grant update (phone) on public.profiles to authenticated;

-- agora_me(): also return own phone.
create or replace function public.agora_me()
returns json
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result json;
begin
  if uid is null then
    return null;
  end if;

  insert into public.profiles (id, name)
  select u.id, coalesce(nullif(u.raw_user_meta_data->>'name', ''),
                        nullif(u.raw_user_meta_data->>'full_name', ''),
                        split_part(u.email, '@', 1))
  from auth.users u where u.id = uid
  on conflict (id) do nothing;

  select json_build_object(
    'id', p.id, 'name', p.name, 'city', p.city, 'languages', p.languages, 'links', p.links,
    'photo_url', p.photo_url, 'preferred_lang', p.preferred_lang,
    'header_visibility', p.header_visibility, 'consent_at', p.consent_at,
    'consent_version', p.consent_version, 'created_at', p.created_at,
    'phone', p.phone, 'email', u.email, 'role', public.agora_my_role()
  ) into result
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = uid;
  return result;
end;
$$;

-- New-user trigger: also keep the phone given at sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  cver text  := nullif(meta->>'consent_version', '');
  ph   text  := nullif(trim(meta->>'phone'), '');
begin
  if ph is not null and ph !~ '^\+?[0-9 ()\-]{7,25}$' then ph := null; end if;
  insert into public.profiles (id, name, preferred_lang, consent_at, consent_version, phone)
  values (
    new.id,
    left(coalesce(nullif(trim(meta->>'name'), ''), nullif(trim(meta->>'full_name'), ''),
                  split_part(new.email, '@', 1)), 120),
    case when meta->>'lang' in ('ru', 'en') then meta->>'lang' else 'ru' end,
    case when cver is not null then now() end,
    left(cver, 20),
    ph
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'member')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2. Events
-- ------------------------------------------------------------
create table if not exists public.events (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  title_ru       text not null check (char_length(title_ru) <= 200),
  title_en       text check (char_length(title_en) <= 200),
  description_ru text check (char_length(description_ru) <= 8000),
  description_en text check (char_length(description_en) <= 8000),
  date_text_ru   text check (char_length(date_text_ru) <= 200),  -- e.g. "18–20 декабря 2026"
  date_text_en   text check (char_length(date_text_en) <= 200),
  starts_at      timestamptz,                                    -- may be unknown yet
  ends_at        timestamptz,
  place_ru       text check (char_length(place_ru) <= 300),
  place_en       text check (char_length(place_en) <= 300),
  place_url      text check (place_url is null or place_url ~ '^(https?://|/)'),
  cover_url      text check (cover_url is null or cover_url ~ '^(https?://|/)'),
  capacity       integer check (capacity is null or capacity > 0),
  status         text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.events enable row level security;
drop policy if exists events_read on public.events;
drop policy if exists events_admin_write on public.events;
create policy events_read on public.events
  for select to anon, authenticated
  using (status in ('published', 'closed') or public.agora_is_admin());
create policy events_admin_write on public.events
  for all to authenticated
  using (public.agora_is_admin()) with check (public.agora_is_admin());
revoke all on public.events from anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

drop trigger if exists events_touch on public.events;
create trigger events_touch before insert or update on public.events
  for each row execute function public.agora_touch_updated_at();

-- ------------------------------------------------------------
-- 3. Registrations
-- ------------------------------------------------------------
create table if not exists public.event_registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'registered'
                check (status in ('registered', 'cancelled', 'attended', 'no_show')),
  checkin_code  uuid not null default gen_random_uuid(),   -- for the QR code (later step)
  checked_in_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists event_reg_event_idx on public.event_registrations (event_id, status);

-- Members may only switch their own row between registered/cancelled;
-- attended / no_show are set by organisers (coordinators & admins).
create or replace function public.agora_event_reg_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  ev public.events;
  taken int;
begin
  select * into ev from public.events where id = new.event_id;
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.checked_in_at := null;
    new.checkin_code := gen_random_uuid();
    if not public.agora_is_coordinator() then
      new.status := 'registered';
    end if;
  end if;
  if not public.agora_is_coordinator() then
    if new.status not in ('registered', 'cancelled') then
      raise exception 'only organisers can mark attendance';
    end if;
    if tg_op = 'UPDATE' then
      new.checkin_code := old.checkin_code;
      new.checked_in_at := old.checked_in_at;
    end if;
    if ev.status <> 'published' then
      raise exception 'registration_closed';
    end if;
    if new.status = 'registered' and ev.capacity is not null then
      select count(*) into taken from public.event_registrations
       where event_id = new.event_id and status in ('registered', 'attended') and user_id <> new.user_id;
      if taken >= ev.capacity then
        raise exception 'event_full';
      end if;
    end if;
  end if;
  if new.status = 'attended' and new.checked_in_at is null then
    new.checked_in_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.agora_event_reg_guard() from public, anon, authenticated;

drop trigger if exists event_reg_guard on public.event_registrations;
create trigger event_reg_guard before insert or update on public.event_registrations
  for each row execute function public.agora_event_reg_guard();

alter table public.event_registrations enable row level security;
drop policy if exists ereg_select on public.event_registrations;
drop policy if exists ereg_insert_own on public.event_registrations;
drop policy if exists ereg_update on public.event_registrations;
create policy ereg_select on public.event_registrations
  for select to authenticated
  using (user_id = auth.uid() or public.agora_is_coordinator());
create policy ereg_insert_own on public.event_registrations
  for insert to authenticated
  with check (user_id = auth.uid() and public.agora_has_consent());
create policy ereg_update on public.event_registrations
  for update to authenticated
  using (user_id = auth.uid() or public.agora_is_coordinator())
  with check (user_id = auth.uid() or public.agora_is_coordinator());
revoke all on public.event_registrations from anon, authenticated;
grant select on public.event_registrations to authenticated;
grant insert (event_id, user_id) on public.event_registrations to authenticated;
grant update (status) on public.event_registrations to authenticated;

-- ------------------------------------------------------------
-- 4. Public event card with a head count (no names)
-- ------------------------------------------------------------
create or replace function public.agora_event_public(p_slug text)
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'id', e.id, 'slug', e.slug,
    'title_ru', e.title_ru, 'title_en', e.title_en,
    'description_ru', e.description_ru, 'description_en', e.description_en,
    'date_text_ru', e.date_text_ru, 'date_text_en', e.date_text_en,
    'starts_at', e.starts_at, 'ends_at', e.ends_at,
    'place_ru', e.place_ru, 'place_en', e.place_en, 'place_url', e.place_url,
    'cover_url', e.cover_url, 'capacity', e.capacity, 'status', e.status,
    'going', (select count(*) from public.event_registrations r
               where r.event_id = e.id and r.status in ('registered', 'attended'))
  )
  from public.events e
  where e.slug = p_slug and e.status in ('published', 'closed');
$$;
revoke all on function public.agora_event_public(text) from public;
grant execute on function public.agora_event_public(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 5. First event (texts are a draft — edit freely)
-- ------------------------------------------------------------
insert into public.events (slug, title_ru, title_en, description_ru, description_en,
                           date_text_ru, date_text_en, place_ru, place_en, place_url, status)
values (
  'dec-2026',
  'Первый сбор на земле AGORA-01',
  'First gathering on AGORA-01 land',
  'Выходные в честь дня рождения — первый раз собираемся на нашей земле. Знакомимся, гуляем по участку, обсуждаем, что строим дальше.',
  'A birthday weekend — our first time gathering on our own land. Meet each other, walk the land, talk about what we build next.',
  '18–20 декабря 2026 · точная дата уточняется',
  'December 18–20, 2026 · exact date to be confirmed',
  'AGORA-01 · County Road 132, Burlington, Texas',
  'AGORA-01 · County Road 132, Burlington, Texas',
  '/map',
  'published'
)
on conflict (slug) do nothing;

commit;

notify pgrst, 'reload schema';
