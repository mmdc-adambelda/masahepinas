import Link from 'next/link';
import { formatRelativeDate } from '@masahepinas/utils';
import { requireAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { markAllNotificationsRead, markNotificationRead } from './actions';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const session = await requireAuth();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = data ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        {hasUnread ? (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-sm text-brand-accent hover:underline">
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <p className="text-foreground-secondary">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start justify-between gap-3 ${n.is_read ? 'opacity-60' : ''}`}
            >
              <div className="space-y-0.5">
                {n.link_url ? (
                  <Link
                    href={n.link_url}
                    className="font-medium text-foreground hover:underline"
                  >
                    {n.title}
                  </Link>
                ) : (
                  <p className="font-medium text-foreground">{n.title}</p>
                )}
                {n.body ? (
                  <p className="text-sm text-foreground-secondary">{n.body}</p>
                ) : null}
                <p className="text-xs text-foreground-secondary">
                  {formatRelativeDate(n.created_at)}
                </p>
              </div>
              {!n.is_read ? (
                <form action={markNotificationRead.bind(null, n.id)}>
                  <button
                    type="submit"
                    className="text-xs text-foreground-secondary hover:text-foreground"
                  >
                    Mark read
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
