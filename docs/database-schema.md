# Masahe Pinas — Database Schema (Phase 0 Design)

Status: Phase 0 draft · Last updated: 2026-08-05
Target: PostgreSQL (Supabase) + PostGIS. All primary keys are UUID
(`gen_random_uuid()`). All tables have `created_at timestamptz default now()`
and `updated_at timestamptz default now()` (maintained via trigger) unless
noted. Soft-deletable tables have `deleted_at timestamptz null`. This is a
logical design; exact SQL is produced in Phase 1 migrations.

## Enums (controlled lookup values)

- `app_role`: `guest` (implicit/unauthenticated, not stored), `customer`,
  `spa_owner`, `moderator`, `superadmin`
- `listing_status`: `pending_review`, `verified`, `unverified`, `suspended`,
  `archived`
- `claim_status`: `pending`, `approved`, `rejected`
- `gender_availability`: `male_only`, `female_only`, `both`, `no_preference`
- `price_range`: `budget`, `mid_range`, `premium`, `luxury`
- `subscription_status`: `trial`, `active`, `past_due`, `cancelled`, `expired`
- `review_moderation_status`: `visible`, `hidden`, `under_review`, `removed`
- `report_status`: `open`, `investigating`, `resolved`, `dismissed`
- `report_target_type`: `review`, `listing`, `user`
- `report_reason`: `fake_review`, `harassment`, `hate_speech`,
  `personal_information`, `spam`, `conflict_of_interest`, `explicit_content`,
  `blackmail_or_extortion`, `unrelated_to_business`, `illegal_service_promotion`
- `moderation_action_type`: `hide_content`, `restore_content`, `suspend_account`,
  `reinstate_account`, `approve_listing`, `reject_listing`, `approve_verification`,
  `reject_verification`, `approve_claim`, `reject_claim`, `remove_review`,
  `resolve_report`, `dismiss_report`
- `notification_type`: (open string enum in `application_settings`-driven list;
  examples in docs/product-requirements.md §Notifications)

## Core Identity & Roles

### profiles

Extends `auth.users` (Supabase). One row per authenticated user.

- `id uuid PK` (= `auth.users.id`)
- `display_name text not null`
- `avatar_url text null`
- `bio text null`
- `city text null`, `province text null`
- `is_private boolean default false` — hides parts of public profile
- `credibility_score numeric null` — internal, never exposed via public API
- `status text default 'active'` (`active`, `suspended`)
- `deleted_at`

### user_roles

- `id uuid PK`
- `user_id uuid FK -> profiles.id`, unique per `(user_id, role)`
- `role app_role not null`
- `granted_by uuid FK -> profiles.id null` (who assigned this role, for staff roles)
- Index on `user_id`

## Spa / Business Domain

### spa_businesses

- `id uuid PK`
- `slug text unique not null` (indexed)
- `owner_id uuid FK -> profiles.id null` (null = unclaimed, admin-created)
- `business_name text not null`
- `description text null`
- `logo_image_id uuid FK -> business_images.id null`
- `status listing_status not null default 'pending_review'`
- `is_premium boolean default false`
- `premium_subscription_id uuid FK -> subscriptions.id null`
- `is_recommended boolean default false` (Masahe Pinas Recommended — editorial only)
- `recommended_by uuid FK -> profiles.id null`, `recommended_at timestamptz null`
- `contact_number text null`, `booking_contact_number text null`
- `website_url text null`, `social_media_url text null`
- `price_range price_range null`
- `gender_availability gender_availability not null default 'no_preference'`
- `average_rating numeric(3,2) default 0`
- `review_count integer default 0`
- `verified_review_count integer default 0`
- `claim_status claim_status default 'approved'` (approved = normal owned/unclaimed state; used mainly on `business_claims`)
- `deleted_at`
- Indexes: `slug`, `status`, `is_premium`, `is_recommended`, trigram index on
  `business_name` for search

### spa_owners

Join/profile-extension table for owner-specific attestation data (kept
separate from `profiles` so customer accounts aren't polluted with owner
fields).

- `id uuid PK`
- `user_id uuid FK -> profiles.id unique not null`
- `full_name text not null`
- `contact_number text not null`
- `business_permit_reference text null` (private)
- `government_registration_reference text null` (private)
- `verification_document_path text null` (private storage path)
- `attested_legitimate_service boolean not null default false`

### business_claims

- `id uuid PK`
- `business_id uuid FK -> spa_businesses.id`
- `claimant_user_id uuid FK -> profiles.id`
- `status claim_status default 'pending'`
- `supporting_document_path text null` (private)
- `reviewed_by uuid FK -> profiles.id null`, `reviewed_at timestamptz null`
- `notes text null`

### business_locations

