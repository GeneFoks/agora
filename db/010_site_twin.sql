-- ============================================================
-- AGORA — migration 010: «Цифровой двойник» земли АГОРА ТЕХАС (3D-карта)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Requires 001 (roles).
--
-- Coordinates (as in the master plan): d = metres from the road (east)
-- boundary westward, y = metres north of the south boundary, heights in m.
--
-- Visibility of every row:
--   public   — everyone, even without an account
--   members  — any signed-in member
--   founders — admins only
-- Editors (add / change objects, write history): coordinators and admins.
-- A status change (planned → in_progress → done) writes a history entry
-- automatically, with the date and the editor's name.
-- ============================================================

begin;

-- Who may see a row with this visibility?
create or replace function public.agora_can_view(vis text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case vis
    when 'public'   then true
    when 'members'  then auth.uid() is not null
    when 'founders' then public.agora_is_admin()
    else false
  end;
$$;
grant execute on function public.agora_can_view(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Zones (bands across the lot by distance from the road)
-- ------------------------------------------------------------
create table if not exists public.site_zones (
  id         text primary key check (id ~ '^[a-z0-9_]{1,40}$'),
  name_ru    text not null check (char_length(name_ru) <= 120),
  name_en    text check (char_length(name_en) <= 120),
  d_from     numeric not null,
  d_to       numeric not null,
  color      text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  no_build   boolean not null default false,
  sort       integer not null default 0,
  visibility text not null default 'public' check (visibility in ('public', 'members', 'founders'))
);

-- ------------------------------------------------------------
-- Paths (roads, trails, walkway, hedges, utility trench)
-- ------------------------------------------------------------
create table if not exists public.site_paths (
  id         text primary key check (id ~ '^[a-z0-9_]{1,40}$'),
  name_ru    text not null check (char_length(name_ru) <= 160),
  name_en    text check (char_length(name_en) <= 160),
  type       text not null check (type in ('ribbon_road', 'road', 'track', 'trail', 'walkway', 'hedge', 'utility')),
  phase      smallint not null default 0 check (phase between 0 and 3),
  status     text not null default 'planned' check (status in ('planned', 'in_progress', 'done')),
  width      numeric not null default 1 check (width > 0 and width <= 50),
  points     jsonb not null check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) >= 2),
  closed     boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public', 'members', 'founders')),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Objects
-- ------------------------------------------------------------
create table if not exists public.site_objects (
  id             text primary key check (id ~ '^[a-z0-9_]{1,40}$'),
  name_ru        text not null check (char_length(name_ru) <= 160),
  name_en        text check (char_length(name_en) <= 160),
  category       text not null check (category in ('building', 'residence', 'lodging', 'wellness', 'farm', 'utility',
                                                   'infrastructure', 'parking', 'landmark', 'feature', 'water', 'reserve')),
  shape          text not null check (shape in ('box', 'house', 'pavilion', 'greenhouse', 'cylinder', 'tower', 'gate',
                                                'rock_wall', 'ring', 'ring_path', 'ring_sectors', 'flat', 'flat_dashed', 'pond', 'pole')),
  d              numeric not null check (d between -50 and 750),
  y              numeric not null check (y between -50 and 200),
  w              numeric check (w is null or w between 0 and 500),
  l              numeric check (l is null or l between 0 and 500),
  h              numeric check (h is null or h between 0 and 100),
  h_final        numeric check (h_final is null or h_final between 0 and 100),
  r              numeric check (r is null or r between 0 and 200),
  sectors        smallint check (sectors is null or sectors between 2 and 32),
  rotation_deg   numeric not null default 0,
  phase          smallint not null default 0 check (phase between 0 and 3),
  status         text not null default 'planned' check (status in ('planned', 'in_progress', 'done')),
  built_by       text check (char_length(built_by) <= 200),
  hours          numeric check (hours is null or hours >= 0),
  cost_usd       numeric check (cost_usd is null or cost_usd >= 0),
  date_started   date,
  date_done      date,
  permit         text check (char_length(permit) <= 200),
  photos         text[] not null default '{}',
  model_url      text check (model_url is null or model_url ~ '^https://'),
  description_ru text check (char_length(description_ru) <= 4000),
  description_en text check (char_length(description_en) <= 4000),
  visibility     text not null default 'public' check (visibility in ('public', 'members', 'founders')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null
);

-- ------------------------------------------------------------
-- Tree areas (windbreak along the north line, food forest)
-- ------------------------------------------------------------
create table if not exists public.site_tree_areas (
  id         text primary key check (id ~ '^[a-z0-9_]{1,40}$'),
  name_ru    text not null check (char_length(name_ru) <= 160),
  name_en    text check (char_length(name_en) <= 160),
  type       text not null check (type in ('line_offset_from_north', 'scatter')),
  d_from     numeric not null,
  d_to       numeric not null,
  "offset"   numeric,
  spacing    numeric,
  count      integer check (count is null or count between 0 and 2000),
  exclude    jsonb not null default '[]'::jsonb,
  phase      smallint not null default 0 check (phase between 0 and 3),
  status     text not null default 'planned' check (status in ('planned', 'in_progress', 'done')),
  visibility text not null default 'public' check (visibility in ('public', 'members', 'founders'))
);

-- ------------------------------------------------------------
-- History of each object ("летопись")
-- ------------------------------------------------------------
create table if not exists public.site_object_events (
  id          uuid primary key default gen_random_uuid(),
  object_id   text not null references public.site_objects(id) on delete cascade,
  happened_on date not null default current_date,
  kind        text not null default 'note' check (kind in ('created', 'status', 'note', 'photo')),
  text        text check (char_length(text) <= 2000),
  by_name     text check (char_length(by_name) <= 200),
  hours       numeric check (hours is null or hours >= 0),
  photos      text[] not null default '{}',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists site_object_events_obj_idx on public.site_object_events (object_id, happened_on desc);

-- ------------------------------------------------------------
-- Status change → history entry (date + editor's name)
-- ------------------------------------------------------------
create or replace function public.agora_site_object_touch()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  who text;
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    select coalesce(name, 'admin') into who from public.profiles where id = auth.uid();
    insert into public.site_object_events (object_id, kind, text, by_name, created_by)
    values (new.id, 'status',
            case new.status when 'planned' then 'Статус: запланировано'
                            when 'in_progress' then 'Статус: строится'
                            else 'Статус: готово' end,
            who, auth.uid());
    if new.status = 'done' and new.date_done is null then new.date_done := current_date; end if;
    if new.status = 'in_progress' and new.date_started is null then new.date_started := current_date; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.agora_site_object_touch() from public, anon, authenticated;
drop trigger if exists site_objects_touch on public.site_objects;
create trigger site_objects_touch before insert or update on public.site_objects
  for each row execute function public.agora_site_object_touch();

-- ------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['site_zones', 'site_paths', 'site_objects', 'site_tree_areas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_edit', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (public.agora_can_view(visibility))', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.agora_is_coordinator()) with check (public.agora_is_coordinator())', t || '_edit', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.site_object_events enable row level security;
drop policy if exists site_events_read on public.site_object_events;
drop policy if exists site_events_edit on public.site_object_events;
create policy site_events_read on public.site_object_events
  for select to anon, authenticated
  using (exists (select 1 from public.site_objects o
                 where o.id = object_id and public.agora_can_view(o.visibility)));
create policy site_events_edit on public.site_object_events
  for all to authenticated
  using (public.agora_is_coordinator()) with check (public.agora_is_coordinator());
revoke all on public.site_object_events from anon, authenticated;
grant select on public.site_object_events to anon, authenticated;
grant insert, update, delete on public.site_object_events to authenticated;

-- ------------------------------------------------------------
-- Media: photos and GLB models (public read, editors upload)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 26214400,
        array['image/jpeg', 'image/png', 'image/webp', 'model/gltf-binary', 'application/octet-stream'])
on conflict (id) do update
  set public = true, file_size_limit = 26214400,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'model/gltf-binary', 'application/octet-stream'];

drop policy if exists site_media_write on storage.objects;
drop policy if exists site_media_update on storage.objects;
drop policy if exists site_media_delete on storage.objects;
create policy site_media_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and public.agora_is_coordinator());
create policy site_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and public.agora_is_coordinator())
  with check (bucket_id = 'site-media' and public.agora_is_coordinator());
create policy site_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and public.agora_is_coordinator());

commit;

notify pgrst, 'reload schema';
