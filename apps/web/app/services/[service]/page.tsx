import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { searchListings } from '@/lib/spa-businesses';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/ListingCard';

interface PageProps {
  params: Promise<{ service: string }>;
}

async function getCategory(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('service_categories')
    .select('id, slug, name, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { service } = await params;
  const category = await getCategory(service);
  if (!category) return { title: 'Service not found' };
  return {
    title: `${category.name} in the Philippines`,
    description:
      category.description ??
      `Find spas and wellness centers offering ${category.name} across the Philippines.`,
    alternates: { canonical: `/services/${category.slug}` },
  };
}

export default async function ServiceDirectoryPage({ params }: PageProps) {
  const { service } = await params;
  const category = await getCategory(service);
  if (!category) notFound();

  const results = await searchListings({
    serviceSlug: category.slug,
    sort: 'rating',
    page: 1,
  });

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs text-foreground-secondary">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        / <span>{category.name}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{category.name}</h1>
        {category.description ? (
          <p className="max-w-2xl text-foreground-secondary">{category.description}</p>
        ) : null}
        <p className="text-sm text-foreground-secondary">
          {results.totalCount}{' '}
          {results.totalCount === 1 ? 'business offers' : 'businesses offer'}{' '}
          {category.name.toLowerCase()}.
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
          No businesses offering {category.name.toLowerCase()} yet — check back soon.
        </p>
      )}
    </main>
  );
}
