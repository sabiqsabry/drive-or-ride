import type { Country, Place, RideKind, Route, Vehicle } from '../types'
import type { Weather } from './weather'

/* ---------- Trip time ---------- */

export interface TripTime {
  y: number
  m: number
  d: number
  hour: number
  minute: number
  /** 0 = Sunday */
  weekday: number
}

export function nowIn(timeZone: string): TripTime {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  )
  return fromParts(+parts.year, +parts.month, +parts.day, +parts.hour % 24, +parts.minute)
}

/** Parses a `datetime-local` value as wall-clock time in the trip's country. */
export function fromLocalInput(value: string): TripTime | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  return m ? fromParts(+m[1], +m[2], +m[3], +m[4], +m[5]) : null
}

function fromParts(y: number, m: number, d: number, hour: number, minute: number): TripTime {
  return { y, m, d, hour, minute, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Converts a wall-clock trip time in `timeZone` to an absolute instant. */
export function toInstant(t: TripTime, timeZone: string): Date {
  const guess = Date.UTC(t.y, t.m - 1, t.d, t.hour, t.minute)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  )
  const asZone = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute)
  return new Date(guess - (asZone - guess))
}
export const hourKey = (t: TripTime) => `${t.y}-${pad(t.m)}-${pad(t.d)}T${pad(t.hour)}:00`
export const toLocalInput = (t: TripTime) => `${t.y}-${pad(t.m)}-${pad(t.d)}T${pad(t.hour)}:${pad(t.minute)}`

/* ---------- Conditions: time of day, traffic, weather ---------- */

export interface Factor {
  icon: string
  label: string
  detail: string
  tone: 'up' | 'down' | 'neutral'
}

