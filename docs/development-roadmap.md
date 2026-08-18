# Masahe Pinas — Development Roadmap

Status: living document · MVP scope (Phases 1-8) complete · Last updated:
2026-08-06

Phases are executed in order. Each phase ends with the phase summary format
defined in the master brief (features completed, files created/modified,
migrations, security policies, tests + results, known limitations, manual
setup required, env vars required, deployment impact, recommended next
phase), and updates this file plus `CHANGELOG.md` and `README.md`.

## Phase 0 — Product Planning & Architecture — ✅ In Progress / Completing Now

Deliverables: this roadmap, [product-requirements.md](./product-requirements.md),
[architecture.md](./architecture.md), [database-schema.md](./database-schema.md),
[permissions.md](./permissions.md), [moderation-policy.md](./moderation-policy.md),
[security-checklist.md](./security-checklist.md).
Repository confirmed empty at start of Phase 0.

## Phase 1 — Project Foundation — ✅ Complete (2026-08-05)

Turborepo scaffold (`apps/web`, `apps/mobile`, `packages/ui|types|database|
validation|config|utils`), TypeScript strict config, ESLint/Prettier,
Supabase migration (`profiles`, `user_roles` + RLS + signup trigger), design
tokens (dark-mode palette from the brief), base auth (sign up/sign in/email
verification/password reset foundations on web + mobile), error boundaries,
logging foundations, test runner setup (Vitest for packages/web, Jest for
mobile).
**Acceptance:** `npm run typecheck`/`lint`/`test` pass across all 8
workspaces; `next build` succeeds; mobile app structure runs under Expo
(pending a real Supabase project + device/simulator for a live manual
smoke test); roles are stored and read server-side only
(`profiles`/`user_roles` + RLS, `lib/auth.ts`); no secrets committed
(`.env.example` only); README has full setup steps. See CHANGELOG.md for the
detailed file list.
**Deferred to Phase 2:** the full spa owner registration form (business
details/map pin/hours/services/verification upload) — a placeholder route
exists so the sign-up flow doesn't dead-end, but real fields depend on the
business/location schema built in Phase 2.
**Manual setup still required before this runs against real data:** a
Supabase project (URL + anon key + service role key), applying the Phase 1
migration via `supabase db push`, and populating `.env.local`/`.env` in
`apps/web`/`apps/mobile` per the README.

## Phase 2 — Spa Directory & Location Discovery — ✅ Complete (2026-08-05)

Business/location/hours/services/images schema + RLS, owner submission form
(with map pin picker via the MapProvider abstraction), superadmin manual
listing creation, public listing pages, search + filters, list/map views,
saved businesses.
**Acceptance:** customer can browse listings (`/`, `/search`, `/map`,
`/spas/[province]/[city]`, `/services/[service]`), an owner can submit a
listing (`/sign-up/spa-owner` → `/submit-a-spa`), a superadmin can add a
listing (`/admin/spas/new`), map coordinates are saved correctly (PostGIS
`geom` generated column + lat/lng columns), 3-image/2MB limits enforced
both client-side and server-side (server sniffs actual file bytes, not just
the declared MIME type), location/gender/price/verified/recommended filters
work via a server-side `search_spa_businesses` RPC, listing pages are
shareable URLs with LocalBusiness JSON-LD (AggregateRating omitted until
real reviews exist in Phase 3). Verified: typecheck/lint/test/`next build`
all pass; `next build` succeeds against the live linked Supabase project.
**Deferred to later phases (tracked, not dropped):**

