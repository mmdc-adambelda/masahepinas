'use client';

import { useActionState } from 'react';
import { REVIEW_CATEGORIES, type Review } from '@masahepinas/types';
import { submitReview, type ReviewActionResult } from './review-actions';

const initialState: ReviewActionResult = { error: null };

const CATEGORY_LABELS: Record<(typeof REVIEW_CATEGORIES)[number], string> = {
  service_quality: 'Service quality',
  professionalism: 'Professionalism',
  cleanliness: 'Cleanliness',
  ambience: 'Ambience',
  value_for_money: 'Value for money',
};

export function ReviewForm({
  businessId,
  slug,
  existingReview,
}: {
  businessId: string;
  slug: string;
  existingReview: Review | null;
}) {
  const boundAction = submitReview.bind(null, businessId, slug);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="card space-y-4">
      <h3 className="font-medium text-foreground">
        {existingReview ? 'Edit your review' : 'Write a review'}
      </h3>

      <div className="space-y-1.5">
        <label htmlFor="overallRating" className="text-sm text-foreground-secondary">
          Overall rating
        </label>
        <select
          id="overallRating"
          name="overallRating"
          required
          defaultValue={existingReview?.overallRating ?? ''}
          className="input-field"
        >
          <option value="" disabled>
            Select a rating
          </option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="body" className="text-sm text-foreground-secondary">
          Your review
        </label>
        <textarea
          id="body"
          name="body"
          required
          minLength={10}
          rows={4}
          defaultValue={existingReview?.body ?? ''}
          className="input-field"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="serviceDate" className="text-sm text-foreground-secondary">
          Service date (optional)
        </label>
        <input
          id="serviceDate"
          name="serviceDate"
          type="date"
          defaultValue={existingReview?.serviceDate ?? ''}
          className="input-field"
        />
      </div>

      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <legend className="mb-1 text-sm text-foreground-secondary">
          Category ratings (optional)
        </legend>
        {REVIEW_CATEGORIES.map((category) => (
          <div key={category} className="space-y-1">
            <label
              htmlFor={`category_${category}`}
              className="text-xs text-foreground-secondary"
            >
              {CATEGORY_LABELS[category]}
            </label>
            <select
              id={`category_${category}`}
              name={`category_${category}`}
              defaultValue={existingReview?.categoryRatings[category] ?? ''}
              className="input-field"
            >
              <option value="">—</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-brand-accent">Saved. Thank you!</p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : existingReview ? 'Update review' : 'Submit review'}
      </button>
      <p className="text-xs text-foreground-secondary">
        You can have one review per business — submitting again edits your existing
        review. By submitting, you confirm this review is truthful.
      </p>
    </form>
  );
}
