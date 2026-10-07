import type { Place, RideKind, Route } from '../types'
import type { TripTime } from './estimate'

/**
 * Anonymous fare contributions from "Got a quote?", stored in Firestore (collection `quotes`)
 * through its REST API. Security rules (firestore.rules) only allow creating well-formed
 * documents; nothing can be read back from the browser.
 *
 * Anonymity: no names, place names, accounts or device ids are sent, and both ends of the
 * trip are rounded to 2 decimal places (~1 km) so a home or workplace can't be pinpointed.
 */
const KEY: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || undefined
const PROJECT: string | undefined = import.meta.env.VITE_GCP_PROJECT_ID || undefined

export const CONTRIBUTIONS_ENABLED = Boolean(KEY && PROJECT)

export interface QuoteContribution {
  country: string
  service: string
  category: string
  kind: RideKind
  quote: number
  estimate: { low: number; mid: number; high: number }
  route: Route
  from: Place
  to: Place
  trip: TripTime
  rain: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100
const dbl = (n: number) => ({ doubleValue: round2(n) })
const int = (n: number) => ({ integerValue: String(Math.round(n)) })
const text = (s: string) => ({ stringValue: s.slice(0, 24) })

export async function contributeQuote(c: QuoteContribution): Promise<boolean> {
  if (!CONTRIBUTIONS_ENABLED) return false
  const fields: Record<string, unknown> = {
    v: int(1),
    country: text(c.country),
    service: text(c.service),
    category: text(c.category || '-'),
    kind: text(c.kind),
    quote: dbl(c.quote),
    estimate: dbl(c.estimate.mid),
    estimateLow: dbl(c.estimate.low),
    estimateHigh: dbl(c.estimate.high),
    distanceKm: dbl(c.route.distanceKm),
    durationMin: dbl(c.route.durationMin),
    hour: int(c.trip.hour),
    weekday: int(c.trip.weekday),
    rain: { booleanValue: c.rain },
    fromLat: dbl(c.from.lat),
    fromLon: dbl(c.from.lon),
    toLat: dbl(c.to.lat),
    toLon: dbl(c.to.lon),
    provider: text(c.route.provider),
  }
  if (c.route.trafficRatio) fields.trafficRatio = dbl(c.route.trafficRatio)
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/quotes?key=${KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) },
    )
    return res.ok
  } catch {
    return false
  }
}
