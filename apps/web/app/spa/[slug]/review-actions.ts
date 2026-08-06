'use server';

import { revalidatePath } from 'next/cache';
import { contentReportSchema, reviewSubmissionSchema } from '@masahepinas/validation';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ReviewActionResult {
  error: string | null;
  success?: boolean;
}

/**
 * Creates or updates the caller's single review for a business (RLS +
 * the `reviews_one_active_per_customer_idx` unique index both enforce one
 * active review per customer per spa — see docs/permissions.md). Editing
 * an existing review is just calling this again; history is preserved
 * automatically by the `record_review_edit` DB trigger.
 */
export async function submitReview(
  businessId: string,
  slug: string,
  _prevState: ReviewActionResult,
  formData: FormData,
): Promise<ReviewActionResult> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const categoryRatingsRaw: Record<string, number> = {};
  for (const category of [
    'service_quality',
    'professionalism',
    'cleanliness',
    'ambience',
    'value_for_money',
  ]) {
    const value = formData.get(`category_${category}`);
    if (value) categoryRatingsRaw[category] = Number(value);
  }

  const parsed = reviewSubmissionSchema.safeParse({
    overallRating: formData.get('overallRating'),
    body: formData.get('body'),
    serviceDate: formData.get('serviceDate') || undefined,
    categoryRatings:
      Object.keys(categoryRatingsRaw).length > 0 ? categoryRatingsRaw : undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Check your review and try again.',
    };
  }

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_id', session.userId)
    .is('deleted_at', null)
    .maybeSingle();

  let reviewId = existing?.id;

  if (!existing) {
    // Only rate-limit new reviews — editing your one existing review isn't
    // a spam vector (the unique index already caps it at one per business).
    const rateLimitError = await checkRateLimit({
      table: 'reviews',
      userColumn: 'customer_id',
      userId: session.userId,
      maxCount: 5,
      windowMinutes: 15,
      message: "You're posting reviews too quickly. Please wait a bit and try again.",
    });
    if (rateLimitError) return { error: rateLimitError };
  }

  if (existing) {
    const { error } = await supabase
      .from('reviews')
      .update({
        overall_rating: parsed.data.overallRating,
        body: parsed.data.body,
        service_date: parsed.data.serviceDate || null,
      })
      .eq('id', existing.id);
    if (error) return { error: 'Could not update your review. Please try again.' };
  } else {
    const { data: created, error } = await supabase
      .from('reviews')
      .insert({
        business_id: businessId,
        customer_id: session.userId,
        overall_rating: parsed.data.overallRating,
        body: parsed.data.body,
        service_date: parsed.data.serviceDate || null,
      })
      .select('id')
      .single();
    if (error || !created) {
      return {
        error:
          'Could not submit your review. Business owners cannot review their own listing, and you can only have one active review per business.',
      };
    }
    reviewId = created.id;
  }

  if (reviewId && parsed.data.categoryRatings) {
    await supabase.from('review_ratings').delete().eq('review_id', reviewId);
    const rows = Object.entries(parsed.data.categoryRatings).map(
      ([category, rating]) => ({
        review_id: reviewId,
        category,
        rating,
      }),
    );
    if (rows.length > 0) await supabase.from('review_ratings').insert(rows);
  }

  revalidatePath(`/spa/${slug}`);
  return { error: null, success: true };
}

export async function toggleHelpfulVote(
  reviewId: string,
  slug: string,
): Promise<{ helpful: boolean; error: string | null }> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from('review_helpful_votes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('voter_id', session.userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('review_helpful_votes')
      .delete()
      .eq('id', existing.id);
    if (error) return { helpful: true, error: 'Could not update. Please try again.' };
    revalidatePath(`/spa/${slug}`);
    return { helpful: false, error: null };
  }

  const rateLimitError = await checkRateLimit({
    table: 'review_helpful_votes',
    userColumn: 'voter_id',
    userId: session.userId,
    maxCount: 30,
    windowMinutes: 5,
    message: "You're voting too quickly. Please wait a bit and try again.",
  });
  if (rateLimitError) return { helpful: false, error: rateLimitError };

  const { error } = await supabase
    .from('review_helpful_votes')
    .insert({ review_id: reviewId, voter_id: session.userId });
  if (error) {
    return { helpful: false, error: 'You can’t mark your own review as helpful.' };
  }
  revalidatePath(`/spa/${slug}`);
  return { helpful: true, error: null };
}

export async function submitReport(
  _prevState: ReviewActionResult,
  formData: FormData,
): Promise<ReviewActionResult> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const parsed = contentReportSchema.safeParse({
    targetType: formData.get('targetType'),
    targetId: formData.get('targetId'),
    reason: formData.get('reason'),
    details: formData.get('details') || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Select a reason for your report.',
    };
  }

  const rateLimitError = await checkRateLimit({
    table: 'content_reports',
    userColumn: 'reporter_id',
    userId: session.userId,
    maxCount: 10,
    windowMinutes: 60,
    message: "You've submitted a lot of reports recently. Please wait a bit and try again.",
  });
  if (rateLimitError) return { error: rateLimitError };

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: session.userId,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) return { error: 'Could not submit your report. Please try again.' };

  return { error: null, success: true };
}
