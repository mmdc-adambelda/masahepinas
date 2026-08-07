-- Registration approval gate (post-Phase-8 feature request): new sign-ups
-- now start life as 'pending_approval' instead of 'active'. A superadmin
-- (or moderator) reviews the pending queue at /admin/users and approves
-- or rejects each one.
--
-- IMPORTANT — this migration alone does not block anything. It only
-- changes the default so new profiles land in the right starting state.
-- The actual access gate lives in apps/web/lib/supabase/middleware.ts,
-- which redirects any signed-in user with status = 'pending_approval' to
-- /pending-approval for every route except that page itself. This is a
-- UX/page-access gate, not an RLS boundary — RLS policies (row-level
-- read/write permissions) are unchanged for pending users; a pending
-- customer's own profile/review/etc. RLS behaves the same as an active
-- customer's. A sufficiently technical user could still call the
-- Supabase REST API directly (bypassing the Next.js app and its
-- middleware) while pending. If that gap matters for your threat model,
-- it needs a follow-up migration adding `status = 'active'` checks to
-- the relevant RLS policies (reviews_insert, spa_businesses_insert,
-- etc.) — intentionally not done here to keep this change scoped to
-- what was asked for (site-access gating), see the conversation this
-- shipped from.
alter table public.profiles alter column status set default 'pending_approval';

-- Fast lookup for the admin "pending registrations" queue.
create index if not exists profiles_status_idx_pending
  on public.profiles (created_at)
  where status = 'pending_approval';
