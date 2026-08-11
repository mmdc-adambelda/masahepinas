'use server';

import { revalidatePath } from 'next/cache';
import { businessDetailsSchema, locationSchema } from '@masahepinas/validation';
import {
  parseCsvRecords,
  slugify,
  getGeocodingProvider,
  type GeocodeResult,
} from '@masahepinas/utils';
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
    geocoded: number;
  };
  rowErrors?: BulkUploadRowError[];
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 500;
const LISTING_STATUSES = ['pending_review', 'verified', 'unverified'] as const;

// Nominatim's public-instance usage policy caps requests at ~1/second and
// asks that it not be used for heavy/bulk geocoding — MAX_GEOCODE_CALLS
// bounds a single upload's worst case to roughly (45 * 1.1s) ≈ 50s, which
// fits inside the 60s maxDuration set on this route (see page.tsx). Rows
// beyond the cap, or whose address can't be resolved, are reported as
// row errors — re-running the upload (e.g. after splitting the file)
// picks up where the last run left off, since already-created rows are
// skipped via the slug the second time around... actually they are NOT
// automatically deduped by business identity, only by slug collision, so
// don't re-upload rows that already succeeded.
const MAX_GEOCODE_CALLS = 45;
const GEOCODE_DELAY_MS = 1100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function buildGeocodeQuery(record: Record<string, string>): string | null {
  const parts = [
    record.address_line,
    record.barangay,
    record.city_municipality,
    record.province,
  ]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  if (parts.length === 0) return null;
  return `${parts.join(', ')}, Philippines`;
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
 * required — every other field tolerates common gaps in scraped/
 * exported listing data: missing description (auto-generated), missing
 * city/address/region (borrowed from the geocode result or the
 * province itself), phone numbers with spaces/punctuation (normalized),
 * and missing coordinates (best-effort geocoded from whatever address
 * fragments are present — see MAX_GEOCODE_CALLS). owner_name/owner_
 * phone/owner_email are optional, staff-only reference fields stored in
 * business_internal_contacts (never public) so admins can reach out
 * about claiming the listing.
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
  let geocodeCallsUsed = 0;
  const geocoder = getGeocodingProvider();

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

    let latitude = Number(record.latitude);
    let longitude = Number(record.longitude);
    let geocodeMatch: GeocodeResult | null = null;
    const needsGeocoding =
      record.latitude?.trim() === '' ||
      record.longitude?.trim() === '' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude);

    if (needsGeocoding) {
      const query = buildGeocodeQuery(record);
      if (!query) {
        rowErrors.push({
          row: rowNumber,
          businessName: businessNameForErrors,
          message:
            'Missing latitude/longitude and no address to geocode from — add coordinates manually.',
        });
        continue;
      }
      if (geocodeCallsUsed >= MAX_GEOCODE_CALLS) {
        rowErrors.push({
          row: rowNumber,
          businessName: businessNameForErrors,
          message: `Missing coordinates — the ${MAX_GEOCODE_CALLS}-geocode-per-upload limit was reached. Re-run the upload with just the remaining rows.`,
        });
        continue;
      }
      geocodeCallsUsed += 1;
      if (geocodeCallsUsed > 1) await sleep(GEOCODE_DELAY_MS);
      const [match] = await geocoder.searchAddress(query);
      if (!match) {
        rowErrors.push({
          row: rowNumber,
          businessName: businessNameForErrors,
          message: `Could not geocode "${query}" — add coordinates manually.`,
        });
        continue;
      }
      geocodeMatch = match;
      latitude = match.latitude;
      longitude = match.longitude;
    }

    // Only business_name, contact_number, and province are truly required
    // (per the admin's call) — everything else here has a fallback so a
    // sparse scraped-data row still imports rather than failing on a
    // field nobody actually asked for.
    const province = record.province?.trim() ?? '';
    const region = record.region?.trim() || lookupPhRegion(province) || 'Philippines';
    // For rows missing city_municipality/address_line entirely (common for
    // "home service, no fixed storefront" businesses that only give a
    // province) — borrow the geocode result's structured fields, then
    // fall back to the province itself, rather than failing the row.
    const cityMunicipality =
      record.city_municipality?.trim() || geocodeMatch?.cityMunicipality || province;
    const addressLine =
      record.address_line?.trim() ||
      geocodeMatch?.addressLine ||
      [cityMunicipality, province].filter(Boolean).join(', ');

    const locationParsed = locationSchema.safeParse({
      addressLine,
      barangay: record.barangay || geocodeMatch?.barangay || '',
      cityMunicipality,
      province,
      region,
      postalCode: record.postal_code || geocodeMatch?.postalCode || '',
      latitude,
      longitude,
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
      geocoded: geocodeCallsUsed,
    },
  });

  revalidatePath('/admin/spas/bulk-upload');
  revalidatePath('/admin');

  return {
    error: null,
    summary: {
      totalRows: records.length,
      created,
      failed: rowErrors.length,
      geocoded: geocodeCallsUsed,
    },
    rowErrors: rowErrors.slice(0, 100),
  };
}
