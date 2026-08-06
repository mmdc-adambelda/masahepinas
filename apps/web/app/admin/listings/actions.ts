'use server';

import { revalidatePath } from 'next/cache';
import { moderationActionSchema } from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ListingModerationResult {
  error: string | null;
}

// The moderation_action_type enum has no dedicated "suspend/archive
// listing" variants — reject_listing covers every non-approval outcome.
const ACTION_TYPE_BY_STATUS: Record<string, 'approve_listing' | 'reject_listing'> = {
  verified: 'approve_listing',
  unverified: 'reject_listing',
  suspended: 'reject_listing',
  archived: 'reject_listing',
};

/**
 * Sets a listing's verification status. `spa_businesses.status` is a
 * staff-protected column (`enforce_business_update_guard`, see
 * supabase/migrations/0003_spa_directory.sql) — this only works because
 * `requireRole('moderator')` gates the page and RLS separately confirms
 * `is_staff(auth.uid())` before allowing the update.
 */
export async function setListingStatus(
  businessId: string,
  newStatus: 'verified' | 'unverified' | 'suspended' | 'archived',
  _prevState: ListingModerationResult,
  formData: FormData,
): Promise<ListingModerationResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = moderationActionSchema.safeParse({ reason: formData.get('reason') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  const { data: before } = await supabase
    .from('spa_businesses')
    .select('status')
    .eq('id', businessId)
    .maybeSingle();

  const { error } = await supabase
    .from('spa_businesses')
    .update({ status: newStatus })
    .eq('id', businessId);
  if (error) return { error: 'Could not update the listing. Please try again.' };

  await supabase.from('moderation_actions').insert({
    moderator_id: session.userId,
    action_type: ACTION_TYPE_BY_STATUS[newStatus] ?? 'reject_listing',
    target_type: 'spa_business',
    target_id: businessId,
    reason: parsed.data.reason,
    previous_state: before ?? null,
    new_state: { status: newStatus },
  });

  revalidatePath('/admin/listings');
  return { error: null };
}
