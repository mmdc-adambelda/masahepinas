/**
 * Provider-independent geocoding abstraction (see docs/architecture.md §6
 * "Map & Location Architecture"). Web and mobile both call
 * `getGeocodingProvider()` rather than talking to a specific vendor
 * directly, so swapping providers later (Google/Mapbox/a paid PH-focused
 * geocoder) means adding one new class here, not touching call sites.
 */

export interface GeocodeResult {
  label: string;
  addressLine: string;
  barangay: string | null;
  cityMunicipality: string;
  province: string;
  region: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
}

export interface GeocodingProvider {
  /** Free-text address search → candidate matches for an autocomplete-style picker. */
  searchAddress(query: string): Promise<GeocodeResult[]>;
  /** Pin-drag → best-effort structured address for the given coordinates. */
  reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null>;
}

/**
 * Nominatim (OpenStreetMap) provider — used for local development and as
 * the Phase 2 default. Nominatim's public instance has a strict usage
 * policy (max ~1 request/second, no heavy/commercial production traffic —
 * https://operations.osmfoundation.org/policies/nominatim/). Before
 * production launch, swap this for a paid/self-hosted, ToS-compliant
 * provider by implementing `GeocodingProvider` and returning it from
 * `getGeocodingProvider()` — no other code needs to change (see
 * docs/development-roadmap.md Post-MVP backlog).
 */
export class NominatimGeocodingProvider implements GeocodingProvider {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  // Nominatim asks for an identifying User-Agent/Referer for non-browser
  // callers; browsers set Referer automatically, native callers should
  // set NOMINATIM_APP_IDENTIFIER in their fetch headers if extending this.
  private readonly countryCode = 'ph';

  async searchAddress(query: string): Promise<GeocodeResult[]> {
    if (!query.trim()) return [];
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', this.countryCode);
    url.searchParams.set('limit', '5');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];
    const results = (await response.json()) as NominatimResult[];
    return results.map(toGeocodeResult);
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GeocodeResult | null> {
    const url = new URL(`${this.baseUrl}/reverse`);
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const result = (await response.json()) as NominatimResult;
    if (!result || 'error' in result) return null;
    return toGeocodeResult(result);
  }
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    village?: string;
    barangay?: string;
    city?: string;
    town?: string;
    municipality?: string;
    state?: string;
    region?: string;
    postcode?: string;
  };
}

function toGeocodeResult(result: NominatimResult): GeocodeResult {
  const addr = result.address ?? {};
  const addressLine =
    [addr.house_number, addr.road].filter(Boolean).join(' ') || result.display_name;
  return {
    label: result.display_name,
    addressLine,
    barangay: addr.barangay ?? addr.suburb ?? addr.village ?? null,
    cityMunicipality: addr.city ?? addr.town ?? addr.municipality ?? '',
    province: addr.state ?? '',
    region: addr.region ?? addr.state ?? '',
    postalCode: addr.postcode ?? null,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  };
}

let cachedProvider: GeocodingProvider | null = null;

export function getGeocodingProvider(): GeocodingProvider {
  if (!cachedProvider) {
    cachedProvider = new NominatimGeocodingProvider();
  }
  return cachedProvider;
}
