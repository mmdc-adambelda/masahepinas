-- Fixes infinite recursion (Postgres error 42P17) in the RLS policies from
-- 0001_init_profiles_and_roles.sql. Those policies checked "is this user a
-- moderator/superadmin?" by selecting from public.user_roles from *inside*
-- a policy defined ON public.user_roles — every such check re-triggered the
-- same policy, recursing forever.
--
-- Fix: move the role check into a SECURITY DEFINER helper function. Because
-- the function runs with the privileges of its owner (bypassing RLS for
-- its own internal query only), the check no longer re-triggers the policy
-- it's used inside of.

create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role in ('moderator', 'superadmin')
  );
$$;

create or replace function public.is_superadmin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = 'superadmin'
  );
$$;

-- Re-create the affected policies using the helper functions instead of a
-- recursive subquery.

drop policy if exists "profiles_update_staff" on public.profiles;
create policy "profiles_update_staff"
  on public.profiles for update
  using (public.is_staff(auth.uid()));

drop policy if exists "user_roles_select_self_or_staff" on public.user_roles;
create policy "user_roles_select_self_or_staff"
  on public.user_roles for select
  using (auth.uid() = user_id or public.is_staff(auth.uid()));

drop policy if exists "user_roles_write_superadmin_only" on public.user_roles;
create policy "user_roles_write_superadmin_only"
  on public.user_roles for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));
