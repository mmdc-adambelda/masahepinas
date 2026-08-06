import { z } from 'zod';
import { REVIEW_CATEGORIES } from '@masahepinas/types';

/**
 * Shared review/reply/report schemas. Server-side re-validation is
 * mandatory (see docs/security-checklist.md) — the client form using the
 * same schema is a convenience, not the security boundary.
 */

export const reviewSubmissionSchema = z.object({
  overallRating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, 'Write at least 10 characters').max(3000),
  serviceDate: z.string().date().optional().or(z.literal('')),
  serviceCategoryId: z.string().uuid().optional().or(z.literal('')),
  categoryRatings: z
    .record(z.enum(REVIEW_CATEGORIES), z.coerce.number().int().min(1).max(5))
    .optional(),
});
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

export const reviewReplySchema = z.object({
  body: z.string().trim().min(5, 'Write at least 5 characters').max(2000),
});
export type ReviewReplyInput = z.infer<typeof reviewReplySchema>;

export const reportReasons = [
  'fake_review',
  'harassment',
  'hate_speech',
  'personal_information',
  'spam',
  'conflict_of_interest',
  'explicit_content',
  'blackmail_or_extortion',
  'unrelated_to_business',
  'illegal_service_promotion',
] as const;

export const contentReportSchema = z.object({
  targetType: z.enum(['review', 'listing', 'user']),
  targetId: z.string().uuid(),
  reason: z.enum(reportReasons),
  details: z.string().trim().max(1000).optional().or(z.literal('')),
});
export type ContentReportInput = z.infer<typeof contentReportSchema>;

export const moderationActionSchema = z.object({
  reason: z.string().trim().min(3, 'A reason is required').max(500),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
