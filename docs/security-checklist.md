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
- [ ] File uploads validated server-side (type, size, content sniffing) in
      addition to client-side checks
- [ ] Verification documents and other private storage objects served only
      via short-lived signed URLs to authorized roles

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
- [ ] Rate limiting on auth, review submission, report submission, and
      helpful-vote endpoints
- [ ] Basic bot protection on public-facing forms (registration, review
      submission)

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

- [ ] RLS policy tests per table (positive + negative cases)
- [ ] Role/permission boundary tests per the matrix in
      [permissions.md](./permissions.md)
- [ ] Upload security tests (oversized, wrong type, disguised executable)
- [ ] Payment/webhook idempotency tests
- [ ] Abuse/rate-limit tests (review spam, vote manipulation, duplicate
      accounts)
- [ ] Accessibility audit against WCAG-informed requirements

## Related Docs

[permissions.md](./permissions.md) · [moderation-policy.md](./moderation-policy.md) ·
[architecture.md](./architecture.md)
