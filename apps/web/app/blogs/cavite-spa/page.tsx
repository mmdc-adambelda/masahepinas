import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME } from '@masahepinas/config';
import { searchListings } from '@/lib/spa-businesses';
import { labelToSlug, listCitiesInProvince, resolveProvince } from '@/lib/locations';
import { ListingCard, type ListingCardData } from '@/components/ListingCard';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const LAST_UPDATED = '2026-08-11';

export const metadata: Metadata = {
  // Absolute title — bypasses the layout's "%s · Masahe Pinas" template
  // since the brand is already in this title.
  title: { absolute: 'Spa in Cavite: Massage Reviews & Spa Guide | Masahe Pinas' },
  description:
    'Looking for a spa in Cavite or massage in Cavite? Read local spa reviews and discover massage & wellness businesses across Cavite on Masahe Pinas.',
  alternates: { canonical: '/blogs/cavite-spa' },
  openGraph: {
    title: 'Spa in Cavite: Massage Reviews & Spa Guide | Masahe Pinas',
    description:
      'Looking for a spa in Cavite or massage in Cavite? Read local spa reviews and discover massage & wellness businesses across Cavite on Masahe Pinas.',
    url: `${siteUrl}/blogs/cavite-spa`,
    type: 'article',
  },
};

const FEATURED_CITIES = [
  'General Trias',
  'Imus',
  'Dasmariñas',
  'Bacoor',
  'Tagaytay',
  'Trece Martires',
];

const MASSAGE_CATEGORIES = [
  {
    name: 'Swedish massage',
    blurb: 'A gentle, full-body relaxation massage using long, flowing strokes.',
  },
  {
    name: 'Deep tissue massage',
    blurb: 'Firmer pressure aimed at chronic muscle tension and soreness.',
  },
  {
    name: 'Traditional Filipino massage (Hilot)',
    blurb: 'A traditional Filipino healing massage passed down through generations.',
  },
  {
    name: 'Therapeutic massage',
    blurb: 'Massage focused on specific muscle or pain-related concerns.',
  },
  {
    name: 'Relaxation massage',
    blurb: 'Lighter-pressure massage meant purely for stress relief and unwinding.',
  },
  {
    name: 'Foot massage',
    blurb: 'Reflexology-style massage focused on the feet and lower legs.',
  },
];

const FAQS = [
  {
    q: 'Where can I find a spa in Cavite?',
    a: 'You can search for a spa in Cavite directly on Masahe Pinas — our directory lists massage and spa businesses across the province, searchable by city, service, and rating.',
  },
  {
    q: 'How can I find massage reviews in Cavite?',
    a: 'Each spa or massage business listed on Masahe Pinas has its own profile page with community reviews and ratings left by customers who visited that business.',
  },
  {
    q: 'How do I choose a good massage spa in Cavite?',
    a: 'Check recent reviews, compare the services and price range listed, confirm the exact location and operating hours, and reach out through the contact details on the listing before booking.',
  },
  {
    q: 'Can I find spas in General Trias on Masahe Pinas?',
    a: 'Yes — General Trias is one of the Cavite cities covered in our directory. Businesses located there appear in this guide and in search results filtered to General Trias.',
  },
  {
    q: 'Does Masahe Pinas list spas in Imus?',
    a: 'Yes, Imus is one of the Cavite cities in our directory. You can browse Imus listings below or filter search results by city.',
  },
  {
    q: 'How can I review a spa in Cavite?',
    a: 'Create a Masahe Pinas account, visit the business’s listing page, and submit a rating and written review based on your experience.',
  },
  {
    q: 'Can spa owners list their Cavite business on Masahe Pinas?',
    a: 'Yes. Any legitimate massage, spa, or wellness business owner in Cavite (or anywhere in the Philippines) can create a free listing through our spa owner sign-up.',
  },
  {
    q: 'What should I check before booking a massage in Cavite?',
    a: 'Review the business’s services, price range, operating hours, exact address, and recent customer reviews, and confirm booking details directly with the business beforehand.',
  },
];

