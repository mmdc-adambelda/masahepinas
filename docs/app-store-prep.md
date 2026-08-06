# Masahe Pinas — App Store / Play Store Prep Guide

Status: Phase 8 · Last updated: 2026-08-06

The mobile app (`apps/mobile`, Expo + Expo Router) was built and verified
to typecheck/lint/build throughout every phase, but **no device-lab
testing, EAS build, or store submission was performed in this
engagement** — those require accounts, hardware, and business decisions
(pricing, store listing copy, screenshots) that are the user's to make.
This doc is what's needed to actually get there.

## Already in place

- `apps/mobile/app.json`: app name, slug, iOS bundle identifier
  (`com.masahepinas.app`), Android package (`com.masahepinas.app`), dark
  `userInterfaceStyle`, `expo-router` configured.
- Core screens: Explore/Map/Saved (Phase 2), review submission (Phase 3),
  profile + follow (Phase 4). Owner/admin tooling is web-only by design
  (see the roadmap's Phase 3/5/6 "Deferred" notes) — the mobile app is
  customer-facing.

## Before an EAS build

1. **Expo/EAS account** — not set up in this repo; create one at
   expo.dev and run `eas login`.
2. **`eas.json`** — doesn't exist yet; `eas build:configure` generates it
   interactively (build profiles for development/preview/production).
3. **App icons & splash screens** — `assets/icon.png` is referenced in
   `app.json` but verify the actual asset files meet each store's exact
   size/format requirements (iOS and Android have different icon-size
   sets; Expo's `expo-doctor` will flag missing sizes).
4. **Push notification credentials** (if/when push is added — not in
   this MVP's scope; the in-app `notifications` table is web+in-app only
   today) — APNs key (iOS) and FCM config (Android) would be needed.
5. **Privacy manifest (iOS)** — Apple requires declaring what data is
   collected and why (App Privacy details in App Store Connect); base
   this on the actual schema — see [database-schema.md](./database-schema.md)
   and the Privacy section of
   [security-checklist.md](./security-checklist.md) for what is/isn't
   collected (no exact addresses, no therapist identity data, etc.).

## App Store (iOS) checklist

- [ ] Apple Developer Program membership (paid, annual).
- [ ] App Store Connect listing: name, subtitle, description, keywords,
      screenshots per required device size, privacy policy URL (point at
      the deployed web app's `/privacy`).
- [ ] Age rating questionnaire — answer honestly given the app deals with
      massage/spa services and user reviews (likely 12+/17+ depending on
      how content-report categories like `explicit_content` are
      answered in the questionnaire; this is a judgment call for
      whoever submits).
- [ ] TestFlight beta run before public release — this is where real
      device testing should happen, since none was done in this
      engagement.
- [ ] Sign-in/account-deletion flow reviewed against Apple's App Store
      Review Guidelines §5.1.1(v) (apps with account creation must offer
      in-app account deletion) — confirm `/settings/profile` (web) has
      an equivalent path reachable from mobile, or add one, before
      submitting.

## Play Store (Android) checklist

- [ ] Google Play Console account (one-time fee).
- [ ] Play listing: title, short/full description, screenshots, feature
      graphic, privacy policy URL.
- [ ] Data safety section filled out based on the actual schema (same
      source of truth as the iOS privacy manifest above — keep them
      consistent).
- [ ] Content rating questionnaire (IARC).
- [ ] Internal testing track run on real Android hardware before
      production release.

## Device testing (not performed in this engagement)

Before either store submission:

- [ ] Real iOS device (at least one recent model) — sign-up, search,
      map, review submission, follow/profile flows.
- [ ] Real Android device (at least one recent model, ideally also one
      lower-spec/older device given the target market) — same flows.
- [ ] Both light conditions the app supports (the design system is
      dark-mode-first per the master brief — confirm there's no
      unreadable-in-daylight issue on real hardware, not just a
      simulator).
- [ ] Network conditions: throttled/slow connection behavior (map tile
      loading, image loading) — Philippine mobile networks vary widely
      by region, and this wasn't load-tested under real conditions.

## Recommendation

Treat the mobile app as **feature-complete but not release-ready**. The
fastest path to a real release is: create the Expo/EAS account, run
`eas build:configure`, produce an internal/TestFlight build, and get it
in front of a handful of real users on real devices before touching
either store's public submission flow.
