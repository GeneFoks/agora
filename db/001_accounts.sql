-- ============================================================
-- AGORA — migration 001: accounts, roles, consent  (stage 2)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent).
--
-- What it does
--   1. user_roles table: member / coordinator / admin. Users can't change
--      their own role; only an admin can, through agora_set_role().
--   2. profiles: new fields (city, languages, links, photo, visibility,
--      consent). Email and old XP/admin columns are no longer readable or
--      writable from the browser.
--   3. Row Level Security on profiles is rebuilt from scratch:
--      you see your own row; others see it only if its visibility allows.
--   4. Old profiles.is_admin flags are carried over into user_roles, and
--      map_objects write access now checks the new admin role.
--   5. New-user trigger: creates profile + member role, records consent.
--
-- The first admin is NOT set here (no emails in the repository).
-- After registering on the site, run separately in the SQL editor:
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = '<your email>'
--   on conflict (user_id) do update set role = 'admin', updated_at = now();
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. ROLES
-- ------------------------------------------------------------
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'member'
             check (role in ('member', 'coordinator', 'admin')),
  updated_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

-- Role of the current user. SECURITY DEFINER so it can read user_roles
-- regardless of RLS; it only ever answers about auth.uid().
create or replace function public.agora_my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when auth.uid() is null then null
    else coalesce((select role from public.user_roles where user_id = auth.uid()), 'member')
  end;
$$;

create or replace function public.agora_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.agora_my_role() = 'admin', false); $$;

create or replace function public.agora_is_coordinator()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.agora_my_role() in ('coordinator', 'admin'), false); $$;

-- Only admins may change roles; an admin can't demote themselves
-- (so the project never ends up with zero admins by accident).
create or replace function public.agora_set_role(target uuid, new_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.agora_is_admin() then
    raise exception 'not allowed';
  end if;
  if new_role not in ('member', 'coordinator', 'admin') then
    raise exception 'unknown role %', new_role;
  end if;
  if target = auth.uid() and new_role <> 'admin' then
    raise exception 'an admin cannot demote themselves';
  end if;
  insert into public.user_roles (user_id, role) values (target, new_role)
  on conflict (user_id) do update set role = excluded.role, updated_at = now();
end;
$$;

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.agora_is_admin());
-- No insert/update/delete policies: changes go only through agora_set_role().
revoke all on public.user_roles from anon;
revoke insert, update, delete on public.user_roles from authenticated;
grant select on public.user_roles to authenticated;

-- ------------------------------------------------------------
-- 2. PROFILES — new fields
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists city              text,
  add column if not exists languages         text[] not null default '{}',
  add column if not exists links             jsonb  not null default '[]'::jsonb,
  add column if not exists photo_url         text,
  add column if not exists preferred_lang    text   not null default 'ru',
  add column if not exists header_visibility text   not null default 'coordinators',
  add column if not exists consent_at        timestamptz,
  add column if not exists consent_version   text,
  add column if not exists updated_at        timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_header_visibility_chk;
alter table public.profiles add constraint profiles_header_visibility_chk
  check (header_visibility in ('all', 'coordinators', 'self'));
alter table public.profiles drop constraint if exists profiles_preferred_lang_chk;
alter table public.profiles add constraint profiles_preferred_lang_chk
  check (preferred_lang in ('ru', 'en'));
alter table public.profiles drop constraint if exists profiles_name_len_chk;
alter table public.profiles add constraint profiles_name_len_chk
  check (name is null or char_length(name) <= 120);

-- Carry old admin flags over to the new roles table.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
    insert into public.user_roles (user_id, role)
    select id, 'admin' from public.profiles where is_admin is true
    on conflict (user_id) do update set role = 'admin', updated_at = now();
  end if;
end $$;

