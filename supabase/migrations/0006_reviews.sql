-- Phase 3: Reviews & Owner Responses
-- reviews, review_ratings, review_replies, review_edits,
-- review_helpful_votes, content_reports, moderation_actions, notifications.
-- See docs/database-schema.md, docs/permissions.md, docs/moderation-policy.md.

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type review_moderation_status as enum ('visible', 'hidden', 'under_review', 'removed');
create type report_status as enum ('open', 'investigating', 'resolved', 'dismissed');
create type report_target_type as enum ('review', 'listing', 'user');
create type report_reason as enum (
  'fake_review', 'harassment', 'hate_speech', 'personal_information', 'spam',
  'conflict_of_interest', 'explicit_content', 'blackmail_or_extortion',
  'unrelated_to_business', 'illegal_service_promotion'
);
create type moderation_action_type as enum (
  'hide_content', 'restore_content', 'suspend_account', 'reinstate_account',
  'approve_listing', 'reject_listing', 'approve_verification', 'reject_verification',
  'approve_claim', 'reject_claim', 'remove_review', 'resolve_report', 'dismiss_report'
);

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  overall_rating smallint not null check (overall_rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 3000),
  service_date date,
  service_category_id uuid references public.service_categories (id),
  is_verified_visit boolean not null default false,
  helpful_count integer not null default 0,
  moderation_status review_moderation_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index reviews_one_active_per_customer_idx
  on public.reviews (business_id, customer_id) where deleted_at is null;
create index reviews_business_idx on public.reviews (business_id);
create index reviews_customer_idx on public.reviews (customer_id);
create index reviews_moderation_status_idx on public.reviews (moderation_status);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create table public.review_ratings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  category text not null check (
    category in ('service_quality', 'professionalism', 'cleanliness', 'ambience', 'value_for_money')
  ),
  rating smallint not null check (rating between 1 and 5),
  unique (review_id, category)
);

create table public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.reviews (id) on delete cascade,
  business_id uuid not null references public.spa_businesses (id) on delete cascade,
  replied_by uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 5 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.review_edits (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  previous_body text not null,
  previous_rating smallint not null,
  edited_at timestamptz not null default now()
);

create index review_edits_review_idx on public.review_edits (review_id);

create table public.review_helpful_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (review_id, voter_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id),
  target_type report_target_type not null,
  target_id uuid not null,
  reason report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status report_status not null default 'open',
  assigned_moderator_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_reports_status_idx on public.content_reports (status);
create index content_reports_target_idx on public.content_reports (target_type, target_id);

create trigger content_reports_set_updated_at
  before update on public.content_reports
  for each row execute function public.set_updated_at();

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles (id),
  action_type moderation_action_type not null,
  target_type text not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) >= 3),
  notes text,
  previous_state jsonb,
  new_state jsonb,
  report_id uuid references public.content_reports (id),
  created_at timestamptz not null default now()
);

create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link_url text,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, is_read);

