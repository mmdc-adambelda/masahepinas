# Masahe Pinas — Technical Architecture

Status: Phase 0 draft · Last updated: 2026-08-05

## 1. High-Level Architecture

```
                       ┌──────────────────────────┐
                       │        Supabase          │
                       │  Postgres + PostGIS      │
                       │  Auth (JWT)              │
                       │  Row-Level Security       │
                       │  Storage (images/docs)   │
                       │  Edge Functions           │
                       │  Realtime (notifications) │
                       └────────────┬──────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                                      │
        ┌────────▼─────────┐                 ┌──────────▼─────────┐
        │  apps/web         │                 │  apps/mobile        │
        │  Next.js (RSC)    │                 │  Expo / React Native│
        │  Vercel deploy    │                 │  EAS build           │
        │  SSR public pages │                 │  Expo Router          │
        └────────┬──────────┘                 └──────────┬───────────┘
                 │                                        │
                 └──────────────┬─────────────────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │   packages/*  (shared)  │
                     │  types · validation     │
                     │  ui (tokens/components) │
                     │  utils · database client│
                     │  config                 │
                     └─────────────────────────┘
```

Monorepo (Turborepo) with `apps/web`, `apps/mobile`, and shared `packages/*`.
Both clients talk to Supabase directly for reads (via RLS-protected views/tables)
and through server actions / Edge Functions for writes that need extra
validation, privileged logic, or third-party calls (billing, geocoding).

## 2. Monorepo Layout

```
/apps
  /web            Next.js app (App Router, RSC, Tailwind)
  /mobile         Expo app (Expo Router)
/packages
  /ui             Design tokens + cross-platform primitives (web + native)
  /types          Generated Supabase types + domain types (Review, Business, ...)
  /database       Supabase client factory, query helpers, migrations
  /validation     Zod schemas shared by web forms, mobile forms, server actions
  /config         Shared eslint/tsconfig/tailwind/app-config constants
  /utils          Formatting, geo distance helpers, slugify, date helpers
/supabase
  /migrations     SQL migrations (source of truth for schema)
  /functions      Edge Functions (webhooks, privileged operations)
/docs             Phase 0 planning docs (this folder)
/.github          CI workflows (lint, typecheck, test)
```

## 3. Web Application (apps/web)

- Next.js (App Router) + TypeScript, Tailwind CSS, Server Components by default;
  Client Components only for interactivity (forms, map, filters).
  Deploy target: Vercel.
- Public discovery pages (home, search, listing, location, service) are
  server-rendered for SEO; private dashboards (owner/moderator/superadmin) are
  client-heavy behind auth.
- PWA support (manifest + service worker for offline shell) — practical,
  not full offline-first.
- Data access: Supabase JS client. Server Components/Route Handlers use a
  server client with the user's session (never the service-role key). Sensitive
  mutations (verification approval, subscription changes, moderation actions)
  go through Route Handlers / Server Actions that re-check permissions
  server-side and, where privileged, call Supabase with the service role from
  the server only — never shipped to the browser.

## 4. Mobile Application (apps/mobile)

- Expo + React Native + TypeScript + Expo Router, EAS build profiles for
  Android and iOS (dev/preview/production).
- Reuses `packages/types`, `packages/validation`, `packages/utils`, and a
  React Native–compatible subset of `packages/ui` (tokens shared, primitives
  implemented per-platform where native components differ from web).
- Bottom tab navigation: Explore, Map, Saved, Community, Profile (customer);
  Dashboard, Listing, Reviews, Analytics, Account (owner) — role-aware nav
  chosen at runtime based on the signed-in user's role.
- Map rendering via MapLibre React Native.

## 5. Backend — Supabase

- **Postgres** as source of truth; **PostGIS** enabled for geo distance queries
  and bounding-box map search.
- **Auth**: Supabase Auth (email/password + email verification; social login
  deferred to backlog). JWT contains `sub` (user id); role/permission data is
  looked up server-side from `user_roles`, never trusted from the client.
- **Row-Level Security**: enabled on every table from the first migration that
  creates it (see docs/permissions.md and docs/database-schema.md).
- **Storage**: buckets for `business-images` (public, size/type validated),
  `verification-documents` (private, moderator/superadmin only), `avatars`
  (public, size-limited).
