'use server';

import { revalidatePath } from 'next/cache';
import {
  businessDetailsSchema,
  businessHoursSchema,
  businessServicesSchema,
  locationSchema,
} from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SaveResult {
  error: string | null;
  success?: boolean;
}

/**
 * Persists the owner-editable parts of their spa listing. The row itself
 * was created by the `handle_new_user` trigger at sign-up
 * (0004_spa_owner_signup.sql) with status `pending_review` — this action
 * never touches `status`/`is_premium`/`is_recommended`/`owner_id` (those
 * are blocked at the database layer too, see
 * `enforce_business_update_guard` in 0003_spa_directory.sql). RLS ensures
 * a caller can only affect their own business regardless of what
 * `businessId` is passed.
 */
export async function saveSpaDetails(
  businessId: string,
  _prevState: SaveResult,
  formData: FormData,
): Promise<SaveResult> {
  const session = await requireRole('spa_owner');
  const supabase = await createSupabaseServerClient();

  const detailsParsed = businessDetailsSchema.safeParse({
    businessName: formData.get('businessName'),
    description: formData.get('description'),
    contactNumber: formData.get('contactNumber'),
    bookingContactNumber: formData.get('bookingContactNumber') || undefined,
    websiteUrl: formData.get('websiteUrl') || undefined,
    socialMediaUrl: formData.get('socialMediaUrl') || undefined,
    priceRange: formData.get('priceRange') || undefined,
    genderAvailability: formData.get('genderAvailability'),
  });
  if (!detailsParsed.success) {
    return {
      error: detailsParsed.error.issues[0]?.message ?? 'Check the business details.',
    };
  }

  const locationParsed = locationSchema.safeParse({
    addressLine: formData.get('addressLine'),
    barangay: formData.get('barangay') || undefined,
    cityMunicipality: formData.get('cityMunicipality'),
    province: formData.get('province'),
    region: formData.get('region'),
    postalCode: formData.get('postalCode') || undefined,
    latitude: Number(formData.get('latitude')),
    longitude: Number(formData.get('longitude')),
  });
  if (!locationParsed.success) {
    return {
      error:
        locationParsed.error.issues[0]?.message ??
        'Set your business location on the map.',
    };
  }

  const hoursRaw = JSON.parse(String(formData.get('hours') ?? '[]'));
  const hoursParsed = businessHoursSchema.safeParse(hoursRaw);
  if (!hoursParsed.success) {
    return {
      error: 'Check your operating hours — set both times or mark the day closed.',
    };
  }

  const servicesRaw = JSON.parse(String(formData.get('services') ?? '[]'));
  const servicesParsed = businessServicesSchema.safeParse(servicesRaw);
  if (!servicesParsed.success) {
    return {
      error: servicesParsed.error.issues[0]?.message ?? 'Select at least one service.',
    };
  }

  // 1. Core business fields (owner-editable subset only).
  const { error: businessError } = await supabase
    .from('spa_businesses')
    .update({
      business_name: detailsParsed.data.businessName,
      description: detailsParsed.data.description,
      contact_number: detailsParsed.data.contactNumber,
      booking_contact_number: detailsParsed.data.bookingContactNumber || null,
      website_url: detailsParsed.data.websiteUrl || null,
      social_media_url: detailsParsed.data.socialMediaUrl || null,
      price_range: detailsParsed.data.priceRange ?? null,
      gender_availability: detailsParsed.data.genderAvailability,
    })
    .eq('id', businessId)
    .eq('owner_id', session.userId);
  if (businessError)
    return { error: 'Could not save business details. Please try again.' };

  // 2. Location (one row per business — upsert on the unique business_id).
  const { error: locationError } = await supabase.from('business_locations').upsert(
    {
      business_id: businessId,
      address_line: locationParsed.data.addressLine,
      barangay: locationParsed.data.barangay || null,
      city_municipality: locationParsed.data.cityMunicipality,
      province: locationParsed.data.province,
      region: locationParsed.data.region,
      postal_code: locationParsed.data.postalCode || null,
      latitude: locationParsed.data.latitude,
      longitude: locationParsed.data.longitude,
    },
    { onConflict: 'business_id' },
  );
  if (locationError) return { error: 'Could not save your location. Please try again.' };

  // 3. Hours (upsert all 7 days on the (business_id, day_of_week) unique key).
  const { error: hoursError } = await supabase.from('business_hours').upsert(
    hoursParsed.data.map((h) => ({
      business_id: businessId,
      day_of_week: h.dayOfWeek,
      open_time: h.isClosed ? null : h.openTime || null,
      close_time: h.isClosed ? null : h.closeTime || null,
      is_closed: h.isClosed,
    })),
    { onConflict: 'business_id,day_of_week' },
  );
  if (hoursError)
    return { error: 'Could not save your operating hours. Please try again.' };

  // 4. Services: replace the set (simplest correct approach for a handful
  // of rows; not wrapped in a DB transaction, which is an acceptable MVP
  // trade-off — see docs/development-roadmap.md Phase 2 notes).
  await supabase.from('business_services').delete().eq('business_id', businessId);
  if (servicesParsed.data.length > 0) {
    const { error: servicesError } = await supabase.from('business_services').insert(
      servicesParsed.data.map((s) => ({
        business_id: businessId,
        service_category_id: s.serviceCategoryId,
        is_featured: s.isFeatured,
      })),
    );
    if (servicesError)
      return { error: 'Could not save your services. Please try again.' };
  }

  revalidatePath('/submit-a-spa');
  return { error: null, success: true };
}
