-- Closes a gap in the same family as the appeals_insert (0011) and
-- profile-status (0014) fixes: enforce_business_update_guard did not
-- protect spa_businesses.deleted_at, so any moderator (not just a
-- superadmin) could soft-delete a listing directly via the Supabase
-- client — even though the app's own UI (/admin/listings, the new
-- "Delete" action added alongside this migration) only exposes that
-- option to superadmins. Requires is_superadmin(), mirroring the
-- is_recommended precedent from 0010_moderation_admin.sql.

create or replace function public.enforce_business_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.bypass_business_guard', true) = 'true' then
    return new;
  end if;

  if (new.is_recommended is distinct from old.is_recommended
      or new.recommended_by is distinct from old.recommended_by
      or new.recommended_at is distinct from old.recommended_at
      or new.deleted_at is distinct from old.deleted_at)
    and not public.is_superadmin(auth.uid())
  then
    raise exception 'Only a superadmin can change this field';
  end if;

  if not public.is_staff(auth.uid()) then
    if new.is_premium is distinct from old.is_premium
      or new.status is distinct from old.status
      or new.owner_id is distinct from old.owner_id
      or new.average_rating is distinct from old.average_rating
      or new.review_count is distinct from old.review_count
      or new.verified_review_count is distinct from old.verified_review_count
    then
      raise exception 'Only staff can modify protected business fields';
    end if;
  end if;
  return new;
end;
$$;
