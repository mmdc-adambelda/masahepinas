// Server-only data access (see apps/web/lib/spa-businesses.ts convention note).
import type { PaymentEvent, Subscription } from '@masahepinas/types';
import { createSupabaseServerClient } from './supabase/server';

export async function getSubscriptionForBusiness(
  businessId: string,
): Promise<Subscription | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    businessId: data.business_id,
    planId: data.plan_id,
    status: data.status,
    providerName: data.provider_name,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  };
}

export async function getPaymentEvents(subscriptionId: string): Promise<PaymentEvent[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('payment_events')
    .select('id, event_type, processed_at, raw_payload')
    .eq('subscription_id', subscriptionId)
    .order('processed_at', { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    processedAt: row.processed_at,
    rawPayload: (row.raw_payload ?? {}) as Record<string, unknown>,
  }));
}