- **Edge Functions**: webhook receivers (payment provider), scheduled jobs
  (subscription expiry sweep, badge recalculation), and any logic requiring
  the service-role key.
- **Realtime**: used for in-app notification delivery (subscribe to the
  `notifications` table filtered by `user_id`).
- **Migrations**: plain SQL files under `/supabase/migrations`, applied via
  Supabase CLI; this is the only way schema changes are made (no manual
  production DB edits, per rule #10).

## 6. Map & Location Architecture

Provider-independent abstraction: `packages/utils/maps/MapProvider` interface
exposing `geocode(address)`, `reverseGeocode(lat,lng)`, `renderMap(props)`,
`searchAddress(query)`. Initial implementation: MapLibre GL (web) / MapLibre
React Native (mobile) rendering OSM-compatible vector tiles, backed by a
ToS-compliant geocoding provider selected at implementation time (not a
public endpoint whose terms prohibit production/heavy use). Swapping to
Google Maps or Mapbox later means writing a new provider implementation, not
rewriting call sites.

Owner address flow: text search (provider `searchAddress`) → draggable pin on
map → reverse-geocode to confirm/refine → store `latitude`, `longitude`, and
the structured address fields (barangay/city/province/region/postal code).

## 7. Billing Architecture

`packages/database` (or a dedicated `packages/billing`) defines a
`PaymentProvider` interface: `createCheckoutSession()`, `cancelSubscription()`,
`handleWebhookEvent()`, `getSubscriptionStatus()`. MVP implementation is a
`TestModeProvider` that simulates checkout success/failure without touching
real card data. `subscriptions` and `payment_events` tables are provider-
agnostic (store `provider_name`, `provider_reference_id`, generic status enum)
so a real PH provider can be plugged in during Phase 6/post-MVP without schema
changes. No card data is ever stored in the application database.

## 8. Shared Business Logic Principle

Any rule that must hold identically on web and mobile (review-one-per-spa,
image limits, permission checks used for UI gating, subscription status
derivation, badge threshold calculation) lives in `packages/validation` or
`packages/utils` and is imported by both apps — never re-implemented per
platform. Final authority for anything security-relevant is always the
server (RLS + Route Handlers/Edge Functions), per rule #12/#13.

## 9. User Journeys (summary — full diagrams to be produced as Mermaid in

a follow-up design pass)

- Guest → Search → Listing → Sign up → Review
- Owner → Register → Submit listing → Pending → Verified → (optional) Premium
- Customer → Review → Owner reply → Helpful votes → Badge progress
- Report → Moderator queue → Action + reason → Audit log
- Superadmin → Manual listing → Owner claim → Approval → Ownership transfer

## 10. Risks & Mitigations

| Risk                                              | Mitigation                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Fake/incentivized reviews                         | Verified-review system, rate limits, moderation queue, anti-fraud scoring kept private                          |
| Paid placement mistaken for editorial endorsement | Distinct, always-visible "Premium/Sponsored" labels; recommendation logic fully separate from billing status    |
| RLS misconfiguration exposing private data        | RLS policies written per-table at creation time, tested in Phase 8, verification docs bucket private by default |
| Map/geocoding vendor lock-in or cost overrun      | Provider-abstraction interface from day one                                                                     |
| Payment provider integration risk (PH market)     | Provider-agnostic billing schema + test-mode workflow first                                                     |
| Mobile/web logic divergence                       | Shared `packages/*` for types/validation/utils; no duplicated business rules                                    |
| Moderation workload / abuse at scale              | Reporting reasons taxonomy, queue-based moderator dashboard, automated flags as a _signal_ not auto-action      |
| Therapist personal data privacy exposure          | MVP intentionally excludes individual therapist PII                                                             |

## 11. Deployment

- Web: Vercel (preview deployments per PR, production on main).
- Mobile: EAS Build + EAS Submit for Android (Play Console) / iOS (App Store
  Connect), separate dev/preview/production profiles.
- Database: Supabase project per environment (local dev via Supabase CLI,
  staging, production), migrations applied identically to each.

## 12. Related Docs

[product-requirements.md](./product-requirements.md) ·
[database-schema.md](./database-schema.md) ·
[permissions.md](./permissions.md) ·
[moderation-policy.md](./moderation-policy.md) ·
[development-roadmap.md](./development-roadmap.md) ·
[security-checklist.md](./security-checklist.md)