function groupByCity(rows: ListingCardData[], city: string): ListingCardData[] {
  return rows.filter((row) => row.cityMunicipality.toLowerCase() === city.toLowerCase());
}

export default async function CaviteSpaPage() {
  const province = await resolveProvince('cavite');
  const [results, cities] = province
    ? await Promise.all([
        searchListings({ province, sort: 'rating', page: 1 }),
        listCitiesInProvince(province),
      ])
    : [null, []];

  const rows: ListingCardData[] = (results?.rows ?? []).map((row) => ({
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
  }));

  const citiesWithListings = FEATURED_CITIES.filter((city) =>
    cities.some((c) => c.toLowerCase() === city.toLowerCase()),
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${siteUrl}/blogs/cavite-spa#article`,
        headline: 'Spa in Cavite: Massage, Spa Reviews & Local Wellness Guide',
        description:
          'Looking for a spa in Cavite or massage in Cavite? Read local spa reviews and discover massage & wellness businesses across Cavite on Masahe Pinas.',
        url: `${siteUrl}/blogs/cavite-spa`,
        dateModified: LAST_UPDATED,
        author: { '@type': 'Organization', name: APP_NAME },
        publisher: { '@type': 'Organization', name: APP_NAME },
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: [
          { '@type': 'Thing', name: 'Spa in Cavite' },
          { '@type': 'Thing', name: 'Massage in Cavite' },
          { '@type': 'Place', name: 'Cavite, Philippines' },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Blogs', item: `${siteUrl}/blogs` },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Cavite Spa',
            item: `${siteUrl}/blogs/cavite-spa`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-foreground-secondary">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        /{' '}
        <Link href="/blogs" className="hover:underline">
          Blogs
        </Link>{' '}
        / <span>Cavite Spa</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Spa in Cavite: Massage, Spa Reviews &amp; Local Wellness Guide
        </h1>
        <p className="text-sm text-foreground-secondary">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="prose-content space-y-8 text-foreground-secondary [&_a]:text-brand-accent [&_a:hover]:underline [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:pt-2 [&_h3]:text-foreground [&_h3]:font-medium [&_h3]:text-lg [&_p]:leading-relaxed [&_li]:leading-relaxed">
        <p>
          If you&apos;re searching for a{' '}
          <strong className="text-foreground">spa in Cavite</strong>, want{' '}
          <strong className="text-foreground">massage in Cavite</strong> options near you,
          or you&apos;re trying to read an honest{' '}
          <strong className="text-foreground">spa review in Cavite</strong> before you
          book, this guide is built to answer exactly that. Masahe Pinas lists massage and
          spa businesses across Cavite&apos;s cities and municipalities, with community
          reviews attached to real listings.
        </p>

        <section className="space-y-3">
          <h2>Looking for a Spa in Cavite?</h2>
          <p>
            Cavite is one of the fastest-growing provinces in CALABARZON, home to cities
            like General Trias, Imus, Dasmariñas, Bacoor, and Tagaytay — each with its own
            cluster of massage and spa businesses. Masahe Pinas helps you discover
            establishments throughout the province from a single search, rather than
            relying on scattered Facebook posts or word of mouth. You can browse by city,
            filter by service or price range, and check ratings and reviews before you
            commit to a booking.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Discover Massage in Cavite</h2>
          <p>
            Massage and spa businesses across Cavite generally offer a range of service
            categories. What&apos;s actually available varies by establishment, so always
            confirm services directly on the business&apos;s Masahe Pinas listing or with
            the business itself — but here&apos;s what to expect from common categories:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {MASSAGE_CATEGORIES.map((category) => (
              <li key={category.name}>
                <span className="font-medium text-foreground">{category.name}</span> —{' '}
                {category.blurb}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2>Spa Reviews in Cavite</h2>
          <p>
            Customer experiences vary from one business to the next, which is why reviews
            matter before you book a massage or spa treatment. Every business listed on
            Masahe Pinas has its own profile where past customers can leave a rating and a
            written review — the same community review system used across the national{' '}
            <Link href="/search">Masahe Pinas review platform</Link>, applied locally to
            Cavite listings. Reading a handful of recent reviews on a listing is usually
            the fastest way to gauge service quality, cleanliness, and professionalism
            before you go.
          </p>
        </section>

        <section className="space-y-4">
          <h2>Find Spas Across Cavite</h2>
          <p>
            Here&apos;s a look at massage and spa businesses currently listed on Masahe
            Pinas by city. Only real, published listings from our directory appear below.
          </p>

          {citiesWithListings.length > 0 ? (
            <div className="space-y-6">
              {citiesWithListings.map((city) => {
                const cityRows = groupByCity(rows, city).slice(0, 3);
                return (
                  <div key={city} className="space-y-3">
                    <h3>Spa in {city}</h3>
                    {cityRows.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {cityRows.map((row) => (
                          <ListingCard key={row.slug} listing={row} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm">
                        No {city} listings yet —{' '}
                        <Link
                          href={`/search?province=Cavite&city=${encodeURIComponent(city)}`}
                        >
                          check current search results for {city}
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm">
              We&apos;re still building out our Cavite directory city by city. In the
              meantime,{' '}
              <Link href="/search?province=Cavite">search all Cavite listings</Link>{' '}
              directly.
            </p>
          )}

          {province ? (
            <p className="text-sm">
              See every Cavite listing on Masahe Pinas, including cities beyond the ones
              featured above, on our{' '}
              <Link href={`/spas/${labelToSlug(province)}`}>Cavite directory page</Link>.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2>How to Choose a Massage Spa in Cavite</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Check recent reviews from other customers</li>
            <li>Compare the services each business actually offers</li>
            <li>Review posted operating hours before heading over</li>
            <li>Confirm the exact location and how to get there</li>
            <li>Look at whatever facility information or photos are available</li>
            <li>Confirm booking or contact information ahead of time</li>
            <li>Ask about or check pricing before you arrive</li>
            <li>Weigh recent customer experiences, not just star ratings</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2>Popular Types of Massage in Cavite</h2>
          <p>
            Relaxation and Swedish massage tend to be the most commonly requested options
            for stress relief, while deep tissue and therapeutic massage suit customers
            dealing with specific muscle tension or soreness. Traditional hilot remains
            popular with customers looking for a more culturally rooted treatment. Foot
            and body massage are often booked as shorter, standalone sessions.
            Availability differs by business, so check each listing&apos;s service details
            on Masahe Pinas before booking.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Finding a Spa Near You in Cavite</h2>
          <p>
            The fastest way to find a spa near you in Cavite is to use Masahe Pinas&apos;s
            search directly — filter by province and city, add a service or price range if
            you have one in mind, and sort by rating to see top-reviewed businesses first.
          </p>
          <p>
            <Link href="/search?province=Cavite" className="btn-primary mt-1 inline-flex">
              Search Cavite spas now
            </Link>
          </p>
        </section>

        <section className="space-y-3">
          <h2>Explore Cavite Spa Reviews on Masahe Pinas</h2>
          <p>
            This guide is part of the broader <Link href="/blogs">Masahe Pinas blog</Link>
            , where we&apos;re building out local spa and massage guides for provinces and
            cities across the Philippines. To learn more about how Masahe Pinas works as a
            platform, visit our <Link href="/about">about page</Link>. If you run a
            legitimate massage or spa business in Cavite,{' '}
            <Link href="/sign-up/spa-owner">list your spa for free</Link> to become
            discoverable here.
          </p>
        </section>

        <section className="space-y-4">
          <h2>Frequently Asked Questions About Spas in Cavite</h2>
          <dl className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <dt className="font-medium text-foreground">{faq.q}</dt>
                <dd className="mt-1 text-sm">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
