import Link from 'next/link';
import { IMAGE_LIMITS } from '@masahepinas/config';
import { requireRole } from '@/lib/auth';
import { getMyBusiness, listServiceCategories } from '@/lib/spa-businesses';
import { SubmitSpaForm } from './submit-spa-form';
import { ImageManager } from './image-manager';

export const metadata = { title: 'Complete your spa listing' };

export default async function SubmitSpaPage() {
  const session = await requireRole('spa_owner');
  const [business, categories] = await Promise.all([
    getMyBusiness(session.userId),
    listServiceCategories(),
  ]);

  if (!business) {
    // Shouldn't happen for a spa_owner account (the signup trigger always
    // creates a draft business), but fail gracefully rather than crash.
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-foreground-secondary">
          We couldn&apos;t find a draft listing for your account. Please contact support.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Complete your spa listing
        </h1>
        <p className="text-sm text-foreground-secondary">
          Status:{' '}
          <span className="font-medium text-brand-accent">
            {business.status === 'pending_review' ? 'Pending review' : business.status}
          </span>{' '}
          — your listing goes live once a moderator verifies it. You can keep editing
          these details any time.
        </p>
        <Link
          href="/owner/reviews"
          className="inline-block text-sm text-brand-accent hover:underline"
        >
          Manage reviews →
        </Link>
      </div>

      <SubmitSpaForm business={business} categories={categories} />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Photos</h2>
        <p className="text-sm text-foreground-secondary">
          Up to {IMAGE_LIMITS.maxImagesPerListing} images,{' '}
          {IMAGE_LIMITS.maxFileSizeBytes / (1024 * 1024)} MB each. The first photo becomes
          your listing&apos;s primary image.
        </p>
        <ImageManager businessId={business.id} images={business.images} />
      </div>
    </main>
  );
}