- Native interactive map on mobile (MapLibre React Native needs a custom
  native module — doesn't run in Expo Go, needs an EAS dev-client build).
  Mobile's Map tab currently shows a location-sorted list instead; web has
  the full interactive MapLibre GL map.
- Full homepage sections from docs/product-requirements.md §27 (premium
  carousel, recommended carousel, explore-by-location/service grids,
  recent reviews, community contributors) — homepage currently has a
  working hero search + a "Highly rated" section; the rest depends on
  Premium (Phase 6) and Recommendation (Phase 7) data existing.
- A controlled Philippine locations table (province/city are free text on
  `business_locations` for now, matched case-insensitively for directory
  URLs) — Phase 7's "Manage Philippine locations" superadmin feature.
- Business claim workflow for superadmin-created listings — Phase 5.
- `spa_owners` table (verification documents, business permit info) —
  Phase 5 "Spa Owner Portal".

## Phase 3 — Reviews & Owner Responses — ✅ Complete (2026-08-06)

Review submission + category ratings, editing, owner replies, helpful votes,
reporting, moderation status, review edit history, basic anti-spam
(rate limits, one-active-review-per-spa enforcement), owner notifications.
**Acceptance:** duplicate reviews blocked — a unique index
(`business_id`, `customer_id`) plus the `submitReview` action always
updates an existing row instead of inserting a second one; owner replies
scoped to own spa only (`review_replies_insert`/`update` RLS require
`owns_business(business_id)`); no owner delete-review capability exists
anywhere in the UI or API (no delete policy is even granted on `reviews`
to non-staff); a moderator can hide a reported review from
`/admin/reports`, and every hide/restore/dismiss action inserts a row into
`moderation_actions` with a required reason — verified live.
**Enforced at the database layer, not just the app:**

- Self-review and self-vote are blocked by RLS `with check` clauses (an
  owner cannot review their own business; a customer cannot mark their own
  review helpful), not merely hidden in the UI.
- `average_rating`/`review_count`/`verified_review_count` on
  `spa_businesses` and `helpful_count` on `reviews` are recomputed by DB
  triggers from the actual rows — never trusted as client input.
- Review edit history (`review_edits`) is populated automatically by a
  `BEFORE UPDATE` trigger; there is no code path that edits a review
  without leaving a history row.
  **Deferred to later phases (tracked, not dropped):**
- The full Moderator Dashboard (all queues, escalation, appeals) is Phase
  7 — `/admin/reports` is a minimal but fully functional "hide/restore/
  dismiss with logged reason" surface covering the Phase 3 acceptance
  criteria, not the complete moderation UI.
- Verified-visit methods (booking reference, QR code, one-time code) are
  not implemented — `is_verified_visit` exists on the schema but nothing
  sets it yet; manual moderator verification is Phase 5+.
- Rate limiting on review/report submission (beyond the one-review-per-
  business constraint) is Phase 8 ("abuse and rate-limit testing").
- Mobile has review submit/edit/helpful-vote but no owner-reply UI or
  moderation queue — those stay web-only for now, consistent with owner/
  moderator tooling generally being desktop-first in this MVP.

## Phase 4 — Customer Community & Credibility — ✅ Complete (2026-08-06)

Public profiles, follow/unfollow, followers/following lists, credibility
score computation (server-side, formula not exposed), badge catalog +
award logic, verified-review indicator, suspicious-activity flags feeding
the moderator queue.
**Acceptance:** follow graph works (`/u/[userId]`, self-follow blocked by a
DB check constraint); badges cannot be self-assigned — `user_badges` has
no client-facing insert policy at all, the only write path is the
`award_badge_if_missing`/`evaluate_and_award_badges` `SECURITY DEFINER`
functions triggered by review/helpful-vote events; private profile fields
(the credibility score itself) stay protected — moved to a dedicated
`user_credibility_scores` table with a self-or-staff-only RLS policy,
specifically because RLS is row-level, not column-level, so a score column
sitting on the publicly-readable `profiles` row would have been readable
by anyone regardless of app-level query shaping.
**Delivered:** 11-badge catalog (5 review-count tiers + Five Helpful
Reviews, Detailed Reviewer, Community Contributor, and 3
province-specific Explorer badges), public profile pages with stats
(review count, verified count, helpful votes received, cities reviewed,
followers/following), followers/following list pages, a profile settings
page (display name/bio/city/province/private toggle), and a minimal
site-wide nav header so Phase 1-4 pages are actually reachable from each
other. Mobile: Profile tab shows real stats/badges; a public profile
screen with follow is reachable from any review author's name.
**Deferred to later phases (tracked, not dropped):**

- The full automated activity feed ("reviews from people you follow") is
  Post-MVP backlog, per the original scope call in Phase 0.
- Suspicious-activity flags / anti-fraud detection beyond the credibility
  score formula itself are Post-MVP ("Advanced/ML-based anti-fraud
  scoring") — Phase 4 computes a legitimate-activity-based score but does
  not yet implement duplicate-account or vote-manipulation detection.
- Verified-review badge criteria reference `is_verified_visit`, which
  nothing sets yet (verified-visit methods are Phase 5+, per Phase 3's
  notes) — those badge paths are wired but currently unreachable.
- Mobile has no dedicated settings screen yet (web-only); mobile's
  Community tab is still a placeholder — profile/follow works via the
  Profile tab and per-review author links instead.

## Phase 5 — Spa Owner Portal + Superadmin Admin Dashboard — ✅ Complete (2026-08-06)

Dashboard overview (status, ratings, recent reviews, profile
views/clicks/directions events), business management UI, review management
UI (no delete), owner analytics backed by real stored events, verification
application flow, business claim flow. **Scope expanded on request** to
also deliver a real in-app superadmin/moderator admin dashboard covering
user management, listing verification (business registration acceptance),
and business claim review — originally scoped for Phase 7, pulled forward
because it's the natural companion to the owner-side claim/verification
flow built in this phase.
**Acceptance:** owners manage only their own listing (RLS-enforced —
verified live), claims require review (`business_claims` has no
client-facing update policy; resolution only happens through the
`approve_business_claim`/`reject_business_claim` `SECURITY DEFINER` RPCs),
analytics reflect real stored events (`analytics_events`, populated by a
server-side listing-view record and client-side tracked Call/Directions
links — not placeholders), verification documents stay private (dedicated
`verification-documents` storage bucket, owner-or-staff-only policies).
**Delivered:**

- `/owner/dashboard` — status, average rating, review count, saved count,
  response rate, profile views/contact clicks/direction requests.
- Business claiming: a "Claim this business" banner on any unclaimed
  listing page, submitting to `business_claims`.
- Verification details (owner full name/contact, business permit and
  government registration references, one private supporting document)
  addable from `/submit-a-spa`.
- `/admin` (platform stats + navigation), `/admin/listings` (verification
  queue — approve/reject/suspend/archive with a logged reason),
  `/admin/claims` (approve/reject via the RPCs above), `/admin/users`
  (search, suspend/reinstate — moderator; grant/revoke the moderator role
  — superadmin-only, logged to a new platform-wide `audit_logs` table
  distinct from `moderation_actions`).
  **Deferred to later phases (tracked, not dropped):**
- Listing-change approval routing (re-review on edits to an already-
  verified listing, per docs/moderation-policy.md §5) is not implemented —
  edits currently publish immediately, same as Phase 2. This is a
  deliberate trim to fit the expanded admin-dashboard scope; revisit in
  Phase 7/8.
- `/admin/users` searches by display name only — email-based lookup would
  need the Supabase service-role admin API, and `SUPABASE_SERVICE_ROLE_KEY`
  isn't configured in this environment (still blank in `.env.local`).
- No mobile owner dashboard or admin surface — consistent with Phase 3/4,
  owner/moderator/superadmin tooling stays web-only for this MVP.

## Phase 6 — Premium Subscription — ✅ Complete (2026-08-06)

`subscription_plans` seed (₱500/month Premium), a provider-agnostic
test-mode checkout/cancel flow, subscription status lifecycle (trial/
active/past_due/cancelled/expired), premium badge + clearly labelled
placement, premium analytics, cancellation flow, idempotent payment-event
handling, invoice/receipt records.
**Acceptance:**

- Free listings stay fully usable — nothing about search, listing pages,
  or submission requires Premium.
- Premium activates only on a confirmed payment event: `is_premium` is
  never client-settable (no RLS write policy on `subscriptions`/
  `spa_businesses.is_premium` for owners) — it's derived by a DB trigger
  reacting to a `subscriptions.status` change, which itself only happens
  through the `start_premium_subscription` RPC (test-mode "payment") or a
  future real webhook handler.
- Premium is always visibly labelled — the "Premium" badge added in Phase
  2 (`ListingCard`, `/spa/[slug]`) and the explicit non-editorial framing
  on `/premium` and `/owner/billing` ("Premium ... never presented as an
  independent editorial recommendation") satisfy this; search ordering
  (`search_spa_businesses`, Phase 2) already ranks `is_premium desc`
  first, so placement matches the label.
- Cancellation preserves the business record — `cancel_premium_subscription`
  only touches `subscriptions`/`payment_events`, never `spa_businesses`.
- Expiry automatically strips premium benefits — `expire_due_subscriptions`
  flips lapsed subscriptions to `expired`, and the same sync trigger turns
  off `is_premium`; scheduled hourly via `pg_cron` if enabled on the
  project (wrapped so migration succeeds either way), with a manual
  "Run expiration sweep" button on `/admin` as a fallback.
- Duplicate webhook/payment events are no-ops — `payment_events
.provider_event_id` is unique with `on conflict do nothing` in both RPCs.
  **Delivered:** `/premium` (public plan page), `/owner/billing` (current
  plan/status/period end, upgrade/cancel, billing history from
  `payment_events`), superadmin `/admin` now shows active-subscription count
  and MRR.
  **Deferred to later phases (tracked, not dropped):**
- No real payment provider integration — still test-mode only, per the
  original Phase 0 architecture call ("simulated or test-mode billing
  workflow" until a PH-compliant provider is selected).
- No mobile billing UI (web-only, consistent with owner/admin tooling in
  Phases 3-5).
- Only one plan tier exists; multi-plan pricing (if ever needed) would
  need `getPlatformStats`' MRR calc to sum actual plan prices instead of
  assuming ₱500 flat.

## Phase 7 — Moderation & Administration — ✅ Complete (2026-08-06)

Superadmin-only "recommended" listing curation (independent of Premium),
featured-placement scheduling, badge catalog management, service-category
catalog management, a platform-wide audit log viewer, and a full appeals
workflow (user submits an appeal on any moderation action against them →
staff overturn/uphold → overturning automatically reverses the underlying
action).
**Delivered:**

- `recommendation_records` (append-only history) + `spa_businesses
.is_recommended/recommended_by/recommended_at` — set only via
  `/admin/recommendations`, which requires `requireSuperadmin()`, not just
  staff. The `enforce_business_update_guard` trigger was tightened so
  these three columns specifically require `is_superadmin()`, while other
  protected columns (`is_premium`, `status`, etc.) still only require
  `is_staff()`. This keeps "Recommended" provably separate from Premium:
  Premium is set by the billing trigger from Phase 6 and is never
  superadmin-editable; Recommended is set only by a superadmin action and
  is never linked to a `subscriptions` row.
- `featured_placements` (slot key + business + start/end window),
  managed at `/admin/featured` with separate insert/update/delete RLS
  policies (a combined policy would have let one superadmin's `with
check` block another superadmin's edits).
- `/admin/badges` and `/admin/services` — superadmin CRUD over the
  `badges` and `service_categories` catalogs. Badges remain
  system-awarded only (no manual "grant to user" control, by design —
  see [moderation-policy.md](./moderation-policy.md)).
- `/admin/audit-logs` — read-only, superadmin-only viewer over
  `audit_logs` (most recent 100 entries, actor + action + entity).
- `appeals` table + `/appeals/new/[actionId]` (any authenticated user
  appeals a moderation action taken against their own content/account/
  listing) + `/admin/appeals` (staff queue). Overturning an appeal
  auto-reverses the original action (`hide_content` → review restored to
  `visible`, `suspend_account` → profile restored to `active`, listing
  rejection/suspension → `spa_business` restored to `verified`) and logs
  a new `moderation_actions` row for the reversal. Hiding a review,
  changing a listing's status away from `verified`, and suspending a user
  now all notify the affected person with a direct link to file an appeal.
  **Acceptance:**
- Moderator/superadmin permission boundaries hold under RLS: `is_staff()`
  gates most `/admin/*` routes via `requireRole('moderator')`;
  `is_superadmin()` strictly gates recommendations, featured placements,
  badges, service categories, and audit logs via `requireSuperadmin()`.
- Every sensitive action is audited — `moderation_actions` rows for every
  hide/suspend/reject/reinstate/restore/approve, `recommendation_records`
  for every recommend/un-recommend, and generic `audit_logs` entries for
  platform-management actions.
- Recommendation status is provably independent of premium billing status
  (see trigger/RLS reasoning above — no code path lets a `subscriptions`
  change touch `is_recommended`, and no code path lets `/admin/recommendations`
  touch `is_premium`).
- All moderation actions already required reasons/notes as of Phase 3
  (`moderation_actions.reason`); this phase extends that to
  recommendation decisions (`recommendation_records.notes`) and appeal
  resolutions (`appeals.resolution_notes`).
  **Deferred to later phases (tracked, not dropped):**
- No automated duplicate-listing detection or "suspicious user" fraud
  heuristics — flagged for Post-MVP; would need a dedicated scoring job.
- No controlled Philippine locations table (province/city are still free
  text validated client-side) — Post-MVP, needs a canonical PSGC dataset.
- Audit log viewer is read-only with no filtering/search yet — sufficient
  for MVP scale, revisit if the table grows large enough to need
  pagination/filters.

## Phase 8 — QA & Launch Preparation — ✅ Complete (2026-08-06)

RLS/permission-boundary test suite, expanded unit tests, an upload-security
review, an accessibility + SEO pass, abuse/rate-limit hardening, and the
full set of launch/ops documentation deliverables.
**Delivered:**

- [supabase/tests/rls_test_suite.sql](../supabase/tests/rls_test_suite.sql) —
  a self-contained (transaction-rolled-back, safe against production)
  suite exercising guest/customer/spa_owner/moderator/superadmin against
  the RLS policies and guard triggers from migrations `0001`-`0010`:
  profile/role boundaries, the `is_recommended` superadmin-only guard
  (Phase 7), review/moderation-action visibility and immutability,
  subscription privacy, and the full appeals flow. See
  [supabase/tests/README.md](../supabase/tests/README.md) for what it
  doesn't yet cover (Post-MVP).
- 31 new unit tests across `packages/validation` (`review.test.ts`,
  `search.test.ts`, `listing.test.ts`, including `validateImageFile`'s
  size/MIME boundaries) — every schema file now has coverage, not just
  auth.
- Upload-security review: confirmed server-side magic-byte sniffing and
  bucket-level size/MIME allowlists already existed (Phase 2/5); fixed a
  real gap — the uploaded verification document had no staff-facing
  viewer — by adding a 5-minute `createSignedUrl` link on
  `/admin/listings` (never a public URL, since the bucket is private);
  hardened the WEBP magic-byte check to require both the `RIFF` and
  `WEBP` signatures, not just the RIFF prefix shared by other container
  formats.
- Accessibility + SEO: `metadataBase`/OpenGraph/Twitter card metadata,
  `viewport`/`themeColor`, a skip-to-content link, `robots.ts`, and a
  dynamic `sitemap.ts` (static routes + every verified listing). Spot-
  checked forms/images/buttons — already solid from earlier phases
  (labelled inputs, alt text, `role="alert"`, focus-visible states,
  `prefers-reduced-motion`).
- Abuse/rate-limit hardening: [lib/rate-limit.ts](../apps/web/lib/rate-limit.ts),
  a DB-backed limiter (no external Redis/KV provisioned for this MVP)
  wired into review submission, content reports, and helpful votes.
- Launch/ops docs: [launch-checklist.md](./launch-checklist.md),
  [backup-recovery.md](./backup-recovery.md),
  [incident-response.md](./incident-response.md),
  [moderation-ops-guide.md](./moderation-ops-guide.md),
  [deployment-guide.md](./deployment-guide.md),
  [app-store-prep.md](./app-store-prep.md).
  **Acceptance:** `npx turbo run typecheck lint test --force` (14/14) and
  `next build` both pass on the final Phase 8 commit;
  [security-checklist.md](./security-checklist.md) re-audited item by
  item, with every remaining unchecked item explicitly named as a
  Post-MVP follow-up rather than silently dropped.
  **Deliberately not performed in this engagement (see the relevant doc
  for what's needed):**
- No E2E test harness (Playwright/Cypress) — the app has no test runner
  for Server Actions/browser flows yet; RLS and validation-schema tests
  cover the security-critical surface in the meantime.
- No real device testing (Android/iOS hardware) or App Store/Play Store
  submission — see [app-store-prep.md](./app-store-prep.md).
- No load/performance testing under real traffic, and no CAPTCHA/bot
  challenge on public forms — both tracked as Post-MVP in
  [security-checklist.md](./security-checklist.md).
- No CI pipeline — see [deployment-guide.md](./deployment-guide.md) "CI"
  for the natural first addition.

## MVP Scope Boundary

Everything in Phases 1–8 above as described. Excludes items in the Post-MVP
backlog below.

## Post-MVP Backlog

- Review photos
- Full automated activity feed (followed users' reviews/badges)
- Multi-branch/multi-listing per owner (schema-ready, UI deferred)
- Real PH payment gateway integration replacing test-mode provider
- Booking-reference/QR verified-visit automation (beyond manual moderator
  verification)
- Private messaging (only with a dedicated safety/moderation design)
- Mobile push notifications
- Advanced/ML-based anti-fraud scoring
- Alternate map/geocoding provider swap (Google Maps/Mapbox) via the existing
  `MapProvider` abstraction
- SMS/OTP phone verification for spa owners

## Notes

Any requirement that must be deferred mid-phase is documented in that
phase's summary with the reason, and added here rather than silently
dropped (rule #24/#25).
