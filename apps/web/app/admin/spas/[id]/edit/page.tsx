import { notFound } from 'next/navigation';
import { requireSuperadmin } from '@/lib/auth';
import { getListingForEdit } from '@/lib/admin';
import { AdminBackLink } from '../../../back-link';
import { EditSpaForm } from './edit-spa-form';

export const metadata = { title: 'Edit spa listing (admin)' };

export default async function AdminEditSpaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperadmin();
  const { id } = await params;
  const listing = await getListingForEdit(id);
  if (!listing) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-16">
      <AdminBackLink />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Edit {listing.businessName}
        </h1>
        <p className="text-sm text-foreground-secondary">
          Superadmin-only. Status changes (verify/reject/suspend/archive/delete) happen
          from{' '}
          <a href="/admin/listings" className="text-brand-accent hover:underline">
            the listing verification page
          </a>
          , not here.
        </p>
      </div>
      <EditSpaForm listing={listing} />
    </main>
  );
}
