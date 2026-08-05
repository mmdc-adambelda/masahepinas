import Link from 'next/link';
import { formatDistance } from '@masahepinas/utils';

export interface ListingCardData {
  slug: string;
  businessName: string;
  cityMunicipality: string;
  province: string;
  averageRating: number;
  reviewCount: number;
  isPremium: boolean;
  isRecommended: boolean;
  priceRange: string | null;
  primaryImageUrl: string | null;
  distanceKm?: number | null;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link
      href={`/spa/${listing.slug}`}
      className="card group flex flex-col overflow-hidden p-0 transition-colors hover:border-brand"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-background-secondary">
        {listing.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.primaryImageUrl}
            alt={listing.businessName}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-foreground-secondary">
            No photo yet
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
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
        </div>
      </div>
      <div className="space-y-1 p-4">
        <h3 className="font-medium text-foreground">{listing.businessName}</h3>
        <p className="text-sm text-foreground-secondary">
          {listing.cityMunicipality}, {listing.province}
          {typeof listing.distanceKm === 'number'
            ? ` · ${formatDistance(listing.distanceKm)}`
            : ''}
        </p>
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          {listing.reviewCount > 0 ? (
            <span>
              ★ {listing.averageRating.toFixed(1)} ({listing.reviewCount})
            </span>
          ) : (
            <span>No reviews yet</span>
          )}
          {listing.priceRange ? (
            <span>· {listing.priceRange.replace('_', ' ')}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
