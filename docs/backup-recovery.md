# Masahe Pinas — Backup Strategy & DB Recovery Plan

Status: Phase 8 · Last updated: 2026-08-06

## What needs backing up

1. **Database** (Supabase Postgres) — everything: profiles, listings,
   reviews, moderation history, subscriptions, audit logs. This is the
   only irreplaceable data store in the system.
2. **Storage buckets** — `business-images` (replaceable — owners can
   re-upload) and `verification-documents` (harder to replace — ask an
   owner to re-submit if lost, but avoid losing it in the first place).
3. **Application code** — already backed up by git/GitHub; not a database
   concern, mentioned here only for completeness.

Nothing else needs a bespoke backup: all configuration lives in
migrations (version-controlled) and environment variables (documented in
the README/launch checklist, re-enterable from the Supabase dashboard).

## Supabase's built-in backups

Supabase automatically takes daily backups on paid plans (Point-in-Time
Recovery, PITR, is available on Pro+ and lets you restore to any point
within the retention window, not just a daily snapshot). Concretely:

- [ ] Confirm which plan the production project is on and what backup
      retention it includes (as of writing: paid plans get daily backups;
      PITR is a paid add-on with per-project retention you choose).
- [ ] If the project is on the Free plan, upgrade before launch — the
      Free plan has no backups, which is not an acceptable launch state
      for a platform holding real user accounts and business data.
- [ ] Note the actual retention window somewhere the on-call person can
      find it (this doc, once you've checked the dashboard) — "how far
      back can we restore" is exactly what you need mid-incident.

## Storage backups

Supabase Storage buckets are not covered by the database PITR/snapshot
mechanism the same way table data is. For `verification-documents`
specifically (the harder-to-replace bucket):

- [ ] Decide a retention/export policy (Post-MVP if traffic is still low
      enough that manual re-request from an owner is an acceptable
      fallback; revisit once claim volume grows).
- [ ] At minimum, avoid ever running a bulk delete against this bucket
      without a fresh export first.

## Recovery procedure (database)

1. **Identify scope**: is this "restore one accidentally-deleted row" or
   "the whole database is corrupted/lost"? The two need different tools.
2. **Single-row/table mistakes** (e.g. a bad manual `UPDATE` in the SQL
   Editor): use Supabase's PITR to restore to a temporary point-in-time
   branch/project, pull the correct data out via `pg_dump`/`COPY`, then
   manually re-apply just that data to production. Do not restore the
   whole production database over itself for a small mistake.
3. **Full loss/corruption**: restore the whole project from the most
   recent daily backup or PITR point via the Supabase dashboard
   (Database → Backups). This is a project-level operation — read
   Supabase's current restore flow in their dashboard before doing this
   for the first time under pressure; the exact UI changes over time and
   this doc intentionally doesn't screenshot a UI that will drift.
4. **After any restore**: re-run
   [supabase/tests/rls_test_suite.sql](../supabase/tests/rls_test_suite.sql)
   before reopening the app to traffic — a restore is exactly the kind of
   event that could silently drop a policy or trigger.
5. **Re-apply anything created after the restore point**: check
   `audit_logs`/`moderation_actions` timestamps against the restore point
   to identify what needs manual re-entry (there is no "replay the last N
   minutes of writes" tool — PITR restores to a point, it doesn't merge).

## Recovery procedure (storage)

There is no automated storage restore. If `business-images` objects are
lost, the affected owners need to re-upload (the `business_images` table
rows referencing missing objects will show broken images — clean those
rows up once you confirm the objects are actually gone). If
`verification-documents` are lost, ask the affected owner to re-submit
via `/submit-a-spa`.

## What this project does NOT have (tracked as Post-MVP)

- Automated, tested restore drills (i.e., nobody has actually run a
  restore-to-a-fresh-project rehearsal yet — do this at least once before
  it matters for real).
- A documented Recovery Time Objective / Recovery Point Objective. Pick
  numbers appropriate to actual business risk once real revenue is
  flowing through Premium subscriptions.
- Cross-region backup replication.
