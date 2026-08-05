import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { searchListings } from '@/lib/spa-businesses';
import { resolveCity } from '@/lib/locations';
import { ListingCard } from '@/components/ListingCard';

interface PageProps {
  params: Promise<{ province: string; city: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { province: provinceSlug, city: citySlug } = await params;
  const resolved = await resolveCity(provinceSlug, citySlug);
  if (!resolved) return { title: 'Location not found' };
  return {
    title: `Massage & Spa in ${resolved.city}, ${resolved.province}`,
    description: `Find trusted massage and spa businesses in ${resolved.city}, ${resolved.province}. Read community reviews and compare services.`,
    alternates: { canonical: `/spas/${provinceSlug}/${citySlug}` },
  };
}

export default async function CityDirectoryPage({ params }: PageProps) {
  const { province: provinceSlug, city: citySlug } = await params;
  const resolved = await resolveCity(provinceSlug, citySlug);
  if (!resolved) notFound();

  const results = await searchListings({
    province: resolved.province,
    city: resolved.city,
    sort: 'relevance',
    page: 1,
  });

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs text-foreground-secondary">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        /{' '}
        <Link href={`/spas/${provinceSlug}`} className="hover:underline">
          {resolved.province}
        </Link>{' '}
        / <span>{resolved.city}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Massage &amp; Spa in {resolved.city}, {resolved.province}
        </h1>
        <p className="text-foreground-secondary">
          {results.totalCount} {results.totalCount === 1 ? 'business' : 'businesses'}{' '}
          found in {resolved.city}.
        </p>
      </header>

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
        <p className="text-foreground-secondary">
          No listings in {resolved.city} yet — check back soon, or{' '}
          <Link href="/sign-up/spa-owner" className="text-brand-accent hover:underline">
            list your spa for free
          </Link>
          .
        </p>
      )}
    </main>
  );
}
