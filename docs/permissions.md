# Masahe Pinas — Role & Permission Matrix / RLS Plan

Status: Phase 0 draft · Last updated: 2026-08-05

## 1. Roles

`guest` (unauthenticated), `customer`, `spa_owner`, `moderator`, `superadmin`.
A user's roles live in `user_roles`; a single account may hold more than one
role conceptually, but MVP UI treats `customer` and `spa_owner` as the two
primary self-service roles, with `moderator`/`superadmin` as internal staff
roles granted only by an existing superadmin (`granted_by`).

**Server is always the source of truth.** Client-side role checks (hiding a
button) are UX only; every mutation is re-checked via RLS and/or server-side
authorization code (rules #12/#13). JWT `sub` identifies the user; role is
looked up server-side per request, never trusted from client-supplied data.

## 2. Permission Matrix

Legend: ✅ allowed · 🚫 not allowed · 🔶 allowed, own-resource only

| Capability                            | Guest | Customer            | Spa Owner             | Moderator                        | Superadmin            |
| ------------------------------------- | ----- | ------------------- | --------------------- | -------------------------------- | --------------------- |
| Browse listings, search, map          | ✅    | ✅                  | ✅                    | ✅                               | ✅                    |
| View reviews                          | ✅    | ✅                  | ✅                    | ✅                               | ✅                    |
| Register / sign in                    | ✅    | —                   | —                     | —                                | —                     |
| Manage own profile                    | 🚫    | 🔶                  | 🔶                    | 🔶                               | 🔶                    |
| Submit review                         | 🚫    | ✅ (not own spa)    | 🚫                    | 🚫                               | 🚫                    |
| Edit own review                       | 🚫    | 🔶                  | 🚫                    | 🚫                               | 🚫                    |
| Delete a review                       | 🚫    | 🚫                  | 🚫                    | ✅ (with reason, soft)           | ✅                    |
| Follow/unfollow                       | 🚫    | ✅                  | ✅                    | ✅                               | ✅                    |
| Save/favorite spa                     | 🚫    | ✅                  | ✅                    | ✅                               | ✅                    |
| Mark review helpful                   | 🚫    | ✅ (not own review) | 🚫                    | 🚫                               | 🚫                    |
| Report content                        | 🚫    | ✅                  | ✅                    | ✅                               | ✅                    |
| Submit spa listing                    | 🚫    | 🚫                  | ✅                    | 🚫                               | ✅ (manual)           |
| Edit spa listing                      | 🚫    | 🚫                  | 🔶 (own)              | 🚫 (approve/reject changes only) | ✅ (any)              |
| Reply to review                       | 🚫    | 🚫                  | 🔶 (own spa only)     | 🚫                               | ✅                    |
| Edit own reply                        | 🚫    | 🚫                  | 🔶                    | 🚫                               | ✅                    |
| Delete review (owner)                 | 🚫    | 🚫                  | 🚫                    | —                                | —                     |
| View listing analytics                | 🚫    | 🚫                  | 🔶 (own)              | 🚫                               | ✅                    |
| Manage own subscription               | 🚫    | 🚫                  | 🔶                    | 🚫                               | ✅ (support override) |
| Mark own business recommended         | 🚫    | 🚫                  | 🚫                    | 🚫                               | ✅                    |
| Mark own business premium             | 🚫    | 🚫                  | 🚫 (via billing only) | 🚫                               | ✅ (support override) |
| Hide/restore content                  | 🚫    | 🚫                  | 🚫                    | ✅                               | ✅                    |
| Suspend account                       | 🚫    | 🚫                  | 🚫                    | ✅ (per policy)                  | ✅                    |
| Approve verification                  | 🚫    | 🚫                  | 🚫                    | ✅                               | ✅                    |
| Approve business claim                | 🚫    | 🚫                  | 🚫                    | ✅                               | ✅                    |
| View verification documents           | 🚫    | 🚫                  | 🔶 (own, upload only) | ✅                               | ✅                    |
| Manage moderators                     | 🚫    | 🚫                  | 🚫                    | 🚫                               | ✅                    |
| Manage service categories / locations | 🚫    | 🚫                  | 🚫                    | 🚫                               | ✅                    |
| Manage badges catalog                 | 🚫    | 🚫                  | 🚫                    | 🚫                               | ✅                    |
| View audit logs                       | 🚫    | 🚫                  | 🚫                    | 🔶 (moderation_actions only)     | ✅ (all)              |
| Access billing secrets/config         | 🚫    | 🚫                  | 🚫                    | 🚫                               | ✅                    |
| Platform settings                     | 🚫    | 🚫                  | 🚫                    | 🚫                               | ✅                    |

Explicit negative constraints called out in the brief:

- Spa owners **cannot** delete/edit customer reviews, reply to another spa's
  reviews, manage another owner's spa, edit moderation records, self-mark
  recommended/premium, or manipulate badges/credibility.
- Moderators **cannot** access billing secrets or superadmin-only platform
  ownership settings.

## 3. Row-Level Security Policy Plan (by table)

For each table: default deny, then explicit `select`/`insert`/`update`/`delete`
policies. Service-role (server-only) bypasses RLS for privileged operations
(webhooks, badge recalculation) — that key never ships to any client.

| Table                    | select                                                                                 | insert                                                   | update                                                           | delete                                          |
| ------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `profiles`               | public row (non-private fields) to all; full row to self/staff                         | on signup trigger only                                   | self, or superadmin                                              | never (soft delete only, staff)                 |
| `user_roles`             | self, staff                                                                            | superadmin only                                          | superadmin only                                                  | superadmin only                                 |
| `spa_businesses`         | public if `status in ('verified','unverified','pending_review')`*; full to owner/staff | spa_owner (self as owner) or superadmin                  | owner (own row, non-privileged fields only) or staff (any field) | staff only (soft)                               |
| `spa_owners`             | self, staff                                                                            | self (on registration)                                   | self, staff                                                      | staff                                           |
| `business_claims`        | claimant, staff                                                                        | authenticated customer/owner                             | staff (status changes)                                           | staff                                           |
| `business_locations`     | public, staff                                                                          | owner (own business), staff                              | owner (own business), staff                                      | staff                                           |
| `business_hours`         | public, staff                                                                          | owner (own business), staff                              | owner (own business), staff                                      | staff                                           |
| `service_categories`     | public                                                                                 | superadmin                                               | superadmin                                                       | superadmin                                      |
| `business_services`      | public                                                                                 | owner (own business), staff                              | owner (own business), staff                                      | owner (own business), staff                     |
| `business_images`        | public, staff                                                                          | owner (own business, ≤3 rows enforced by trigger), staff | owner (own business), staff                                      | owner (own business), staff                     |
| `reviews`                | public if `moderation_status='visible'`; own + staff see all statuses                  | customer (self, not own spa)                             | author (own review), staff                                       | never by author/owner — soft-hide by staff only |
| `review_ratings`         | follows parent review visibility                                                       | author of parent review                                  | author, staff                                                    | staff                                           |
| `review_replies`         | public with visible review                                                             | owner of `business_id` only                              | owner of `business_id` only                                      | staff only                                      |
| `review_edits`           | staff, author of parent review                                                         | system/trigger on edit                                   | never                                                            | never                                           |
| `review_helpful_votes`   | public count; row visibility staff/self                                                | authenticated customer, not own review                   | never (delete+reinsert to change)                                | self, staff                                     |
| `review_verifications`   | staff; reference_value never selectable by non-staff                                   | system/staff                                             | staff                                                            | staff                                           |
| `user_follows`           | public                                                                                 | self as follower                                         | never                                                            | self (unfollow), staff                          |
| `saved_businesses`       | self, staff                                                                            | self                                                     | never                                                            | self, staff                                     |
| `badges`                 | public                                                                                 | superadmin                                               | superadmin                                                       | superadmin                                      |
| `user_badges`            | public                                                                                 | system/service-role only                                 | never                                                            | staff                                           |
| `subscription_plans`     | public                                                                                 | superadmin                                               | superadmin                                                       | superadmin                                      |
| `subscriptions`          | owner (own business), staff                                                            | system/service-role (checkout flow), superadmin          | system/service-role, superadmin                                  | never                                           |
| `payment_events`         | staff only                                                                             | system/service-role only                                 | never                                                            | never                                           |
| `notifications`          | self only                                                                              | system/service-role                                      | self (mark read), system                                         | self, staff                                     |
| `content_reports`        | reporter (own), staff                                                                  | authenticated user                                       | staff                                                            | never                                           |
| `moderation_actions`     | staff                                                                                  | staff/system (on action)                                 | never                                                            | never                                           |
| `recommendation_records` | public (current status via `spa_businesses.is_recommended`); full history staff only   | superadmin                                               | never                                                            | never                                           |
| `featured_placements`    | public                                                                                 | superadmin                                               | superadmin                                                       | superadmin                                      |
| `audit_logs`             | superadmin only                                                                        | system/service-role only                                 | never                                                            | never                                           |
| `application_settings`   | public for flags marked public; else staff                                             | superadmin                                               | superadmin                                                       | superadmin                                      |

\* Public listing visibility still hides owner-private fields (contact
verification doc paths, internal notes) at the column/query level, not just
row level — enforced via dedicated public views rather than raw table grants.

## 4. Verification & Sensitive Document Access

`verification-documents` storage bucket: private, signed-URL access only,
generated server-side after confirming caller is the owning `spa_owner`, a
`moderator`, or a `superadmin`. No public bucket policy.

## 5. Enforcement Layers

1. **Database RLS** — baseline, cannot be bypassed by any client key.
2. **Server-side authorization** in Route Handlers/Server Actions/Edge
   Functions for anything requiring cross-table logic RLS can't express
   cleanly (e.g., "one active review per customer per spa" combined with
   business-rule messaging, subscription state transitions).
3. **Client-side gating** — UX convenience only (hide owner-only buttons from
   customers), never the actual security boundary.

## 6. Related Docs

[architecture.md](./architecture.md) · [database-schema.md](./database-schema.md) ·
[moderation-policy.md](./moderation-policy.md) · [security-checklist.md](./security-checklist.md)
