# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Phase 5 — Spa Owner Portal + Superadmin Admin Dashboard (2026-08-06)

Scope expanded on request to pull the superadmin admin dashboard forward
from Phase 7 (user management, listing verification, business claims).

#### Added

- `supabase/migrations/0008_owner_portal_admin.sql`: `analytics_events`,
  `spa_owners`, `business_claims`, `audit_logs`; `approve_business_claim`/
  `reject_business_claim` `SECURITY DEFINER` RPCs (atomically reassign
  ownership, grant the `spa_owner` role, resolve the claim, and log it —
  callable by a moderator even though granting roles is normally
  superadmin-only, because authorization is checked inside the trusted
  function rather than relying on the caller's raw table privileges); a
  private `verification-documents` storage bucket.
- `packages/types/owner.ts`, `packages/validation/owner.ts`.
- **Web — owner side**: `/owner/dashboard` (status, rating, saved count,
  response rate, profile views/contact clicks/direction requests from real
  `analytics_events`); a "Claim this business" banner on unclaimed
  listings; a verification-details section (permit/registration
  references + private document upload) on `/submit-a-spa`; `TrackedLink`
  component for Call/Directions click tracking.
- **Web — admin side**: `/admin` (platform stats + nav), `/admin/listings`
  (verification queue: approve/reject/suspend/archive, logged reason
  required), `/admin/claims` (approve/reject via the RPCs above),
  `/admin/users` (search, suspend/reinstate accounts — moderator; grant/
  revoke the moderator role — superadmin-only).
- A role-aware `SiteHeader`: owners see "Owner dashboard", staff see
  "Admin".

#### Fixed

- Root `package.json` now also pins `@types/react`/`@types/react-dom` to
  ^19 (same reasoning as the Phase 1 `react`/`react-dom` pin — a stray
  hoisted `@types/react@18` was causing spurious `ReactNode`/`children`
  type mismatches). Added `.npmrc` with `legacy-peer-deps=true` so
  `npm install` doesn't fail on the resulting (expected, intentional)
  react-native/react peer conflict.

#### Security

- `business_claims` has no client-facing update policy at all — the only
  way a claim is ever resolved is the two `SECURITY DEFINER` RPCs, which
  check `is_staff(auth.uid())` internally.
- Role grants/revocations are logged to a new platform-wide `audit_logs`
  table (superadmin-only read/write), kept distinct from
  `moderation_actions` (moderator-accessible, content-moderation-focused)
  per the original docs/database-schema.md design.
- Verification documents live in a private bucket with owner-or-staff-only
  storage policies — never publicly readable.

#### Known Limitations / Deferred

- Listing-change approval routing (re-review on edits to a verified
  listing) is not implemented — edits still publish immediately.
- `/admin/users` search is display-name-only; email lookup needs the
  Supabase service-role admin API (`SUPABASE_SERVICE_ROLE_KEY` isn't
  configured).
- No mobile owner dashboard or admin surface (web-only, consistent with
  Phase 3/4).

### Phase 4 — Customer Community & Credibility (2026-08-06)

#### Added

- `supabase/migrations/0007_community.sql`: `user_follows`, `badges`,
  `user_badges`, and a **private** `user_credibility_scores` table; an
  11-badge catalog seed (review-count tiers, helpful-votes badge,
  detailed-reviewer badge, community-contributor badge, 3
  province-specific "Explorer" badges); `award_badge_if_missing`/
  `evaluate_and_award_badges`/`recompute_credibility_score` `SECURITY
DEFINER` functions wired into the review and helpful-vote lifecycle.
- **Web**: `/u/[userId]` public profile (stats, badges, recent reviews,
  follow button), `/u/[userId]/followers`, `/u/[userId]/following`,
  `/settings/profile`; a site-wide `SiteHeader` nav bar (Search, Map,
  Saved, Notifications, Profile, sign in/out) added to the root layout so
  the pages built across Phases 1-4 are actually reachable from each
  other; review authors now link to their profile.
- **Mobile**: Profile tab shows real review/helpful/follower/following
  counts and earned badges; new `u/[userId]` public profile screen with
  follow, reachable by tapping a review author's name.

#### Security

- The credibility score is deliberately **not** a column on the publicly
  readable `profiles` table — RLS is row-level, not column-level, so a
  score sitting there would be readable by anyone regardless of how the
  app queries it. It lives in `user_credibility_scores`, a separate table
  with a self-or-staff-only `select` policy.
- `user_badges` has no client-facing insert/update/delete policy at all —
  the only way a badge is ever awarded is the `SECURITY DEFINER` functions
  above, triggered by real review/vote activity. A customer cannot grant
  themselves a badge through any API call.
- Self-follow is blocked by a DB `check` constraint, not just app logic.

#### Known Limitations / Deferred

- No automated activity feed ("reviews from people you follow") yet —
  Post-MVP backlog.
- No anti-fraud/suspicious-activity detection beyond the credibility score
  formula itself (duplicate-account and vote-manipulation detection are
  Post-MVP).
- Badge criteria referencing `is_verified_visit` are wired but currently
  unreachable, since nothing sets that column yet (Phase 5+).
- Mobile has no settings screen and Community tab is still a placeholder;
  profile/follow work via the Profile tab and review-author links instead.

### Phase 3 — Reviews & Owner Responses (2026-08-06)

#### Added

- `supabase/migrations/0006_reviews.sql`: `reviews`, `review_ratings`,
  `review_replies`, `review_edits`, `review_helpful_votes`,
  `content_reports`, `moderation_actions`, `notifications`; RLS on all of
  them; DB triggers recomputing `spa_businesses.average_rating`/
  `review_count`/`verified_review_count` and `reviews.helpful_count` from
  real rows (via a transaction-local guard-bypass flag so the existing
  owner-protection trigger from Phase 2 doesn't block these internal
  system updates); an append-only `review_edits` history trigger; a
  new-review owner-notification trigger.
- `packages/types/review.ts`, `packages/validation/review.ts` (review
  submission, reply, and report schemas shared by web and mobile).
- **Web**: review submit/edit form + list with category ratings, helpful
  voting, and a report modal on `/spa/[slug]`; `/owner/reviews` (reply to
  reviews on your own business); `/notifications` (mark read/mark all
  read); `/admin/reports` (staff-only: hide/restore a reported review or
  dismiss the report, each requiring a logged reason).
- **Mobile**: review submit/edit, list, and helpful-vote wired into the
  `spa/[slug]` detail screen.

#### Security

- Self-review and self-helpful-vote are blocked by RLS `with check`
  clauses at the database layer, not just hidden in the UI.
- Rating/review-count aggregates and helpful counts are always
  server-computed from actual rows — no code path lets a client set them
  directly.
- Every moderator hide/restore/dismiss action requires a reason and is
  logged to `moderation_actions`, verified live against the linked
  Supabase project.

#### Known Limitations / Deferred

- `/admin/reports` is a minimal, functional moderation surface, not the
  full Phase 7 Moderator Dashboard (no queues beyond reports, no
  escalation/appeals yet).
- Verified-visit review verification (booking reference/QR/one-time code)
  is not implemented — `is_verified_visit` exists on the schema but is
  always `false` for now.
- Mobile has no owner-reply or moderation UI yet (web-only).

### Phase 2 — Spa Directory & Location Discovery (2026-08-05)

#### Added

- `supabase/migrations/0003_spa_directory.sql`: `service_categories`,
  `spa_businesses`, `business_locations` (PostGIS `geom` generated column),
  `business_hours`, `business_services`, `business_images`,
  `saved_businesses`; RLS on all of them; a `SECURITY DEFINER`-backed
  `enforce_business_update_guard` trigger blocking owners from touching
  `is_premium`/`is_recommended`/`status`/`owner_id`/rating fields; a
  3-image-max trigger; `business-images` storage bucket + policies; seeded
  the service category catalog (Swedish, Thai, deep tissue, etc.).
- `supabase/migrations/0004_spa_owner_signup.sql`: extends `handle_new_user`
  so spa-owner sign-ups get the `spa_owner` role and a draft
  `pending_review` listing atomically.
- `supabase/migrations/0005_search_rpc.sql`: `search_spa_businesses` SQL
  function — text search, location/service/gender/price/verified/premium/
  recommended/rating filters, PostGIS distance sort, pagination.
- `packages/types/business.ts`, extended `database.types.ts` for all new
  tables + the search RPC's typed args/return shape.
- `packages/validation/listing.ts` (business details/location/hours/
  services/image schemas), `packages/validation/search.ts` (filter schema
  shared by web and mobile).
- `packages/utils/maps/geocoding.ts`: provider-independent
  `GeocodingProvider` interface + a Nominatim (OSM) implementation for
  dev/Phase 2, swappable later per docs/architecture.md §6.
- **Web**: `/sign-up/spa-owner` (real registration form), `/submit-a-spa`
  (location map picker, hours, services, photo upload/reorder/primary),
  `/spa/[slug]` (public listing + LocalBusiness JSON-LD), `/spas/[province]`
  and `/spas/[province]/[city]` (location directory), `/services/[service]`
  (service directory), `/search` (filtered list view), `/map` (MapLibre GL
  discovery map), `/saved`, `/admin/spas/new` (superadmin manual listing
  creation). `components/MapPicker.tsx`, `ListingMap.tsx`, `DiscoveryMap.tsx`,
  `ListingCard.tsx`, `SearchFilters.tsx`.
- **Mobile**: Explore tab (search), Saved tab, `spa/[slug]` detail screen
  wired to real Supabase data; Map tab ships as a location-sorted list for
  now (see Known Limitations).
- `supabase/seed.sql`: 6 fictional, clearly-labelled Philippine spa
  listings (Metro Manila/Cebu/Cavite) for local search/filter testing.

#### Security

- Every owner-mutable table's RLS write policy is `owns_business(business_id)
OR is_staff()`; sensitive `spa_businesses` columns are additionally
  guarded by a DB trigger (not just RLS), so even a bug in application code
  can't let an owner self-grant Premium/Recommended status.
- Image uploads are validated server-side by sniffing the file's actual
  magic bytes, not the client-declared MIME type.

#### Known Limitations

- Mobile has no native interactive map yet (Expo Go can't load custom
  native modules); tracked in the roadmap.
- Directory URLs match province/city by case-insensitive text, not a
  controlled locations table (that's Phase 7).
- Business claiming and spa owner verification documents are Phase 5.

#### Manual setup required

- Apply `supabase/migrations/0003…0005` (same SQL Editor copy/paste
  workflow as before) to the linked Supabase project.
- Optionally run `supabase/seed.sql` for local search-testing data.

### Fixed (2026-08-05, post-Phase 1)

- **RLS infinite recursion on `user_roles`** (Postgres error `42P17`,
  confirmed live against the linked Supabase project): the
  `user_roles_select_self_or_staff` and `user_roles_write_superadmin_only`
  policies checked staff status via a subquery against `user_roles` from
  within a policy defined on `user_roles`, which re-triggered itself
  indefinitely. Fixed in
  `supabase/migrations/0002_fix_user_roles_rls_recursion.sql` by moving the
  check into `SECURITY DEFINER` helper functions (`public.is_staff`,
  `public.is_superadmin`) that bypass RLS for their own internal lookup.
  Documented the pattern in `docs/permissions.md` §4b for future migrations
  to follow.

### Phase 1 — Project Foundation (2026-08-05)

#### Added

- Turborepo monorepo (`turbo.json`, root `package.json` workspaces,
  `tsconfig.base.json`, root `.eslintrc.json` / `.prettierrc.json`).
- Shared packages: `@masahepinas/config`, `@masahepinas/types` (domain types
  - hand-written Supabase `Database` types), `@masahepinas/validation`
    (Zod auth schemas, with unit tests), `@masahepinas/utils` (slugify, geo
    distance, formatting, structured logger, with unit tests),
    `@masahepinas/database` (typed Supabase client factories),
    `@masahepinas/ui` (dark-mode design tokens + Tailwind preset).
- `apps/web`: Next.js 15 App Router app — dark-themed homepage, sign-up
  (customer), sign-in, forgot/reset password, email-verification callback
  route, Terms/Privacy placeholders, error/not-found/loading states,
  Supabase browser/server/middleware clients, server-side session+role
  lookup (`lib/auth.ts`).
- `apps/mobile`: Expo Router app — role-aware tab shell (Explore, Map,
  Saved, Community, Profile), sign-in/sign-up screens, SecureStore-backed
  Supabase session persistence, auth context, Metro monorepo config.
- `supabase/migrations/0001_init_profiles_and_roles.sql`: `profiles`,
  `user_roles`, `app_role`/`account_status` enums, RLS policies, and the
  `handle_new_user` signup trigger. `supabase/config.toml`, `supabase/seed.sql`.
- `.env.example` (root, `apps/web`, `apps/mobile`).

#### Verified

- `npm run typecheck`, `npm run lint`, `npm run test` all pass across all 8
  workspaces (13 unit tests: 6 validation + 7 utils).
- `next build` (production build of `apps/web`) succeeds.

#### Fixed

- Pinned `react`/`react-dom` `^19.0.0` at the workspace root so npm hoists a
  single React 19 copy for Next's runtime, while `apps/mobile` keeps its own
  nested React 18.3.1 (required by React Native 0.76) — without this, a dual
  React-copy mismatch broke `next build` with React error #31.
- Added `__InternalSupabase`/`Relationships` fields to the hand-written
  `Database` type and bumped `@supabase/ssr` to `^0.12.0` (from `^0.5.0`) so
  typed Supabase queries resolve correctly against `@supabase/supabase-js` 2.x.

#### Deferred (see docs/development-roadmap.md Post-MVP/Phase backlog)

- Full spa owner registration form (business details, map pin, hours,
  services, verification upload) — placeholder route exists; real form is
  Phase 2, once the business/location schema exists.

### Phase 0 — Product Planning & Architecture (2026-08-05)

#### Added

- `docs/product-requirements.md` — PRD: goals, scope (MVP + post-MVP),
  user journeys, constraints, open questions.
- `docs/architecture.md` — monorepo layout, web/mobile/backend architecture,
  map & billing provider abstractions, risks & mitigations.
- `docs/database-schema.md` — logical schema for all core tables (identity,
  business/listing, reviews, community, billing, moderation/audit).
- `docs/permissions.md` — role/permission matrix and per-table RLS policy
  plan for guest/customer/spa_owner/moderator/superadmin.
- `docs/moderation-policy.md` — moderation queues, report taxonomy,
  listing/claim lifecycle, escalation and suspension policy.
- `docs/development-roadmap.md` — Phase 0–8 plan with acceptance criteria,
  MVP scope boundary, and post-MVP backlog.
- `docs/security-checklist.md` — cross-cutting security checklist re-run at
  the end of every phase.
- `README.md`, `CHANGELOG.md` (this file), `.env.example`.

#### Notes

- Repository was empty prior to this phase; no application code exists yet.
- No migrations, no tests, no deployable artifacts in this phase — planning
  only, per the phased development plan.
