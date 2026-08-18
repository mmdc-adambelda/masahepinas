import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME } from '@masahepinas/config';
import { listPublishedBlogPosts } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  // Absolute title — bypasses the layout's "%s · Masahe Pinas" template
  // since the brand is already in this title.
  title: { absolute: 'Spa & Massage Guides Philippines | Masahe Pinas Blogs' },
  description:
    'Provincial and city spa guides, massage explainers, and wellness reads from Masahe Pinas — built to help you find and choose a spa anywhere in the Philippines.',
  alternates: { canonical: '/blogs' },
  openGraph: {
    title: 'Spa & Massage Guides Philippines | Masahe Pinas Blogs',
    description:
      'Provincial and city spa guides, massage explainers, and wellness reads from Masahe Pinas.',
    url: `${siteUrl}/blogs`,
    type: 'website',
  },
};

interface GuideEntry {
  href: string;
  title: string;
  description: string;
  tag: string;
}

// Hand-authored provincial/city SEO guides — static pages, not DB rows.
// Staff-authored articles from the admin blog CMS (apps/web/app/admin/blogs)
// are fetched separately below and rendered alongside these.
const GUIDES: GuideEntry[] = [
  {
    href: '/blogs/cavite-spa',
    title: 'Cavite Spa: Massage, Spa Reviews & Local Wellness Guide',
    description:
      'Find a spa in Cavite, compare massage options across General Trias, Imus, Dasmariñas, Bacoor, Tagaytay and more, and read local spa reviews.',
    tag: 'Provincial guide',
  },
];

export default async function BlogsPage() {
  const [featuredPosts, allPosts] = await Promise.all([
    listPublishedBlogPosts({ featuredOnly: true, limit: 4 }),
    listPublishedBlogPosts({ limit: 20 }),
  ]);
  const featuredIds = new Set(featuredPosts.map((post) => post.id));
  const otherPosts = allPosts.filter((post) => !featuredIds.has(post.id));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${siteUrl}/blogs#collectionpage`,
    url: `${siteUrl}/blogs`,
    name: 'Masahe Pinas Blogs',
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: {
      '@type': 'Thing',
      name: 'Massage and spa discovery in the Philippines',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blogs', item: `${siteUrl}/blogs` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-foreground-secondary">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        / <span>Blogs</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Masahe Pinas Blogs — Spa &amp; Massage Guides for the Philippines
        </h1>
        <p className="max-w-2xl text-foreground-secondary">
          Local spa guides, massage explainers, and wellness reads from {APP_NAME}, built
          to help you find and choose a legitimate massage or spa business anywhere in the
          Philippines. We&apos;re expanding this hub province by province and city by city
          — read our{' '}
          <Link href="/about" className="text-brand-accent hover:underline">
            about page
          </Link>{' '}
          to learn more about the platform behind these guides, or head straight to{' '}
          <Link href="/search" className="text-brand-accent hover:underline">
            search spas near you
          </Link>
          .
        </p>
      </header>

      <section aria-labelledby="guides-heading" className="space-y-4">
        <h2 id="guides-heading" className="text-xl font-semibold text-foreground">
          Local spa &amp; massage guides
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GUIDES.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="card flex flex-col gap-2 transition-colors hover:border-brand"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-brand-accent">
                {guide.tag}
              </span>
              <h3 className="text-lg font-semibold text-foreground">{guide.title}</h3>
              <p className="text-sm text-foreground-secondary">{guide.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {featuredPosts.length > 0 ? (
        <section aria-labelledby="featured-heading" className="space-y-4">
          <h2 id="featured-heading" className="text-xl font-semibold text-foreground">
            Featured articles
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {featuredPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} tag="Featured" />
            ))}
          </div>
        </section>
      ) : null}

      {otherPosts.length > 0 ? (
        <section aria-labelledby="latest-heading" className="space-y-4">
          <h2 id="latest-heading" className="text-xl font-semibold text-foreground">
            Latest from Masahe Pinas
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {otherPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} tag="Article" />
            ))}
          </div>
        </section>
      ) : null}

      {featuredPosts.length === 0 && otherPosts.length === 0 ? (
        <section className="card space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            More guides coming soon
          </h2>
          <p className="text-sm text-foreground-secondary">
            We&apos;re building out spa and massage guides for more Philippine provinces
            and cities, along with massage service explainers and consumer guides on how
            to choose a trustworthy wellness business. In the meantime,{' '}
            <Link href="/search" className="text-brand-accent hover:underline">
              explore massage and spa businesses
            </Link>{' '}
            directly, or{' '}
            <Link href="/sign-up/spa-owner" className="text-brand-accent hover:underline">
              list your spa
            </Link>{' '}
            if you own one.
          </p>
        </section>
      ) : null}
    </main>
  );
}

function BlogPostCard({
  post,
  tag,
}: {
  post: { slug: string; title: string; excerpt: string | null };
  tag: string;
}) {
  return (
    <Link
      href={`/blogs/${post.slug}`}
      className="card flex flex-col gap-2 transition-colors hover:border-brand"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-brand-accent">
        {tag}
      </span>
      <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
      {post.excerpt ? (
        <p className="text-sm text-foreground-secondary">{post.excerpt}</p>
      ) : null}
    </Link>
  );
}
