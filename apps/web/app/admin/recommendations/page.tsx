import Link from 'next/link';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RecommendForm } from './recommend-form';

export const metadata = { title: 'Masahe Pinas Recommended' };

export default async function AdminRecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperadmin();
  const { q } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('spa_businesses')
    .select('id, slug, business_name, is_recommended, is_premium, average_rating, review_count, status')
    .eq('status', 'verified')
    .order('average_rating', { ascending: false })
    .limit(50);

  if (q?.trim()) {
    query = query.ilike('business_name', `%${q.trim()}%`);
  }

  const { data: listings } = await query;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Masahe Pinas Recommended</h1>
        <p className="text-sm text-foreground-secondary">
          Editorial, quality-based only — never granted for paying for
          Premium. Only verified listings are eligible. Every decision is
          logged with your reasoning to <code>recommendation_records</code>{' '}
          and <code>audit_logs</code>.
        </p>
      </div>

      <form className="flex gap-2">
        <input type="text" name="q" defaultValue={q ?? ''} placeholder="Search verified listings" className="input-field flex-1" />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      <div className="space-y-3">
        {(listings ?? []).map((listing) => (
          <article key={listing.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/spa/${listing.slug}`} className="font-medium text-foreground hover:underline">
                  {listing.business_name}
                </Link>
                <p className="text-xs text-foreground-secondary">
                  ★ {Number(listing.average_rating).toFixed(1)} ({listing.review_count} reviews)
                  {listing.is_premium ? ' · Premium' : ''}
                  {listing.is_recommended ? ' · Currently recommended' : ''}
                </p>
              </div>
            </div>
            <RecommendForm businessId={listing.id} isRecommended={listing.is_recommended} />
          </article>
        ))}
        {(listings ?? []).length === 0 ? <p className="text-foreground-secondary">No verified listings found.</p> : null}
      </div>
    </main>
  );
}
