import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProfile, listFollowing } from '@/lib/profiles';

export const metadata = { title: 'Following' };

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await getPublicProfile(userId);
  if (!profile) notFound();
  const following = await listFollowing(userId);

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-12">
      <h1 className="text-xl font-semibold text-foreground">
        {profile.displayName} is following
      </h1>
      {following.length === 0 ? (
        <p className="text-sm text-foreground-secondary">Not following anyone yet.</p>
      ) : (
        <ul className="space-y-2">
          {following.map((f) => (
            <li key={f.id}>
              <Link href={`/u/${f.id}`} className="card block hover:border-brand">
                {f.displayName}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
