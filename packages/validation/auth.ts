import { z } from 'zod';

/**
 * Shared between apps/web (React Hook Form / Server Actions) and
 * apps/mobile (React Hook Form) so client and server validation never drift.
 * Server-side callers MUST re-run these schemas — never trust that the
 * client already validated (see docs/security-checklist.md).
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[0-9]/, 'Password needs a number');

export const customerSignUpSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name is too short').max(60),
  email: emailSchema,
  password: passwordSchema,
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  acceptedTermsOfService: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service' }),
  }),
  acceptedPrivacyPolicy: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Privacy Policy' }),
  }),
  confirmedTruthfulReviews: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm you will submit truthful reviews' }),
  }),
});
export type CustomerSignUpInput = z.infer<typeof customerSignUpSchema>;

export const spaOwnerSignUpSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  contactNumber: z
    .string()
    .trim()
    .regex(/^(\+63|0)9\d{9}$/, 'Enter a valid Philippine mobile number'),
  password: passwordSchema,
  businessName: z.string().trim().min(2).max(150),
  acceptedListingPolicies: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the listing policies' }),
  }),
  confirmedLegitimateService: z.literal(true, {
    errorMap: () => ({
      message: 'You must confirm this is a legitimate wellness business',
    }),
  }),
});
export type SpaOwnerSignUpInput = z.infer<typeof spaOwnerSignUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  isPrivate: z.boolean().optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
