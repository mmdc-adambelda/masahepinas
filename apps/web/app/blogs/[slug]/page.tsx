import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { APP_NAME } from '@masahepinas/config';
import { getBlogPostBySlug } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Article not found' };

  const description =
    post.metaDescription || post.excerpt || `${post.title} — from ${APP_NAME}.`;

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blogs/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `${siteUrl}/blogs/${post.slug}`,
      type: 'article',
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  // Drafts are invisible here to anyone but staff — RLS already scopes
  // this select (see blog_posts_select in supabase/migrations/0019_blog_posts.sql),
  // so a null result covers both "doesn't exist" and "not published yet".
  if (!post) notFound();

  const paragraphs = post.content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${siteUrl}/blogs/${post.slug}#article`,
        headline: post.title,
        description: post.metaDescription || post.excerpt || undefined,
        url: `${siteUrl}/blogs/${post.slug}`,
        image: post.coverImageUrl ?? undefined,
        datePublished: post.publishedAt ?? post.createdAt,
        dateModified: post.updatedAt,
        author: { '@type': 'Organization', name: APP_NAME },
        publisher: { '@type': 'Organization', name: APP_NAME },
        isPartOf: { '@id': `${siteUrl}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: 'Blogs', item: `${siteUrl}/blogs` },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: `${siteUrl}/blogs/${post.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-foreground-secondary">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        /{' '}
        <Link href="/blogs" className="hover:underline">
          Blogs
        </Link>{' '}
        / <span>{post.title}</span>
      </nav>

      {post.status === 'draft' ? (
        <p className="card border-warning/40 text-sm text-warning">
          Draft preview — only visible to staff. This won&apos;t be public until it&apos;s
          published.
        </p>
      ) : null}

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="text-lg text-foreground-secondary">{post.excerpt}</p>
        ) : null}
        <p className="text-sm text-foreground-secondary">
          {post.publishedAt
            ? `Published ${new Date(post.publishedAt).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}`
            : 'Not yet published'}
        </p>
      </header>

      {post.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt={post.coverImageAlt ?? post.title}
          className="aspect-video w-full rounded-lg object-cover"
        />
      ) : null}

      <div className="space-y-4 text-foreground-secondary [&_p]:leading-relaxed">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <section className="card space-y-2">
        <p className="text-sm text-foreground-secondary">
          Read more on the{' '}
          <Link href="/blogs" className="text-brand-accent hover:underline">
            Masahe Pinas blog
          </Link>
          , or{' '}
          <Link href="/search" className="text-brand-accent hover:underline">
            search massage and spa businesses
          </Link>{' '}
          across the Philippines.
        </p>
      </section>
    </main>
  );
}
