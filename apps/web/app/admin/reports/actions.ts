'use server';

import { revalidatePath } from 'next/cache';
import { moderationActionSchema } from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ModerationResult {
  error: string | null;
}

/**
 * Minimal Phase 3 moderation surface: hide a reported review, or dismiss
 * the report. The full Moderator Dashboard (all queues from
 * docs/moderation-policy.md) is Phase 7 — this exists now so "a moderator
 * can hide policy-violating reviews" and "every moderation action is
 * logged" (Phase 3 acceptance criteria) are real, working capabilities.
 */
export async function hideReportedReview(
  reportId: string,
  reviewId: string,
  _prevState: ModerationResult,
  formData: FormData,
): Promise<ModerationResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = moderationActionSchema.safeParse({
    reason: formData.get('reason'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  const { data: before } = await supabase
    .from('reviews')
    .select('moderation_status, customer_id')
    .eq('id', reviewId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from('reviews')
    .update({ moderation_status: 'hidden' })
    .eq('id', reviewId);
  if (updateError) return { error: 'Could not hide the review. Please try again.' };

  const { data: action } = await supabase
    .from('moderation_actions')
    .insert({
      moderator_id: session.userId,
      action_type: 'hide_content',
      target_type: 'review',
      target_id: reviewId,
      reason: parsed.data.reason,
      notes: parsed.data.notes || null,
      previous_state: before ? { moderation_status: before.moderation_status } : null,
      new_state: { moderation_status: 'hidden' },
      report_id: reportId,
    })
    .select('id')
    .single();

  if (before?.customer_id && action) {
    await supabase.from('notifications').insert({
      user_id: before.customer_id,
      type: 'review_hidden',
      title: 'Your review was hidden',
      body: `Reason: ${parsed.data.reason}. You can appeal this decision.`,
      link_url: `/appeals/new/${action.id}`,
    });
  }

  await supabase
    .from('content_reports')
    .update({ status: 'resolved' })
    .eq('id', reportId);

  revalidatePath('/admin/reports');
  return { error: null };
}

export async function dismissReport(
  reportId: string,
  targetType: string,
  targetId: string,
  _prevState: ModerationResult,
  formData: FormData,
): Promise<ModerationResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = moderationActionSchema.safeParse({
    reason: formData.get('reason'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  await supabase
    .from('content_reports')
    .update({ status: 'dismissed' })
    .eq('id', reportId);

  await supabase.from('moderation_actions').insert({
    moderator_id: session.userId,
    action_type: 'dismiss_report',
    target_type: targetType,
    target_id: targetId,
    reason: parsed.data.reason,
    notes: parsed.data.notes || null,
    report_id: reportId,
  });

  revalidatePath('/admin/reports');
  return { error: null };
}

export async function restoreReview(
  reviewId: string,
  _prevState: ModerationResult,
  formData: FormData,
): Promise<ModerationResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = moderationActionSchema.safeParse({ reason: formData.get('reason') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  const { error } = await supabase
    .from('reviews')
    .update({ moderation_status: 'visible' })
    .eq('id', reviewId);
  if (error) return { error: 'Could not restore the review.' };

  await supabase.from('moderation_actions').insert({
    moderator_id: session.userId,
    action_type: 'restore_content',
    target_type: 'review',
    target_id: reviewId,
    reason: parsed.data.reason,
    new_state: { moderation_status: 'visible' },
  });

  revalidatePath('/admin/reports');
  return { error: null };
}
