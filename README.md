# Masahe Pinas

**Masahe Pinas** ("Massage in the Philippines") is a Philippine directory,
discovery, review, and community platform for legitimate spas, wellness
centers, bath houses, massage establishments, and massage therapists —
shipped as a shared-backend web app + mobile app.

## Project Status

**Phase 1 — Project Foundation (complete).** The monorepo, shared packages,
web app, mobile app, and Supabase auth foundations are scaffolded and
verified (typecheck, lint, unit tests, and a production `next build` all
pass). See [docs/development-roadmap.md](./docs/development-roadmap.md) for
the full phase plan; Phase 2 (Spa Directory & Location Discovery) is next.

## Planning Documents

- [Product Requirements](./docs/product-requirements.md)
- [Architecture](./docs/architecture.md)
- [Database Schema](./docs/database-schema.md)
- [Roles & Permissions (RLS Plan)](./docs/permissions.md)
- [Moderation Policy](./docs/moderation-policy.md)
- [Development Roadmap](./docs/development-roadmap.md)
- [Security Checklist](./docs/security-checklist.md)

## Planned Architecture (summary)

- **Monorepo**: Turborepo, `apps/web` (Next.js), `apps/mobile` (Expo/React
  Native), shared `packages/{ui,types,database,validation,config,utils}`.
- **Backend**: Supabase (Postgres + PostGIS, Auth, Row-Level Security,
  Storage, Edge Functions, Realtime).
- **Maps**: provider-independent abstraction over MapLibre/OSM-compatible
  tiles, swappable to Google Maps/Mapbox later.
- **Billing**: provider-agnostic subscription architecture; ₱500/month
  "Masahe Pinas Premium" plan, test-mode billing during early development.

Full detail in [docs/architecture.md](./docs/architecture.md).

## Monorepo Layout

```
/apps
  /web            Next.js 15 (App Router) + TypeScript + Tailwind, dark theme
  /mobile         Expo + Expo Router + TypeScript, bottom-tab navigation
/packages
  /ui             Design tokens (docs/product-requirements.md §3) + Tailwind preset
  /types          Domain types + hand-written Supabase Database types
  /database       Supabase client factories (browser/server/service-role)
  /validation     Zod schemas shared by web forms, mobile forms, server actions
  /config         App-wide constants (plan pricing, image limits, roles, ...)
  /utils          slugify, geo distance, formatting, structured logger
/supabase
  /migrations     SQL migrations (0001: profiles, user_roles, RLS, signup trigger)
  seed.sql        Local dev seed notes (empty until Phase 2 listing data exists)
/docs             Phase 0 planning docs
```

## Setup

Prerequisites: Node 20+, npm 11+, and (for real backend connectivity) the
[Supabase CLI](https://supabase.com/docs/guides/cli) + a Supabase project.

```bash
npm install
```

1. **Web app**
   - Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in your
     Supabase project's URL/anon key (`NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`), plus `NEXT_PUBLIC_SITE_URL`.
   - `npm run dev:web` (or `cd apps/web && npm run dev`) — runs at
     `http://localhost:3000`.

2. **Mobile app**
   - Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in
     `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   - `npm run dev:mobile` (or `cd apps/mobile && npm run dev`) — opens the
     Expo dev tools; scan the QR code with Expo Go, or press `a`/`i` for an
     Android/iOS simulator.

3. **Database**
   - `supabase login` / `supabase link` to your project, then
     `supabase db push` to apply `supabase/migrations/0001_init_profiles_and_roles.sql`
     (creates `profiles`, `user_roles`, RLS policies, and the
     `handle_new_user` signup trigger).
   - Bootstrap your first superadmin locally by signing up a normal account
     through the app, then running the SQL noted in `supabase/seed.sql`.

### Workspace-wide commands

```bash
npm run typecheck   # tsc --noEmit in every package/app
npm run lint        # eslint in every package/app
npm run test        # vitest (packages, web) / jest (mobile)
npm run build       # production build (currently apps/web; mobile builds via EAS in Phase 8)
npm run format      # prettier --write across the repo
```

All four (typecheck/lint/test/build) are green as of the end of Phase 1.

### Known gotcha: React version pinning

`apps/web` needs React 19 (required by Next.js 15's Server Actions), while
`apps/mobile` is pinned to React 18.3.1 (required by React Native 0.76). The
root `package.json` deliberately depends on `react`/`react-dom` `^19.0.0` so
npm hoists a single React 19 copy to the workspace root for Next's own
runtime to resolve; `apps/mobile`'s conflicting 18.3.1 requirement gets
nested under `apps/mobile/node_modules` instead, and
`apps/mobile/metro.config.js` is configured to prefer that local copy. If
this pin is ever removed, `next build` breaks with a React error #31 caused
by Next's server bundle and the app's client bundle resolving two different
React copies — keep the root-level React dependency in place.

## Contributing / Working Rules

See the implementation rules embedded in each phase of
[docs/development-roadmap.md](./docs/development-roadmap.md): RLS before any
table is exposed, server-side permission checks always, shared validation
between web and mobile, no secrets committed, honest reporting of test
results, and no silently dropped requirements (deferred items go to the
Post-MVP backlog in the roadmap).

## License

TBD.
