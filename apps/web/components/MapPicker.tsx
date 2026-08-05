'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getGeocodingProvider, type GeocodeResult } from '@masahepinas/utils';

// Free, no-key vector basemap. Swap the style URL to a paid provider later
// if OSM's demo tiles aren't sufficient for production traffic — the
// MapPicker component itself doesn't need to change (see
// docs/architecture.md §6).
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER: [number, number] = [121.0244, 14.5547]; // Makati, Metro Manila

export interface MapPickerValue {
  latitude: number;
  longitude: number;
}

interface MapPickerProps {
  value: MapPickerValue | null;
  onChange: (value: MapPickerValue) => void;
  onAddressSelect?: (result: GeocodeResult) => void;
}

export function MapPicker({ value, onChange, onAddressSelect }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = value
      ? [value.longitude, value.latitude]
      : DEFAULT_CENTER;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: value ? 15 : 11,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const marker = new maplibregl.Marker({ draggable: true, color: '#49C96D' })
      .setLngLat(center)
      .addTo(map);

    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      onChange({ latitude: lat, longitude: lng });
    });

    map.on('click', (event) => {
      marker.setLngLat(event.lngLat);
      onChange({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Intentionally only runs once on mount; subsequent `value` updates are
    // applied imperatively below so we don't tear down/recreate the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([value.longitude, value.latitude]);
    mapRef.current.flyTo({ center: [value.longitude, value.latitude], zoom: 15 });
    // Intentionally depend on the primitive lat/lng, not the `value` object
    // reference, so re-renders that pass a new-but-equal object don't
    // re-trigger the map fly-to animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.latitude, value?.longitude]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const provider = getGeocodingProvider();
      const found = await provider.searchAddress(`${query}, Philippines`);
      setResults(found);
    } finally {
      setIsSearching(false);
    }
  }

  function selectResult(result: GeocodeResult) {
    onChange({ latitude: result.latitude, longitude: result.longitude });
    onAddressSelect?.(result);
    setResults([]);
    setQuery(result.label);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your address"
          className="input-field flex-1"
        />
        <button type="submit" className="btn-secondary shrink-0" disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {results.length > 0 ? (
        <ul className="card divide-y divide-white/5 p-0">
          {results.map((result, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => selectResult(result)}
                className="w-full px-4 py-2 text-left text-sm text-foreground-secondary hover:text-foreground"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-lg border border-white/10"
        role="application"
        aria-label="Map: drag the pin or click to set your business location"
      />
      <p className="text-xs text-foreground-secondary">
        Search for your address, then drag the pin to fine-tune the exact location.
        {value
          ? ` Current pin: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
          : ''}
      </p>
    </div>
  );
}
