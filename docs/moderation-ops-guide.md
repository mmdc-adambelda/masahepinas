# Masahe Pinas — Moderation Operations Guide

Status: Phase 8 · Last updated: 2026-08-06

The day-to-day "how do I actually do my job" guide for a moderator or
superadmin. For the _policy_ behind these actions (what counts as a valid
reason to hide something, escalation rules, etc.), see
[moderation-policy.md](./moderation-policy.md) — this doc is the
operational walkthrough of the dashboard that implements that policy.

## Daily/regular routine

1. **`/admin/users`** — the registration approval queue is at the top of
   this page. New sign-ups can't use the site at all until approved here
   (see "Registration approval" below) — check this first, since it's
   blocking real people from getting in.
2. **`/admin/reports`** — the report queue. Work through open
   `content_reports`, oldest first unless something looks urgent
   (harassment, blackmail/extortion, illegal service promotion reports
   jump the queue).
3. **`/admin/listings?status=pending_review`** — new spa submissions
   awaiting verification. Check the business details, and if the owner
   uploaded a permit/registration document, use the "View verification
   document" link (a 5-minute signed URL — reload the page if it expires
   before you click it) before approving.
4. **`/admin/claims`** — existing-listing ownership claims. Same
   verification-document check applies.
5. **`/admin/appeals`** — appeals of your own or another moderator's past
   decisions. Read the original reason (shown inline) and the appellant's
   message, then Overturn or Uphold.

## Registration approval

Every new sign-up starts in a `pending_approval` state and cannot access
any page of the site (not even browsing) until a moderator or superadmin
approves them from `/admin/users`. There is no email-confirmation step
anymore — this replaced it. Approve doesn't require a reason (it's the
non-punitive default path); Reject does, and sends the same appeal-linked
notification a suspension does (there's no account-deletion path in the
app, so a rejected registration ends up `suspended`, not removed).

## Taking an action

Every action requires a reason (enforced by both the UI and, ultimately,
a database constraint — `moderation_actions.reason` has a minimum length
check). Write a real reason, not a placeholder — it's what the affected
user sees if they appeal, and what a superadmin sees auditing your
decisions later.

| You want to...                      | Where                              | Notes                                                                         |
| ----------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| Approve / reject a new registration | `/admin/users` (top section)       | Blocks all site access until approved. Reject requires a reason.              |
| Hide a review                       | `/admin/reports`                   | Notifies the review's author with an appeal link.                             |
| Verify / reject / suspend a listing | `/admin/listings`                  | Notifies the owner (if status leaves `verified`) with an appeal link.         |
| Approve / reject a claim            | `/admin/claims`                    | Reassigns ownership atomically on approval.                                   |
| Suspend a user account              | `/admin/users`                     | Notifies the user with an appeal link.                                        |
| Mark a listing "Recommended"        | `/admin/recommendations`           | **Superadmin only**, deliberately separate from Premium — see below.          |
| Schedule a featured placement       | `/admin/featured`                  | Superadmin only.                                                              |
| Manage the badge/service catalog    | `/admin/badges`, `/admin/services` | Superadmin only. Badges are system-awarded, never manually granted to a user. |
| Review the platform audit trail     | `/admin/audit-logs`                | Superadmin only, read-only.                                                   |
| Resolve an appeal                   | `/admin/appeals`                   | Overturning auto-reverses the original action.                                |

## "Recommended" vs "Premium" — do not confuse these

- **Premium** is a paid subscription (`/owner/billing`). Any listing that
  pays gets it, automatically, with no editorial judgment involved. A
  moderator/superadmin cannot grant or revoke it manually — it is
  entirely driven by subscription status.
- **Recommended** is an editorial curation decision, superadmin-only,
  made from `/admin/recommendations`. It is never influenced by whether a
  business pays for Premium — the two systems don't share any code path
  (see [development-roadmap.md](./development-roadmap.md) Phase 7 for the
  implementation detail). When recommending a listing, the criteria notes
  field exists specifically so this decision has a stated, auditable
  rationale that isn't "they paid us."

If you ever see these two conflated in a support conversation with a spa
owner, correct it explicitly — it's a trust-critical distinction for the
platform.

## Appeals: what "overturn" actually does

Overturning an appeal isn't just a status flag — it live-reverses the
underlying action:

- A hidden review is set back to visible.
- A suspended account is reinstated to active.
- A rejected/suspended listing is set back to verified.

Each reversal is itself logged as a new `moderation_actions` row, so the
full back-and-forth stays in the audit trail. Uphold does nothing beyond
recording your decision — the original action stands.

## Escalation

- Anything you're personally unsure about (edge-case content, a claim
  that smells like fraud, a legal-sounding threat in a report) — escalate
  to a superadmin rather than guessing.
- Anything that looks like a security incident (someone describing a way
  to see data they shouldn't, account takeover reports) — see
  [incident-response.md](./incident-response.md), not this doc.

## What this project does NOT have (tracked as Post-MVP)

- Automated flag scoring / triage prioritization beyond manual sorting.
- A macro/canned-response system for common moderation-notification
  wording.
- Bulk actions (e.g. hide 10 reviews at once) — every action is currently
  one row at a time by design (it's also what makes "every action has a
  reason" easy to enforce).
