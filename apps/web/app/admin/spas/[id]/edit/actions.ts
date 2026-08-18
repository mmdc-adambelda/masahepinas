'use server';

import { revalidatePath } from 'next/cache';
import { businessDetailsSchema, locationSchema } from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AdminEditResult {
  error: string | null;
  success?: boolean;
}

const bulkLocationSchema = locationSchema.omit({ latitude: true, longitude: true });

function parseOptionalCoordinate(
  raw: FormDataEntryValue | null,
  min: number,
  max: number,
): number | null {
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (str === '') return null;
  const value = Number(str);
  if (Number.isNaN(value) || value < min || value > max) return null;
  return value;
}

/**
 * Staff (moderator or superadmin) edit for any existing listing —
 * mainly here so bad data from a bulk CSV import (or anywhere else) can
 * be fixed without a database console. Deliberately does not touch
 * `status` (that's the moderation action on /admin/listings, logged
 * with a reason) or `owner_id`/claim state — those stay behind their
 * own guarded flows. RLS (spa_businesses_update in
 * supabase/migrations/0003_spa_directory.sql) already grants any staff
 * session write access to these fields, so this matches the real
 * security boundary rather than being stricter than it.
 */
export async function updateSpaListing(
  businessId: string,
  _prevState: AdminEditResult,
  formData: FormData,
): Promise<AdminEditResult> {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const detailsParsed = businessDetailsSchema.safeParse({
    businessName: formData.get('businessName'),
    description: formData.get('description'),
    contactNumber: formData.get('contactNumber'),
    bookingContactNumber: formData.get('bookingContactNumber') || '',
    websiteUrl: formData.get('websiteUrl') || '',
    socialMediaUrl: formData.get('socialMediaUrl') || '',
    priceRange: formData.get('priceRange') || undefined,
    genderAvailability: formData.get('genderAvailability') || 'no_preference',
  });
  if (!detailsParsed.success) {
    const issue = detailsParsed.error.issues[0];
    return {
      error: issue
        ? `${issue.path.join('.')}: ${issue.message}`
        : 'Check the business details.',
    };
  }

  const locationParsed = bulkLocationSchema.safeParse({
    addressLine: formData.get('addressLine'),
    barangay: formData.get('barangay') || '',
    cityMunicipality: formData.get('cityMunicipality'),
    province: formData.get('province'),
    region: formData.get('region'),
    postalCode: formData.get('postalCode') || '',
  });
  if (!locationParsed.success) {
    const issue = locationParsed.error.issues[0];
    return {
      error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Check the location.',
    };
  }

  const latitude = parseOptionalCoordinate(formData.get('latitude'), -90, 90);
  const longitude = parseOptionalCoordinate(formData.get('longitude'), -180, 180);

  const { error: businessError } = await supabase
    .from('spa_businesses')
    .update({
      business_name: detailsParsed.data.businessName,
      description: detailsParsed.data.description,
      contact_number: detailsParsed.data.contactNumber,
      booking_contact_number: detailsParsed.data.bookingContactNumber || null,
      website_url: detailsParsed.data.websiteUrl || null,
      social_media_url: detailsParsed.data.socialMediaUrl || null,
      price_range: detailsParsed.data.priceRange || null,
      gender_availability: detailsParsed.data.genderAvailability,
    })
    .eq('id', businessId);
  if (businessError) return { error: 'Could not save the listing. Please try again.' };

  const { error: locationError } = await supabase.from('business_locations').upsert(
    {
      business_id: businessId,
      address_line: locationParsed.data.addressLine,
      barangay: locationParsed.data.barangay || null,
      city_municipality: locationParsed.data.cityMunicipality,
      province: locationParsed.data.province,
      region: locationParsed.data.region,
      postal_code: locationParsed.data.postalCode || null,
      latitude,
      longitude,
    },
    { onConflict: 'business_id' },
  );
  if (locationError) {
    return { error: 'Listing details saved, but the location failed to save.' };
  }

  revalidatePath('/admin/listings');
  revalidatePath(`/admin/spas/${businessId}/edit`);
  return { error: null, success: true };
}
