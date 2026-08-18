import Link from 'next/link';

/**
 * Shared "article/guide" card — used by /blogs (guide + post grids) and
 * /blogs/[slug]'s "More from Masahe Pinas" section, so both surfaces
 * share one visual design instead of drifting apart.
 */
export function ArticleCard({
  href,
  title,
  description,
  tag,
}: {
  href: string;
  title: string;
  description?: string | null;
  tag: string;
}) {
  return (
    <Link
      href={href}
      className="card flex flex-col gap-2 transition-colors hover:border-brand"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-brand-accent">
        {tag}
      </span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="text-sm text-foreground-secondary">{description}</p>
      ) : null}
    </Link>
  );
}
