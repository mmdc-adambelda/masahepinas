'use server';

import { requireAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ClaimResult {
  error: string | null;
  success?: boolean;
}

/**
 * Files a claim on an unclaimed (superadmin-created) listing. Approval is
 * a staff-only action (`approve_business_claim` RPC — see
 * supabase/migrations/0008_owner_portal_admin.sql) that reassigns
 * ownership and grants the `spa_owner` role atomically; this action only
 * creates the pending request (docs/moderation-policy.md §6).
 */
export async function submitClaim(
  businessId: string,
  _prevState: ClaimResult,
  formData: FormData,
): Promise<ClaimResult> {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const notes = String(formData.get('notes') ?? '').trim();

  const { error } = await supabase.from('business_claims').insert({
    business_id: businessId,
    claimant_user_id: session.userId,
    notes: notes || null,
  });

  if (error) {
    return {
      error:
        'Could not submit your claim — you may already have a pending claim on this listing.',
    };
  }

  return { error: null, success: true };
}
