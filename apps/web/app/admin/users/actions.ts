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

/** Approve a pending registration — moderator-level, same tier as
 * suspend/reinstate. Logged to moderation_actions since it's a
 * per-account decision, not a platform-config change. Unlike suspend/
 * reject, this doesn't require a typed reason — approving is the
 * non-punitive happy path, not a judgment call that needs justifying. */
export async function approveRegistration(
  userId: string,
  _prevState: AdminUserActionResult,
): Promise<AdminUserActionResult> {
  const session = await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const { data: before } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', userId)
    .maybeSingle();
  if (before?.status !== 'pending_approval') {
    return { error: 'This account is no longer pending approval.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', userId);
  if (error) return { error: 'Could not approve this account. Please try again.' };

  await supabase.from('moderation_actions').insert({
    moderator_id: session.userId,
    action_type: 'approve_registration',
    target_type: 'profile',
    target_id: userId,
    reason: 'Registration approved',
    previous_state: before,
    new_state: { status: 'active' },
  });

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'registration_approved',
    title: 'Your account was approved',
    body: 'You now have full access to Masahe Pinas.',
    link_url: '/',
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { error: null };
}

/** Reject a pending registration. There's no account-deletion path
 * available to the app (that requires the Supabase Admin API / service-
 * role key, which is intentionally never used from this app — see
 * docs/security-checklist.md), so a rejection lands the account in
 * 'suspended' rather than removing it. The person can appeal like any
 * other suspension. */
export async function rejectRegistration(
  userId: string,
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
  if (before?.status !== 'pending_approval') {
    return { error: 'This account is no longer pending approval.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId);
  if (error) return { error: 'Could not reject this account. Please try again.' };

  const { data: action } = await supabase
    .from('moderation_actions')
    .insert({
      moderator_id: session.userId,
      action_type: 'reject_registration',
      target_type: 'profile',
      target_id: userId,
      reason: parsed.data.reason,
      previous_state: before,
      new_state: { status: 'suspended' },
    })
    .select('id')
    .single();

  if (action) {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'registration_rejected',
      title: 'Your registration was not approved',
      body: `Reason: ${parsed.data.reason}. You can appeal this decision.`,
      link_url: `/appeals/new/${action.id}`,
    });
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin');
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
