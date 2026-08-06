import { describe, expect, it } from 'vitest';
import {
  contentReportSchema,
  moderationActionSchema,
  reviewSubmissionSchema,
} from './review';

describe('reviewSubmissionSchema', () => {
  const validPayload = {
    overallRating: 5,
    body: 'A genuinely relaxing experience, would come back again.',
  };

  it('accepts a valid review', () => {
    expect(reviewSubmissionSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects a body under 10 characters', () => {
    const result = reviewSubmissionSchema.safeParse({
      ...validPayload,
      body: 'too short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a rating outside 1-5', () => {
    expect(
      reviewSubmissionSchema.safeParse({ ...validPayload, overallRating: 0 }).success,
    ).toBe(false);
    expect(
      reviewSubmissionSchema.safeParse({ ...validPayload, overallRating: 6 }).success,
    ).toBe(false);
  });

  it('coerces a numeric-string rating (form data)', () => {
    const result = reviewSubmissionSchema.safeParse({
      ...validPayload,
      overallRating: '4',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overallRating).toBe(4);
    }
  });
});

describe('contentReportSchema', () => {
  const validPayload = {
    targetType: 'review' as const,
    targetId: '00000000-0000-0000-0000-000000000001',
    reason: 'spam' as const,
  };

  it('accepts a valid report', () => {
    expect(contentReportSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects an unlisted reason (abuse prevention — only the enumerated reasons are allowed)', () => {
    const result = contentReportSchema.safeParse({
      ...validPayload,
      reason: 'i just dont like it',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-UUID targetId', () => {
    const result = contentReportSchema.safeParse({
      ...validPayload,
      targetId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('moderationActionSchema', () => {
  it('requires a reason of at least 3 characters (every moderation action must be justified)', () => {
    expect(moderationActionSchema.safeParse({ reason: 'ab' }).success).toBe(false);
    expect(moderationActionSchema.safeParse({ reason: 'spam' }).success).toBe(true);
  });
});
