import type { SubscriptionStatus } from './enums';

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  pricePhp: number;
  billingCycle: string;
}

export interface Subscription {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  providerName: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentEvent {
  id: string;
  eventType: string;
  processedAt: string;
  rawPayload: Record<string, unknown>;
}
