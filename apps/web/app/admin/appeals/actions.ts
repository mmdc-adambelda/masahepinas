'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AppealResolutionResult {
  error: string | null;
}

export async function resolveAppeal(
  appealId: string,
  outcome: 'upheld' | 'overturned',
  _prevState: AppealResolutionResult,
  formData: FormData,
): Promise<AppealResolutionResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const notes = String(formData.get('notes') ?? '').trim();
  if (notes.length < 3) return { error: 'Add a short resolution note.' };

  const { data: appeal } = await supabase
    .from('appeals')
    .select(
      'id, moderation_action_id, moderation_actions(target_type, target_id, action_type)',
    )
    .eq('id', appealId)
    .maybeSingle();
  if (!appeal) return { error: 'Appeal not found.' };

  const { error: updateError } = await supabase
    .from('appeals')
    .update({
      status: outcome,
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
      resolution_notes: notes,
    })
    .eq('id', appealId);
  if (updateError) return { error: 'Could not resolve the appeal. Please try again.' };

  if (outcome === 'overturned') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const action = appeal.moderation_actions as any;
    if (action?.target_type === 'review' && action.action_type === 'hide_content') {
      await supabase
        .from('reviews')
        .update({ moderation_status: 'visible' })
        .eq('id', action.target_id);
      await supabase.from('moderation_actions').insert({
        moderator_id: session.userId,
        action_type: 'restore_content',
        target_type: 'review',
        target_id: action.target_id,
        reason: `Appeal overturned: ${notes}`,
      });
    } else if (
      action?.target_type === 'profile' &&
      action.action_type === 'suspend_account'
    ) {
      await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', action.target_id);
      await supabase.from('moderation_actions').insert({
        moderator_id: session.userId,
        action_type: 'reinstate_account',
        target_type: 'profile',
        target_id: action.target_id,
        reason: `Appeal overturned: ${notes}`,
      });
    } else if (action?.target_type === 'spa_business') {
      await supabase
        .from('spa_businesses')
        .update({ status: 'verified' })
        .eq('id', action.target_id);
      await supabase.from('moderation_actions').insert({
        moderator_id: session.userId,
        action_type: 'approve_listing',
        target_type: 'spa_business',
        target_id: action.target_id,
        reason: `Appeal overturned: ${notes}`,
      });
    }
  }

  revalidatePath('/admin/appeals');
  return { error: null };
}
