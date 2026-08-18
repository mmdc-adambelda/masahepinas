import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getListingForEdit } from '@/lib/admin';
import { getBusinessImages } from '@/lib/spa-businesses';
import { ImageManager } from '@/components/ImageManager';
import { AdminBackLink } from '../../../back-link';
import { EditSpaForm } from './edit-spa-form';

export const metadata = { title: 'Edit spa listing (admin)' };

export default async function AdminEditSpaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Staff-gated (moderator or superadmin) — any admin can manage a
  // business's logo/banner photos and business details here.
  // `updateSpaListing` (apps/web/app/admin/spas/[id]/edit/actions.ts)
  // independently enforces the same staff-level check, matching what
  // RLS already permits (spa_businesses_update in
  // supabase/migrations/0003_spa_directory.sql).
  await requireRole('moderator');
  const { id } = await params;
  const [listing, images] = await Promise.all([
    getListingForEdit(id),
    getBusinessImages(id),
  ]);
  if (!listing) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-16">
      <AdminBackLink />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Edit {listing.businessName}
        </h1>
        <p className="text-sm text-foreground-secondary">
          Status changes (verify/reject/suspend/archive/delete) happen from{' '}
          <a href="/admin/listings" className="text-brand-accent hover:underline">
            the listing verification page
          </a>
          , not here.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Logo, banner &amp; photos
        </h2>
        <p className="text-sm text-foreground-secondary">
          Upload a logo or banner on behalf of this business owner. The photo marked
          &quot;Logo / banner&quot; is shown on the business&apos;s public listing.
        </p>
        <ImageManager businessId={id} images={images} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Business details</h2>
        <EditSpaForm listing={listing} />
      </section>
    </main>
  );
}
