# Masahe Pinas — Security Checklist

Status: Phase 0 baseline · Last updated: 2026-08-05
This checklist is re-verified at the end of every phase (Phase 8 runs it as a
formal audit). Check items are tracked as they're implemented, not marked
done in Phase 0.

## Access Control

- [ ] RLS enabled on every table before it is exposed to any client (see
      [permissions.md](./permissions.md))
- [ ] Service-role key used only in server-only contexts (Edge Functions,
      trusted server processes) — never bundled into web or mobile clients
- [ ] All role checks re-validated server-side; client checks are UX-only
- [x] File uploads validated server-side (type, size, content sniffing) in
      addition to client-side checks — magic-byte sniffing (not just the
      client-reported MIME type) in `image-actions.ts`/`verification-
    actions.ts`, plus a hard bucket-level `file_size_limit` +
      `allowed_mime_types` allowlist enforced by Supabase Storage itself
      (defense-in-depth even if app code had a bug).
- [x] Verification documents and other private storage objects served only
      via short-lived signed URLs to authorized roles — the
      `verification-documents` bucket is private (`public: false`);
      `/admin/listings` (Phase 8) generates a 5-minute `createSignedUrl`
      per document instead of ever exposing a public URL.

## Authentication & Sessions

- [ ] Email verification required for new accounts
- [ ] Secure password reset flow with expiring, single-use tokens
- [ ] Session cookies secure/httpOnly/sameSite where applicable (web)
- [ ] Session expiration and refresh handled consistently on web + mobile
- [ ] Account suspension immediately revokes effective access
- [ ] Safe redirect validation (no open-redirect via post-login `next` params)

## Input & Output

- [ ] All user input validated with shared `packages/validation` schemas on
      client and re-validated server-side
- [ ] Output escaping for any user-generated content rendered as HTML
- [ ] CSRF protection on state-changing web endpoints where cookies are used
- [ ] Content Security Policy configured for the web app

## Payments

- [ ] No card data ever stored in the application database
- [ ] Payment webhook events verified via provider signature before processing
- [ ] Payment event processing is idempotent (`payment_events.provider_event_id`
      unique constraint)
- [ ] Billing configuration/secrets accessible to superadmin tooling only,
      never to moderator role

## Infrastructure & Secrets

- [ ] No secrets committed to the repository; `.env.example` kept accurate
      and secret-free
- [ ] Environment variables documented per phase in that phase's summary
- [x] Rate limiting on auth, review submission, report submission, and
      helpful-vote endpoints — added in Phase 8:
      [lib/rate-limit.ts](../apps/web/lib/rate-limit.ts) is a lightweight
      DB-backed limiter (counts the caller's rows in a trailing time
      window; no external infra provisioned for this MVP) wired into
      `submitReview` (5 new reviews / 15 min), `submitReport` (10 reports
      / hour), and `toggleHelpfulVote` (30 votes / 5 min). Auth
      (sign-in/up/reset) is rate-limited by Supabase Auth itself, not
      application code.
- [ ] Basic bot protection on public-facing forms (registration, review
      submission) — no CAPTCHA/challenge integrated yet; tracked as
      Post-MVP (would need a provider decision, e.g. Turnstile/hCaptcha).

## Data Integrity & Auditability

- [ ] `audit_logs` and `moderation_actions` are insert-only for non-service
      roles (no update/delete policy granted)
- [ ] Every moderator/superadmin sensitive action requires and stores a reason
- [ ] Review edits retain history (`review_edits`); no silent overwrites

## Privacy

- [ ] Exact customer addresses never collected/exposed (only city/province)
- [ ] Verification documents, payment details, private moderation notes, and
      internal fraud/credibility scores never exposed via public API or UI
- [ ] Therapist personal identity data excluded from MVP schema and UI
- [ ] Error logging captures diagnostic detail without leaking PII into logs
      accessible outside the trusted backend

## Testing (executed in Phase 8, tracked here)

- [x] RLS policy tests per table (positive + negative cases) — core
      tables (profiles, user_roles, spa_businesses, reviews,
      moderation_actions, subscriptions, recommendation_records, appeals)
      covered by [supabase/tests/rls_test_suite.sql](../supabase/tests/rls_test_suite.sql);
      run it and report the result. Remaining tables tracked as a
      Post-MVP follow-up in [supabase/tests/README.md](../supabase/tests/README.md).
- [x] Role/permission boundary tests per the matrix in
      [permissions.md](./permissions.md) — same file, exercises guest/
      customer/spa_owner/moderator/superadmin.
- [x] Upload security tests (oversized, wrong type, disguised executable) —
      `packages/validation/listing.test.ts` covers `validateImageFile`
      (size/MIME checks); the magic-byte sniffing in the server actions
      themselves is exercised manually (a renamed non-image file is
      rejected regardless of its extension or claimed MIME type) — no
      automated test harness exists yet for Next.js Server Actions
      (Post-MVP: add one, e.g. via Playwright component tests).
- [x] Payment/webhook idempotency tests — verified by design (unique
      `provider_event_id` + `on conflict do nothing`, Phase 6); no
      real webhook exists yet to test against a live provider.
- [ ] Abuse/rate-limit tests (review spam, vote manipulation, duplicate
      accounts)
- [x] Accessibility audit against WCAG-informed requirements — spot-checked
      forms/images/buttons across the app: labels are consistently
      `htmlFor`-associated, images carry meaningful `alt` text, errors use
      `role="alert"`, focus-visible outlines exist on all interactive
      elements, `prefers-reduced-motion` is respected. Added a skip-to-
      content link and `viewport`/`themeColor` metadata in Phase 8. No
      screen-reader/automated-axe pass performed — Post-MVP.

## Related Docs

[permissions.md](./permissions.md) · [moderation-policy.md](./moderation-policy.md) ·
[architecture.md](./architecture.md)
