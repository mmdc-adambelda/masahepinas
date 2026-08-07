-- Closes a real gap surfaced while building the registration-approval
-- feature: "profiles_update_self" (0001_init_profiles_and_roles.sql) has
-- no column-level restriction — using (auth.uid() = id) with check
-- (auth.uid() = id) lets a user update ANY column on their own profile
-- row, including `status`. That means a 'pending_approval' user could
-- simply call `supabase.from('profiles').update({ status: 'active' })`
-- themselves and skip the approval gate entirely (and, pre-existing but
-- equally real: a 'suspended' user could un-suspend themselves the same
-- way). Fixes it with the same enforce_*_update_guard pattern already
-- used on spa_businesses/reviews.

create or replace function public.enforce_profile_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff(auth.uid()) then
    if new.status is distinct from old.status
      or new.credibility_score is distinct from old.credibility_score
    then
      raise exception 'Only staff can modify protected profile fields';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_update_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_update_guard();
