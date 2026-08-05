import { createSupabaseServerClient } from './supabase/server';

export async function isBusinessSaved(
  userId: string,
  businessId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('saved_businesses')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle();
  return Boolean(data);
}

export interface SavedListingRow {
  businessId: string;
  slug: string;
  businessName: string;
  cityMunicipality: string;
  province: string;
  averageRating: number;
  reviewCount: number;
  isPremium: boolean;
  isRecommended: boolean;
  priceRange: string | null;
  primaryImagePath: string | null;
}

export async function listSavedBusinesses(userId: string): Promise<SavedListingRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('saved_businesses')
    .select(
      'business_id, spa_businesses(slug, business_name, is_premium, is_recommended, price_range, average_rating, review_count, business_locations(city_municipality, province), business_images(storage_path, is_primary, position))',
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
        businessId: row.business_id,
        slug: b.slug,
        businessName: b.business_name,
        cityMunicipality: location?.city_municipality ?? '',
        province: location?.province ?? '',
        averageRating: Number(b.average_rating),
        reviewCount: b.review_count,
        isPremium: b.is_premium,
        isRecommended: b.is_recommended,
        priceRange: b.price_range,
        primaryImagePath: primary?.storage_path ?? null,
      },
    ];
  });
}
