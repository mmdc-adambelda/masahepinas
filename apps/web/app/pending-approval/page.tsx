import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';
import { signOut } from '../(auth)/actions';

export const metadata = { title: 'Account pending approval' };

export default async function PendingApprovalPage() {
  const session = await getServerAuthSession();
  if (!session) redirect('/sign-in');
  // Not actually pending (already approved, or suspended) — nothing to
  // wait for here, send them on to the app.
  if (session.profile?.status !== 'pending_approval') redirect('/');

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        Your account is pending approval
      </h1>
      <p className="text-sm text-foreground-secondary">
        Thanks for signing up to Masahe Pinas. A superadmin needs to review and approve
        new accounts before you can use the site — this is usually quick, but there&apos;s
        no fixed timeline. You don&apos;t need to do anything else; check back later.
      </p>
      <form action={signOut}>
        <button type="submit" className="btn-secondary">
          Sign out
        </button>
      </form>
    </main>
  );
}
