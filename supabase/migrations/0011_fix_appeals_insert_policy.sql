-- Fixes a bug in 0010_moderation_admin.sql discovered by running
-- supabase/tests/rls_test_suite.sql: appeals_insert's WITH CHECK used a
-- raw subquery on public.moderation_actions to verify the referenced
-- action exists:
--
--   with check (
--     submitted_by = auth.uid()
--     and exists (select 1 from public.moderation_actions ma where ma.id = moderation_action_id)
--   )
--
-- That subquery is itself subject to moderation_actions' own RLS policy
-- (moderation_actions_select: staff-only). For any non-staff caller —
-- i.e. every real appellant, since appeals exist specifically for
-- non-staff users to contest a decision — the exists() check always
-- evaluated to false, so the insert was silently rejected by RLS. In
-- effect, only a moderator/superadmin could ever successfully submit an
-- appeal, defeating the entire feature.
--
-- Fix: check existence via a SECURITY DEFINER helper that bypasses RLS
-- for this one controlled lookup, the same pattern already used for
-- is_staff()/is_superadmin() (see 0002_fix_user_roles_rls_recursion.sql).

create or replace function public.moderation_action_exists(action_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.moderation_actions where id = action_id);
$$;

drop policy if exists "appeals_insert" on public.appeals;
create policy "appeals_insert"
  on public.appeals for insert
  with check (
    submitted_by = auth.uid()
    and public.moderation_action_exists(moderation_action_id)
  );
