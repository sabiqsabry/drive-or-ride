import type { Place, PlaceSuggestion, Route } from '../../types'
import * as g from './google'
import * as osm from './osm'

/** Google Maps when a key is configured, otherwise free OpenStreetMap services. */
export const PROVIDER: 'google' | 'osm' = g.GOOGLE_KEY ? 'google' : 'osm'

export type SearchSession = g.SearchSession
export const newSession = (): SearchSession => ({})

export async function searchPlaces(
  query: string,
  country: { code: string; center: [number, number] },
  session: SearchSession,
  signal: AbortSignal,
  onResults: (s: PlaceSuggestion[]) => void,
) {
  if (PROVIDER === 'google') return onResults(await g.searchPlaces(query, country, session))
  return osm.searchPlaces(query, country, signal, onResults)
}

export function getRoute(from: Place, to: Place, departure: Date | undefined, signal: AbortSignal): Promise<Route> {
  return PROVIDER === 'google' ? g.getRoute(from, to, departure, signal) : osm.getRoute(from, to, signal)
}

export const reverseGeocode = osm.reverseGeocode
