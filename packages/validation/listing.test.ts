import { describe, expect, it } from 'vitest';
import {
  businessDetailsSchema,
  businessHoursSchema,
  locationSchema,
  validateImageFile,
} from './listing';

describe('businessDetailsSchema', () => {
  const validPayload = {
    businessName: 'Serenity Spa',
    description: 'A peaceful wellness retreat offering full-body massage services.',
    contactNumber: '09171234567',
    genderAvailability: 'no_preference' as const,
  };

  it('accepts a valid PH mobile number in either 09xx or +639xx form', () => {
    expect(businessDetailsSchema.safeParse(validPayload).success).toBe(true);
    expect(
      businessDetailsSchema.safeParse({ ...validPayload, contactNumber: '+639171234567' })
        .success,
    ).toBe(true);
  });

  it('rejects a non-Philippine phone number', () => {
    const result = businessDetailsSchema.safeParse({
      ...validPayload,
      contactNumber: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a description that is too short (prevents low-effort/spam listings)', () => {
    const result = businessDetailsSchema.safeParse({
      ...validPayload,
      description: 'too short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid website URL', () => {
    const result = businessDetailsSchema.safeParse({
      ...validPayload,
      websiteUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('locationSchema', () => {
  it('rejects coordinates outside valid lat/lng ranges', () => {
    const base = {
      addressLine: '123 Main St',
      cityMunicipality: 'Cebu City',
      province: 'Cebu',
      region: 'Region VII',
      latitude: 10.3,
      longitude: 123.9,
    };
    expect(locationSchema.safeParse(base).success).toBe(true);
    expect(locationSchema.safeParse({ ...base, latitude: 200 }).success).toBe(false);
    expect(locationSchema.safeParse({ ...base, longitude: -200 }).success).toBe(false);
  });
});

describe('businessHoursSchema', () => {
  const closedDay = { dayOfWeek: 0, isClosed: true };
  const openDay = (day: number) => ({
    dayOfWeek: day,
    isClosed: false,
    openTime: '09:00',
    closeTime: '18:00',
  });

  it('requires exactly 7 days', () => {
    const sixDays = Array.from({ length: 6 }, (_, i) => openDay(i));
    expect(businessHoursSchema.safeParse(sixDays).success).toBe(false);
  });

  it('accepts a full week mixing open and closed days', () => {
    const week = [closedDay, ...Array.from({ length: 6 }, (_, i) => openDay(i + 1))];
    expect(businessHoursSchema.safeParse(week).success).toBe(true);
  });

  it('rejects an open day missing open/close times', () => {
    const week = [
      { dayOfWeek: 0, isClosed: false },
      ...Array.from({ length: 6 }, (_, i) => openDay(i + 1)),
    ];
    expect(businessHoursSchema.safeParse(week).success).toBe(false);
  });
});

describe('validateImageFile', () => {
  it('accepts a well-formed JPEG under the size limit', () => {
    expect(validateImageFile({ size: 1024 * 1024, type: 'image/jpeg' })).toBeNull();
  });

  it('rejects a file over the 5MB limit', () => {
    const error = validateImageFile({ size: 6 * 1024 * 1024, type: 'image/jpeg' });
    expect(error).not.toBeNull();
  });

  it('rejects a disallowed MIME type (e.g. a disguised executable or SVG)', () => {
    expect(validateImageFile({ size: 1024, type: 'image/svg+xml' })).not.toBeNull();
    expect(
      validateImageFile({ size: 1024, type: 'application/octet-stream' }),
    ).not.toBeNull();
  });

  it('accepts PNG and WEBP, the other two allowed types', () => {
    expect(validateImageFile({ size: 1024, type: 'image/png' })).toBeNull();
    expect(validateImageFile({ size: 1024, type: 'image/webp' })).toBeNull();
  });
});
