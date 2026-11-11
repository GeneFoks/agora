-- ============================================================
-- AGORA — migration 004: Agorian Portrait  (stage 5)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Requires 001–003.
--
--   1. growth_log — "История развития". Key changes are logged by the
--      database itself (role change, new skills, test taken, questionnaire
--      completed); members can add their own notes. Each event inherits
--      the visibility of the block it came from, and follows it if the
--      person later changes that block's visibility.
--   2. avatars — private photo bucket; a photo is visible exactly to those
--      who can see the person's profile header.
--   3. agora_delete_my_account() — deletes the account and, by cascade,
--      every row that belongs to it.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. GROWTH LOG
-- ------------------------------------------------------------
create table if not exists public.growth_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('role_changed', 'skill_added', 'skill_learning',
                                           'test_taken', 'anketa_completed', 'note')),
  payload    jsonb not null default '{}'::jsonb check (pg_column_size(payload) < 4000),
  note       text check (note is null or char_length(note) <= 1000),
  visibility text not null default 'coordinators'
             check (visibility in ('all', 'coordinators', 'self')),
  created_at timestamptz not null default now()
);
create index if not exists growth_log_user_idx on public.growth_log (user_id, created_at desc);

alter table public.growth_log enable row level security;
drop policy if exists growth_select on public.growth_log;
drop policy if exists growth_insert_note on public.growth_log;
drop policy if exists growth_delete_note on public.growth_log;

create policy growth_select on public.growth_log
  for select to authenticated
  using (
    user_id = auth.uid()
    or visibility = 'all'
    or (visibility = 'coordinators' and public.agora_is_coordinator())
  );
-- Members may only add/remove their own notes; other kinds come from triggers.
create policy growth_insert_note on public.growth_log
  for insert to authenticated
  with check (user_id = auth.uid() and kind = 'note' and note is not null
              and public.agora_has_consent());
create policy growth_delete_note on public.growth_log
  for delete to authenticated
  using (user_id = auth.uid() and kind = 'note');

revoke all on public.growth_log from anon;
revoke all on public.growth_log from authenticated;
grant select, delete on public.growth_log to authenticated;
grant insert (user_id, kind, note, visibility) on public.growth_log to authenticated;

-- Events from questionnaire answers (roles in b1, skills in b7).
create or replace function public.agora_growth_from_answers()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  oldd jsonb := case when tg_op = 'UPDATE' then old.data else '{}'::jsonb end;
  k text;
  added text[] := '{}';
  learning text[] := '{}';
begin
  if tg_op = 'UPDATE' and new.visibility is distinct from old.visibility then
    update public.growth_log set visibility = new.visibility
     where user_id = new.user_id and payload->>'block' = new.block_id;
  end if;

  if new.block_id = 'b1' then
    if (new.data->>'role_primary') is distinct from (oldd->>'role_primary')
       or (new.data->>'role_secondary') is distinct from (oldd->>'role_secondary') then
      insert into public.growth_log (user_id, kind, payload, visibility)
      values (new.user_id, 'role_changed', jsonb_build_object(
                'block', 'b1',
                'from_primary', oldd->>'role_primary', 'to_primary', new.data->>'role_primary',
                'from_secondary', oldd->>'role_secondary', 'to_secondary', new.data->>'role_secondary'),
              new.visibility);
    end if;
  elsif new.block_id = 'b7' and jsonb_typeof(new.data->'skills') = 'object' then
    for k in select jsonb_object_keys(new.data->'skills') loop
      if new.data->'skills'->>k = 'can' and coalesce(oldd->'skills'->>k, '') <> 'can' then
        added := added || k;
      elsif new.data->'skills'->>k = 'learning' and coalesce(oldd->'skills'->>k, '') <> 'learning' then
        learning := learning || k;
      end if;
    end loop;
    if coalesce(array_length(added, 1), 0) > 0 then
      insert into public.growth_log (user_id, kind, payload, visibility)
      values (new.user_id, 'skill_added', jsonb_build_object('block', 'b7', 'skills', to_jsonb(added)), new.visibility);
    end if;
    if coalesce(array_length(learning, 1), 0) > 0 then
      insert into public.growth_log (user_id, kind, payload, visibility)
      values (new.user_id, 'skill_learning', jsonb_build_object('block', 'b7', 'skills', to_jsonb(learning)), new.visibility);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists answers_growth on public.answers;
create trigger answers_growth
  after insert or update on public.answers
  for each row execute function public.agora_growth_from_answers();

-- Event when a Big Five test is taken; follows the result's visibility.
create or replace function public.agora_growth_from_ipip()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.growth_log (user_id, kind, payload, visibility)
    values (new.user_id, 'test_taken', jsonb_build_object(
              'block', 'b4', 'result_id', new.id,
              'extraversion', new.extraversion, 'agreeableness', new.agreeableness,
              'conscientiousness', new.conscientiousness,
              'emotional_stability', new.emotional_stability, 'openness', new.openness),
            new.visibility);
  elsif new.visibility is distinct from old.visibility then
    update public.growth_log set visibility = new.visibility
     where user_id = new.user_id and payload->>'block' = 'b4';
  end if;
  return null;
end;
$$;

drop trigger if exists ipip_growth on public.ipip_results;
create trigger ipip_growth
  after insert or update of visibility on public.ipip_results
  for each row execute function public.agora_growth_from_ipip();

-- Event when the questionnaire is completed for the first time.
create or replace function public.agora_growth_from_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (old.anketa_progress->>'completed_at') is null
     and (new.anketa_progress->>'completed_at') is not null then
    insert into public.growth_log (user_id, kind, payload, visibility)
    values (new.id, 'anketa_completed',
            jsonb_build_object('version', new.anketa_progress->>'version'), 'coordinators');
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_growth on public.profiles;
create trigger profiles_growth
  after update of anketa_progress on public.profiles
  for each row execute function public.agora_growth_from_profile();

revoke all on function public.agora_growth_from_answers() from public, anon, authenticated;
revoke all on function public.agora_growth_from_ipip() from public, anon, authenticated;
revoke all on function public.agora_growth_from_profile() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2. PHOTOS (private bucket, same visibility as the profile header)
-- ------------------------------------------------------------
create or replace function public.agora_can_see_profile(target text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and target ~ '^[0-9a-f-]{36}$'
     and (target = auth.uid()::text
          or exists (select 1 from public.profiles p
                     where p.id = target::uuid
                       and (p.header_visibility = 'all'
                            or (p.header_visibility = 'coordinators' and public.agora_is_coordinator()))));
$$;
revoke all on function public.agora_can_see_profile(text) from public, anon;
grant execute on function public.agora_can_see_profile(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;

create policy avatars_read on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.agora_can_see_profile((storage.foldername(name))[1]));
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- 3. DELETE MY ACCOUNT (cascades to profiles, roles, answers,
--    test results, growth log). The photo file is removed by the page
--    through the Storage API just before this call.
-- ------------------------------------------------------------
create or replace function public.agora_delete_my_account()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.agora_delete_my_account() from public, anon;
grant execute on function public.agora_delete_my_account() to authenticated;

commit;

notify pgrst, 'reload schema';
