import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatRelativeDate } from '@masahepinas/utils';
import { getServerAuthSession } from '@/lib/auth';
import {
  getPublicProfile,
  getProfileStats,
  getUserBadges,
  isFollowing,
  listPublicReviews,
} from '@/lib/profiles';
import { FollowButton } from './follow-button';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getPublicProfile(userId);
  if (!profile) return { title: 'Profile not found' };
  return { title: `${profile.displayName} — Masahe Pinas` };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const profile = await getPublicProfile(userId);
  if (!profile) notFound();

  const session = await getServerAuthSession();
  const isSelf = session?.userId === userId;

  const [stats, badges, following, reviews] = await Promise.all([
    getProfileStats(userId),
    getUserBadges(userId),
    session ? isFollowing(session.userId, userId) : Promise.resolve(false),
    profile.isPrivate && !isSelf ? Promise.resolve([]) : listPublicReviews(userId),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated text-xl text-foreground">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {profile.displayName}
            </h1>
            <p className="text-sm text-foreground-secondary">
              {[profile.city, profile.province].filter(Boolean).join(', ') ||
                'Philippines'}{' '}
              · Joined {formatRelativeDate(profile.createdAt)}
            </p>
          </div>
        </div>
        {isSelf ? (
          <Link href="/settings/profile" className="btn-secondary">
            Edit profile
          </Link>
        ) : (
          <FollowButton
            targetUserId={userId}
            initialFollowing={following}
            isSignedIn={Boolean(session)}
            isSelf={isSelf}
          />
        )}
      </header>

      {profile.bio ? (
        <p className="text-sm text-foreground-secondary">{profile.bio}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Reviews" value={stats.reviewCount} />
        <StatCard label="Verified" value={stats.verifiedReviewCount} />
        <StatCard label="Helpful votes" value={stats.helpfulVotesReceived} />
        <StatCard label="Cities reviewed" value={stats.citiesReviewed} />
      </div>

      <div className="flex gap-4 text-sm">
        <Link
          href={`/u/${userId}/followers`}
          className="text-foreground-secondary hover:text-foreground"
        >
          <span className="font-medium text-foreground">{stats.followerCount}</span>{' '}
          followers
        </Link>
        <Link
          href={`/u/${userId}/following`}
          className="text-foreground-secondary hover:text-foreground"
        >
          <span className="font-medium text-foreground">{stats.followingCount}</span>{' '}
          following
        </Link>
      </div>

      {badges.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge.id}
                title={badge.description ?? undefined}
                className="rounded-full border border-brand/40 px-3 py-1 text-sm text-brand-accent"
              >
                {badge.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {profile.isPrivate && !isSelf ? (
        <p className="text-sm text-foreground-secondary">
          This member&apos;s review history is private.
        </p>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Recent reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-foreground-secondary">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="card space-y-1">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/spa/${review.businessSlug}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {review.businessName}
                  </Link>
                  <span className="text-sm text-foreground">
                    ★ {review.overallRating}
                  </span>
                </div>
                <p className="text-xs text-foreground-secondary">
                  {formatRelativeDate(review.createdAt)}
                </p>
                <p className="text-sm text-foreground-secondary">{review.body}</p>
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-foreground-secondary">{label}</p>
    </div>
  );
}
