import type { GenderAvailability, ListingStatus, PriceRange } from './enums';

/** App-level (camelCase) shape of a spa listing, decoupled from the raw
 * snake_case DB row so web/mobile UI code never touches Supabase column
 * names directly. Map raw rows to this shape at the data-access boundary. */
export interface SpaBusiness {
  id: string;
  slug: string;
  ownerId: string | null;
  businessName: string;
  description: string | null;
  status: ListingStatus;
  isPremium: boolean;
  isRecommended: boolean;
  contactNumber: string | null;
  bookingContactNumber: string | null;
  websiteUrl: string | null;
  socialMediaUrl: string | null;
  priceRange: PriceRange | null;
  genderAvailability: GenderAvailability;
  averageRating: number;
  reviewCount: number;
  verifiedReviewCount: number;
  createdAt: string;
}

export interface BusinessLocation {
  businessId: string;
  addressLine: string;
  barangay: string | null;
  cityMunicipality: string;
  province: string;
  region: string;
  postalCode: string | null;
  /** Null when the listing has no pinned coordinates (e.g. imported
   * without them) — such listings show address/city text but no map and
   * are excluded from distance/"near me" search. */
  latitude: number | null;
  longitude: number | null;
}

export interface BusinessHour {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface BusinessService {
  serviceCategoryId: string;
  isFeatured: boolean;
}

export interface BusinessImage {
  id: string;
  storagePath: string;
  publicUrl: string;
  caption: string | null;
  altText: string | null;
  isPrimary: boolean;
  position: number;
}

/** Composite shape used by listing detail pages / cards. */
export interface SpaBusinessWithDetails extends SpaBusiness {
  location: BusinessLocation | null;
  hours: BusinessHour[];
  services: (BusinessService & { category: ServiceCategory })[];
  images: BusinessImage[];
  distanceKm?: number;
}

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
