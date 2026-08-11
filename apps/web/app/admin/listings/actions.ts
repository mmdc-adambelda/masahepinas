'use server';

import { revalidatePath } from 'next/cache';
import { hasRole } from '@masahepinas/types';
import { moderationActionSchema } from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ListingModerationResult {
  error: string | null;
}

const STATUS_ACTIONS = ['verified', 'unverified', 'suspended', 'archived'] as const;
type StatusAction = (typeof STATUS_ACTIONS)[number];

// The moderation_action_type enum has no dedicated "suspend/archive
// listing" variants — reject_listing covers every non-approval outcome.
const ACTION_TYPE_BY_STATUS: Record<StatusAction, 'approve_listing' | 'reject_listing'> =
  {
    verified: 'approve_listing',
    unverified: 'reject_listing',
    suspended: 'reject_listing',
    archived: 'reject_listing',
  };

/**
 * Single entry point for every per-listing action on /admin/listings —
 * one dropdown ("Choose action…") + one reason field + one Apply button,
 * rather than a row of four separate always-visible buttons. The action
 * itself comes from `formData` (not a pre-bound argument), which is what
 * makes one form/one server action work for every possible choice.
 *
 * `spa_businesses.status` is a staff-protected column
 * (`enforce_business_update_guard`, see
 * supabase/migrations/0003_spa_directory.sql) — the status branch only
 * works because `requireRole('moderator')` gates the page and RLS
 * separately confirms `is_staff(auth.uid())`. Delete is superadmin-only,
 * checked again here even though the option is hidden from moderators in
 * the UI — never trust a client-side hide as the real boundary.
 */
export async function applyListingAction(
  businessId: string,
  _prevState: ListingModerationResult,
  formData: FormData,
): Promise<ListingModerationResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const action = String(formData.get('action') ?? '');
  const parsed = moderationActionSchema.safeParse({ reason: formData.get('reason') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  if (action === 'deleted') {
    if (!hasRole(session, 'superadmin')) {
      return { error: 'Only a superadmin can delete a listing.' };
    }

    const { data: before } = await supabase
      .from('spa_businesses')
      .select('business_name, owner_id')
      .eq('id', businessId)
      .maybeSingle();

    const { error } = await supabase
      .from('spa_businesses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', businessId);
    if (error) return { error: 'Could not delete the listing. Please try again.' };

    await supabase.from('audit_logs').insert({
      actor_id: session.userId,
      action: 'delete_listing',
      entity_type: 'spa_business',
      entity_id: businessId,
      previous_state: before ?? null,
      new_state: { deleted: true, reason: parsed.data.reason },
    });

    revalidatePath('/admin/listings');
    revalidatePath('/admin');
    return { error: null };
  }

  if (!STATUS_ACTIONS.includes(action as StatusAction)) {
    return { error: 'Choose an action.' };
  }
  const newStatus = action as StatusAction;

  const { data: before } = await supabase
    .from('spa_businesses')
    .select('status, owner_id, business_name')
    .eq('id', businessId)
    .maybeSingle();

  const { error } = await supabase
    .from('spa_businesses')
    .update({ status: newStatus })
    .eq('id', businessId);
  if (error) return { error: 'Could not update the listing. Please try again.' };

  const { data: moderationAction } = await supabase
    .from('moderation_actions')
    .insert({
      moderator_id: session.userId,
      action_type: ACTION_TYPE_BY_STATUS[newStatus],
      target_type: 'spa_business',
      target_id: businessId,
      reason: parsed.data.reason,
      previous_state: before ? { status: before.status } : null,
      new_state: { status: newStatus },
    })
    .select('id')
    .single();

  if (before?.owner_id && moderationAction && newStatus !== 'verified') {
    await supabase.from('notifications').insert({
      user_id: before.owner_id,
      type: 'listing_status_changed',
      title: `Your listing status changed: ${newStatus.replace('_', ' ')}`,
      body: `Reason: ${parsed.data.reason}. You can appeal this decision.`,
      link_url: `/appeals/new/${moderationAction.id}`,
    });
  }

  revalidatePath('/admin/listings');
  return { error: null };
}
