# Masahe Pinas — Development Roadmap

Status: living document · Last updated: 2026-08-05

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

## Phase 2 — Spa Directory & Location Discovery

Business/location/hours/services/images schema + RLS, owner submission form
(with map pin picker via the MapProvider abstraction), superadmin manual
listing creation, public listing pages, search + filters, list/map views,
saved businesses.
**Acceptance:** customer can browse, owner can submit, superadmin can add
manually, coordinates persist correctly, 3-image/5MB limits enforced
client+server, location/gender filters work, listing pages are shareable
URLs.

## Phase 3 — Reviews & Owner Responses

Review submission + category ratings, editing, owner replies, helpful votes,
reporting, moderation status, review edit history, basic anti-spam
(rate limits, one-active-review-per-spa enforcement), owner notifications.
**Acceptance:** duplicate reviews blocked (edit existing instead), owner
replies scoped to own spa only, no owner delete-review capability exists
anywhere in the UI or API, moderator hide action is logged.

## Phase 4 — Customer Community & Credibility

Public profiles, follow/unfollow, followers/following lists, credibility
score computation (server-side, formula not exposed), badge catalog +
award logic, verified-review indicator, suspicious-activity flags feeding
the moderator queue.
**Acceptance:** follow graph works, badges cannot be self-assigned, badge
awarding is a service-role/system operation only, private profile fields
stay protected under RLS.

## Phase 5 — Spa Owner Portal

Dashboard overview (status, ratings, recent reviews, profile
views/clicks/directions events), business management UI, review management
UI (no delete), owner analytics backed by real stored events, verification
application flow, business claim flow, listing-change approval routing.
**Acceptance:** owners manage only their own listing (RLS-enforced), claims
require review, analytics reflect real events not placeholders,
verification documents stay private.

## Phase 6 — Premium Subscription

`subscription_plans` seed (₱500/month Premium), `PaymentProvider` interface

- `TestModeProvider`, checkout flow, subscription status lifecycle
  (trial/active/past_due/cancelled/expired), premium badge + clearly labelled
  placement, premium analytics, cancellation flow, idempotent payment-event
  handling, invoice/receipt records.
  **Acceptance:** free listings stay fully usable, premium activates only on
  confirmed payment event, premium is always visibly labelled (never disguised
  as editorial), cancellation preserves the business record, expiry
  automatically strips premium benefits (scheduled job), duplicate webhook
  events are no-ops.

## Phase 7 — Moderation & Administration

Moderator dashboard (all queues from
[moderation-policy.md](./moderation-policy.md)), superadmin dashboard
(platform metrics, user/listing/moderator/badge/service/location management,
recommendation + featured-placement controls, audit log viewer, appeals).
**Acceptance:** moderator/superadmin permission boundaries hold under RLS
testing, every sensitive action is audited, recommendation status is
provably independent of premium billing status, all actions require reasons.

## Phase 8 — QA & Launch Preparation

Unit/integration/E2E tests, RLS test suite, permission-boundary tests,
upload-security tests, payment tests, accessibility audit, responsive +
Android/iOS device testing, performance pass (Core Web Vitals, map marker
clustering, pagination), SEO audit, error-state and abuse/rate-limit
testing. Deliverables: launch checklist, backup strategy, DB recovery plan,
incident response guide, moderation ops guide, deployment guide, App
Store/Play Store prep guides.

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
