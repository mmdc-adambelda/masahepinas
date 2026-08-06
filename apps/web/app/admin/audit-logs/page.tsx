import { formatRelativeDate } from '@masahepinas/utils';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Audit logs' };

export default async function AdminAuditLogsPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Audit logs</h1>
        <p className="text-sm text-foreground-secondary">
          Immutable, superadmin-only. Most recent 100 platform-level actions (role grants,
          recommendation decisions, featured placements).
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-foreground-secondary">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Actor</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Entity</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(logs ?? []).map((log: any) => (
              <tr key={log.id} className="border-b border-white/5">
                <td className="py-2 pr-4 text-foreground-secondary">
                  {formatRelativeDate(log.created_at)}
                </td>
                <td className="py-2 pr-4 text-foreground-secondary">
                  {log.profiles?.display_name ?? '—'}
                </td>
                <td className="py-2 pr-4 text-foreground">{log.action}</td>
                <td className="py-2 pr-4 text-foreground-secondary">
                  {log.entity_type}
                  {log.entity_id ? ` (${log.entity_id.slice(0, 8)}…)` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(logs ?? []).length === 0 ? (
          <p className="mt-4 text-foreground-secondary">No audit log entries yet.</p>
        ) : null}
      </div>
    </main>
  );
}
