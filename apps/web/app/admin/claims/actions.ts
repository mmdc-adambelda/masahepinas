'use server';

import { revalidatePath } from 'next/cache';
import { moderationActionSchema } from '@masahepinas/validation';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ClaimModerationResult {
  error: string | null;
}

export async function approveClaim(
  claimId: string,
  _prevState: ClaimModerationResult,
  formData: FormData,
): Promise<ClaimModerationResult> {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = moderationActionSchema.safeParse({ reason: formData.get('reason') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  const { error } = await supabase.rpc('approve_business_claim', {
    claim_id: claimId,
    reason: parsed.data.reason,
  });
  if (error) return { error: 'Could not approve the claim. Please try again.' };

  revalidatePath('/admin/claims');
  return { error: null };
}

export async function rejectClaim(
  claimId: string,
  _prevState: ClaimModerationResult,
  formData: FormData,
): Promise<ClaimModerationResult> {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const parsed = moderationActionSchema.safeParse({ reason: formData.get('reason') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'A reason is required.' };
  }

  const { error } = await supabase.rpc('reject_business_claim', {
    claim_id: claimId,
    reason: parsed.data.reason,
  });
  if (error) return { error: 'Could not reject the claim. Please try again.' };

  revalidatePath('/admin/claims');
  return { error: null };
}