-- Every existing account gets a profile row and a role row.
insert into public.profiles (id, name)
select u.id, coalesce(nullif(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select id, 'member' from auth.users
on conflict (user_id) do nothing;

-- ------------------------------------------------------------
-- 3. PROFILES — row level security, rebuilt
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
end $$;

-- "all"          → every signed-in agorian
-- "coordinators" → coordinators and admins
-- "self"         → only the owner (not even admins)
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or header_visibility = 'all'
    or (header_visibility = 'coordinators' and public.agora_is_coordinator())
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- No insert policy: rows are created by the signup trigger.
-- No delete policy: account deletion comes in stage 5 (cascades from auth.users).

-- Column-level access: the browser can only read/write these columns.
-- email, is_admin, xp, points, consent_* etc. stay server-side.
revoke all on public.profiles from anon;
revoke select, insert, update, delete on public.profiles from authenticated;
grant select (id, name, city, languages, links, photo_url, preferred_lang,
              header_visibility, created_at, updated_at)
  on public.profiles to authenticated;
grant update (name, city, languages, links, photo_url, preferred_lang, header_visibility)
  on public.profiles to authenticated;

-- ------------------------------------------------------------
-- 4. "ME" + CONSENT
-- ------------------------------------------------------------
-- Own profile incl. private bits (email, role, consent). Creates the
-- profile row if it is somehow missing.
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
    'id', p.id,
    'name', p.name,
    'city', p.city,
    'languages', p.languages,
    'links', p.links,
    'photo_url', p.photo_url,
    'preferred_lang', p.preferred_lang,
    'header_visibility', p.header_visibility,
    'consent_at', p.consent_at,
    'consent_version', p.consent_version,
    'created_at', p.created_at,
    'email', u.email,
    'role', public.agora_my_role()
  ) into result
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = uid;

  return result;
end;
$$;

create or replace function public.agora_accept_consent(p_version text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_version is null or char_length(p_version) > 20 then
    raise exception 'bad consent version';
  end if;
  update public.profiles
     set consent_at = now(),
         consent_version = p_version,
         updated_at = now()
   where id = auth.uid();
end;
$$;

-- ------------------------------------------------------------
-- 5. NEW-USER TRIGGER (replaces the old one with the XP referral bonus)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  cver text  := nullif(meta->>'consent_version', '');
begin
  insert into public.profiles (id, name, preferred_lang, consent_at, consent_version)
  values (
    new.id,
    left(coalesce(nullif(trim(meta->>'name'), ''),
                  nullif(trim(meta->>'full_name'), ''),
                  split_part(new.email, '@', 1)), 120),
    case when meta->>'lang' in ('ru', 'en') then meta->>'lang' else 'ru' end,
    case when cver is not null then now() end,
    left(cver, 20)
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6. MAP: everyone reads, only admins (new role) write
-- ------------------------------------------------------------
do $$
declare p record;
begin
  if to_regclass('public.map_objects') is not null then
    for p in select policyname from pg_policies
             where schemaname = 'public' and tablename = 'map_objects' loop
      execute format('drop policy %I on public.map_objects', p.policyname);
    end loop;
    execute 'alter table public.map_objects enable row level security';
    execute 'create policy map_objects_read on public.map_objects for select using (true)';
    execute 'create policy map_objects_admin_write on public.map_objects for all to authenticated
             using (public.agora_is_admin()) with check (public.agora_is_admin())';
  end if;
end $$;

-- ------------------------------------------------------------
-- 7. FUNCTION PERMISSIONS
-- ------------------------------------------------------------
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.agora_set_role(uuid, text) from public, anon;
revoke all on function public.agora_me() from public, anon;
revoke all on function public.agora_accept_consent(text) from public, anon;
grant execute on function public.agora_set_role(uuid, text) to authenticated;
grant execute on function public.agora_me() to authenticated;
grant execute on function public.agora_accept_consent(text) to authenticated;
grant execute on function public.agora_my_role(), public.agora_is_admin(),
                           public.agora_is_coordinator() to anon, authenticated;

commit;

notify pgrst, 'reload schema';

-- Check: policies that still mention the old is_admin flag (should be empty).
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') ~* '(^|[^_a-z])is_admin'
       or coalesce(with_check, '') ~* '(^|[^_a-z])is_admin');
