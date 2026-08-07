import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DAY_NAMES } from '@masahepinas/types';
import { APP_NAME } from '@masahepinas/config';
import { formatGenderAvailability, formatPriceRange } from '@masahepinas/utils';
import { getListingBySlug } from '@/lib/spa-businesses';
import { getServerAuthSession } from '@/lib/auth';
import { isBusinessSaved } from '@/lib/saved';
import {
  getMyHelpfulVotes,
  getMyReviewForBusiness,
  getReviewsForBusiness,
} from '@/lib/reviews';
import { ListingMap } from '@/components/ListingMap';
import { ReportButton } from '@/components/ReportButton';
import { TrackedLink } from '@/components/TrackedLink';
import { recordEvent } from '@/lib/analytics';
import { ClaimBanner } from './claim-banner';
import { SavedToggle } from './saved-toggle';
import { ReviewForm } from './review-form';
import { ReviewList } from './review-list';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: 'Listing not found' };

  const location = listing.location
    ? `${listing.location.cityMunicipality}, ${listing.location.province}`
    : '';
  const description =
    listing.description?.slice(0, 155) ??
    `${listing.businessName} — massage and spa services in ${location}, Philippines.`;

  return {
    title: `${listing.businessName} — ${location}`,
    description,
    alternates: { canonical: `/spa/${listing.slug}` },
    openGraph: {
      title: listing.businessName,
      description,
      images: listing.images[0] ? [listing.images[0].publicUrl] : undefined,
    },
  };
}

