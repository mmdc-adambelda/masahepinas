# Masahe Pinas — Product Requirements Document (PRD)

Status: Phase 0 draft
Owner: Product/Architecture (Claude Code)
Last updated: 2026-08-05

## 1. Product Summary

Masahe Pinas ("Massage in the Philippines") is a Philippine directory, discovery,
review, and community platform for legitimate spas, wellness centers, bath houses,
massage establishments, and massage therapists. It ships as one connected product:

- Public web app (Next.js) — SEO-first discovery, reviews, community
- Mobile app (Expo/React Native) — Android + iOS, same backend
- Spa owner portal — listing management, replies, analytics, subscription
- Moderator dashboard — trust & safety operations
- Superadmin dashboard — platform administration
- Recurring premium subscription (₱500/month) for spa owners

All clients share one Supabase-backed database, auth system, business logic
(via shared `packages/`), and permission model.

## 2. Goals

1. Help customers find trustworthy, verified massage/wellness businesses across
   the Philippines quickly, by location, service, and therapist-gender availability.
2. Give spa owners a free, low-friction way to list their business, with a paid
   Premium tier for extra visibility.
3. Maintain content integrity: reviews are hard to fake, moderation is auditable,
   and paid placement is never disguised as editorial endorsement.
4. Build a reusable, secure, typed foundation (shared types/validation/business
   logic) so the web and mobile apps never diverge in behavior.

## 3. Non-Goals (MVP)

- In-app booking/payments to spas (only "contact" and "directions" actions)
- Private messaging between users
- Therapist-level personal profiles (only business-level therapist _availability_)
- Multi-branch/multi-listing per owner (schema supports it, UI does not expose it)
- Native payment gateway integration (test/simulated billing only)
- Real-time chat, live map presence, or social feed beyond simple following

## 4. Target Users

- **Customers**: Filipino residents and visitors seeking legitimate massage/spa
  services; want trust signals (verification, reviews, ratings) and convenient
  filters (location, gender availability, price, open-now).
- **Spa Owners**: legitimate small-to-medium wellness businesses wanting free
  visibility, plus willing to pay ₱500/month for more exposure.
- **Moderators**: platform trust & safety staff (internal/contracted).
- **Superadmins**: platform operators/founders.

## 5. Core User Journeys (see docs/architecture.md §User Journeys for diagrams)

1. Guest discovers a spa near them → views listing → registers to leave a review.
2. Spa owner registers → submits listing → awaits verification → goes live as
   "Pending" then "Verified" → optionally upgrades to Premium.
3. Customer reviews a spa → owner replies → other customers mark helpful.
4. Moderator receives a report → investigates → hides content with a reason →
   audit log entry created.
5. Superadmin manually creates a listing for a business that hasn't registered →
   the real owner later files a claim → superadmin/moderator approves the claim.

## 6. Feature Scope — MVP

Directory & discovery, spa listings (owner-submitted + admin-created), map +
list search with filters, reviews + owner replies + moderation, customer
profiles + follow/badges (basic), owner dashboard, moderator dashboard,
superadmin dashboard, Premium subscription (test-mode billing), notifications
(in-app + email), SEO location/service pages, legal/policy pages.

## 7. Feature Scope — Post-MVP (backlog)

- Review photos
- Booking-reference / QR-based verified visits (beyond manual verification)
- Full activity feed (followed users' reviews/badges surfaced automatically)
- Multi-branch listings per owner
- Real payment gateway integration (PH-compatible: e.g., PayMongo/Xendit-style)
- Private messaging (only if a dedicated safety system is designed)
- Push notifications (mobile) beyond basic in-app/email
- Advanced anti-fraud ML scoring
- Google Maps/Mapbox provider swap (architecture supports it; not built)

## 8. Success Metrics

- # verified listings, # active Premium subscriptions, MRR
- Review volume & review-to-listing ratio
- % of reports resolved within SLA
- Search → listing view → contact-click conversion
- Customer retention (return visits, follow actions, review streaks)

## 9. Constraints & Assumptions

- Currency: PHP (₱). Premium plan is ₱500/month, single plan for MVP.
- Legal jurisdiction: Philippines. Content must exclude illegal/sexual services;
  "legitimate wellness services only" is enforced via registration attestation +
  moderation, not automated detection (MVP).
- Therapist personal data is NOT collected in MVP — only aggregate gender
  availability options.
- Payments: simulated/test-mode only until a PH-compliant provider is selected
  post-MVP (assumption: PayMongo-style aggregator, TBD — configurable).
- Maps: MapLibre + OSM-compatible tiles + a compliant geocoder (assumption:
  a provider with acceptable production ToS, TBD at implementation time —
  abstracted behind a provider interface so it can change without app rewrites).
- One spa per owner in MVP UI; schema supports many.

## 10. Open Questions (tracked, not blocking Phase 0)

- Final production geocoding/tiles vendor (cost + PH coverage quality).
- Final PH payment provider for real billing (Phase 6 decision).
- Whether email verification uses Supabase's built-in flow or a custom one
  (assumption: Supabase built-in for MVP).
- SMS/OTP verification for spa owner contact numbers — deferred to backlog.

## 11. Definition of Done for Phase 0

- This PRD, architecture.md, database-schema.md, permissions.md,
  moderation-policy.md, development-roadmap.md, security-checklist.md exist,
  are internally consistent, and reference each other correctly.
