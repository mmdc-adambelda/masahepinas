# Masahe Pinas — Incident Response Guide

Status: Phase 8 · Last updated: 2026-08-06

A short, practical guide for "something is wrong in production, what do I
do" — not a formal enterprise IR policy. Scale it up once the team/traffic
justifies more process.

## Severity levels

- **SEV1 — the app is down or leaking data.** Site unreachable, database
  unreachable, or evidence that RLS/auth is not enforcing correctly
  (e.g. a user can see another user's private data). Drop everything.
- **SEV2 — a feature is broken but the app is otherwise usable.** Search
  broken, reviews failing to submit, billing stuck. Fix same-day.
- **SEV3 — a bug affecting few users or a cosmetic/non-blocking issue.**
  Normal bug-triage cadence.

## First response (any SEV1/SEV2)

1. **Confirm it's real** — reproduce it yourself before assuming; check
   Supabase's status page (status.supabase.com) in case it's an upstream
   outage, not your code.
2. **Check recent changes** — what was deployed/migrated in the last 24h?
   `git log` on `main`, and the Supabase migrations list, are the first
   two places to look.
3. **Contain before you fix** — if it's a security issue (see below),
   containment comes before root-causing.
4. **Communicate** — even a one-line "we know, we're on it" to affected
   users/spa owners (via a banner, email, or support channel) buys time
   and trust.

## Suspected data exposure / RLS bypass (SEV1, treat as security incident)

1. **Contain**: if a specific policy/trigger is the culprit, you can
   temporarily tighten it (e.g. `alter table x force row level security;`
   or drop the offending permissive policy) faster than shipping a full
   fix — do this first if user data is actively exposed.
2. **Scope**: query `audit_logs`/`moderation_actions` and, if needed,
   Supabase's own project logs to determine what was actually accessed
   and by whom, and for how long the bypass existed (check migration
   history / deploy timestamps).
3. **Fix properly**: write the corrected policy, and add or extend the
   relevant block in
   [supabase/tests/rls_test_suite.sql](../supabase/tests/rls_test_suite.sql)
   so this exact bypass can never silently regress again.
4. **Verify**: re-run the full RLS test suite against production after
   the fix.
5. **Disclose**: if real user data (not fixture/test data) was exposed,
   this likely triggers a legal notification obligation under Philippine
   data privacy law (NPC / Data Privacy Act of 2012) — this is a legal
   question, not an engineering one; involve the business owner
   immediately, don't decide notification scope unilaterally as the
   engineer.

## Billing/payment incident

Current billing is test-mode only (no real payment provider — see
[development-roadmap.md](./development-roadmap.md) Phase 6), so there is
no real-money incident surface yet. Once a real provider is integrated,
add: webhook signature verification failures, duplicate-charge reports,
and provider outage handling to this section.

## Moderation/abuse incident (coordinated spam, harassment brigade, etc.)

1. Check `content_reports` volume/velocity for the affected target(s).
2. The Phase 8 rate limiter
   ([lib/rate-limit.ts](../apps/web/lib/rate-limit.ts)) caps review/
   report/vote spam per-user, but does not stop many distinct accounts
   acting in concert — for a coordinated attack, a superadmin can suspend
   the involved accounts from `/admin/users` and hide affected content
   from `/admin/reports`/`/admin/listings`.
3. Every action taken is already logged (`moderation_actions`) — no extra
   step needed to preserve the record.
4. See [moderation-ops-guide.md](./moderation-ops-guide.md) for the
   day-to-day version of this.

## Database incident

See [backup-recovery.md](./backup-recovery.md) for the actual restore
procedure. The short version: identify scope, don't restore-over-
production for a small mistake, always re-run the RLS test suite after
any restore.

## Post-incident

- [ ] Write a short retro: what happened, root cause, what would have
      caught it sooner (a test? a monitor? a review checklist item?).
- [ ] Turn the "what would have caught it sooner" answer into an actual
      change — a new RLS test assertion, a new checklist item in
      [security-checklist.md](./security-checklist.md), or a monitor —
      don't let the retro be the only artifact.

## What this project does NOT have (tracked as Post-MVP)

- An on-call rotation/paging tool (PagerDuty, Opsgenie, etc.) — for a
  single-operator MVP this is reasonably deferred; revisit once there's
  a team.
- Automated alerting on error rates/latency (depends on wiring
  `packages/utils`' `logger` to a real monitoring sink — see the launch
  checklist).
- A status page for users.
