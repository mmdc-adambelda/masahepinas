import Link from 'next/link';
import { hasRole } from '@masahepinas/types';
import { formatRelativeDate } from '@masahepinas/utils';
import { requireRole } from '@/lib/auth';
import { listPendingRegistrations, searchUsers } from '@/lib/admin';
import { rejectRegistration, setModeratorRole, setUserStatus } from './actions';
import { AdminBackLink } from '../back-link';
import { ApproveRegistrationForm } from './approve-registration-form';
import { UserActionForm } from './user-action-form';

export const metadata = { title: 'User management' };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireRole('moderator');
  const { q } = await searchParams;
  const [users, pendingRegistrations] = await Promise.all([
    searchUsers(q ?? ''),
    listPendingRegistrations(),
  ]);
  const isSuperadmin = hasRole(session, 'superadmin');

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <AdminBackLink />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">User management</h1>
        <p className="text-sm text-foreground-secondary">
          Suspending an account revokes their effective access immediately.
          {isSuperadmin
            ? ' Only superadmins can grant or revoke the moderator role.'
            : ''}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">
          Pending registrations
          {pendingRegistrations.length > 0 ? (
            <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">
              {pendingRegistrations.length}
            </span>
          ) : null}
        </h2>
        <p className="text-xs text-foreground-secondary">
          New sign-ups can&apos;t use the site until approved here — see{' '}
          <code>docs/moderation-ops-guide.md</code>.
        </p>
        {pendingRegistrations.length === 0 ? (
          <p className="text-sm text-foreground-secondary">No pending registrations.</p>
        ) : (
          <div className="space-y-3">
            {pendingRegistrations.map((user) => (
              <article
                key={user.id}
                className="card flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-foreground">{user.displayName}</p>
                  <p className="text-xs text-foreground-secondary">
                    {[user.city, user.province].filter(Boolean).join(', ') ||
                      'No location set'}
                    {' · signed up '}
                    {formatRelativeDate(user.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ApproveRegistrationForm userId={user.id} />
                  <UserActionForm
                    action={rejectRegistration.bind(null, user.id)}
                    label="Reject"
                    variant="danger"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <hr className="border-white/10" />

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by display name"
          className="input-field flex-1"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      <div className="space-y-3">
        {users.map((user) => (
          <article key={user.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href={`/u/${user.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {user.displayName}
                </Link>
                <p className="text-xs text-foreground-secondary">
                  {[user.city, user.province].filter(Boolean).join(', ')} · status:{' '}
                  {user.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-foreground-secondary"
                  >
                    {role.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {user.status === 'active' ? (
                <UserActionForm
                  action={setUserStatus.bind(null, user.id, 'suspended')}
                  label="Suspend"
                  variant="danger"
                />
              ) : (
                <UserActionForm
                  action={setUserStatus.bind(null, user.id, 'active')}
                  label="Reinstate"
                />
              )}

              {isSuperadmin && !user.roles.includes('moderator') ? (
                <UserActionForm
                  action={setModeratorRole.bind(null, user.id, true)}
                  label="Make moderator"
                />
              ) : null}
              {isSuperadmin && user.roles.includes('moderator') ? (
                <UserActionForm
                  action={setModeratorRole.bind(null, user.id, false)}
                  label="Remove moderator"
                  variant="danger"
                />
              ) : null}
            </div>
          </article>
        ))}
        {users.length === 0 ? (
          <p className="text-foreground-secondary">No users found.</p>
        ) : null}
      </div>
    </main>
  );
}
