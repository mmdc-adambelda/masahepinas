# Masahe Pinas — Deployment Guide

Status: Phase 8 · Last updated: 2026-08-06

## Backend (Supabase)

1. Create a production Supabase project (separate from any dev project
   used during development).
2. Apply every migration in `supabase/migrations/` **in filename order**
   (`0001` → `0010`), either via `supabase db push` (with the CLI linked
   to the production project) or by pasting each file into the SQL
   Editor one at a time. This has been the workflow for every phase so
   far — see [development-roadmap.md](./development-roadmap.md) for the
   phase-by-phase migration list.
3. Run [supabase/tests/rls_test_suite.sql](../supabase/tests/rls_test_suite.sql)
   against the production project and confirm it passes before pointing
   any real traffic at it.
4. Bootstrap a superadmin (README "Bootstrap your first superadmin").
5. Confirm the two storage buckets exist (`business-images` public,
   `verification-documents` private) — they're created by migrations
   `0003` and `0008` respectively; check Storage in the dashboard if
   anything looks off.
6. Confirm `pg_cron` status for the premium-expiration sweep (Phase 6) —
   either it's enabled, or you're relying on the manual "Run expiration
   sweep" button on `/admin`.

## Web app (Next.js)

The app is a standard Next.js 15 App Router project (`apps/web`) with no
platform-specific code — it deploys to Vercel with zero configuration, or
to any Node.js host that can run `next build && next start`.

### Vercel (recommended path)

1. Import the GitHub repo into Vercel, set the **Root Directory** to
   `apps/web` (this is a monorepo — Vercel needs to know which app to
   build).
2. Set environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (the real production domain, e.g.
     `https://masahepinas.com` — used by `sitemap.ts`, `robots.ts`, and
     OpenGraph tags added in Phase 8)
3. Vercel auto-detects the Next.js build command; no `vercel.json`
   override is needed unless you customize the build further.
4. Attach the production domain and confirm HTTPS (Vercel handles this
   automatically via Let's Encrypt).
5. Every push to `main` (or whatever branch is configured as production)
   auto-deploys; PRs get preview deployments for free — useful for
   reviewing a phase's changes before merging.

### Self-hosted / other Node hosts

1. `npm install` at the repo root (this is a workspaces monorepo —
   installing from the root is required so `@masahepinas/*` packages
   resolve).
2. `npm run build --workspace=apps/web` (or `cd apps/web && npx next
build`).
3. `npx next start` from `apps/web`, behind a reverse proxy (nginx/
   Caddy) terminating TLS.
4. Set the same three env vars as above via your host's env mechanism.

## Mobile app (Expo)

Not deployed as part of this engagement — see
[app-store-prep.md](./app-store-prep.md) for what's needed before a
store submission. For internal testing without a store release:

1. `apps/mobile/.env` populated with the production Supabase values.
2. `eas build` (requires an Expo/EAS account, not set up in this repo) to
   produce an installable build, or `npx expo start` + Expo Go for quick
   iteration against production data.

## CI

There is no CI pipeline configured in this repo yet (Post-MVP). At
minimum, before adding one, it should run exactly what the phase-closing
workflow has run manually every phase:

```bash
npx turbo run typecheck lint test --force
cd apps/web && npx next build
```

A GitHub Actions workflow running those two steps on every PR is the
natural first CI addition.
