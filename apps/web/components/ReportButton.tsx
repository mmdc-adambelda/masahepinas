'use client';

import { useActionState, useState } from 'react';
import { reportReasons } from '@masahepinas/validation';
import { submitReport, type ReviewActionResult } from '@/app/spa/[slug]/review-actions';

const REASON_LABELS: Record<(typeof reportReasons)[number], string> = {
  fake_review: 'Fake review',
  harassment: 'Harassment',
  hate_speech: 'Hate speech',
  personal_information: 'Contains personal information',
  spam: 'Spam',
  conflict_of_interest: 'Conflict of interest',
  explicit_content: 'Explicit content',
  blackmail_or_extortion: 'Blackmail or extortion',
  unrelated_to_business: 'Unrelated to this business',
  illegal_service_promotion: 'Promotes an illegal service',
};

const initialState: ReviewActionResult = { error: null };

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: 'review' | 'listing' | 'user';
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(submitReport, initialState);

  if (state.success) {
    return <span className="text-xs text-brand-accent">Reported — thank you</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-foreground-secondary hover:text-danger"
      >
        Report
      </button>
    );
  }

  return (
    <form action={formAction} className="card space-y-2 p-3 text-left">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <select name="reason" required className="input-field" defaultValue="">
        <option value="" disabled>
          Why are you reporting this?
        </option>
        {reportReasons.map((reason) => (
          <option key={reason} value={reason}>
            {REASON_LABELS[reason]}
          </option>
        ))}
      </select>
      <textarea
        name="details"
        placeholder="Additional details (optional)"
        rows={2}
        className="input-field"
      />
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="btn-secondary text-xs" disabled={isPending}>
          {isPending ? 'Submitting…' : 'Submit report'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-foreground-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
