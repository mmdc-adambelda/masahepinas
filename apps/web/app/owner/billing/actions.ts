'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface BillingResult {
  error: string | null;
}

/**
 * Test-mode "checkout" — no card details are collected or stored anywhere
 * (see docs/security-checklist.md). Delegates to the
 * `start_premium_subscription` RPC, which is the only way
 * `spa_businesses.is_premium` ever gets set (via a DB trigger reacting to
 * the resulting subscription row) — never directly client-settable.
 */
export async function upgradeToPremium(businessId: string): Promise<BillingResult> {
  await requireRole('spa_owner');
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc('start_premium_subscription', {
    target_business_id: businessId,
  });
  if (error)
    return { error: 'Could not start your Premium subscription. Please try again.' };

  revalidatePath('/owner/billing');
  revalidatePath('/owner/dashboard');
  return { error: null };
}

export async function cancelPremium(businessId: string): Promise<BillingResult> {
  await requireRole('spa_owner');
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc('cancel_premium_subscription', {
    target_business_id: businessId,
  });
  if (error) return { error: 'Could not cancel your subscription. Please try again.' };

  revalidatePath('/owner/billing');
  revalidatePath('/owner/dashboard');
  return { error: null };
}
