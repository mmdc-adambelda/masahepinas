'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface RecommendationResult {
  error: string | null;
}

/**
 * Toggles "Masahe Pinas Recommended" — deliberately superadmin-only (the
 * business-update guard trigger enforces this independently of this
 * action, see supabase/migrations/0010_moderation_admin.sql) and always
 * separate from Premium billing status: nothing here reads or touches
 * `is_premium`/`subscriptions` (docs/product-requirements.md §8).
 */
export async function setRecommended(
  businessId: string,
  isRecommended: boolean,
  _prevState: RecommendationResult,
  formData: FormData,
): Promise<RecommendationResult> {
  const session = await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const criteriaNotes = String(formData.get('criteriaNotes') ?? '').trim();
  if (isRecommended && criteriaNotes.length < 10) {
    return { error: 'Explain why this listing qualifies (at least 10 characters).' };
  }

  const { error: updateError } = await supabase
    .from('spa_businesses')
    .update({
      is_recommended: isRecommended,
      recommended_by: isRecommended ? session.userId : null,
      recommended_at: isRecommended ? new Date().toISOString() : null,
    })
    .eq('id', businessId);
  if (updateError) return { error: 'Could not update recommendation status. Please try again.' };

  await supabase.from('recommendation_records').insert({
    business_id: businessId,
    decided_by: session.userId,
    is_recommended: isRecommended,
    criteria_notes: criteriaNotes || null,
  });

  await supabase.from('audit_logs').insert({
    actor_id: session.userId,
    action: isRecommended ? 'mark_recommended' : 'unmark_recommended',
    entity_type: 'spa_business',
    entity_id: businessId,
    new_state: { is_recommended: isRecommended, criteria_notes: criteriaNotes || null },
  });

  revalidatePath('/admin/recommendations');
  return { error: null };
}
