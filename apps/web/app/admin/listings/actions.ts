'use server';

import { revalidatePath } from 'next/cache';
import { hasRole } from '@masahepinas/types';
import type { AuthSession } from '@masahepinas/types';
import { moderationActionSchema } from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ListingModerationResult {
  error: string | null;
}

export interface BulkListingModerationResult {
  error: string | null;
  summary?: { updated: number; failed: number };
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

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * The actual per-listing action, shared by both the single-row form
 * (`applyListingAction`) and the multi-select bulk bar
 * (`bulkApplyListingAction`) — one implementation, two entry points.
 *
 * `spa_businesses.status` is a staff-protected column
 * (`enforce_business_update_guard`, see
 * supabase/migrations/0003_spa_directory.sql) — the status branch only
 * works because the caller is already staff-gated and RLS separately
 * confirms `is_staff(auth.uid())`. Delete requires superadmin, checked
 * again here even though the option is hidden from moderators in the
 * UI — never trust a client-side hide as the real boundary.
 */
async function applyOneListingAction(
  session: AuthSession,
  supabase: SupabaseClient,
  businessId: string,
  action: string,
  reason: string,
): Promise<{ error: string | null }> {
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
    if (error) return { error: 'Could not delete the listing.' };

    await supabase.from('audit_logs').insert({
      actor_id: session.userId,
      action: 'delete_listing',
      entity_type: 'spa_business',
      entity_id: businessId,
      previous_state: before ?? null,
      new_state: { deleted: true, reason },
    });

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
  if (error) return { error: 'Could not update the listing.' };

  const { data: moderationAction } = await supabase
    .from('moderation_actions')
    .insert({
      moderator_id: session.userId,
      action_type: ACTION_TYPE_BY_STATUS[newStatus],
      target_type: 'spa_business',
      target_id: businessId,
      reason,
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
      body: `Reason: ${reason}. You can appeal this decision.`,
      link_url: `/appeals/new/${moderationAction.id}`,
    });
  }

  return { error: null };
}

/** Single-listing entry point — one dropdown ("Choose action…") + one
 * reason field + one Apply button per row, rather than four separate
 * always-visible buttons. */
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

  const result = await applyOneListingAction(
    session,
    supabase,
    businessId,
    action,
    parsed.data.reason,
  );
  if (result.error) return result;

  revalidatePath('/admin/listings');
  revalidatePath('/admin');
  return { error: null };
}

/** Multi-select entry point — applies the same action/reason to every
 * checked listing (checkboxes elsewhere on the page reference this
 * form's id via the HTML `form` attribute, since a checkbox doesn't have
 * to be a DOM descendant of the form it submits with). One bad row in
 * the batch doesn't stop the rest — the summary reports how many of
 * each. */
export async function bulkApplyListingAction(
  _prevState: BulkListingModerationResult,
  formData: FormData,
): Promise<BulkListingModerationResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const businessIds = formData.getAll('businessIds').map(String).filter(Boolean);
  if (businessIds.length === 0) {
    return { error: 'Select at least one listing first.' };
  }

  const action = String(formData.get('action') ?? '');
  const parsed = moderationActionSchema.safeParse({ reason: formData.get('reason') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  let updated = 0;
  let failed = 0;
  let lastError: string | null = null;
  for (const businessId of businessIds) {
    const result = await applyOneListingAction(
      session,
      supabase,
      businessId,
      action,
      parsed.data.reason,
    );
    if (result.error) {
      failed += 1;
      lastError = result.error;
    } else {
      updated += 1;
    }
  }

  revalidatePath('/admin/listings');
  revalidatePath('/admin');

  if (updated === 0) {
    return { error: lastError ?? 'Could not apply the action to any selected listing.' };
  }
  return { error: null, summary: { updated, failed } };
}
