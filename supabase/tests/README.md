# Supabase test suite

## `rls_test_suite.sql`

An automated RLS / permission-boundary test suite covering every table
introduced in migrations `0001`-`0010` that's called out in
[docs/security-checklist.md](../../docs/security-checklist.md) §Testing and
the role matrix in [docs/permissions.md](../../docs/permissions.md).

It runs as guest/customer/spa_owner/moderator/superadmin against disposable
fixture data (a test business, a test review, five test users) and asserts
the expected allow/deny outcome for each boundary — e.g. "a customer cannot
edit someone else's review", "only a superadmin can set `is_recommended`",
"a non-staff user cannot read `moderation_actions`".

**Safe to run against a live/production-configured project**: the entire
file runs inside one transaction that always ends in `rollback`, so nothing
it creates or modifies persists.

### How to run

- **Supabase SQL Editor**: paste the whole file in and run it. Assertion
  results appear as `NOTICE`/`PASS`/`FAIL` messages in the query log.
- **psql**: `psql "$DATABASE_URL" -f supabase/tests/rls_test_suite.sql`

A clean run ends with a `=== RLS TEST SUITE: ALL ASSERTIONS PASSED ===`
notice. The script raises an exception and stops at the first failing
assertion, naming exactly which check failed — re-run after fixing the
underlying policy/trigger.

### When to run it

- After writing or changing any RLS policy or guard trigger.
- Before considering a phase's migration "done" (this was written
  retroactively in Phase 8 to cover 0001-0010; run it once now, and treat
  it as part of the checklist for every migration going forward).

### What it intentionally does not cover

- `business_claims`, `saved_businesses`, `user_follows`, `badges`,
  `user_badges`, `user_credibility_scores`, `analytics_events`,
  `featured_placements`, `content_reports`, `review_helpful_votes` RLS is
  exercised indirectly by the app's own integration surface but doesn't
  have a dedicated assertion block yet — same pattern as the tables that
  are covered, so extending this file for them is mechanical. Flagged as
  a Post-MVP follow-up in the Phase 8 summary.
- Storage bucket policies (tracked separately — see the upload-security
  notes in [docs/security-checklist.md](../../docs/security-checklist.md)).
- Load/concurrency behavior — this is a correctness suite, not a
  performance one.
