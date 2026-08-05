/**
 * Controlled lookup values shared across web + mobile.
 * Mirrors the enums defined in docs/database-schema.md.
 * Extend this file as later phases introduce the tables that use them.
 */

export type AppRole = 'customer' | 'spa_owner' | 'moderator' | 'superadmin';

export type ListingStatus =
  'pending_review' | 'verified' | 'unverified' | 'suspended' | 'archived';

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export type GenderAvailability = 'male_only' | 'female_only' | 'both' | 'no_preference';

export type PriceRange = 'budget' | 'mid_range' | 'premium' | 'luxury';

export type SubscriptionStatus =
  'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';

export type ReviewModerationStatus = 'visible' | 'hidden' | 'under_review' | 'removed';

export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export type ReportTargetType = 'review' | 'listing' | 'user';

export type ReportReason =
  | 'fake_review'
  | 'harassment'
  | 'hate_speech'
  | 'personal_information'
  | 'spam'
  | 'conflict_of_interest'
  | 'explicit_content'
  | 'blackmail_or_extortion'
  | 'unrelated_to_business'
  | 'illegal_service_promotion';

export type ModerationActionType =
  | 'hide_content'
  | 'restore_content'
  | 'suspend_account'
  | 'reinstate_account'
  | 'approve_listing'
  | 'reject_listing'
  | 'approve_verification'
  | 'reject_verification'
  | 'approve_claim'
  | 'reject_claim'
  | 'remove_review'
  | 'resolve_report'
  | 'dismiss_report';

export type AccountStatus = 'active' | 'suspended';
