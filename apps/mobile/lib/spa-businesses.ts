import { supabase } from './supabase';

const IMAGE_BASE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/business-images/`;

export function businessImagePublicUrl(storagePath: string): string {
  return `${IMAGE_BASE_URL}${storagePath}`;
}

export interface ListingSummary {
  id: string;
  slug: string;
  businessName: string;
  description: string | null;
  status: string;
  isPremium: boolean;
  isRecommended: boolean;
  averageRating: number;
  reviewCount: number;
  priceRange: string | null;
  cityMunicipality: string;
  province: string;
  /** Null when the listing has no pinned coordinates (e.g. imported
   * without them) — such listings show address/city text but no map pin. */
  latitude: number | null;
  longitude: number | null;
  primaryImageUrl: string | null;
}

export async function searchListings(query: string): Promise<ListingSummary[]> {
  const { data, error } = await supabase.rpc('search_spa_businesses', {
    search_query: query || null,
    sort_by: 'relevance',
    page_number: 1,
    page_size: 30,
  });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    description: row.description,
    status: row.status,
    isPremium: row.is_premium,
    isRecommended: row.is_recommended,
    averageRating: Number(row.average_rating),
    reviewCount: row.review_count,
    priceRange: row.price_range,
    cityMunicipality: row.city_municipality,
    province: row.province,
    latitude: row.latitude,
    longitude: row.longitude,
    primaryImageUrl: row.primary_image_path
      ? businessImagePublicUrl(row.primary_image_path)
      : null,
  }));
}

export interface ListingDetail extends ListingSummary {
  addressLine: string;
  contactNumber: string | null;
  hours: {
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }[];
  images: string[];
}

export async function getListingBySlug(slug: string): Promise<ListingDetail | null> {
  const { data: business } = await supabase
    .from('spa_businesses')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (!business) return null;

  const [{ data: location }, { data: hours }, { data: images }] = await Promise.all([
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
      .from('business_images')
      .select('*')
      .eq('business_id', business.id)
      .order('position'),
  ]);

  return {
    id: business.id,
    slug: business.slug,
    businessName: business.business_name,
    description: business.description,
    status: business.status,
    isPremium: business.is_premium,
    isRecommended: business.is_recommended,
    averageRating: Number(business.average_rating),
    reviewCount: business.review_count,
    priceRange: business.price_range,
    cityMunicipality: location?.city_municipality ?? '',
    province: location?.province ?? '',
    addressLine: location?.address_line ?? '',
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    contactNumber: business.contact_number,
    primaryImageUrl: images?.find((img) => img.is_primary)?.storage_path
      ? businessImagePublicUrl(images.find((img) => img.is_primary)!.storage_path)
      : null,
    hours: (hours ?? []).map((h) => ({
      dayOfWeek: h.day_of_week,
      openTime: h.open_time,
      closeTime: h.close_time,
      isClosed: h.is_closed,
    })),
    images: (images ?? []).map((img) => businessImagePublicUrl(img.storage_path)),
  };
}

export async function listSavedBusinesses(userId: string): Promise<ListingSummary[]> {
  const { data } = await supabase
    .from('saved_businesses')
    .select(
      'business_id, spa_businesses(id, slug, business_name, description, status, is_premium, is_recommended, average_rating, review_count, price_range, business_locations(city_municipality, province, latitude, longitude), business_images(storage_path, is_primary, position))',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).flatMap((row: any) => {
    const b = row.spa_businesses;
    if (!b) return [];
    const location = Array.isArray(b.business_locations)
      ? b.business_locations[0]
      : b.business_locations;
    const images = (b.business_images ?? []) as {
      storage_path: string;
      is_primary: boolean;
      position: number;
    }[];
    const primary = [...images].sort(
      (a, c) => Number(c.is_primary) - Number(a.is_primary) || a.position - c.position,
    )[0];
    return [
      {
        id: b.id,
        slug: b.slug,
        businessName: b.business_name,
        description: b.description,
        status: b.status,
        isPremium: b.is_premium,
        isRecommended: b.is_recommended,
        averageRating: Number(b.average_rating),
        reviewCount: b.review_count,
        priceRange: b.price_range,
        cityMunicipality: location?.city_municipality ?? '',
        province: location?.province ?? '',
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        primaryImageUrl: primary ? businessImagePublicUrl(primary.storage_path) : null,
      },
    ];
  });
}

export async function toggleSaved(userId: string, businessId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('saved_businesses')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (existing) {
    await supabase.from('saved_businesses').delete().eq('id', existing.id);
    return false;
  }
  await supabase
    .from('saved_businesses')
    .insert({ user_id: userId, business_id: businessId });
  return true;
}

export async function isSaved(userId: string, businessId: string): Promise<boolean> {
  const { data } = await supabase
    .from('saved_businesses')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle();
  return Boolean(data);
}
