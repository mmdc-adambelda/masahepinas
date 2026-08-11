'use server';

import { revalidatePath } from 'next/cache';
import { businessDetailsSchema, locationSchema } from '@masahepinas/validation';
import { parseCsvRecords, slugify, logger } from '@masahepinas/utils';
import { lookupPhRegion } from '@masahepinas/config';
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
    withoutCoordinates: number;
  };
  rowErrors?: BulkUploadRowError[];
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 500;
const LISTING_STATUSES = ['pending_review', 'verified', 'unverified'] as const;

// Location fields validated without latitude/longitude — those are
// handled separately below since they're optional here (see
// parseOptionalCoordinate), unlike the map-picker-based submission flows
// that still use the full locationSchema with required coordinates.
const bulkLocationSchema = locationSchema.omit({ latitude: true, longitude: true });

/** Strips everything except a leading '+' and digits, so "0965 937 3768"
 * or "(0965) 937-3768" both normalize to "09659373768" before validation
 * — scraped/exported contact lists are formatted this inconsistently. */
function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

function fallbackDescription(
  businessName: string,
  city: string,
  province: string,
): string {
  const location = [city, province].filter(Boolean).join(', ');
  return `${businessName} — massage and spa services${location ? ` in ${location}` : ''}, Philippines. (Description auto-generated at import; edit for accuracy.)`;
}

/** Returns a valid latitude/longitude number, or null if the cell was
 * blank/unusable — never blocks the row. `add coordinates manually
 * later" is the fallback, not a hard requirement (see the "no
 * geocoding" decision this shipped from). */
function parseOptionalCoordinate(
  raw: string | undefined,
  min: number,
  max: number,
): number | null {
  if (!raw || raw.trim() === '') return null;
  const value = Number(raw);
  if (Number.isNaN(value) || value < min || value > max) return null;
  return value;
}

/**
 * Superadmin-only bulk listing import — same underlying insert shape as
 * the single-listing form (createSpaByAdmin in ../new/actions.ts):
 * owner_id null (unclaimed), no hours/services (the app already treats
 * those as optional/owner-completed-later for admin-created listings).
 * Each row is validated and inserted independently so one bad row
 * doesn't sink the whole batch — the response reports exactly which
 * rows failed and why (naming the specific field, not just "Required").
 *
 * Only business_name, contact_number, and province are actually
 * required — every other field tolerates gaps in scraped/exported
 * listing data: missing description (auto-generated), missing region
 * (looked up from province), missing city/address (falls back to the
 * province itself), and phone numbers with spaces/punctuation
 * (normalized). Coordinates are used as-is if present and never
 * geocoded — a row with no lat/lng still imports, it just won't show a
 * map or appear in "near me" search until someone adds coordinates
 * later (see docs/moderation-ops-guide.md). owner_name/owner_phone/
 * owner_email are optional, staff-only reference fields stored in
 * business_internal_contacts (never public) so admins can reach out
 * about claiming the listing.
 */
export async function bulkUploadSpas(
  _prevState: BulkUploadResult,
  formData: FormData,
): Promise<BulkUploadResult> {
  try {
    return await runBulkUpload(formData);
  } catch (err) {
    // Anything unexpected here must never crash the whole request — that
    // surfaces to the admin as the generic "Something went wrong" error
    // boundary with no useful information. Always return a graceful
    // result instead.
    logger.error('bulkUploadSpas crashed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      error:
        'Something went wrong partway through the upload. Any rows already created are saved — check /admin/listings, then re-run the upload for the rest.',
    };
  }
}

