'use server';

import { revalidatePath } from 'next/cache';
import { moderationActionSchema } from '@masahepinas/validation';
import { requireRole, requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AdminUserActionResult {
  error: string | null;
}

/** Suspend/reinstate is a moderator-level capability (docs/permissions.md
 * §2 "Suspend account: moderator (per policy)") — logged to
 * moderation_actions, not audit_logs, since it's a content-moderation-style
 * action on a specific account. */
export async function setUserStatus(
  userId: string,
  newStatus: 'active' | 'suspended',
  _prevState: AdminUserActionResult,
  formData: FormData,
): Promise<AdminUserActionResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = moderationActionSchema.safeParse({ reason: formData.get('reason') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  const { data: before } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', userId)
    .maybeSingle();

  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', userId);
  if (error) return { error: 'Could not update this account. Please try again.' };

  const { data: action } = await supabase
    .from('moderation_actions')
    .insert({
      moderator_id: session.userId,
      action_type: newStatus === 'suspended' ? 'suspend_account' : 'reinstate_account',
      target_type: 'profile',
      target_id: userId,
      reason: parsed.data.reason,
      previous_state: before ?? null,
      new_state: { status: newStatus },
    })
    .select('id')
    .single();

  if (newStatus === 'suspended' && action) {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'account_suspended',
      title: 'Your account was suspended',
      body: `Reason: ${parsed.data.reason}. You can appeal this decision.`,
      link_url: `/appeals/new/${action.id}`,
    });
  }

  revalidatePath('/admin/users');
  return { error: null };
}

/** Granting/revoking staff roles is superadmin-only (docs/permissions.md
 * §2 "Manage moderators: superadmin"), logged to the platform-wide
 * audit_logs table rather than moderation_actions. */
export async function setModeratorRole(
  userId: string,
  grant: boolean,
  _prevState: AdminUserActionResult,
  formData: FormData,
): Promise<AdminUserActionResult> {
  const session = await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const reason = String(formData.get('reason') ?? '').trim();
  if (reason.length < 3) {
    return { error: 'A reason is required.' };
  }

  if (grant) {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: 'moderator', granted_by: session.userId });
    if (error)
      return { error: 'Could not grant the moderator role. They may already have it.' };
  } else {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'moderator');
    if (error) return { error: 'Could not revoke the moderator role.' };
  }

  await supabase.from('audit_logs').insert({
    actor_id: session.userId,
    action: grant ? 'grant_moderator_role' : 'revoke_moderator_role',
    entity_type: 'user_roles',
    entity_id: userId,
    new_state: { role: 'moderator', granted: grant, reason },
  });

  revalidatePath('/admin/users');
  return { error: null };
}
