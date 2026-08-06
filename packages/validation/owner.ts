import { z } from 'zod';

export const verificationDetailsSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional().or(z.literal('')),
  contactNumber: z
    .string()
    .trim()
    .regex(/^(\+63|0)9\d{9}$/, 'Enter a valid Philippine mobile number')
    .optional()
    .or(z.literal('')),
  businessPermitReference: z.string().trim().max(120).optional().or(z.literal('')),
  governmentRegistrationReference: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal('')),
});
export type VerificationDetailsInput = z.infer<typeof verificationDetailsSchema>;
