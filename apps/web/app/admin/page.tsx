import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getPlatformStats } from '@/lib/admin';

export const metadata = { title: 'Admin dashboard' };

export default async function AdminHomePage() {
  await requireRole('moderator');
  const stats = await getPlatformStats();

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Customers" value={stats.totalCustomers} />
        <StatCard label="Spa owners" value={stats.totalSpaOwners} />
        <StatCard label="Listings" value={stats.totalListings} />
        <StatCard label="Verified" value={stats.verifiedListings} />
        <StatCard
          label="Pending listings"
          value={stats.pendingListings}
          highlight={stats.pendingListings > 0}
        />
        <StatCard
          label="Open reports"
          value={stats.openReports}
          highlight={stats.openReports > 0}
        />
        <StatCard
          label="Pending claims"
          value={stats.pendingClaims}
          highlight={stats.pendingClaims > 0}
        />
        <StatCard label="Reviews" value={stats.reviewCount} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AdminLink
          href="/admin/listings"
          title="Listing verification"
          description="Approve, reject, suspend, or archive spa listings."
        />
        <AdminLink
          href="/admin/claims"
          title="Business claims"
          description="Review ownership claims on unclaimed listings."
        />
        <AdminLink
          href="/admin/reports"
          title="Content reports"
          description="Hide or restore reported reviews and listings."
        />
        <AdminLink
          href="/admin/users"
          title="User management"
          description="Search users, suspend accounts, manage moderator roles."
        />
        <AdminLink
          href="/admin/spas/new"
          title="Add a spa listing"
          description="Manually create an unclaimed listing."
        />
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`card text-center ${highlight ? 'border-warning/50' : ''}`}>
      <p
        className={`text-2xl font-semibold ${highlight ? 'text-warning' : 'text-foreground'}`}
      >
        {value}
      </p>
      <p className="text-xs text-foreground-secondary">{label}</p>
    </div>
  );
}

function AdminLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="card block hover:border-brand">
      <h2 className="font-medium text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
    </Link>
  );
}
