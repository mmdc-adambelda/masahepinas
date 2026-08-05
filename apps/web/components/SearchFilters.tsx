'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { GENDER_AVAILABILITY_OPTIONS, PRICE_RANGE_OPTIONS } from '@masahepinas/config';
import { sortOptions } from '@masahepinas/validation';

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="card space-y-4 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParam('q', q);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Business, city, or service"
          className="input-field flex-1"
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1 text-xs text-foreground-secondary">
          Therapist availability
          <select
            defaultValue={searchParams.get('genderAvailability') ?? ''}
            onChange={(e) => updateParam('genderAvailability', e.target.value)}
            className="input-field"
          >
            <option value="">Any</option>
            {GENDER_AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs text-foreground-secondary">
          Price range
          <select
            defaultValue={searchParams.get('priceRange') ?? ''}
            onChange={(e) => updateParam('priceRange', e.target.value)}
            className="input-field"
          >
            <option value="">Any</option>
            {PRICE_RANGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs text-foreground-secondary">
          Sort by
          <select
            defaultValue={searchParams.get('sort') ?? 'relevance'}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="input-field"
          >
            {sortOptions
              .filter((opt) => opt !== 'distance')
              .map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace('_', ' ')}
                </option>
              ))}
          </select>
        </label>

        <div className="flex flex-col justify-end gap-1 text-xs text-foreground-secondary">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              defaultChecked={searchParams.get('verifiedOnly') === 'true'}
              onChange={(e) =>
                updateParam('verifiedOnly', e.target.checked ? 'true' : '')
              }
            />
            Verified only
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              defaultChecked={searchParams.get('recommendedOnly') === 'true'}
              onChange={(e) =>
                updateParam('recommendedOnly', e.target.checked ? 'true' : '')
              }
            />
            Recommended only
          </label>
        </div>
      </div>
    </div>
  );
}
