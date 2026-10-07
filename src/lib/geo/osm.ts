import type { Place, PlaceSuggestion, Route } from '../../types'

/**
 * Geocoding: Photon (komoot) over OpenStreetMap data. Free, keyless, CORS-enabled.
 * Routing: OSRM public demo server. Fine for prototyping; swap for a hosted
 * OSRM / OpenRouteService / Mapbox instance before real traffic (see README).
 */
const PHOTON = 'https://photon.komoot.io'
const OSRM = 'https://router.project-osrm.org'
const NOMINATIM = 'https://nominatim.openstreetmap.org'

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    district?: string
    county?: string
    state?: string
    countrycode?: string
  }
}

const toPlace = (f: PhotonFeature): Place => {
  const p = f.properties
  const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || 'Unnamed place'
  const detail = [p.street && p.name ? p.street : null, p.city ?? p.district, p.county ?? p.state]
    .filter((x, i, a) => x && x !== name && a.indexOf(x) === i)
    .join(', ')
  return { name, detail, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }
}

const withTimeout = (signal: AbortSignal | undefined, ms: number) =>
  signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms)

const dedupe = (places: Place[]) => {
  const seen = new Set<string>()
  return places
    .filter((p) => {
      const key = `${p.name}|${p.detail}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

async function photonSearch(query: string, country: { code: string; center: [number, number] }, signal?: AbortSignal) {
  const url = `${PHOTON}/api/?q=${encodeURIComponent(query)}&limit=12&lang=en&lat=${country.center[0]}&lon=${country.center[1]}`
  const res = await fetch(url, { signal: withTimeout(signal, 9000) })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const data: { features: PhotonFeature[] } = await res.json()
  return dedupe(data.features.filter((f) => f.properties.countrycode === country.code).map(toPlace))
}

interface NominatimResult {
  lat: string
  lon: string
  name: string
  display_name: string
  address?: Record<string, string>
}

/** Fallback when Photon is slow. Nominatim's policy allows light, non-bulk use only. */
async function nominatimSearch(query: string, country: { code: string; center: [number, number] }, signal?: AbortSignal) {
  const [lat, lon] = country.center
  const viewbox = [lon - 1, lat + 1, lon + 1, lat - 1].join(',') // preference, not a hard bound
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=8&addressdetails=1&accept-language=en&countrycodes=${country.code.toLowerCase()}&viewbox=${viewbox}`
  const res = await fetch(url, { signal: withTimeout(signal, 8000) })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data: NominatimResult[] = await res.json()
  return dedupe(
    data.map((r) => {
      const a = r.address ?? {}
      const name = r.name || r.display_name.split(',')[0]
      const detail = [a.road, a.suburb ?? a.city ?? a.town ?? a.village, a.state_district ?? a.state]
        .filter((x, i, arr) => x && x !== name && arr.indexOf(x) === i)
        .join(', ')
      return { name, detail, lat: +r.lat, lon: +r.lon }
    }),
  )
}

/**
 * Photon gives the best fuzzy matches but the public instance can be slow. If it hasn't
 * answered within 1.5s, Nominatim is queried too and shown first; Photon's results
 * replace them when they arrive. `onResults` may therefore fire twice.
 */
export async function searchPlaces(
  query: string,
  country: { code: string; center: [number, number] },
  signal: AbortSignal,
  onResults: (places: PlaceSuggestion[]) => void,
): Promise<void> {
  const emit = (places: Place[]) =>
    onResults(places.map((p) => ({ id: `${p.lat},${p.lon}`, name: p.name, detail: p.detail, resolve: async () => p })))
  let photonDone = false
  let shown = false
  const photon = photonSearch(query, country, signal).then(
    (r) => {
      photonDone = true
      if (r.length || !shown) {
        shown = true
        emit(r)
      }
      return true
    },
    () => false,
  )
  const fallback = new Promise<boolean>((resolve) => {
    const timer = setTimeout(run, 1500)
    photon.then((ok) => {
      if (ok) {
        clearTimeout(timer)
        resolve(true)
      } else {
        clearTimeout(timer)
        run()
      }
    })
    let started = false
    function run() {
      if (started) return
      started = true
      nominatimSearch(query, country, signal).then(
        (r) => {
          if (!photonDone && (r.length || !shown)) {
            shown = true
            emit(r)
          }
          resolve(true)
        },
        () => resolve(false),
      )
    }
  })
  const [a, b] = await Promise.all([photon, fallback])
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  if (!a && !b) throw new Error('Place search is unavailable right now')
}

export async function reverseGeocode(lat: number, lon: number): Promise<Place> {
  const res = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lon}&lang=en`)
  const data: { features: PhotonFeature[] } = res.ok ? await res.json() : { features: [] }
  const place = data.features[0] ? toPlace(data.features[0]) : null
  return { name: place?.name ?? 'Current location', detail: place?.detail ?? '', lat, lon }
}

export async function getRoute(from: Place, to: Place, signal?: AbortSignal): Promise<Route> {
  const url = `${OSRM}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=simplified&geometries=geojson`
  const res = await fetch(url, { signal: withTimeout(signal, 15000) })
  if (!res.ok) throw new Error('Routing service is busy - try again in a moment')
  const data = await res.json()
  const route = data.routes?.[0]
  if (data.code !== 'Ok' || !route) throw new Error('No driving route found between these places')
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    coords: route.geometry.coordinates,
    provider: 'osm',
  }
}
