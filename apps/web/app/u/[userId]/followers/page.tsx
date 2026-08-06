import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProfile, listFollowers } from '@/lib/profiles';

export const metadata = { title: 'Followers' };

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await getPublicProfile(userId);
  if (!profile) notFound();
  const followers = await listFollowers(userId);

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-12">
      <h1 className="text-xl font-semibold text-foreground">
        {profile.displayName}&apos;s followers
      </h1>
      {followers.length === 0 ? (
        <p className="text-sm text-foreground-secondary">No followers yet.</p>
      ) : (
        <ul className="space-y-2">
          {followers.map((f) => (
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
