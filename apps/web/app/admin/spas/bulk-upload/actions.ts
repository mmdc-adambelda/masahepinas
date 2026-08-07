'use server';

import { revalidatePath } from 'next/cache';
import { businessDetailsSchema, locationSchema } from '@masahepinas/validation';
import { parseCsvRecords, slugify } from '@masahepinas/utils';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface BulkUploadRowError {
  row: number;
  businessName: string;
  message: string;
}

export interface BulkUploadResult {
  error: string | null;
  summary?: {
    totalRows: number;
    created: number;
    failed: number;
  };
  rowErrors?: BulkUploadRowError[];
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 500;
const LISTING_STATUSES = ['pending_review', 'verified', 'unverified'] as const;

/**
 * Superadmin-only bulk listing import — same underlying insert shape as
 * the single-listing form (createSpaByAdmin in ../new/actions.ts):
 * owner_id null (unclaimed), no hours/services (the app already treats
 * those as optional/owner-completed-later for admin-created listings).
 * Each row is validated and inserted independently so one bad row
 * doesn't sink the whole batch — the response reports exactly which
 * rows failed and why.
 */
export async function bulkUploadSpas(
  _prevState: BulkUploadResult,
  formData: FormData,
): Promise<BulkUploadResult> {
  const session = await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a CSV file to upload.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: `File must be under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.` };
  }
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    return { error: 'That file doesn’t look like a .csv file.' };
  }

  const text = await file.text();
  const records = parseCsvRecords(text);
  if (records.length === 0) {
    return { error: 'The CSV file has no data rows.' };
  }
  if (records.length > MAX_ROWS) {
    return { error: `A single upload is capped at ${MAX_ROWS} rows — split the file.` };
  }

  const rowErrors: BulkUploadRowError[] = [];
  let created = 0;

  for (let i = 0; i < records.length; i += 1) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
    const record = records[i]!;
    const businessNameForErrors = record.business_name || '(no name)';

    const detailsParsed = businessDetailsSchema.safeParse({
      businessName: record.business_name,
      description: record.description,
      contactNumber: record.contact_number,
      bookingContactNumber: record.booking_contact_number || '',
      websiteUrl: record.website_url || '',
      socialMediaUrl: record.social_media_url || '',
      priceRange: record.price_range || undefined,
      genderAvailability: record.gender_availability || 'no_preference',
    });
    if (!detailsParsed.success) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: detailsParsed.error.issues[0]?.message ?? 'Invalid business details.',
      });
      continue;
    }

    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    if (record.latitude?.trim() === '' || Number.isNaN(latitude)) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: 'Missing or invalid latitude.',
      });
      continue;
    }
    if (record.longitude?.trim() === '' || Number.isNaN(longitude)) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: 'Missing or invalid longitude.',
      });
      continue;
    }

    const locationParsed = locationSchema.safeParse({
      addressLine: record.address_line,
      barangay: record.barangay || '',
      cityMunicipality: record.city_municipality,
      province: record.province,
      region: record.region,
      postalCode: record.postal_code || '',
      latitude,
      longitude,
    });
    if (!locationParsed.success) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: locationParsed.error.issues[0]?.message ?? 'Invalid location.',
      });
      continue;
    }

    const statusRaw = (record.status || 'unverified').trim();
    if (!LISTING_STATUSES.includes(statusRaw as (typeof LISTING_STATUSES)[number])) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: `Invalid status "${statusRaw}" — must be pending_review, verified, or unverified.`,
      });
      continue;
    }

    const baseSlug = slugify(detailsParsed.data.businessName) || 'spa';
    let finalSlug = baseSlug;
    let attempt = 0;
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

    const { data: createdBusiness, error: insertError } = await supabase
      .from('spa_businesses')
      .insert({
        slug: finalSlug,
        owner_id: null,
        business_name: detailsParsed.data.businessName,
        description: detailsParsed.data.description,
        contact_number: detailsParsed.data.contactNumber,
        booking_contact_number: detailsParsed.data.bookingContactNumber || null,
        website_url: detailsParsed.data.websiteUrl || null,
        social_media_url: detailsParsed.data.socialMediaUrl || null,
        price_range: detailsParsed.data.priceRange || null,
        gender_availability: detailsParsed.data.genderAvailability,
        status: statusRaw as (typeof LISTING_STATUSES)[number],
      })
      .select('id')
      .single();

    if (insertError || !createdBusiness) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: 'Could not create the listing (database error).',
      });
      continue;
    }

    const { error: locationError } = await supabase.from('business_locations').insert({
      business_id: createdBusiness.id,
      address_line: locationParsed.data.addressLine,
      barangay: locationParsed.data.barangay || null,
      city_municipality: locationParsed.data.cityMunicipality,
      province: locationParsed.data.province,
      region: locationParsed.data.region,
      postal_code: locationParsed.data.postalCode || null,
      latitude: locationParsed.data.latitude,
      longitude: locationParsed.data.longitude,
    });
    if (locationError) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: 'Listing created, but its location failed to save — edit it manually.',
      });
      // Still counts as created since the business row exists.
    }

    created += 1;
  }

  await supabase.from('audit_logs').insert({
    actor_id: session.userId,
    action: 'bulk_import_spas',
    entity_type: 'spa_businesses',
    new_state: { total_rows: records.length, created, failed: rowErrors.length },
  });

  revalidatePath('/admin/spas/bulk-upload');
  revalidatePath('/admin');

  return {
    error: null,
    summary: { totalRows: records.length, created, failed: rowErrors.length },
    rowErrors: rowErrors.slice(0, 100),
  };
}
