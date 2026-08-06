-- Phase 7: Moderation & Administration
-- recommendation_records, featured_placements, appeals; tightens the
-- business-update guard so "Masahe Pinas Recommended" can only ever be set
-- by a superadmin (not any moderator) — per docs/permissions.md §2
-- ("Mark own business recommended" / "Configure Masahe Pinas
-- recommendations" is listed as superadmin-only, distinct from the
-- broader is_staff() moderation capabilities). Most of the superadmin
-- dashboard core (users, listings, claims, reports) shipped in Phase 5;
-- this migration covers what was left: recommendation/featured-placement
-- editorial controls, catalog management, and an appeals queue.

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.recommendation_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  decided_by uuid not null references public.profiles (id),
  is_recommended boolean not null,
  criteria_notes text,
  decided_at timestamptz not null default now()
);

create index recommendation_records_business_idx on public.recommendation_records (business_id);

create table public.featured_placements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  placement_key text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index featured_placements_key_idx on public.featured_placements (placement_key);

create type appeal_status as enum ('open', 'upheld', 'overturned');

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  moderation_action_id uuid not null references public.moderation_actions (id) on delete cascade,
  submitted_by uuid not null references public.profiles (id),
  message text not null check (char_length(message) between 10 and 2000),
  status appeal_status not null default 'open',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);

create index appeals_status_idx on public.appeals (status);
create index appeals_submitted_by_idx on public.appeals (submitted_by);

-- ---------------------------------------------------------------------
-- Tighten the business-update guard: is_recommended (+ its audit fields)
-- now require is_superadmin, not just is_staff. Every other protected
-- field (status, is_premium, owner_id, rating aggregates) stays
-- moderator-or-superadmin as before — verifying a listing is still a
-- moderator task; recommending one is editorial and superadmin-only.
-- ---------------------------------------------------------------------
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
      or new.recommended_at is distinct from old.recommended_at)
    and not public.is_superadmin(auth.uid())
  then
    raise exception 'Only a superadmin can change Masahe Pinas Recommended status';
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

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.recommendation_records enable row level security;
alter table public.featured_placements enable row level security;
alter table public.appeals enable row level security;

create policy "recommendation_records_select"
  on public.recommendation_records for select
  using (true);

create policy "recommendation_records_insert"
  on public.recommendation_records for insert
  with check (public.is_superadmin(auth.uid()) and decided_by = auth.uid());

create policy "featured_placements_select"
  on public.featured_placements for select
  using (true);

create policy "featured_placements_insert"
  on public.featured_placements for insert
  with check (public.is_superadmin(auth.uid()) and created_by = auth.uid());

create policy "featured_placements_update"
  on public.featured_placements for update
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

create policy "featured_placements_delete"
  on public.featured_placements for delete
  using (public.is_superadmin(auth.uid()));

create policy "appeals_select"
  on public.appeals for select
  using (submitted_by = auth.uid() or public.is_staff(auth.uid()));

create policy "appeals_insert"
  on public.appeals for insert
  with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from public.moderation_actions ma
      where ma.id = moderation_action_id
    )
  );

create policy "appeals_update_staff"
  on public.appeals for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
