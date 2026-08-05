import { requireAuth } from '@/lib/auth';
import { listSavedBusinesses } from '@/lib/saved';
import { businessImagePublicUrl } from '@/lib/spa-businesses';
import { ListingCard } from '@/components/ListingCard';

export const metadata = { title: 'Saved spas' };

export default async function SavedPage() {
  const session = await requireAuth();
  const saved = await listSavedBusinesses(session.userId);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Saved spas</h1>

      {saved.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((item) => (
            <ListingCard
              key={item.businessId}
              listing={{
                slug: item.slug,
                businessName: item.businessName,
                cityMunicipality: item.cityMunicipality,
                province: item.province,
                averageRating: item.averageRating,
                reviewCount: item.reviewCount,
                isPremium: item.isPremium,
                isRecommended: item.isRecommended,
                priceRange: item.priceRange,
                primaryImageUrl: item.primaryImagePath
                  ? businessImagePublicUrl(item.primaryImagePath)
                  : null,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-foreground-secondary">
          You haven&apos;t saved any spas yet. Browse the{' '}
          <a href="/search" className="text-brand-accent hover:underline">
            directory
          </a>{' '}
          and tap Save on a listing.
        </p>
      )}
    </main>
  );
}
