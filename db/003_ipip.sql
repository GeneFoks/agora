-- ============================================================
-- AGORA — migration 003: Big Five test (IPIP-50)  (stage 4)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Requires 001 and 002.
--
-- ipip_results: one row per completed test. The browser sends only the
-- raw answers (item 1..50 → 1..5); the five sums are recomputed HERE by a
-- trigger with the official IPIP key, so nobody can write themselves
-- "good" scores. History is kept (retake allowed once per 6 months).
-- Items & key: ipip.ori.org, "50-item IPIP Big-Five Factor Markers".
-- ============================================================

begin;

create table if not exists public.ipip_results (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  test_version        text not null default 'ipip50-v1' check (char_length(test_version) <= 20),
  item_lang           text not null default 'ru' check (item_lang in ('ru', 'en')),
  translation         text check (char_length(translation) <= 30),
  raw_answers         jsonb not null,
  extraversion        smallint,
  agreeableness       smallint,
  conscientiousness   smallint,
  emotional_stability smallint,
  openness            smallint,
  visibility          text not null default 'coordinators'
                      check (visibility in ('all', 'coordinators', 'self')),
  taken_at            timestamptz not null default now()
);

create index if not exists ipip_results_user_idx on public.ipip_results (user_id, taken_at desc);

-- Score with the IPIP key. Items cycle through factors I..V:
--   item % 5 = 1 → Extraversion, 2 → Agreeableness, 3 → Conscientiousness,
--   4 → Emotional Stability, 0 → Intellect/Openness.
-- Reverse-keyed items are scored as 6 − answer.
create or replace function public.agora_ipip_score()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rev constant int[] := array[6,16,26,36,46, 2,12,22,32, 8,18,28,38,
                              4,14,24,29,34,39,44,49, 10,20,30];
  i int; v int; raw text;
  e int := 0; a int := 0; c int := 0; s int := 0; o int := 0;
begin
  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid() and auth.uid() is not null then
      raise exception 'not your result';
    end if;
    if exists (select 1 from public.ipip_results
               where user_id = new.user_id and taken_at > now() - interval '6 months') then
      raise exception 'retake_too_soon';
    end if;
    new.taken_at := now();
  end if;

  if jsonb_typeof(new.raw_answers) <> 'object' then
    raise exception 'raw_answers must be an object';
  end if;
  if (select count(*) from jsonb_object_keys(new.raw_answers)) <> 50 then
    raise exception 'need exactly 50 answers';
  end if;

  for i in 1..50 loop
    raw := new.raw_answers ->> i::text;
    if raw is null or raw !~ '^[1-5]$' then
      raise exception 'answer % must be 1..5', i;
    end if;
    v := raw::int;
    if i = any(rev) then v := 6 - v; end if;
    case i % 5
      when 1 then e := e + v;
      when 2 then a := a + v;
      when 3 then c := c + v;
      when 4 then s := s + v;
      else        o := o + v;
    end case;
  end loop;

  new.extraversion := e;
  new.agreeableness := a;
  new.conscientiousness := c;
  new.emotional_stability := s;
  new.openness := o;
  return new;
end;
$$;

drop trigger if exists ipip_score on public.ipip_results;
create trigger ipip_score
  before insert or update of raw_answers on public.ipip_results
  for each row execute function public.agora_ipip_score();
revoke all on function public.agora_ipip_score() from public, anon, authenticated;

alter table public.ipip_results enable row level security;

drop policy if exists ipip_select on public.ipip_results;
drop policy if exists ipip_insert_own on public.ipip_results;
drop policy if exists ipip_update_own on public.ipip_results;

create policy ipip_select on public.ipip_results
  for select to authenticated
  using (
    user_id = auth.uid()
    or visibility = 'all'
    or (visibility = 'coordinators' and public.agora_is_coordinator())
  );

create policy ipip_insert_own on public.ipip_results
  for insert to authenticated
  with check (user_id = auth.uid() and public.agora_has_consent());

-- The owner can change only who sees the result (column grant below).
create policy ipip_update_own on public.ipip_results
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.ipip_results from anon;
revoke all on public.ipip_results from authenticated;
grant select on public.ipip_results to authenticated;
grant insert (user_id, test_version, item_lang, translation, raw_answers, visibility)
  on public.ipip_results to authenticated;
grant update (visibility) on public.ipip_results to authenticated;
-- No delete: history is kept; it goes away only with the account.

commit;

notify pgrst, 'reload schema';
