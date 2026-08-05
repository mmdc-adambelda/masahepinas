import type { Metadata } from 'next';
import Link from 'next/link';
import { searchFiltersSchema } from '@masahepinas/validation';
import { searchListings } from '@/lib/spa-businesses';
import { DiscoveryMap } from '@/components/DiscoveryMap';
import { ListingCard } from '@/components/ListingCard';

export const metadata: Metadata = {
  title: 'Map — Explore spas near you',
  description: 'Browse massage and spa businesses on the map across the Philippines.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MapDiscoveryPage({ searchParams }: PageProps) {
  const rawParams = await searchParams;
  const flatParams = Object.fromEntries(
    Object.entries(rawParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const parsed = searchFiltersSchema.safeParse(flatParams);
  const filters = parsed.success ? parsed.data : searchFiltersSchema.parse({});

  const results = await searchListings(filters);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Map discovery</h1>
        <Link href="/search" className="btn-secondary">
          List view
        </Link>
      </div>

      <DiscoveryMap
        pins={results.rows.map((row) => ({
          slug: row.slug,
          businessName: row.businessName,
          latitude: row.latitude,
          longitude: row.longitude,
        }))}
      />

      {results.rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.rows.map((row) => (
            <ListingCard
              key={row.id}
              listing={{
                slug: row.slug,
                businessName: row.businessName,
                cityMunicipality: row.cityMunicipality,
                province: row.province,
                averageRating: row.averageRating,
                reviewCount: row.reviewCount,
                isPremium: row.isPremium,
                isRecommended: row.isRecommended,
                priceRange: row.priceRange,
                primaryImageUrl: row.primaryImageUrl,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-foreground-secondary">No listings to show on the map yet.</p>
      )}
    </main>
  );
}
