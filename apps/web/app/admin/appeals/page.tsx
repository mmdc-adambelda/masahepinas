import { formatRelativeDate } from '@masahepinas/utils';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ResolveForm } from './resolve-form';

export const metadata = { title: 'Appeals' };

export default async function AdminAppealsPage() {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const { data: appeals } = await supabase
    .from('appeals')
    .select(
      'id, message, created_at, profiles!appeals_submitted_by_fkey(display_name), moderation_actions(action_type, target_type, reason)',
    )
    .eq('status', 'open')
    .order('created_at', { ascending: true });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Appeals</h1>
        <p className="text-sm text-foreground-secondary">
          Open appeals of moderation decisions. Overturning automatically reverses the
          underlying action where possible (restoring a review, reinstating an account, or
          re-verifying a listing).
        </p>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(appeals ?? []).map((appeal: any) => (
        <article key={appeal.id} className="card space-y-2">
          <p className="text-xs text-foreground-secondary">
            {appeal.profiles?.display_name ?? 'Unknown user'} ·{' '}
            {formatRelativeDate(appeal.created_at)}
          </p>
          <p className="text-xs uppercase tracking-wide text-foreground-secondary">
            Appealing: {appeal.moderation_actions?.action_type} (
            {appeal.moderation_actions?.target_type})
          </p>
          {appeal.moderation_actions?.reason ? (
            <p className="text-xs text-foreground-secondary">
              Original reason: {appeal.moderation_actions.reason}
            </p>
          ) : null}
          <p className="text-sm text-foreground-secondary">{appeal.message}</p>
          <div className="grid grid-cols-2 gap-3">
            <ResolveForm appealId={appeal.id} outcome="overturned" label="Overturn" />
            <ResolveForm appealId={appeal.id} outcome="upheld" label="Uphold" />
          </div>
        </article>
      ))}
      {(appeals ?? []).length === 0 ? (
        <p className="text-foreground-secondary">No open appeals.</p>
      ) : null}
    </main>
  );
}
