-- ============================================================
-- AGORA — migration 005: Members page for coordinators  (stage 6)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Requires 001–004.
--
-- The members page reads profiles / answers / ipip_results directly:
-- the existing RLS already lets coordinators see exactly the rows with
-- visibility 'all' or 'coordinators' and nothing marked 'self'.
-- This migration only adds the system-role list (member / coordinator /
-- admin) for coordinators and admins. Roles are changed by admins only,
-- through agora_set_role() from migration 001.
-- ============================================================

create or replace function public.agora_member_roles()
returns table (user_id uuid, role text)
language sql stable security definer set search_path = public
as $$
  select r.user_id, r.role
  from public.user_roles r
  where public.agora_is_coordinator();
$$;

revoke all on function public.agora_member_roles() from public, anon;
grant execute on function public.agora_member_roles() to authenticated;

notify pgrst, 'reload schema';
