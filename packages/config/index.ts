/**
 * Shared, non-secret application configuration constants.
 * Anything environment-specific (URLs, keys) belongs in env vars, not here.
 */

export const APP_NAME = 'Masahe Pinas';
export const APP_TAGLINE =
  'Discover trusted massage and spa experiences across the Philippines.';

export const PREMIUM_PLAN = {
  slug: 'premium-monthly',
  name: 'Masahe Pinas Premium',
  pricePhp: 500,
  billingCycle: 'monthly',
} as const;

export const IMAGE_LIMITS = {
  maxImagesPerListing: 3,
  maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
};

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;

export const REVIEW_CATEGORY_KEYS = [
  'service_quality',
  'professionalism',
  'cleanliness',
  'ambience',
  'value_for_money',
] as const;

export const GENDER_AVAILABILITY_OPTIONS = [
  'male_only',
  'female_only',
  'both',
  'no_preference',
] as const;

export const PRICE_RANGE_OPTIONS = ['budget', 'mid_range', 'premium', 'luxury'] as const;

export const APP_ROLES = ['customer', 'spa_owner', 'moderator', 'superadmin'] as const;

export type AppRole = (typeof APP_ROLES)[number];