async function runBulkUpload(formData: FormData): Promise<BulkUploadResult> {
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
  let withoutCoordinates = 0;

  for (let i = 0; i < records.length; i += 1) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
    const record = records[i]!;
    const businessNameForErrors = record.business_name || '(no name)';

    const description =
      record.description && record.description.trim().length >= 20
        ? record.description
        : fallbackDescription(
            record.business_name || 'This business',
            record.city_municipality || '',
            record.province || '',
          );

    const detailsParsed = businessDetailsSchema.safeParse({
      businessName: record.business_name,
      description,
      contactNumber: record.contact_number ? normalizePhone(record.contact_number) : '',
      bookingContactNumber: record.booking_contact_number
        ? normalizePhone(record.booking_contact_number)
        : '',
      websiteUrl: record.website_url || '',
      socialMediaUrl: record.social_media_url || '',
      priceRange: record.price_range || undefined,
      genderAvailability: record.gender_availability || 'no_preference',
    });
    if (!detailsParsed.success) {
      const issue = detailsParsed.error.issues[0];
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: issue
          ? `${issue.path.join('.')}: ${issue.message}`
          : 'Invalid business details.',
      });
      continue;
    }

    // Only business_name, contact_number, and province are truly required
    // — everything else here has a fallback so a sparse scraped-data row
    // still imports rather than failing on a field nobody asked for.
    const province = record.province?.trim() ?? '';
    const region = record.region?.trim() || lookupPhRegion(province) || 'Philippines';
    const cityMunicipality = record.city_municipality?.trim() || province;
    const addressLine =
      record.address_line?.trim() ||
      [cityMunicipality, province].filter(Boolean).join(', ');
    const latitude = parseOptionalCoordinate(record.latitude, -90, 90);
    const longitude = parseOptionalCoordinate(record.longitude, -180, 180);
    if (latitude == null || longitude == null) withoutCoordinates += 1;

    const locationParsed = bulkLocationSchema.safeParse({
      addressLine,
      barangay: record.barangay || '',
      cityMunicipality,
      province,
      region,
      postalCode: record.postal_code || '',
    });
    if (!locationParsed.success) {
      const issue = locationParsed.error.issues[0];
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: issue
          ? `${issue.path.join('.')}: ${issue.message}`
          : 'Invalid location.',
      });
      continue;
    }

    const statusRaw = (record.status || 'unverified').trim();
    if (!LISTING_STATUSES.includes(statusRaw as (typeof LISTING_STATUSES)[number])) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: `status: must be pending_review, verified, or unverified (got "${statusRaw}").`,
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
        message: `Could not create the listing (database error: ${insertError?.message ?? 'unknown'}).`,
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
      latitude,
      longitude,
    });
    if (locationError) {
      rowErrors.push({
        row: rowNumber,
        businessName: businessNameForErrors,
        message: 'Listing created, but its location failed to save — edit it manually.',
      });
      // Still counts as created since the business row exists.
    }

    // Internal-only, staff-visible reference info (never public — see
    // supabase/migrations/0015_business_internal_contacts.sql). Optional;
    // only stored when at least one field was actually provided.
    const ownerName = record.owner_name?.trim() || null;
    const ownerPhone = record.owner_phone ? normalizePhone(record.owner_phone) : null;
    const ownerEmail = record.owner_email?.trim() || null;
    if (ownerName || ownerPhone || ownerEmail) {
      await supabase.from('business_internal_contacts').insert({
        business_id: createdBusiness.id,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        owner_email: ownerEmail,
      });
      // Best-effort — an internal-contact save failure shouldn't fail a
      // row whose public listing was already created successfully.
    }

    created += 1;
  }

  await supabase.from('audit_logs').insert({
    actor_id: session.userId,
    action: 'bulk_import_spas',
    entity_type: 'spa_businesses',
    new_state: {
      total_rows: records.length,
      created,
      failed: rowErrors.length,
      without_coordinates: withoutCoordinates,
    },
  });

  revalidatePath('/admin/spas/bulk-upload');
  revalidatePath('/admin');
  revalidatePath('/admin/listings');

  return {
    error: null,
    summary: {
      totalRows: records.length,
      created,
      failed: rowErrors.length,
      withoutCoordinates,
    },
    rowErrors: rowErrors.slice(0, 100),
  };
}
