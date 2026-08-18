import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listAllBlogPostsForAdmin } from '@/lib/blog';
import { AdminBackLink } from '../back-link';
import { DeletePostButton } from './delete-button';

export const metadata = { title: 'Blog posts (admin)' };

export default async function AdminBlogsPage() {
  await requireRole('moderator');
  const posts = await listAllBlogPostsForAdmin();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <AdminBackLink />
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Blog posts</h1>
          <p className="text-sm text-foreground-secondary">
            Publish articles and guides to the{' '}
            <Link href="/blogs" className="text-brand-accent hover:underline">
              /blogs
            </Link>{' '}
            hub. Drafts are only visible to staff.
          </p>
        </div>
        <Link href="/admin/blogs/new" className="btn-primary shrink-0">
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-foreground-secondary">No posts yet.</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => (
            <li
              key={post.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{post.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      post.status === 'published'
                        ? 'bg-brand/20 text-brand-accent'
                        : 'bg-white/10 text-foreground-secondary'
                    }`}
                  >
                    {post.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                  {post.isFeatured ? (
                    <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">
                      Featured
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-foreground-secondary">
                  {post.status === 'published' && post.publishedAt
                    ? `Published ${new Date(post.publishedAt).toLocaleDateString()}`
                    : `Last updated ${new Date(post.updatedAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                {post.status === 'published' ? (
                  <a
                    href={`/blogs/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-accent hover:underline"
                  >
                    View
                  </a>
                ) : null}
                <Link
                  href={`/admin/blogs/${post.id}/edit`}
                  className="text-brand-accent hover:underline"
                >
                  Edit
                </Link>
                <DeletePostButton postId={post.id} title={post.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
