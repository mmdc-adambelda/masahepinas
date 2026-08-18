import { requireRole } from '@/lib/auth';
import { AdminBackLink } from '../../back-link';
import { PostForm } from '../post-form';
import { createBlogPost } from '../actions';

export const metadata = { title: 'New blog post (admin)' };

export default async function NewBlogPostPage() {
  await requireRole('moderator');

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-16">
      <AdminBackLink />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">New blog post</h1>
        <p className="text-sm text-foreground-secondary">
          Save as a draft first if you want to add a cover image before publishing — you
          can flip it to Published any time from the edit page.
        </p>
      </div>
      <PostForm action={createBlogPost} submitLabel="Save post" />
    </main>
  );
}
