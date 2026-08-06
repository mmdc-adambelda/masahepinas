-- Phase 4: Customer Community & Credibility
-- user_follows, badges, user_badges, and a private user_credibility_scores
-- table (kept separate from public.profiles so the internal signal is
-- never publicly queryable — see docs/product-requirements.md §10
-- "Do not reveal the complete anti-fraud scoring formula publicly").
-- See docs/database-schema.md, docs/permissions.md.

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index user_follows_follower_idx on public.user_follows (follower_id);
create index user_follows_followee_idx on public.user_follows (followee_id);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  tier smallint,
  icon text,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  awarded_reason text,
  unique (user_id, badge_id)
);

create index user_badges_user_idx on public.user_badges (user_id);

-- Private — never exposed to any role other than the user themselves and
-- staff. Deliberately a separate table from public.profiles (which is
-- publicly selectable) rather than reusing profiles.credibility_score,
-- because RLS is row-level, not column-level: a column on a
-- publicly-readable row is still publicly readable.
create table public.user_credibility_scores (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  score numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Badge-award helper: system-only insert path. No RLS insert policy is
-- ever granted on user_badges to customers — this SECURITY DEFINER
-- function (and the evaluator below) is the only way a badge is awarded,
-- matching "badges cannot be manually assigned by customers"
-- (docs/permissions.md).
-- ---------------------------------------------------------------------
create or replace function public.award_badge_if_missing(uid uuid, badge_slug text, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid;
begin
  select id into bid from public.badges where slug = badge_slug;
  if bid is null then
    return;
  end if;
  insert into public.user_badges (user_id, badge_id, awarded_reason)
  values (uid, bid, reason)
  on conflict (user_id, badge_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------
-- Credibility score recompute. Formula is intentionally simple and
-- internal-only (never exposed via the public API) — a starting point,
-- not the final anti-fraud system (see docs/development-roadmap.md
-- Post-MVP backlog: "Advanced/ML-based anti-fraud scoring").
-- ---------------------------------------------------------------------
create or replace function public.recompute_credibility_score(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  visible_review_count integer;
  verified_review_count integer;
  helpful_received integer;
  account_age_days integer;
  score numeric;
begin
  select count(*) into visible_review_count
  from public.reviews where customer_id = uid and moderation_status = 'visible';

  select count(*) into verified_review_count
  from public.reviews where customer_id = uid and moderation_status = 'visible' and is_verified_visit;

  select coalesce(sum(helpful_count), 0) into helpful_received
  from public.reviews where customer_id = uid and moderation_status = 'visible';

  select greatest(0, extract(day from now() - created_at))::integer into account_age_days
  from public.profiles where id = uid;

  score := (visible_review_count * 2)
    + (verified_review_count * 3)
    + (helpful_received * 1)
    + least(coalesce(account_age_days, 0) / 30.0, 12);

  insert into public.user_credibility_scores (user_id, score, updated_at)
  values (uid, score, now())
  on conflict (user_id) do update set score = excluded.score, updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------
-- Badge evaluator — checks every badge's criteria and awards any newly
-- earned ones. Idempotent (award_badge_if_missing no-ops if already held).
-- ---------------------------------------------------------------------
create or replace function public.evaluate_and_award_badges(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  visible_review_count integer;
  helpful_received integer;
  detailed_count integer;
  distinct_provinces integer;
  has_manila boolean;
  has_cebu boolean;
  has_cavite boolean;
begin
  select count(*) into visible_review_count
  from public.reviews where customer_id = uid and moderation_status = 'visible';

  select coalesce(sum(helpful_count), 0) into helpful_received
  from public.reviews where customer_id = uid and moderation_status = 'visible';

  select count(*) into detailed_count
  from public.reviews
  where customer_id = uid and moderation_status = 'visible' and char_length(body) >= 200;

  select count(distinct l.province) into distinct_provinces
  from public.reviews r
  join public.business_locations l on l.business_id = r.business_id
  where r.customer_id = uid and r.moderation_status = 'visible';

  select exists (
    select 1 from public.reviews r join public.business_locations l on l.business_id = r.business_id
    where r.customer_id = uid and r.moderation_status = 'visible' and l.province = 'Metro Manila'
  ) into has_manila;
  select exists (
    select 1 from public.reviews r join public.business_locations l on l.business_id = r.business_id
    where r.customer_id = uid and r.moderation_status = 'visible' and l.province = 'Cebu'
  ) into has_cebu;
  select exists (
    select 1 from public.reviews r join public.business_locations l on l.business_id = r.business_id
    where r.customer_id = uid and r.moderation_status = 'visible' and l.province = 'Cavite'
  ) into has_cavite;

  if visible_review_count >= 1 then perform public.award_badge_if_missing(uid, 'new-explorer'); end if;
  if visible_review_count >= 5 then perform public.award_badge_if_missing(uid, 'local-reviewer'); end if;
  if visible_review_count >= 15 then perform public.award_badge_if_missing(uid, 'trusted-reviewer'); end if;
  if visible_review_count >= 40 then perform public.award_badge_if_missing(uid, 'wellness-guide'); end if;
  if visible_review_count >= 100 then perform public.award_badge_if_missing(uid, 'masahe-pinas-expert'); end if;
  if helpful_received >= 5 then perform public.award_badge_if_missing(uid, 'five-helpful-reviews'); end if;
  if detailed_count >= 3 then perform public.award_badge_if_missing(uid, 'detailed-reviewer'); end if;
  if distinct_provinces >= 3 then perform public.award_badge_if_missing(uid, 'community-contributor'); end if;
  if has_manila then perform public.award_badge_if_missing(uid, 'metro-manila-explorer'); end if;
  if has_cebu then perform public.award_badge_if_missing(uid, 'cebu-explorer'); end if;
  if has_cavite then perform public.award_badge_if_missing(uid, 'cavite-explorer'); end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Wire credibility + badge recompute into the review lifecycle.
-- ---------------------------------------------------------------------
create or replace function public.handle_review_credibility_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_credibility_score(new.customer_id);
  perform public.evaluate_and_award_badges(new.customer_id);
  return new;
end;
$$;

create trigger reviews_credibility_update
  after insert or update of moderation_status, is_verified_visit, body on public.reviews
  for each row execute function public.handle_review_credibility_update();

create or replace function public.handle_helpful_vote_credibility_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_id uuid;
begin
  select customer_id into author_id from public.reviews where id = coalesce(new.review_id, old.review_id);
  if author_id is not null then
    perform public.recompute_credibility_score(author_id);
    perform public.evaluate_and_award_badges(author_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger review_helpful_votes_credibility_update
  after insert or delete on public.review_helpful_votes
  for each row execute function public.handle_helpful_vote_credibility_update();

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.user_follows enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_credibility_scores enable row level security;

create policy "user_follows_select"
  on public.user_follows for select
  using (true);

create policy "user_follows_insert"
  on public.user_follows for insert
  with check (follower_id = auth.uid());

create policy "user_follows_delete"
  on public.user_follows for delete
  using (follower_id = auth.uid());

create policy "badges_select"
  on public.badges for select
  using (true);

create policy "badges_write_superadmin"
  on public.badges for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- user_badges: publicly viewable (badges are a public trust signal on a
-- profile); no insert/update/delete policy for any client role — only
-- award_badge_if_missing (SECURITY DEFINER) can write here.
create policy "user_badges_select"
  on public.user_badges for select
  using (true);

-- user_credibility_scores: private to the user and staff.
create policy "user_credibility_scores_select"
  on public.user_credibility_scores for select
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------
-- Badge catalog seed (platform configuration, superadmin-managed).
-- ---------------------------------------------------------------------
insert into public.badges (slug, name, description, tier) values
  ('new-explorer', 'New Explorer', 'Posted your first review.', 1),
  ('local-reviewer', 'Local Reviewer', 'Posted 5 reviews.', 2),
  ('trusted-reviewer', 'Trusted Reviewer', 'Posted 15 reviews.', 3),
  ('wellness-guide', 'Wellness Guide', 'Posted 40 reviews.', 4),
  ('masahe-pinas-expert', 'Masahe Pinas Expert', 'Posted 100 reviews.', 5),
  ('five-helpful-reviews', 'Five Helpful Reviews', 'Received 5 helpful votes on your reviews.', null),
  ('detailed-reviewer', 'Detailed Reviewer', 'Wrote 3 or more detailed (200+ character) reviews.', null),
  ('community-contributor', 'Community Contributor', 'Reviewed businesses across 3 or more provinces.', null),
  ('metro-manila-explorer', 'Metro Manila Explorer', 'Reviewed a business in Metro Manila.', null),
  ('cebu-explorer', 'Cebu Explorer', 'Reviewed a business in Cebu.', null),
  ('cavite-explorer', 'Cavite Explorer', 'Reviewed a business in Cavite.', null)
on conflict (slug) do nothing;
