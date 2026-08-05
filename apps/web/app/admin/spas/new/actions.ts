'use server';

import { redirect } from 'next/navigation';
import { businessDetailsSchema, locationSchema } from '@masahepinas/validation';
import { slugify } from '@masahepinas/utils';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AdminCreateResult {
  error: string | null;
}

/**
 * Superadmin-only manual listing creation (docs/product-requirements.md
 * §14 "The superadmin must be able to create a spa listing without an
 * existing owner and later allow a legitimate owner to claim it"). The
 * resulting row has `owner_id = null`; the claim workflow that attaches a
 * real owner is Phase 5.
 */
export async function createSpaByAdmin(
  _prevState: AdminCreateResult,
  formData: FormData,
): Promise<AdminCreateResult> {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const detailsParsed = businessDetailsSchema.safeParse({
    businessName: formData.get('businessName'),
    description: formData.get('description'),
    contactNumber: formData.get('contactNumber'),
    genderAvailability: formData.get('genderAvailability') || 'no_preference',
  });
  if (!detailsParsed.success) {
    return {
      error: detailsParsed.error.issues[0]?.message ?? 'Check the business details.',
    };
  }

  const locationParsed = locationSchema.safeParse({
    addressLine: formData.get('addressLine'),
    cityMunicipality: formData.get('cityMunicipality'),
    province: formData.get('province'),
    region: formData.get('region'),
    latitude: Number(formData.get('latitude')),
    longitude: Number(formData.get('longitude')),
  });
  if (!locationParsed.success) {
    return {
      error: locationParsed.error.issues[0]?.message ?? 'Set the location on the map.',
    };
  }

  const status = String(formData.get('status') ?? 'unverified');

  const baseSlug = slugify(detailsParsed.data.businessName) || 'spa';
  let finalSlug = baseSlug;
  let attempt = 0;
  // Client-side uniqueness retry loop; the DB's unique constraint on
  // `slug` is still the authoritative guard against a race.
  while (attempt < 5) {
    const { data: existing } = await supabase
      .from('spa_businesses')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();
    if (!existing) break;
    attempt += 1;
    finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const { data: created, error: insertError } = await supabase
    .from('spa_businesses')
    .insert({
      slug: finalSlug,
      owner_id: null,
      business_name: detailsParsed.data.businessName,
      description: detailsParsed.data.description,
      contact_number: detailsParsed.data.contactNumber,
      gender_availability: detailsParsed.data.genderAvailability,
      status: status as 'pending_review' | 'verified' | 'unverified',
    })
    .select('id')
    .single();

  if (insertError || !created) {
    return { error: 'Could not create the listing. Please try again.' };
  }

  const { error: locationError } = await supabase.from('business_locations').insert({
    business_id: created.id,
    address_line: locationParsed.data.addressLine,
    city_municipality: locationParsed.data.cityMunicipality,
    province: locationParsed.data.province,
    region: locationParsed.data.region,
    latitude: locationParsed.data.latitude,
    longitude: locationParsed.data.longitude,
  });
  if (locationError) {
    return {
      error:
        'Listing created, but the location failed to save. Edit it from the listing.',
    };
  }

  redirect(`/spa/${finalSlug}`);
}