One-to-one with `spa_businesses` (kept separate for clarity/PostGIS indexing).

- `id uuid PK`
- `business_id uuid FK -> spa_businesses.id unique`
- `address_line text not null`
- `barangay text null`, `city_municipality text not null`,
  `province text not null`, `region text not null`, `postal_code text null`
- `latitude double precision not null`, `longitude double precision not null`
- `geom geography(Point,4326)` — generated/maintained from lat/lng, GiST index
  for distance queries
- Index: GiST on `geom`; btree on `(province, city_municipality)`

### business_hours

- `id uuid PK`
- `business_id uuid FK -> spa_businesses.id`
- `day_of_week smallint not null` (0=Sunday..6=Saturday)
- `open_time time null`, `close_time time null`
- `is_closed boolean default false`
- Unique `(business_id, day_of_week)`

### service_categories

Superadmin-managed lookup (e.g., Swedish Massage, Thai Massage, Sauna).

- `id uuid PK`, `slug text unique`, `name text not null`,
  `description text null`, `is_active boolean default true`

### business_services

Join table, core vs featured flag.

- `id uuid PK`
- `business_id uuid FK -> spa_businesses.id`
- `service_category_id uuid FK -> service_categories.id`
- `is_featured boolean default false`
- Unique `(business_id, service_category_id)`

### business_images

- `id uuid PK`
- `business_id uuid FK -> spa_businesses.id`
- `storage_path text not null`
- `caption text null`, `alt_text text null`
- `is_primary boolean default false`
- `position smallint default 0`
- Constraint (app-enforced + DB trigger): max 3 rows per `business_id`

## Reviews

### reviews

- `id uuid PK`
- `business_id uuid FK -> spa_businesses.id`
- `customer_id uuid FK -> profiles.id`
- `overall_rating smallint not null check (overall_rating between 1 and 5)`
- `body text not null`
- `service_date date null`
- `service_category_id uuid FK -> service_categories.id null`
- `is_verified_visit boolean default false`
- `helpful_count integer default 0`
- `moderation_status review_moderation_status default 'visible'`
- `deleted_at`
- Unique `(business_id, customer_id) where deleted_at is null` — one active
  review per customer per spa
- Indexes: `business_id`, `customer_id`, `moderation_status`

### review_ratings

Optional category ratings, one row per category per review (or wide columns —
modeled as rows for extensibility).

- `id uuid PK`
- `review_id uuid FK -> reviews.id`
- `category text check (category in ('service_quality','professionalism','cleanliness','ambience','value_for_money'))`
- `rating smallint check (rating between 1 and 5)`
- Unique `(review_id, category)`

### review_replies

One official reply per review, editable.

- `id uuid PK`
- `review_id uuid FK -> reviews.id unique`
- `business_id uuid FK -> spa_businesses.id`
- `replied_by uuid FK -> profiles.id` (must be owner of `business_id`)
- `body text not null`
- `edited_at timestamptz null`

### review_edits

Immutable history of prior review bodies/ratings (append-only).

- `id uuid PK`, `review_id uuid FK -> reviews.id`
- `previous_body text`, `previous_rating smallint`
- `edited_at timestamptz default now()`

### review_helpful_votes

- `id uuid PK`
- `review_id uuid FK -> reviews.id`
- `voter_id uuid FK -> profiles.id`
- Unique `(review_id, voter_id)` — prevents duplicate/self-vote abuse
  (self-vote additionally blocked: voter_id != reviews.customer_id, app-enforced)

### review_verifications

- `id uuid PK`, `review_id uuid FK -> reviews.id unique`
- `method text check (method in ('booking_reference','qr_code','one_time_code','manual'))`
- `reference_value text null` (private — never exposed publicly)
- `verified_by uuid FK -> profiles.id null` (moderator, for manual method)
- `verified_at timestamptz null`

## Community

### user_follows

- `id uuid PK`
- `follower_id uuid FK -> profiles.id`
- `followee_id uuid FK -> profiles.id`
- Unique `(follower_id, followee_id)`, check `follower_id <> followee_id`

### saved_businesses

- `id uuid PK`, `user_id uuid FK -> profiles.id`,
  `business_id uuid FK -> spa_businesses.id`
- Unique `(user_id, business_id)`

### badges

Superadmin-managed catalog.

- `id uuid PK`, `slug text unique`, `name text`, `description text`,
  `tier smallint null` (for leveled badges: New Explorer..Masahe Pinas Expert),
  `icon text null`

### user_badges

- `id uuid PK`, `user_id uuid FK -> profiles.id`,
  `badge_id uuid FK -> badges.id`, `awarded_at timestamptz default now()`,
  `awarded_reason text null`
- Unique `(user_id, badge_id)`

## Billing

