import type { Metadata } from 'next';
import Link from 'next/link';
import { searchFiltersSchema, PAGE_SIZE } from '@masahepinas/validation';
import { searchListings } from '@/lib/spa-businesses';
import { ListingCard } from '@/components/ListingCard';
import { SearchFilters } from '@/components/SearchFilters';

export const metadata: Metadata = {
  title: 'Search massage & spa businesses',
  description:
    'Search and filter verified massage and spa businesses across the Philippines.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: PageProps) {
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
  const totalPages = Math.max(1, Math.ceil(results.totalCount / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Search</h1>

      <SearchFilters />

      <p className="text-sm text-foreground-secondary">
        {results.totalCount} {results.totalCount === 1 ? 'result' : 'results'}
      </p>

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
                distanceKm: row.distanceKm,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-foreground-secondary">
          No results. Try a different search term or clear some filters.
        </p>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={{
                pathname: '/search',
                query: { ...flatParams, page: String(pageNum) },
              }}
              className={`rounded-md px-3 py-1.5 ${
                pageNum === results.page
                  ? 'bg-brand text-background'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              {pageNum}
            </Link>
          ))}
        </nav>
      ) : null}
    </main>
  );
}
