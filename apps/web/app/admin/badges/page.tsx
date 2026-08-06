import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CreateBadgeForm, DeleteBadgeButton } from './badge-controls';

export const metadata = { title: 'Badge management' };

export default async function AdminBadgesPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();
  const { data: badges } = await supabase.from('badges').select('*').order('tier', { ascending: true, nullsFirst: false });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Badge management</h1>
        <p className="text-sm text-foreground-secondary">
          Badges are only ever awarded automatically by the system based on
          real activity — there is no manual &quot;award to user&quot;
          control here, by design.
        </p>
      </div>

      <CreateBadgeForm />

      <div className="space-y-2">
        {(badges ?? []).map((badge) => (
          <div key={badge.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                {badge.name} {badge.tier ? <span className="text-xs text-foreground-secondary">Tier {badge.tier}</span> : null}
              </p>
              <p className="text-xs text-foreground-secondary">{badge.description}</p>
            </div>
            <DeleteBadgeButton badgeId={badge.id} />
          </div>
        ))}
      </div>
    </main>
  );
}