export default async function SpaListingPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || !listing.location) notFound();

  const session = await getServerAuthSession();
  const saved = session ? await isBusinessSaved(session.userId, listing.id) : false;
  const isOwner = session?.userId === listing.ownerId;

  // Best-effort, never blocks rendering — see docs/product-requirements.md §26.
  void recordEvent('listing_view', listing.id, session?.userId ?? null);

  const reviews = await getReviewsForBusiness(listing.id);
  const [myReview, votedReviewIds] = session
    ? await Promise.all([
        getMyReviewForBusiness(listing.id, session.userId),
        getMyHelpfulVotes(
          reviews.map((r) => r.id),
          session.userId,
        ),
      ])
    : [null, new Set<string>()];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.businessName,
    description: listing.description ?? undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/spa/${listing.slug}`,
    telephone: listing.contactNumber ?? undefined,
    image: listing.images.map((img) => img.publicUrl),
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.location.addressLine,
      addressLocality: listing.location.cityMunicipality,
      addressRegion: listing.location.province,
      postalCode: listing.location.postalCode ?? undefined,
      addressCountry: 'PH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: listing.location.latitude,
      longitude: listing.location.longitude,
    },
    // AggregateRating is intentionally omitted until reviewCount > 0 (Phase
    // 3) — never publish rating schema without real reviews backing it,
    // per docs/product-requirements.md §19.
    ...(listing.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: listing.averageRating,
            reviewCount: listing.reviewCount,
          },
        }
      : {}),
  };

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-foreground-secondary">
        <Link href="/" className="hover:underline">
          {APP_NAME}
        </Link>{' '}
        /{' '}
        <Link
          href={`/spas/${slugParam(listing.location.province)}`}
          className="hover:underline"
        >
          {listing.location.province}
        </Link>{' '}
        / <span>{listing.businessName}</span>
      </nav>

      {listing.status !== 'verified' ? (
        <div className="card border-warning/40 text-sm text-warning">
          {listing.status === 'pending_review'
            ? 'This listing is pending verification and not yet publicly indexed.'
            : 'This listing has not completed verification yet.'}
        </div>
      ) : null}

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {listing.isPremium ? (
            <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-background">
              Premium
            </span>
          ) : null}
          {listing.isRecommended ? (
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-background">
              Masahe Pinas Recommended
            </span>
          ) : null}
          {listing.status === 'verified' ? (
            <span className="rounded-full border border-brand/40 px-2 py-0.5 text-xs text-brand-accent">
              Verified
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold text-foreground">{listing.businessName}</h1>
        <p className="text-foreground-secondary">
          {listing.location.addressLine},{' '}
          {listing.location.barangay ? `${listing.location.barangay}, ` : ''}
          {listing.location.cityMunicipality}, {listing.location.province}
        </p>
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          {listing.reviewCount > 0 ? (
            <span>
              ★ {listing.averageRating.toFixed(1)} ({listing.reviewCount} reviews)
            </span>
          ) : (
            <span>No reviews yet</span>
          )}
        </div>
      </header>

      {listing.images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {listing.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.id}
              src={image.publicUrl}
              alt={image.altText ?? listing.businessName}
              className="aspect-[4/3] w-full rounded-lg object-cover"
            />
          ))}
        </div>
      ) : null}

      {!listing.ownerId ? (
        <ClaimBanner businessId={listing.id} isSignedIn={Boolean(session)} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        {listing.contactNumber ? (
          <TrackedLink
            eventType="contact_click"
            businessId={listing.id}
            href={`tel:${listing.contactNumber}`}
            className="btn-primary"
          >
            Call {listing.contactNumber}
          </TrackedLink>
        ) : null}
        <TrackedLink
          eventType="directions_click"
          businessId={listing.id}
          href={`https://www.openstreetmap.org/directions?to=${listing.location.latitude}%2C${listing.location.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Get directions
        </TrackedLink>
        <SavedToggle
          businessId={listing.id}
          slug={listing.slug}
          initialSaved={saved}
          isSignedIn={Boolean(session)}
        />
        {session ? <ReportButton targetType="listing" targetId={listing.id} /> : null}
      </div>

      {listing.description ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">About</h2>
          <p className="whitespace-pre-line text-foreground-secondary">
            {listing.description}
          </p>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full border border-white/10 px-3 py-1 text-foreground-secondary">
          {formatGenderAvailability(listing.genderAvailability)}
        </span>
        {listing.priceRange ? (
          <span className="rounded-full border border-white/10 px-3 py-1 text-foreground-secondary">
            {formatPriceRange(listing.priceRange)}
          </span>
        ) : null}
      </section>

      {listing.services.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Services</h2>
          <div className="flex flex-wrap gap-2">
            {listing.services.map((s) => (
              <Link
                key={s.serviceCategoryId}
                href={`/services/${s.category.slug}`}
                className={`rounded-full border px-3 py-1 text-sm ${
                  s.isFeatured
                    ? 'border-brand text-brand-accent'
                    : 'border-white/10 text-foreground-secondary'
                }`}
              >
                {s.category.name}
                {s.isFeatured ? ' ★' : ''}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Operating hours</h2>
        <table className="w-full text-sm text-foreground-secondary">
          <tbody>
            {listing.hours
              .slice()
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((h) => (
                <tr key={h.dayOfWeek} className="border-t border-white/5">
                  <td className="py-1.5 pr-4 text-foreground">
                    {DAY_NAMES[h.dayOfWeek]}
                  </td>
                  <td className="py-1.5">
                    {h.isClosed
                      ? 'Closed'
                      : `${h.openTime?.slice(0, 5)} – ${h.closeTime?.slice(0, 5)}`}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Location</h2>
        <ListingMap
          latitude={listing.location.latitude}
          longitude={listing.location.longitude}
          label={listing.businessName}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Reviews</h2>

        {!session ? (
          <p className="text-sm text-foreground-secondary">
            <a href="/sign-in" className="text-brand-accent hover:underline">
              Sign in
            </a>{' '}
            to write a review.
          </p>
        ) : isOwner ? (
          <p className="text-sm text-foreground-secondary">
            You can&apos;t review your own business.
          </p>
        ) : (
          <ReviewForm
            businessId={listing.id}
            slug={listing.slug}
            existingReview={myReview}
          />
        )}

        <ReviewList
          reviews={reviews}
          slug={listing.slug}
          votedReviewIds={votedReviewIds}
          isSignedIn={Boolean(session)}
        />
      </section>
    </main>
  );
}

function slugParam(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}
