import Link from 'next/link';

/** Dropped into every /admin/* subpage so staff always have a one-click
 * way back to the dashboard, instead of relying on the browser's back
 * button (which breaks after following a link from a notification/email,
 * or after a page reload). */
export function AdminBackLink() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1 text-xs text-foreground-secondary hover:text-brand-accent"
    >
      ← Back to admin dashboard
    </Link>
  );
}
