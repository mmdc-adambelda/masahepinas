'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Read-only map: a single fixed pin, no search box or drag handling.
 * Used on public listing/search pages — MapPicker (components/MapPicker.tsx)
 * is the editable version used in the owner submission flow. */
export function ListingMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [longitude, latitude],
      zoom: 15,
      interactive: true,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    new maplibregl.Marker({ color: '#49C96D' })
      .setLngLat([longitude, latitude])
      .addTo(map);
    return () => map.remove();
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-lg border border-white/10"
      role="img"
      aria-label={
        label ? `Map showing the location of ${label}` : 'Business location map'
      }
    />
  );
}
