# Masahe Pinas — Moderation Workflow & Policy

Status: Phase 0 draft · Last updated: 2026-08-05

## 1. Principles

1. Every moderation decision is logged immutably (`moderation_actions`) with
   moderator, target, action, reason, notes, timestamp, previous/new state.
2. Hiding ≠ deleting. Content is soft-hidden (`reviews.moderation_status`,
   `spa_businesses.status`) so it can be restored and audited; hard deletion
   is a superadmin-only, rare, and separately logged action (`audit_logs`).
3. Spa owners never get a delete button for reviews — removal is exclusively
   a moderator/superadmin action, always with a stated reason.
4. Automated flags are signals, not verdicts — they route content into a
   human queue; they never auto-hide content in the MVP.
5. Reasons are mandatory on every moderation action, both for the internal
   record and (in generalized form) for any notification sent to the
   affected user.

## 2. Content Report Reasons (customer/owner-facing)

`fake_review`, `harassment`, `hate_speech`, `personal_information`, `spam`,
`conflict_of_interest`, `explicit_content`, `blackmail_or_extortion`,
`unrelated_to_business`, `illegal_service_promotion`. Reportable targets:
reviews, listings, user profiles.

## 3. Moderation Queues (Moderator Dashboard)

1. **Report queue** — new `content_reports`, sorted by severity/age.
2. **Review moderation queue** — reports + automated flags on reviews.
3. **Listing verification queue** — new spa owner registrations awaiting
   `pending_review` → `verified` decision.
4. **Listing change approval queue** — edits to a verified listing that are
   configured to require re-approval (see §5).
5. **Duplicate listing queue** — system-flagged possible duplicates (same
   address/phone/name similarity).
6. **Suspicious user queue** — accounts flagged by rate-limit/anti-fraud
   signals (vote-stuffing, mass account creation, self-voting attempts).
7. **Appeals queue** — users contesting a prior moderation action.

Each queue item supports: assign to self, add internal note, take action
(with required reason), escalate to superadmin.

## 4. Automated Flags (signals feeding the queues, not auto-actions)

- Review posted within seconds of account creation.
- Multiple reviews from the same IP/device fingerprint in a short window.
- Helpful-vote pattern consistent with vote manipulation (many votes from
  freshly created accounts, or from accounts that only ever vote for one
  business).
- Listing fields matching an existing listing closely (name/address/phone).
- Rate-limit breach on review or report submission.

Anti-fraud scoring internals are intentionally not exposed publicly or to
end users (see docs/product-requirements.md §Customer Credibility). They are
visible to moderators/superadmins only as supporting context, never as an
auto-decision.

## 5. Listing Lifecycle & Approval Points

`pending_review` → `verified` | `unverified` (moderator/superadmin decision,
reason required) → may move to `suspended` (policy violation) → `archived`
(business closed/removed, reversible by superadmin).

Edits to a **verified** listing's core trust fields (business name, address,
verification documents) route through the listing change approval queue
before going live; cosmetic edits (description wording, hours tweak, photo
swap within the 3-image/5MB limits) publish immediately but remain subject to
retroactive report-driven review.

## 6. Business Claim Workflow

1. Superadmin creates an unclaimed listing (`spa_businesses.owner_id = null`).
2. A real owner registers/signs in and files a `business_claims` row with
   supporting evidence (private document).
3. Moderator or superadmin reviews evidence, approves or rejects with a
   reason; approval sets `spa_businesses.owner_id` and notifies the claimant.
4. All claim decisions are recorded in `moderation_actions`
   (`approve_claim`/`reject_claim`).

## 7. Review Verification

Verified-visit status (`review_verifications`) supported methods: booking
reference issued by the spa, QR code at the location, one-time visit code,
or manual moderator verification. Reference values are private and never
surfaced publicly — only the resulting boolean "Verified visit" badge is
shown on the review.

## 8. Escalation & Appeals

Moderators can escalate any queue item to a superadmin (e.g., ambiguous
policy calls, repeat offenders, legal-sounding threats). Affected users can
appeal a moderation action; appeals form their own queue and must reference
the original `moderation_actions` row.

## 9. Suspension Policy

Account suspension (customer or spa owner) requires: a stated reason, a
`moderation_actions` record, and a notification to the affected user.
Suspended spa owners' listings are set to `suspended` (hidden from public
search, listing page shows a neutral "temporarily unavailable" state, not a
punitive public message). Reinstatement follows the same logging discipline.

## 10. What Moderators Cannot Do

Access billing/payment secrets, change platform ownership/superadmin
settings, permanently hard-delete content (superadmin-only, exceptional), or
bypass the reason-required rule on any action (enforced at the server layer,
not just UI).

## 11. Related Docs

[permissions.md](./permissions.md) · [database-schema.md](./database-schema.md) ·
[product-requirements.md](./product-requirements.md)
