import { z } from 'zod';
import { GENDER_AVAILABILITY_OPTIONS, PRICE_RANGE_OPTIONS } from '@masahepinas/config';

/**
 * Search/filter query shape shared by the web search page (URL search
 * params), the mobile Explore/Map screens, and the server-side query
 * builder. Keeping this in one place avoids the web and mobile filter UIs
 * silently drifting apart.
 */
export const sortOptions = [
  'relevance',
  'rating',
  'most_reviewed',
  'newest',
  'distance',
] as const;
export type SortOption = (typeof sortOptions)[number];

export const searchFiltersSchema = z.object({
  q: z.string().trim().max(150).optional(),
  region: z.string().trim().max(120).optional(),
  province: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  serviceSlug: z.string().trim().max(120).optional(),
  genderAvailability: z.enum(GENDER_AVAILABILITY_OPTIONS).optional(),
  priceRange: z.enum(PRICE_RANGE_OPTIONS).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  premiumOnly: z.coerce.boolean().optional(),
  recommendedOnly: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).optional(),
  sort: z.enum(sortOptions).optional().default('relevance'),
  page: z.coerce.number().int().min(1).optional().default(1),
});
export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export const PAGE_SIZE = 20;
