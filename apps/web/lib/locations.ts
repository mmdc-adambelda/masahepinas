import { createSupabaseServerClient } from './supabase/server';

/**
 * Phase 2 location-directory lookups. There's no controlled "locations"
 * table yet (that's Phase 7's "Manage Philippine locations" superadmin
 * feature) — province/city are free text on `business_locations`, so we
 * match the URL slug back to whatever casing an owner actually entered via
 * a case-insensitive comparison. Good enough for the MVP directory; a real
 * locations table would make this exact and remove the ambiguity of two
 * different spellings of the same city.
 */

export function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function labelToSlug(label: string): string {
  return label.toLowerCase().trim().replace(/\s+/g, '-');
}

export async function resolveProvince(slug: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const guess = slugToLabel(slug);
  const { data } = await supabase
    .from('business_locations')
    .select('province')
    .ilike('province', guess)
    .limit(1)
    .maybeSingle();
  return data?.province ?? null;
}

export async function resolveCity(
  provinceSlug: string,
  citySlug: string,
): Promise<{ province: string; city: string } | null> {
  const supabase = await createSupabaseServerClient();
  const provinceGuess = slugToLabel(provinceSlug);
  const cityGuess = slugToLabel(citySlug);
  const { data } = await supabase
    .from('business_locations')
    .select('province, city_municipality')
    .ilike('province', provinceGuess)
    .ilike('city_municipality', cityGuess)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { province: data.province, city: data.city_municipality };
}

export async function listCitiesInProvince(province: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('business_locations')
    .select('city_municipality')
    .eq('province', province);
  return Array.from(new Set((data ?? []).map((row) => row.city_municipality))).sort();
}

export async function listProvinces(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('business_locations').select('province');
  return Array.from(new Set((data ?? []).map((row) => row.province))).sort();
}
