# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