### subscription_plans

- `id uuid PK`, `slug text unique` (e.g. `premium-monthly`),
  `name text` ("Masahe Pinas Premium"), `price_php numeric(10,2) not null`,
  `billing_cycle text default 'monthly'`, `is_active boolean default true`

### subscriptions

- `id uuid PK`
- `business_id uuid FK -> spa_businesses.id`
- `plan_id uuid FK -> subscription_plans.id`
- `status subscription_status not null default 'trial'`
- `provider_name text not null default 'test_mode'`
- `provider_reference_id text null`
- `current_period_start timestamptz null`, `current_period_end timestamptz null`
- `cancel_at_period_end boolean default false`
- Index on `business_id`, `status`

### payment_events

Append-only ledger of provider webhook/simulated events (idempotent).

- `id uuid PK`
- `subscription_id uuid FK -> subscriptions.id`
- `provider_event_id text unique not null` (idempotency key)
- `event_type text not null` (`payment_succeeded`, `payment_failed`,
  `subscription_cancelled`, ...)
- `raw_payload jsonb not null`
- `processed_at timestamptz default now()`

## Notifications, Reports, Moderation, Audit

### notifications

- `id uuid PK`, `user_id uuid FK -> profiles.id`
- `type text not null`, `title text not null`, `body text null`
- `link_url text null`, `is_read boolean default false`
- `metadata jsonb null`
- Index `(user_id, is_read)`

### content_reports

- `id uuid PK`
- `reporter_id uuid FK -> profiles.id`
- `target_type report_target_type not null`
- `target_id uuid not null` (polymorphic; app-layer join by `target_type`)
- `reason report_reason not null`
- `details text null`
- `status report_status default 'open'`
- `assigned_moderator_id uuid FK -> profiles.id null`
- Index `(status)`, `(target_type, target_id)`

### moderation_actions

Immutable log of every moderator/superadmin decision.

- `id uuid PK`
- `moderator_id uuid FK -> profiles.id`
- `action_type moderation_action_type not null`
- `target_type text not null`, `target_id uuid not null`
- `reason text not null`
- `notes text null`
- `previous_state jsonb null`, `new_state jsonb null`
- `report_id uuid FK -> content_reports.id null`
- `created_at timestamptz default now()` (no `updated_at` — immutable)

### recommendation_records

Editorial "Masahe Pinas Recommended" decision history (separate from premium).

- `id uuid PK`, `business_id uuid FK -> spa_businesses.id`
- `decided_by uuid FK -> profiles.id`, `is_recommended boolean not null`
- `criteria_notes text null`, `decided_at timestamptz default now()`

### featured_placements

Superadmin-controlled homepage/featured sections (distinct from premium
carousels and recommendations).

- `id uuid PK`, `business_id uuid FK -> spa_businesses.id`
- `placement_key text not null` (e.g. `homepage_highly_rated`)
- `starts_at timestamptz null`, `ends_at timestamptz null`
- `created_by uuid FK -> profiles.id`

### audit_logs

Platform-wide immutable audit trail for superadmin/system-level actions
(distinct from `moderation_actions`, which is specifically content moderation).

- `id uuid PK`, `actor_id uuid FK -> profiles.id null`
- `action text not null`, `entity_type text not null`, `entity_id uuid null`
- `previous_state jsonb null`, `new_state jsonb null`
- `created_at timestamptz default now()`
- No update/delete permitted at the RLS/policy level (insert-only role access)

### application_settings

Key-value platform configuration (feature flags, plan pricing display,
sorting weights, etc.), superadmin-editable.

- `key text PK`, `value jsonb not null`, `updated_by uuid FK -> profiles.id null`

## Geo & Search Notes

- PostGIS `geography(Point,4326)` on `business_locations.geom`, GiST index,
  used for `ST_DWithin` radius queries and `ST_Distance` sorting.
- Full-text/trigram search (`pg_trgm`) on `spa_businesses.business_name`,
  `business_locations.address_line/city_municipality`, and
  `service_categories.name` to support the unified keyword search box.
- Cursor-based pagination keys: `(created_at, id)` for reviews and listings
  to support stable infinite scroll (see docs/architecture.md §Performance
  intent and product-requirements §24).

## Soft Deletion & History Policy

- `spa_businesses`, `reviews`, `profiles` use `deleted_at` (soft delete) so
  audit trails and review history remain intact.
- `review_edits`, `moderation_actions`, `audit_logs`, `payment_events` are
  append-only/immutable by design — no update or hard-delete policy is ever
  granted to non-service-role callers.

## Next Step

Phase 1 turns this into versioned SQL migrations under `/supabase/migrations`,
paired 1:1 with RLS policies defined in [permissions.md](./permissions.md).
