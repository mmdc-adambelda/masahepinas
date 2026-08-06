'use server';

import { revalidatePath } from 'next/cache';
import { reviewReplySchema } from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ReplyResult {
  error: string | null;
}

/**
 * One official reply per review, owner-only (RLS: `owns_business`). Owners
 * can create or edit their reply but never delete a review itself — there
 * is deliberately no delete action anywhere in this file (see
 * docs/permissions.md: "spa owners cannot delete reviews").
 */
export async function submitReply(
  reviewId: string,
  businessId: string,
  _prevState: ReplyResult,
  formData: FormData,
): Promise<ReplyResult> {
  const session = await requireRole('spa_owner');
  const supabase = await createSupabaseServerClient();

  const parsed = reviewReplySchema.safeParse({ body: formData.get('body') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Write a reply first.' };
  }

  const { data: existing } = await supabase
    .from('review_replies')
    .select('id')
    .eq('review_id', reviewId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('review_replies')
      .update({ body: parsed.data.body })
      .eq('id', existing.id);
    if (error) return { error: 'Could not update your reply. Please try again.' };
  } else {
    const { error } = await supabase.from('review_replies').insert({
      review_id: reviewId,
      business_id: businessId,
      replied_by: session.userId,
      body: parsed.data.body,
    });
    if (error) return { error: 'Could not post your reply. Please try again.' };
  }

  revalidatePath('/owner/reviews');
  return { error: null };
}
