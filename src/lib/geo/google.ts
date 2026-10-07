import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import type { Place, PlaceSuggestion, Route } from '../../types'

/**
 * Google Maps Platform provider.
 * - Places API (New) autocomplete via the Maps JS SDK, with session tokens so a whole
 *   type-then-pick interaction is billed as one session.
 * - Routes API (REST) with TRAFFIC_AWARE routing for live and predicted traffic.
 *
 * Restrict the key in Cloud Console to your domains (HTTP referrers) and to
 * Maps JavaScript API, Places API (New) and Routes API.
 */
export const GOOGLE_KEY: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || undefined
export const GOOGLE_MAP_ID: string = import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'

let configured = false
export function loadGoogle<T extends keyof google.maps.ImportLibraryMap>(lib: T) {
  if (!configured) {
    setOptions({ key: GOOGLE_KEY, v: 'weekly', language: 'en' })
    configured = true
  }
  return importLibrary(lib)
}

/** Opaque per-input session; holds the current Places session token. */
export interface SearchSession {
  token?: google.maps.places.AutocompleteSessionToken
}

export async function searchPlaces(
  query: string,
  country: { code: string; center: [number, number] },
  session: SearchSession,
): Promise<PlaceSuggestion[]> {
  const { AutocompleteSuggestion, AutocompleteSessionToken } = await loadGoogle('places')
  session.token ??= new AutocompleteSessionToken()
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: query,
    sessionToken: session.token,
    includedRegionCodes: [country.code.toLowerCase()],
    locationBias: { center: { lat: country.center[0], lng: country.center[1] }, radius: 50_000 },
    language: 'en',
  })
  return suggestions.flatMap((s) => {
    const p = s.placePrediction
    if (!p) return []
    const name = p.mainText?.text ?? p.text.text
    const detail = p.secondaryText?.text ?? ''
    return [
      {
        id: p.placeId,
        name,
        detail,
        resolve: async (): Promise<Place> => {
          const place = p.toPlace()
          // Essentials-tier fields only; this call also closes the autocomplete session.
          await place.fetchFields({ fields: ['location'] })
          session.token = undefined
          const loc = place.location
          if (!loc) throw new Error('Could not locate that place')
          return { name, detail, lat: loc.lat(), lon: loc.lng(), placeId: p.placeId }
        },
      },
    ]
  })
}

const waypoint = (p: Place) =>
  p.placeId ? { placeId: p.placeId } : { location: { latLng: { latitude: p.lat, longitude: p.lon } } }

const seconds = (s?: string) => (s ? parseFloat(s) : NaN)

/** `departure` is an absolute instant; omit for "leave now" (live traffic). */
export async function getRoute(from: Place, to: Place, departure?: Date, signal?: AbortSignal): Promise<Route> {
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY!,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.geoJsonLinestring',
    },
    body: JSON.stringify({
      origin: waypoint(from),
      destination: waypoint(to),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      ...(departure ? { departureTime: departure.toISOString() } : {}),
      polylineQuality: 'OVERVIEW',
      polylineEncoding: 'GEO_JSON_LINESTRING',
      languageCode: 'en',
      units: 'METRIC',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message ?? 'Google routing is unavailable right now')
  const route = data.routes?.[0]
  if (!route) throw new Error('No driving route found between these places')
  const live = seconds(route.duration)
  const typical = seconds(route.staticDuration) || live
  return {
    distanceKm: route.distanceMeters / 1000,
    durationMin: typical / 60,
    trafficRatio: live && typical ? live / typical : undefined,
    coords: route.polyline.geoJsonLinestring.coordinates,
    provider: 'google',
  }
}
