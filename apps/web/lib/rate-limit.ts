import { createSupabaseServerClient } from './supabase/server';

/**
 * Lightweight DB-backed rate limit for abuse-prone write endpoints (review
 * spam, report spam, vote manipulation — see docs/security-checklist.md
 * "Rate limiting on auth, review submission, report submission, and
 * helpful-vote endpoints"). No external infra (Redis/Upstash, an edge KV)
 * is provisioned for this MVP, so this trades perfect accuracy/distributed
 * correctness for "good enough" abuse resistance using the Postgres
 * database we already have: count how many rows this user created in the
 * trailing window and reject once they hit the cap. Good enough to stop a
 * naive spam script; not a substitute for a real rate limiter at scale
 * (tracked as a Post-MVP follow-up once traffic justifies it).
 *
 * Auth endpoints (sign-in/sign-up/password reset) are NOT covered here —
 * Supabase Auth enforces its own server-side rate limits on those
 * independent of application code.
 */

type RateLimitedTable = 'content_reports' | 'reviews' | 'review_helpful_votes';

export async function checkRateLimit(options: {
  table: RateLimitedTable;
  userColumn: string;
  userId: string;
  maxCount: number;
  windowMinutes: number;
  message?: string;
}): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - options.windowMinutes * 60_000).toISOString();

  const { count } = await supabase
    .from(options.table)
    .select('id', { count: 'exact', head: true })
    .eq(options.userColumn, options.userId)
    .gte('created_at', since);

  if ((count ?? 0) >= options.maxCount) {
    return (
      options.message ?? "You're doing that too often. Please wait a bit and try again."
    );
  }
  return null;
}