-- ---------------------------------------------------------------------
-- Guard-trigger bypass mechanism: internal recompute triggers below need
-- to update spa_businesses/reviews columns that enforce_*_update_guard
-- would otherwise block for a non-staff caller (e.g. a customer's review
-- triggering a rating recompute on a business they don't own). Each
-- trusted internal function sets a transaction-local flag before writing;
-- the guard checks it in addition to is_staff(). The flag resets
-- automatically at transaction end (set_config(..., true) = local).
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
  if not public.is_staff(auth.uid()) then
    if new.is_premium is distinct from old.is_premium
      or new.is_recommended is distinct from old.is_recommended
      or new.recommended_by is distinct from old.recommended_by
      or new.recommended_at is distinct from old.recommended_at
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

create or replace function public.enforce_review_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.bypass_review_guard', true) = 'true' then
    return new;
  end if;
  if not public.is_staff(auth.uid()) then
    if new.moderation_status is distinct from old.moderation_status
      or new.business_id is distinct from old.business_id
      or new.customer_id is distinct from old.customer_id
      or new.helpful_count is distinct from old.helpful_count
    then
      raise exception 'Only staff can modify protected review fields';
    end if;
  end if;
  return new;
end;
$$;

create trigger reviews_update_guard
  before update on public.reviews
  for each row execute function public.enforce_review_update_guard();

-- ---------------------------------------------------------------------
-- Business rating/review-count recompute (fires on any review change).
-- ---------------------------------------------------------------------
create or replace function public.recompute_business_rating(biz_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_business_guard', 'true', true);
  update public.spa_businesses
  set
    average_rating = coalesce(
      (select round(avg(overall_rating)::numeric, 2) from public.reviews
       where business_id = biz_id and moderation_status = 'visible'),
      0
    ),
    review_count = (
      select count(*) from public.reviews
      where business_id = biz_id and moderation_status = 'visible'
    ),
    verified_review_count = (
      select count(*) from public.reviews
      where business_id = biz_id and moderation_status = 'visible' and is_verified_visit
    )
  where id = biz_id;
end;
$$;

create or replace function public.reviews_recompute_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.recompute_business_rating(old.business_id);
    return old;
  end if;

  perform public.recompute_business_rating(new.business_id);
  if TG_OP = 'UPDATE' and new.business_id is distinct from old.business_id then
    perform public.recompute_business_rating(old.business_id);
  end if;
  return new;
end;
$$;

create trigger reviews_after_change
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_recompute_trigger();

-- ---------------------------------------------------------------------
-- Review edit history (append-only, populated automatically).
-- ---------------------------------------------------------------------
create or replace function public.record_review_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body or new.overall_rating is distinct from old.overall_rating then
    insert into public.review_edits (review_id, previous_body, previous_rating)
    values (old.id, old.body, old.overall_rating);
  end if;
  return new;
end;
$$;

create trigger reviews_record_edit
  before update on public.reviews
  for each row execute function public.record_review_edit();

-- ---------------------------------------------------------------------
-- Helpful-vote count recompute.
-- ---------------------------------------------------------------------
create or replace function public.recompute_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_review_id uuid := coalesce(new.review_id, old.review_id);
begin
  perform set_config('app.bypass_review_guard', 'true', true);
  update public.reviews
  set helpful_count = (
    select count(*) from public.review_helpful_votes where review_id = target_review_id
  )
  where id = target_review_id;
  return coalesce(new, old);
end;
$$;

create trigger review_helpful_votes_recompute
  after insert or delete on public.review_helpful_votes
  for each row execute function public.recompute_helpful_count();

-- ---------------------------------------------------------------------
-- Notify the business owner when a new review comes in.
-- ---------------------------------------------------------------------
create or replace function public.notify_owner_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  biz record;
begin
  select owner_id, business_name, slug into biz
  from public.spa_businesses where id = new.business_id;

  if biz.owner_id is not null then
    insert into public.notifications (user_id, type, title, body, link_url)
    values (
      biz.owner_id,
      'new_review',
      'New review received',
      'Someone left a new review on ' || biz.business_name || '.',
      '/spa/' || biz.slug
    );
  end if;
  return new;
end;
$$;

create trigger reviews_notify_owner
  after insert on public.reviews
  for each row execute function public.notify_owner_new_review();

-- ---------------------------------------------------------------------
-- review_replies: stamp edited_at whenever the reply body changes.
-- ---------------------------------------------------------------------
create or replace function public.record_reply_edit()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

create trigger review_replies_record_edit
  before update on public.review_replies
  for each row execute function public.record_reply_edit();

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.reviews enable row level security;
alter table public.review_ratings enable row level security;
alter table public.review_replies enable row level security;
alter table public.review_edits enable row level security;
alter table public.review_helpful_votes enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.notifications enable row level security;

-- reviews
create policy "reviews_select"
  on public.reviews for select
  using (
    (moderation_status = 'visible' and deleted_at is null)
    or customer_id = auth.uid()
    or public.owns_business(business_id)
    or public.is_staff(auth.uid())
  );

create policy "reviews_insert"
  on public.reviews for insert
  with check (
    customer_id = auth.uid()
    and not exists (
      select 1 from public.spa_businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

create policy "reviews_update"
  on public.reviews for update
  using (customer_id = auth.uid() or public.is_staff(auth.uid()))
  with check (customer_id = auth.uid() or public.is_staff(auth.uid()));

-- review_ratings: mirrors the parent review's visibility; writable only by
-- the review's author.
create policy "review_ratings_select"
  on public.review_ratings for select
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and (
          (r.moderation_status = 'visible' and r.deleted_at is null)
          or r.customer_id = auth.uid()
          or public.owns_business(r.business_id)
          or public.is_staff(auth.uid())
        )
    )
  );

create policy "review_ratings_write"
  on public.review_ratings for all
  using (exists (select 1 from public.reviews r where r.id = review_id and r.customer_id = auth.uid()))
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.customer_id = auth.uid()));

-- review_replies: public read alongside a visible review; only the owning
-- business can write (never delete — no delete policy granted).
create policy "review_replies_select"
  on public.review_replies for select
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and (
          (r.moderation_status = 'visible' and r.deleted_at is null)
          or r.customer_id = auth.uid()
          or public.owns_business(r.business_id)
          or public.is_staff(auth.uid())
        )
    )
  );

create policy "review_replies_insert"
  on public.review_replies for insert
  with check (public.owns_business(business_id) and replied_by = auth.uid());

create policy "review_replies_update"
  on public.review_replies for update
  using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

-- review_edits: read-only to the review's author and staff; inserted only
-- by the record_review_edit trigger (security definer).
create policy "review_edits_select"
  on public.review_edits for select
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id and (r.customer_id = auth.uid() or public.is_staff(auth.uid()))
    )
  );

-- review_helpful_votes: self-service, but never on your own review.
create policy "review_helpful_votes_select"
  on public.review_helpful_votes for select
  using (voter_id = auth.uid() or public.is_staff(auth.uid()));

create policy "review_helpful_votes_insert"
  on public.review_helpful_votes for insert
  with check (
    voter_id = auth.uid()
    and not exists (select 1 from public.reviews r where r.id = review_id and r.customer_id = auth.uid())
  );

create policy "review_helpful_votes_delete"
  on public.review_helpful_votes for delete
  using (voter_id = auth.uid());

-- content_reports
create policy "content_reports_select"
  on public.content_reports for select
  using (reporter_id = auth.uid() or public.is_staff(auth.uid()));

create policy "content_reports_insert"
  on public.content_reports for insert
  with check (reporter_id = auth.uid());

create policy "content_reports_update"
  on public.content_reports for update
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- moderation_actions: staff-only, immutable (no update/delete policy).
create policy "moderation_actions_select"
  on public.moderation_actions for select
  using (public.is_staff(auth.uid()));

create policy "moderation_actions_insert"
  on public.moderation_actions for insert
  with check (public.is_staff(auth.uid()) and moderator_id = auth.uid());

-- notifications: private to the recipient; inserted only by trusted
-- server-side triggers/functions (no client insert policy).
create policy "notifications_select"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
