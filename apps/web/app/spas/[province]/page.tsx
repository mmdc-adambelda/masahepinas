import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { searchListings } from '@/lib/spa-businesses';
import { labelToSlug, listCitiesInProvince, resolveProvince } from '@/lib/locations';
import { ListingCard } from '@/components/ListingCard';

interface PageProps {
  params: Promise<{ province: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { province: provinceSlug } = await params;
  const province = await resolveProvince(provinceSlug);
  if (!province) return { title: 'Location not found' };
  return {
    title: `Massage & Spa in ${province}, Philippines`,
    description: `Browse verified massage and spa businesses in ${province}. Filter by service, rating, and therapist availability.`,
    alternates: { canonical: `/spas/${provinceSlug}` },
  };
}

export default async function ProvinceDirectoryPage({ params }: PageProps) {
  const { province: provinceSlug } = await params;
  const province = await resolveProvince(provinceSlug);
  if (!province) notFound();

  const [results, cities] = await Promise.all([
    searchListings({ province, sort: 'relevance', page: 1 }),
    listCitiesInProvince(province),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs text-foreground-secondary">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        / <span>{province}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Massage &amp; Spa in {province}, Philippines
        </h1>
        <p className="text-foreground-secondary">
          {results.totalCount} {results.totalCount === 1 ? 'business' : 'businesses'}{' '}
          found across {province}.
        </p>
      </header>

      {cities.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {cities.map((city) => (
            <Link
              key={city}
              href={`/spas/${provinceSlug}/${labelToSlug(city)}`}
              className="rounded-full border border-white/10 px-3 py-1 text-sm text-foreground-secondary hover:border-brand hover:text-foreground"
            >
              {city}
            </Link>
          ))}
        </div>
      ) : null}

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
          No listings in {province} yet — check back soon, or{' '}
          <Link href="/sign-up/spa-owner" className="text-brand-accent hover:underline">
            list your spa for free
          </Link>
          .
        </p>
      )}
    </main>
  );
}
