// lib/geocoding.ts

export interface GeoResult {
  lat: number;
  lng: number;
  country_code: string;
  country_name: string;
  city?: string;
  display_name: string;
  place_type: 'country' | 'city' | 'region' | 'address';
}

export interface GeoError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'API_ERROR';
  message: string;
}

// ─── Helper : fetch avec timeout ─────────────────────────────────────────────

async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Géolocalisation navigateur ────────────────────────────────────────────────

export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | GeoError> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        code: 'POSITION_UNAVAILABLE',
        message: 'Géolocalisation non supportée par votre navigateur'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        let code: GeoError['code'] = 'POSITION_UNAVAILABLE';
        let message = 'Erreur de géolocalisation';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            code = 'PERMISSION_DENIED';
            message = 'Géolocalisation refusée. Activez la localisation dans votre navigateur.';
            break;
          case error.POSITION_UNAVAILABLE:
            code = 'POSITION_UNAVAILABLE';
            message = 'Position indisponible. Vérifiez votre connexion.';
            break;
          case error.TIMEOUT:
            code = 'TIMEOUT';
            message = 'Délai de géolocalisation dépassé.';
            break;
        }

        resolve({ code, message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  });
}

// ─── Geocoding par nom ──────────────────────────────────────────────────────────

export async function geocodePlace(query: string): Promise<GeoResult[] | GeoError> {
  if (!query.trim()) return [];

  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?` +
      new URLSearchParams({
        q: query,
        format: 'json',
        limit: '8',
        addressdetails: '1',
        'accept-language': 'fr,en'
      }),
      {
        headers: {
          'User-Agent': 'Lukeni Music Platform (contact@lukeni.africa)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      country_code: item.address?.country_code?.toUpperCase() || 'UNKNOWN',
      country_name: item.address?.country || 'Unknown',
      city: item.address?.city || item.address?.town || item.address?.village || undefined,
      display_name: item.display_name,
      place_type: determinePlaceType(item)
    }));

  } catch (error: any) {
    console.error('Geocoding error:', error?.message || error);
    if (error?.name === 'AbortError') {
      return {
        code: 'TIMEOUT',
        message: 'Délai de recherche dépassé. Réessayez.'
      };
    }
    return {
      code: 'API_ERROR',
      message: 'Erreur lors de la recherche de lieu. Vérifiez votre connexion.'
    };
  }
}

// ─── Reverse geocoding ──────────────────────────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | GeoError> {
  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?` +
      new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'fr,en'
      }),
      {
        headers: {
          'User-Agent': 'Lukeni Music Platform (contact@lukeni.africa)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.address) {
      return {
        code: 'API_ERROR',
        message: 'Aucune adresse trouvée pour ces coordonnées'
      };
    }

    return {
      lat,
      lng,
      country_code: data.address.country_code?.toUpperCase() || 'UNKNOWN',
      country_name: data.address.country || 'Unknown',
      city: data.address.city || data.address.town || data.address.village || undefined,
      display_name: data.display_name,
      place_type: determinePlaceType(data)
    };

  } catch (error: any) {
    console.error('Reverse geocoding error:', error?.message || error);
    if (error?.name === 'AbortError') {
      return {
        code: 'TIMEOUT',
        message: 'Délai de géolocalisation dépassé. Réessayez.'
      };
    }
    return {
      code: 'API_ERROR',
      message: 'Erreur lors de la géolocalisation inverse'
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function determinePlaceType(item: any): GeoResult['place_type'] {
  const type = item.type || item.class;
  if (['country', 'nation'].includes(type)) return 'country';
  if (['city', 'town', 'village'].includes(type)) return 'city';
  if (['state', 'region', 'province'].includes(type)) return 'region';
  return 'address';
}

// ─── Autocomplétion pays ─────────────────────────────────────────────────────────

export async function searchCountries(query: string): Promise<GeoResult[]> {
  const results = await geocodePlace(query);
  if ('code' in results) return [];
  return results.filter(r => r.place_type === 'country').slice(0, 5);
}

// ─── Fonction combo : Auto + Search ─────────────────────────────────────────────

export async function getLocationInfo(
  useCurrentPosition: boolean = false,
  searchQuery?: string
): Promise<GeoResult | GeoError> {

  if (useCurrentPosition) {
    const position = await getCurrentPosition();
    if ('code' in position) return position;
    return await reverseGeocode(position.lat, position.lng);
  }

  if (searchQuery) {
    const results = await geocodePlace(searchQuery);
    if ('code' in results) return results;
    if (results.length === 0) {
      return {
        code: 'API_ERROR',
        message: `Aucun lieu trouvé pour "${searchQuery}"`
      };
    }
    return results[0];
  }

  return {
    code: 'API_ERROR',
    message: 'Aucune méthode de géolocalisation spécifiée'
  };
}

// ─── Validation coordinates ──────────────────────────────────────────────────────

export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

export function formatCoordinates(lat: number, lng: number, precision = 4): string {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

// ─── Cache simple ────────────────────────────────────────────────────────────────

const geocodeCache = new Map<string, GeoResult[]>();
const CACHE_DURATION = 5 * 60 * 1000;

export async function geocodePlaceWithCache(query: string): Promise<GeoResult[] | GeoError> {
  const cacheKey = query.toLowerCase().trim();
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const results = await geocodePlace(query);

  if (!('code' in results)) {
    geocodeCache.set(cacheKey, results);
    setTimeout(() => { geocodeCache.delete(cacheKey); }, CACHE_DURATION);
  }

  return results;
}