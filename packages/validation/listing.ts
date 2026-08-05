import { z } from 'zod';
import {
  GENDER_AVAILABILITY_OPTIONS,
  IMAGE_LIMITS,
  PRICE_RANGE_OPTIONS,
} from '@masahepinas/config';

/**
 * Shared between the web submission form, the mobile equivalent (Phase 5+),
 * and the server action that persists a listing. Server-side re-validation
 * is mandatory — see docs/security-checklist.md.
 */

export const businessDetailsSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is too short').max(150),
  description: z
    .string()
    .trim()
    .min(20, 'Add a bit more detail (at least 20 characters)')
    .max(2000),
  contactNumber: z
    .string()
    .trim()
    .regex(/^(\+63|0)9\d{9}$/, 'Enter a valid Philippine mobile number'),
  bookingContactNumber: z
    .string()
    .trim()
    .regex(/^(\+63|0)9\d{9}$/, 'Enter a valid Philippine mobile number')
    .optional()
    .or(z.literal('')),
  websiteUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  socialMediaUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  priceRange: z.enum(PRICE_RANGE_OPTIONS).optional(),
  genderAvailability: z.enum(GENDER_AVAILABILITY_OPTIONS),
});
export type BusinessDetailsInput = z.infer<typeof businessDetailsSchema>;

export const locationSchema = z.object({
  addressLine: z.string().trim().min(5, 'Enter a street address').max(255),
  barangay: z.string().trim().max(120).optional().or(z.literal('')),
  cityMunicipality: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().max(10).optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type LocationInput = z.infer<typeof locationSchema>;

export const businessHourSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .or(z.literal('')),
    closeTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .or(z.literal('')),
  })
  .refine((hour) => hour.isClosed || (hour.openTime && hour.closeTime), {
    message: 'Set both an open and close time, or mark the day as closed',
    path: ['openTime'],
  });
export type BusinessHourInput = z.infer<typeof businessHourSchema>;

export const businessHoursSchema = z.array(businessHourSchema).length(7);

export const businessServicesSchema = z
  .array(
    z.object({
      serviceCategoryId: z.string().uuid(),
      isFeatured: z.boolean().default(false),
    }),
  )
  .min(1, 'Select at least one service');

export const imageMetadataSchema = z.object({
  caption: z.string().trim().max(140).optional().or(z.literal('')),
  altText: z.string().trim().max(140).optional().or(z.literal('')),
  isPrimary: z.boolean().default(false),
});
export type ImageMetadataInput = z.infer<typeof imageMetadataSchema>;

/** Validates a File's client-reported size/type against the platform's
 * image rules before upload — the server re-checks the actual bytes
 * server-side (magic-byte sniffing), since a client can lie about both. */
export function validateImageFile(file: { size: number; type: string }): string | null {
  if (file.size > IMAGE_LIMITS.maxFileSizeBytes) {
    return `Image must be under ${IMAGE_LIMITS.maxFileSizeBytes / (1024 * 1024)} MB`;
  }
  if (
    !IMAGE_LIMITS.allowedMimeTypes.includes(
      file.type as (typeof IMAGE_LIMITS.allowedMimeTypes)[number],
    )
  ) {
    return 'Only JPEG, PNG, or WEBP images are allowed';
  }
  return null;
}

export const spaSubmissionSchema = z.object({
  details: businessDetailsSchema,
  location: locationSchema,
  hours: businessHoursSchema,
  services: businessServicesSchema,
});
export type SpaSubmissionInput = z.infer<typeof spaSubmissionSchema>;
