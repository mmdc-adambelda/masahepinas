import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getBlogPostById } from '@/lib/blog';
import { AdminBackLink } from '../../../back-link';
import { PostForm } from '../../post-form';
import { CoverImageManager } from '../../cover-image-manager';
import { DeletePostButton } from '../../delete-button';
import { updateBlogPost } from '../../actions';

export const metadata = { title: 'Edit blog post (admin)' };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('moderator');
  const { id } = await params;
  const post = await getBlogPostById(id);
  if (!post) notFound();

  const boundUpdate = updateBlogPost.bind(null, id);

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-16">
      <AdminBackLink />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Edit post</h1>
          <p className="text-sm text-foreground-secondary">
            Status: <span className="font-medium text-brand-accent">{post.status}</span>
          </p>
        </div>
        <DeletePostButton postId={post.id} title={post.title} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Cover image</h2>
        <CoverImageManager
          postId={post.id}
          coverImageUrl={post.coverImageUrl}
          coverImageAlt={post.coverImageAlt}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Post details</h2>
        <PostForm action={boundUpdate} post={post} submitLabel="Save changes" />
      </section>
    </main>
  );
}
