import { formatPhp, formatRelativeDate } from '@masahepinas/utils';
import { PREMIUM_PLAN } from '@masahepinas/config';
import { requireRole } from '@/lib/auth';
import { getMyBusiness } from '@/lib/spa-businesses';
import { getPaymentEvents, getSubscriptionForBusiness } from '@/lib/billing';
import { CancelButton, UpgradeButton } from './billing-actions';

export const metadata = { title: 'Subscription' };

const STATUS_LABELS: Record<string, string> = {
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export default async function OwnerBillingPage() {
  const session = await requireRole('spa_owner');
  const business = await getMyBusiness(session.userId);

  if (!business) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-foreground-secondary">No listing found for your account.</p>
      </main>
    );
  }

  const subscription = await getSubscriptionForBusiness(business.id);
  const events = subscription ? await getPaymentEvents(subscription.id) : [];
  const isActive = subscription && ['trial', 'active'].includes(subscription.status);

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Subscription</h1>
        <p className="text-sm text-foreground-secondary">{business.businessName}</p>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">
              {isActive ? PREMIUM_PLAN.name : 'Free plan'}
            </p>
            {subscription ? (
              <p className="text-xs text-foreground-secondary">
                Status: {STATUS_LABELS[subscription.status] ?? subscription.status}
                {subscription.currentPeriodEnd
                  ? ` · renews/expires ${new Date(subscription.currentPeriodEnd).toLocaleDateString('en-PH')}`
                  : ''}
                {subscription.cancelAtPeriodEnd ? ' · will not renew' : ''}
              </p>
            ) : (
              <p className="text-xs text-foreground-secondary">No active subscription.</p>
            )}
          </div>
        </div>

        <ul className="space-y-1 text-sm text-foreground-secondary">
          <li>✓ Premium badge and priority placement in search results</li>
          <li>✓ Inclusion in premium discovery carousels</li>
          <li>✓ Basic listing analytics</li>
          <li>✓ Priority verification review</li>
        </ul>

        {isActive ? (
          <CancelButton businessId={business.id} />
        ) : (
          <UpgradeButton businessId={business.id} />
        )}

        <p className="text-xs text-foreground-secondary">
          {formatPhp(PREMIUM_PLAN.pricePhp)}/{PREMIUM_PLAN.billingCycle.replace('ly', '')}
          , billed in test mode — no real payment is collected during development. Premium
          placement is always clearly labelled &quot;Premium&quot; and never presented as
          an independent editorial recommendation.
        </p>
      </div>

      {events.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Billing history</h2>
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="card flex items-center justify-between text-sm"
              >
                <span className="text-foreground">
                  {event.eventType.replace(/_/g, ' ')}
                </span>
                <span className="text-foreground-secondary">
                  {formatRelativeDate(event.processedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
