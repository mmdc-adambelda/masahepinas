import Link from 'next/link';
import { APP_NAME, APP_TAGLINE, PREMIUM_PLAN } from '@masahepinas/config';
import { formatPhp } from '@masahepinas/utils';
import { searchListings } from '@/lib/spa-businesses';
import { ListingCard } from '@/components/ListingCard';

export default async function HomePage() {
  const highlyRated = await searchListings({ sort: 'rating', page: 1 });

  return (
    <main className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <section className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-accent">
          {APP_NAME}
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold text-foreground sm:text-4xl">
          {APP_TAGLINE}
        </h1>
        <p className="mx-auto max-w-xl text-foreground-secondary">
          Search by location, therapist availability, service, rating, or Masahe Pinas
          recommendation. Read community reviews and find the right wellness experience
          for you.
        </p>

        <form action="/search" className="flex w-full max-w-xl gap-2">
          <input
            type="text"
            name="q"
            placeholder="Search by business, city, or service"
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary shrink-0">
            Explore
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/map" className="btn-secondary">
            Map discovery
          </Link>
          <Link href="/sign-up" className="btn-secondary">
            Create an account
          </Link>
        </div>
      </section>

      {highlyRated.rows.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Highly rated</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlyRated.rows.slice(0, 4).map((row) => (
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
        </section>
      ) : null}

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Safety and trust</h2>
        <ul className="grid grid-cols-1 gap-2 text-sm text-foreground-secondary sm:grid-cols-2">
          <li>✓ Verified businesses reviewed by moderators</li>
          <li>✓ Community reviews from real customers</li>
          <li>✓ Transparent, logged moderation</li>
          <li>✓ Legitimate wellness services only</li>
        </ul>
      </section>

      <section className="card flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Own a spa or wellness business?
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            List your spa for free. Upgrade to {PREMIUM_PLAN.name} for{' '}
            {formatPhp(PREMIUM_PLAN.pricePhp)}/month for extra visibility.
          </p>
        </div>
        <Link href="/sign-up/spa-owner" className="btn-primary shrink-0">
          List your spa
        </Link>
      </section>

      <p className="text-center text-xs text-foreground-secondary">
        Directory, search, and reviews are under active development. See{' '}
        <code className="text-foreground">docs/development-roadmap.md</code>.
      </p>
    </main>
  );
}