export interface Conditions {
  label: string
  /** Multiplier on free-flow travel time. */
  traffic: number
  /** Expected demand multiplier range on ride fares. */
  surge: [number, number]
  factors: Factor[]
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const inHours = (h: number, from: number, to: number) => (from < to ? h >= from && h < to : h >= from || h < to)

export function getConditions(country: Country, t: TripTime, weather: Weather | null, route: Route, live: boolean): Conditions {
  const distanceKm = route.distanceKm
  const weekend = t.weekday === 0 || t.weekday === 6
  const win = country.demandWindows.find(
    (w) =>
      inHours(t.hour, w.from, w.to) &&
      (w.days === 'all' || (w.days === 'weekend') === weekend),
  )
  // Congestion mostly hits the urban ends of a trip, so dilute it on long intercity drives.
  const urbanShare = Math.min(1, 25 / Math.max(distanceKm, 1))
  const known = route.trafficRatio
  let traffic = known ?? 1 + ((win?.traffic ?? 1.1) - 1) * urbanShare
  let surge: [number, number] = win ? [...win.surge] : [1, 1.1]
  const label = win?.label ?? 'Off-peak'
  const time = `${pad(t.hour)}:${pad(t.minute)}`

  const factors: Factor[] = [
    win
      ? {
          icon: label === 'Late night' ? '🌙' : '🚦',
          label,
          detail: `${time} on a ${DAYS[t.weekday]} - expect ${label === 'Late night' ? 'night-time pricing' : 'heavier traffic and higher demand'}`,
          tone: 'up',
        }
      : { icon: '🕐', label: 'Off-peak', detail: `${time} on a ${DAYS[t.weekday]} - usually the cheapest time to ride`, tone: 'down' },
    {
      icon: weekend ? '🛋️' : '💼',
      label: weekend ? 'Weekend' : 'Weekday',
      detail: weekend ? 'Lighter commute traffic, busier evenings' : 'Commuter peaks around 7-10 AM and 4-8 PM',
      tone: 'neutral',
    },
  ]

  if (known) {
    const delay = route.durationMin * (known - 1)
    const heavy = known >= 1.25
    if (heavy) surge = [surge[0] + 0.05, surge[1] + 0.15]
    factors.unshift({
      icon: heavy ? '🚗' : known >= 1.08 ? '🚙' : '🟢',
      label: heavy ? 'Heavy traffic' : known >= 1.08 ? 'Moderate traffic' : 'Light traffic',
      detail:
        (delay >= 1 ? `About ${Math.round(delay)} min slower than usual` : 'Moving at normal speed') +
        (live ? ' right now (Google live traffic)' : ' at that time (Google predicted traffic)'),
      tone: heavy ? 'up' : known >= 1.08 ? 'neutral' : 'down',
    })
  }

  if (weather) {
    const heavy = weather.code >= 95 || weather.rainMm >= 4
    if (weather.rainMm >= 0.3 || weather.code >= 61) {
      surge = [surge[0] + (heavy ? 0.15 : 0.08), surge[1] + (heavy ? 0.35 : 0.2)]
      if (!known) traffic *= 1 + (heavy ? 0.2 : 0.1) * urbanShare
      factors.push({
        icon: weather.icon,
        label: weather.label,
        detail: `${weather.rainMm.toFixed(1)} mm/h forecast - rain pushes up demand and slows traffic`,
        tone: 'up',
      })
    } else {
      factors.push({
        icon: weather.icon,
        label: weather.label,
        detail: `${Math.round(weather.tempC)}°C, no rain expected - no weather surge`,
        tone: 'down',
      })
    }
  }

  if (distanceKm > 40) {
    factors.push({
      icon: '🛣️',
      label: 'Long trip',
      detail: 'Out-of-town rides may add return-trip or waiting charges, and expressway tolls apply either way',
      tone: 'up',
    })
  }

  return { label, traffic, surge, factors }
}

/* ---------- Driving cost ---------- */

export interface DriveEstimate {
  total: number
  fuelCost: number
  wearCost: number
  units: number
  unit: 'L' | 'kWh'
  efficiency: number
  avgSpeed: number
}

export function estimateDrive(opts: {
  vehicle: Vehicle
  fuelPrice: number
  unit: 'L' | 'kWh'
  route: Route
  conditions: Conditions
  wearPerKm: number
  includeWear: boolean
  roundTrip: boolean
}): DriveEstimate {
  const { vehicle, route, conditions } = opts
  const legs = opts.roundTrip ? 2 : 1
  const durationMin = route.durationMin * conditions.traffic
  const avgSpeed = route.distanceKm / (durationMin / 60)

  // Blend city ↔ highway efficiency by average speed, then penalise stop-and-go traffic.
  const t = Math.min(1, Math.max(0, (avgSpeed - 25) / 40))
  const blended = vehicle.city * (1 - t) + vehicle.highway * t
  const congestion = Math.max(0, conditions.traffic - 1.1)
  const sensitivity = vehicle.power === 'electric' ? 0.03 : vehicle.hybrid ? 0.06 : 0.3
  const efficiency = blended / (1 + congestion * sensitivity)

  const km = route.distanceKm * legs
  const units = km / efficiency
  const fuelCost = units * opts.fuelPrice
  const wearCost = opts.includeWear ? km * opts.wearPerKm : 0
  return { total: fuelCost + wearCost, fuelCost, wearCost, units, unit: opts.unit, efficiency, avgSpeed }
}

/* ---------- Ride-hailing fares ---------- */

export interface RideEstimate {
  key: string
  service: string
  serviceId: string
  color: string
  category: string
  kind: RideKind
  low: number
  mid: number
  high: number
  deepLink?: string
  appUrl: string
}

export function estimateRides(country: Country, route: Route, conditions: Conditions, roundTrip: boolean, from: Place, to: Place) {
  const legs = roundTrip ? 2 : 1
  const minutes = route.durationMin * conditions.traffic
  const [s0, s1] = conditions.surge
  return country.services.flatMap((svc) =>
    svc.categories.map((c): RideEstimate => {
      const fare = Math.max(c.minimum, c.base + c.perKm * route.distanceKm + c.perMin * minutes) * legs
      return {
        key: `${svc.id}-${c.id}`,
        service: svc.name,
        serviceId: svc.id,
        color: svc.color,
        category: c.name,
        kind: c.kind,
        low: fare * s0 * 0.95,
        mid: (fare * (s0 + s1)) / 2,
        high: fare * s1 * 1.05,
        deepLink: svc.deepLink?.(from, to),
        appUrl: svc.appUrl,
      }
    }),
  )
}
