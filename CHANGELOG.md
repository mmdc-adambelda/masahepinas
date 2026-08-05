# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Phase 1 — Project Foundation (2026-08-05)

#### Added
- Turborepo monorepo (`turbo.json`, root `package.json` workspaces,
  `tsconfig.base.json`, root `.eslintrc.json` / `.prettierrc.json`).
- Shared packages: `@masahepinas/config`, `@masahepinas/types` (domain types
  + hand-written Supabase `Database` types), `@masahepinas/validation`
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
