import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';
import { distanceKm } from './geo';
import { formatPhp, truncate } from './format';

describe('slugify', () => {
  it('lowercases and dashes a business name', () => {
    expect(slugify('Serenity Spa & Wellness')).toBe('serenity-spa-wellness');
  });

  it('collapses repeated whitespace/dashes', () => {
    expect(slugify('  Makati   Bath   House  ')).toBe('makati-bath-house');
  });
});

describe('distanceKm', () => {
  it('returns ~0 for identical points', () => {
    const point = { latitude: 14.5547, longitude: 121.0244 };
    expect(distanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it('computes a plausible Metro Manila distance', () => {
    const makati = { latitude: 14.5547, longitude: 121.0244 };
    const quezonCity = { latitude: 14.676, longitude: 121.0437 };
    const km = distanceKm(makati, quezonCity);
    expect(km).toBeGreaterThan(10);
    expect(km).toBeLessThan(20);
  });
});

describe('formatPhp', () => {
  it('formats whole peso amounts', () => {
    expect(formatPhp(500)).toContain('500');
  });
});

describe('truncate', () => {
  it('leaves short strings untouched', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('truncates long strings with an ellipsis', () => {
    expect(truncate('a very long description text', 10)).toHaveLength(10);
  });
});
