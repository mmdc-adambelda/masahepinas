'use client';

import { useActionState } from 'react';
import { submitReply, type ReplyResult } from './actions';

const initialState: ReplyResult = { error: null };

export function ReplyForm({
  reviewId,
  businessId,
  existingBody,
}: {
  reviewId: string;
  businessId: string;
  existingBody: string | null;
}) {
  const bound = submitReply.bind(null, reviewId, businessId);
  const [state, formAction, isPending] = useActionState(bound, initialState);

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <textarea
        name="body"
        rows={2}
        required
        minLength={5}
        defaultValue={existingBody ?? ''}
        placeholder="Write a public response…"
        className="input-field"
      />
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <button type="submit" className="btn-secondary text-xs" disabled={isPending}>
        {isPending ? 'Saving…' : existingBody ? 'Update reply' : 'Post reply'}
      </button>
    </form>
  );
}
