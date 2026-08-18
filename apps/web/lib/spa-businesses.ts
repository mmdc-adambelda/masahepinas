// Server-only data access — uses the request-scoped Supabase server client
// (lib/supabase/server.ts), which relies on `next/headers`. Only import
// this from Server Components, Server Actions, or Route Handlers.
import type {
  BusinessHour,
  BusinessImage,
  ServiceCategory,
  SpaBusinessWithDetails,
} from '@masahepinas/types';
import type { SearchFilters } from '@masahepinas/validation';
import { PAGE_SIZE } from '@masahepinas/validation';
import { createSupabaseServerClient } from './supabase/server';

const IMAGE_PUBLIC_URL_PREFIX = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-images/`
  : '';

export function businessImagePublicUrl(storagePath: string): string {
  return `${IMAGE_PUBLIC_URL_PREFIX}${storagePath}`;
}

export interface SearchResultRow {
  id: string;
  slug: string;
  businessName: string;
  description: string | null;
  status: string;
  isPremium: boolean;
  isRecommended: boolean;
  genderAvailability: string;
  priceRange: string | null;
  averageRating: number;
  reviewCount: number;
  cityMunicipality: string;
  province: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  primaryImageUrl: string | null;
  distanceKm: number | null;
}

export interface SearchResult {
  rows: SearchResultRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export async function searchListings(filters: SearchFilters): Promise<SearchResult> {
  const supabase = await createSupabaseServerClient();
  const page = filters.page ?? 1;
  const pageSize = PAGE_SIZE;

  const { data, error } = await supabase.rpc('search_spa_businesses', {
    search_query: filters.q ?? null,
    filter_region: filters.region ?? null,
    filter_province: filters.province ?? null,
    filter_city: filters.city ?? null,
    filter_service_slug: filters.serviceSlug ?? null,
    filter_gender: filters.genderAvailability ?? null,
    filter_price: filters.priceRange ?? null,
    filter_verified_only: filters.verifiedOnly ?? false,
    filter_premium_only: filters.premiumOnly ?? false,
    filter_recommended_only: filters.recommendedOnly ?? false,
    filter_min_rating: filters.minRating ?? null,
    user_lat: filters.lat ?? null,
    user_lng: filters.lng ?? null,
    radius_km: filters.radiusKm ?? null,
    sort_by: filters.sort ?? 'relevance',
    page_number: page,
    page_size: pageSize,
  });

  if (error || !data) {
    return { rows: [], totalCount: 0, page, pageSize };
  }

  const rows: SearchResultRow[] = data.map((row) => ({
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    description: row.description,
    status: row.status,
    isPremium: row.is_premium,
    isRecommended: row.is_recommended,
    genderAvailability: row.gender_availability,
    priceRange: row.price_range,
    averageRating: Number(row.average_rating),
    reviewCount: row.review_count,
    cityMunicipality: row.city_municipality,
    province: row.province,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
    primaryImageUrl: row.primary_image_path
      ? businessImagePublicUrl(row.primary_image_path)
      : null,
    distanceKm: row.distance_km,
  }));

  return {
    rows,
    totalCount: Number(data[0]?.total_count ?? 0),
    page,
    pageSize,
  };
}

export async function getListingBySlug(
  slug: string,
): Promise<SpaBusinessWithDetails | null> {
  const supabase = await createSupabaseServerClient();

  const { data: business } = await supabase
    .from('spa_businesses')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (!business) return null;

  const [{ data: location }, { data: hours }, { data: services }, { data: images }] =
    await Promise.all([
      supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', business.id)
        .maybeSingle(),
      supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', business.id)
        .order('day_of_week'),
      supabase
        .from('business_services')
        .select(
          'service_category_id, is_featured, service_categories(id, slug, name, description)',
        )
        .eq('business_id', business.id),
      supabase
        .from('business_images')
        .select('*')
        .eq('business_id', business.id)
        .order('position'),
    ]);

  return {
    id: business.id,
    slug: business.slug,
    ownerId: business.owner_id,
    businessName: business.business_name,
    description: business.description,
    status: business.status,
    isPremium: business.is_premium,
    isRecommended: business.is_recommended,
    contactNumber: business.contact_number,
    bookingContactNumber: business.booking_contact_number,
    websiteUrl: business.website_url,
    socialMediaUrl: business.social_media_url,
    priceRange: business.price_range,
    genderAvailability: business.gender_availability,
    averageRating: Number(business.average_rating),
    reviewCount: business.review_count,
    verifiedReviewCount: business.verified_review_count,
    createdAt: business.created_at,
    location: location
      ? {
          businessId: location.business_id,
          addressLine: location.address_line,
          barangay: location.barangay,
          cityMunicipality: location.city_municipality,
          province: location.province,
          region: location.region,
          postalCode: location.postal_code,
          latitude: location.latitude,
          longitude: location.longitude,
        }
      : null,
    hours: (hours ?? []).map((h): BusinessHour => ({
      dayOfWeek: h.day_of_week,
      openTime: h.open_time,
      closeTime: h.close_time,
      isClosed: h.is_closed,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    services: (services ?? []).map((s: any) => ({
      serviceCategoryId: s.service_category_id,
      isFeatured: s.is_featured,
      category: {
        id: s.service_categories.id,
        slug: s.service_categories.slug,
        name: s.service_categories.name,
        description: s.service_categories.description,
      },
    })),
    images: (images ?? []).map((img): BusinessImage => ({
      id: img.id,
      storagePath: img.storage_path,
      publicUrl: businessImagePublicUrl(img.storage_path),
      caption: img.caption,
      altText: img.alt_text,
      isPrimary: img.is_primary,
      position: img.position,
    })),
  };
}

export async function getMyBusiness(
  ownerId: string,
): Promise<SpaBusinessWithDetails | null> {
  const supabase = await createSupabaseServerClient();
  const { data: business } = await supabase
    .from('spa_businesses')
    .select('slug')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!business) return null;
  return getListingBySlug(business.slug);
}

/** Fetches just a business's photos by id — used by the staff admin
 * listing editor, which (unlike `getMyBusiness`) needs to look up any
 * business, not just the signed-in owner's own one. RLS already lets
 * staff select any business's images (see business_images_select in
 * supabase/migrations/0003_spa_directory.sql). */
export async function getBusinessImages(businessId: string): Promise<BusinessImage[]> {
  const supabase = await createSupabaseServerClient();
  const { data: images } = await supabase
    .from('business_images')
    .select('*')
    .eq('business_id', businessId)
    .order('position');

  return (images ?? []).map((img): BusinessImage => ({
    id: img.id,
    storagePath: img.storage_path,
    publicUrl: businessImagePublicUrl(img.storage_path),
    caption: img.caption,
    altText: img.alt_text,
    isPrimary: img.is_primary,
    position: img.position,
  }));
}

export async function listServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('service_categories')
    .select('id, slug, name, description')
    .eq('is_active', true)
    .order('name');
  return data ?? [];
}
