import Link from 'next/link';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AddFeaturedForm } from './add-form';
import { RemoveButton } from './remove-button';

export const metadata = { title: 'Featured placements' };

export default async function AdminFeaturedPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data: placements } = await supabase
    .from('featured_placements')
    .select('id, placement_key, created_at, spa_businesses(business_name, slug)')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Featured placements</h1>
        <p className="text-sm text-foreground-secondary">
          Controls homepage/featured sections independently of Premium and
          Recommended status.
        </p>
      </div>

      <AddFeaturedForm />

      <div className="space-y-2">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(placements ?? []).map((p: any) => (
          <div key={p.id} className="card flex items-center justify-between">
            <div>
              <Link href={`/spa/${p.spa_businesses?.slug}`} className="font-medium text-foreground hover:underline">
                {p.spa_businesses?.business_name ?? 'Unknown listing'}
              </Link>
              <p className="text-xs text-foreground-secondary">{p.placement_key}</p>
            </div>
            <RemoveButton placementId={p.id} />
          </div>
        ))}
        {(placements ?? []).length === 0 ? <p className="text-foreground-secondary">No featured placements yet.</p> : null}
      </div>
    </main>
  );
}
