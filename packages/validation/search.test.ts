import { describe, expect, it } from 'vitest';
import { searchFiltersSchema } from './search';

describe('searchFiltersSchema', () => {
  it('accepts an empty object and defaults sort/page', () => {
    const result = searchFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe('relevance');
      expect(result.data.page).toBe(1);
    }
  });

  it('rejects an out-of-range latitude/longitude', () => {
    expect(searchFiltersSchema.safeParse({ lat: 200 }).success).toBe(false);
    expect(searchFiltersSchema.safeParse({ lng: -200 }).success).toBe(false);
  });

  it('rejects an unlisted sort value', () => {
    const result = searchFiltersSchema.safeParse({ sort: 'most_expensive' });
    expect(result.success).toBe(false);
  });

  it('coerces boolean/number query-string params (URLSearchParams values are always strings)', () => {
    const result = searchFiltersSchema.safeParse({
      premiumOnly: 'true',
      minRating: '4',
      page: '2',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.premiumOnly).toBe(true);
      expect(result.data.minRating).toBe(4);
      expect(result.data.page).toBe(2);
    }
  });

  it('rejects page below 1', () => {
    expect(searchFiltersSchema.safeParse({ page: 0 }).success).toBe(false);
  });
});
