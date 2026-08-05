'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER: [number, number] = [121.0244, 14.5547];

export interface DiscoveryMapPin {
  slug: string;
  businessName: string;
  latitude: number;
  longitude: number;
}

/**
 * Multi-marker discovery map. Renders every result as an individual
 * marker — fine at Phase 2 result-set sizes. Marker clustering (see
 * docs/product-requirements.md §24 "Performance Requirements") is a
 * Phase 8 performance pass once real-world listing volume justifies it.
 */
export function DiscoveryMap({ pins }: { pins: DiscoveryMapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const center: [number, number] = pins[0]
      ? [pins[0].longitude, pins[0].latitude]
      : DEFAULT_CENTER;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom: pins.length ? 11 : 6,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    for (const pin of pins) {
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<a href="/spa/${pin.slug}" style="color:#07110C;font-weight:600">${escapeHtml(pin.businessName)}</a>`,
      );
      new maplibregl.Marker({ color: '#49C96D' })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(popup)
        .addTo(map);
    }

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.length]);

  return (
    <div
      ref={containerRef}
      className="h-[520px] w-full overflow-hidden rounded-lg border border-white/10"
      role="application"
      aria-label="Map of spa and massage businesses"
    />
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] ?? char;
  });
}
