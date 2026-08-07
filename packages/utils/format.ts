export function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

const GENDER_AVAILABILITY_LABELS: Record<string, string> = {
  male_only: 'Male therapists only',
  female_only: 'Female therapists only',
  both: 'Male and female therapists',
  no_preference: 'Therapist gender not specified',
};

/** Human-readable label for a business's `gender_availability` value —
 * shown on the listing page so customers know who's available before
 * they book. Falls back to the raw value for forward-compatibility if a
 * new enum value ships before this map is updated. */
export function formatGenderAvailability(value: string): string {
  return GENDER_AVAILABILITY_LABELS[value] ?? value;
}

const PRICE_RANGE_LABELS: Record<string, string> = {
  budget: 'Budget',
  mid_range: 'Mid-range',
  premium: 'Premium',
  luxury: 'Luxury',
};

export function formatPriceRange(value: string): string {
  return PRICE_RANGE_LABELS[value] ?? value;
}
