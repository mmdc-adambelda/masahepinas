'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  GENDER_AVAILABILITY_OPTIONS,
  PH_PROVINCES,
  PRICE_RANGE_OPTIONS,
} from '@masahepinas/config';
import { sortOptions } from '@masahepinas/validation';
import { getGeocodingProvider } from '@masahepinas/utils';

// Once per browser tab: if the visitor lands on search with no location
// filter set at all, try to default the results to their province via
// the browser's geolocation + reverse geocoding. Guarded by sessionStorage
// so we don't re-prompt on every filter change or back/forward nav.
const GEO_ATTEMPTED_KEY = 'mp_geo_province_attempted';

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [detectingLocation, setDetectingLocation] = useState(false);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`/search?${params.toString()}`);
  }

  useEffect(() => {
    const hasLocationFilter = searchParams.get('province') || searchParams.get('city');
    const hasAnyFilter =
      hasLocationFilter ||
      searchParams.get('q') ||
      searchParams.get('serviceSlug') ||
      searchParams.get('genderAvailability') ||
      searchParams.get('priceRange');
    if (hasAnyFilter) return;
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (window.sessionStorage.getItem(GEO_ATTEMPTED_KEY)) return;
    window.sessionStorage.setItem(GEO_ATTEMPTED_KEY, '1');

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await getGeocodingProvider().reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
          );
          const matchedProvince = result
            ? PH_PROVINCES.find(
                (province) =>
                  province.toLowerCase() === result.province.trim().toLowerCase(),
              )
            : null;
          if (matchedProvince) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('province', matchedProvince);
            router.replace(`/search?${params.toString()}`);
          }
        } finally {
          setDetectingLocation(false);
        }
      },
      () => setDetectingLocation(false),
      { timeout: 8000 },
    );
    // Only run once on mount — searchParams/router intentionally excluded
    // to avoid re-triggering as filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {detectingLocation ? (
        <p className="text-xs text-foreground-secondary">
          Detecting your location to show nearby spas…
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1 text-xs text-foreground-secondary">
          Province
          <select
            defaultValue={searchParams.get('province') ?? ''}
            onChange={(e) => updateParam('province', e.target.value)}
            className="input-field"
          >
            <option value="">All provinces</option>
            {PH_PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs text-foreground-secondary">
          City / municipality
          <input
            type="text"
            defaultValue={searchParams.get('city') ?? ''}
            onBlur={(e) => updateParam('city', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                updateParam('city', e.currentTarget.value);
              }
            }}
            placeholder="Any city"
            className="input-field"
          />
        </label>

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
