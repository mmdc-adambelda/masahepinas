import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { APP_NAME } from '@masahepinas/config';
import { estimateReadingMinutes, getBlogPostBySlug, listPublishedBlogPosts } from '@/lib/blog';
import { ArticleCard } from '@/components/ArticleCard';

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

  // Staff can write either HTML or plain text in the content field (see
  // apps/web/app/admin/blogs/post-form.tsx). If it looks like it contains
  // any HTML tags, render it as-is; otherwise treat blank lines as
  // paragraph breaks. Both branches share the same `.article-prose`
  // typography (apps/web/app/globals.css) so the reading experience is
  // identical either way. This content is staff-authored/staff-published
  // only (blog_posts_write RLS), so it isn't sanitized before rendering —
  // don't reuse this pattern for any user-submitted content.
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(post.content);
  const paragraphs = looksLikeHtml
    ? []
    : post.content
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

  const readingMinutes = estimateReadingMinutes(post.content);
  const publishedLabel = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const relatedCandidates = await listPublishedBlogPosts({ limit: 6 });
  const relatedPosts = relatedCandidates.filter((p) => p.id !== post.id).slice(0, 3);

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
    <main className="mx-auto max-w-[800px] px-6 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-foreground-secondary">
          <Link href="/" className="hover:underline">
            Home
          </Link>{' '}
          /{' '}
          <Link href="/blogs" className="hover:underline">
            Blogs
          </Link>{' '}
          / <span className="text-foreground-secondary">{post.title}</span>
        </nav>

        {post.status === 'draft' ? (
          <p className="card mb-8 border-warning/40 text-sm text-warning">
            Draft preview — only visible to staff. This won&apos;t be public until
            it&apos;s published.
          </p>
        ) : null}

        <header className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            Article
          </p>
          <h1 className="text-[32px] font-bold leading-[1.15] tracking-tight text-foreground sm:text-[40px] lg:text-[48px] lg:leading-[1.08]">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="text-lg leading-relaxed text-foreground-secondary sm:text-xl">
              {post.excerpt}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-secondary">
            {publishedLabel ? (
              <>
                <span>{publishedLabel}</span>
                <span aria-hidden="true">•</span>
              </>
            ) : null}
            <span>{readingMinutes} min read</span>
          </div>
        </header>

        {post.coverImageUrl ? (
          <figure className="mt-8 space-y-2 sm:mt-10">
            <div className="overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImageUrl}
                alt={post.coverImageAlt ?? post.title}
                className="aspect-video w-full object-cover"
              />
            </div>
            {post.coverImageAlt ? (
              <figcaption className="text-center text-xs text-foreground-secondary">
                {post.coverImageAlt}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {looksLikeHtml ? (
          <div
            className="article-prose mt-10 sm:mt-12"
            // Staff-authored HTML, rendered as-is — see the comment above
            // `looksLikeHtml` for why this is safe in this specific context.
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <div className="article-prose mt-10 sm:mt-12">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        )}

        <section className="card mt-12 space-y-2">
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
      </article>

      {relatedPosts.length > 0 ? (
        <section aria-labelledby="related-heading" className="mt-16 space-y-4">
          <h2
            id="related-heading"
            className="text-xl font-semibold text-foreground sm:text-2xl"
          >
            More from Masahe Pinas
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {relatedPosts.map((related) => (
              <ArticleCard
                key={related.id}
                href={`/blogs/${related.slug}`}
                title={related.title}
                description={related.excerpt}
                tag="Article"
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
