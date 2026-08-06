# Masahe Pinas — Launch Checklist

Status: Phase 8 · Last updated: 2026-08-06

The go/no-go list for taking Masahe Pinas from "builds and passes tests"
to "real users can sign up." Work through it top to bottom; items with a
linked doc have the full procedure there.

## 1. Environment & secrets

- [ ] Production Supabase project created (separate from any dev/staging
      project) — URL + anon key + service role key captured.
- [ ] `apps/web/.env.local` (or hosting platform's env var UI) populated
      with production values: `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (the real
      production domain — `sitemap.ts`/`robots.ts`/OpenGraph tags read
      this).
- [ ] `apps/mobile/.env` populated with the same Supabase project's
      `EXPO_PUBLIC_*` values.
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` (or equivalent) present in any
      client-bundled `.env` — confirm with `grep -r SERVICE_ROLE apps/`.
- [ ] `.env.example` files still contain placeholders only, not real
      values (`git diff` should show no secrets ever committed).

## 2. Database

- [ ] All migrations `0001`–`0010` applied to the production project, in
      order (`supabase db push` or pasted into the SQL Editor).
- [ ] [supabase/tests/rls_test_suite.sql](../supabase/tests/rls_test_suite.sql)
      run against production and passes end-to-end.
- [ ] `supabase/seed.sql` superadmin-bootstrap step run for at least one
      real superadmin account (see README "Bootstrap your first
      superadmin").
- [ ] pg_cron confirmed enabled (or the manual "Run expiration sweep"
      button on `/admin` documented for whoever operates the platform) —
      see [database-schema.md](./database-schema.md).
- [ ] Backup strategy in place — see [backup-recovery.md](./backup-recovery.md).

## 3. Application

- [ ] `npx turbo run typecheck lint test --force` passes clean on the
      commit being deployed.
- [ ] `next build` succeeds with production env vars.
- [ ] [security-checklist.md](./security-checklist.md) reviewed end to
      end; every unchecked item has an explicit owner/decision, not a
      silent gap.
- [ ] Deployed to a real HTTPS domain — see
      [deployment-guide.md](./deployment-guide.md).
- [ ] `robots.txt` and `sitemap.xml` reachable at the production domain
      and pointing at the production domain (not `localhost`).

## 4. Content & operations

- [ ] At least one moderator and one superadmin account exist beyond the
      founder's own, so moderation isn't a single point of failure.
- [ ] Moderator(s) walked through
      [moderation-ops-guide.md](./moderation-ops-guide.md).
- [ ] Support contact / abuse-report email address decided and reachable
      (referenced from `/terms`, `/privacy`, and moderation notifications).
- [ ] Fictional seed data removed or clearly excluded from what real
      users see (the Phase 2 seed listings are labelled `(fictional)` —
      confirm they're not left live in the production project, or keep
      only if intentionally used as demo content).

## 5. Legal / policy

- [ ] `/terms` and `/privacy` reviewed by the business owner (this
      project shipped placeholder-quality copy, not lawyer-reviewed text)
      before accepting real customer/spa-owner sign-ups.
- [ ] Premium subscription pricing/terms (`/premium`) match what's
      actually being charged once a real payment provider replaces
      test-mode billing.

## 6. Post-launch

- [ ] Error/log monitoring reachable (see `logger` usage in
      `packages/utils` — wire it to a real sink, e.g. Sentry/Logflare,
      rather than console-only, before meaningful traffic arrives).
- [ ] [incident-response.md](./incident-response.md) reviewed by whoever
      is on call.
- [ ] A rollback plan exists for the deployed web app (most hosts —
      Vercel included — keep prior deployments one click away; confirm
      this is true wherever it's actually deployed).

## Explicitly out of scope for this checklist

Device-lab testing (real Android/iOS hardware), App Store/Play Store
submission, and load/performance testing under real traffic were not
performed in this engagement — see
[app-store-prep.md](./app-store-prep.md) for what's needed before a
mobile release, and treat the web app's first weeks of real traffic as
the actual performance test, watching Core Web Vitals via your hosting
provider's analytics.
