'use client';

import { useTransition } from 'react';
import { deleteBlogPost } from './actions';

export function DeletePostButton({ postId, title }: { postId: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="text-xs text-danger hover:underline disabled:opacity-50"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
        startTransition(() => {
          void deleteBlogPost(postId);
        });
      }}
    >
      {isPending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
