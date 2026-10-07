export type PowerType = 'petrol' | 'diesel' | 'electric'
export type VehicleBody = 'hatch' | 'sedan' | 'suv' | 'van' | 'pickup' | 'tuk' | 'motorcycle'

export interface FuelOption {
  id: string
  label: string
  power: PowerType
  /** Default price per unit in the country's currency. User can override. */
  price: number
  unit: 'L' | 'kWh'
}

export interface Vehicle {
  id: string
  make: string
  model: string
  variant?: string
  years: [number, number]
  engine: string
  power: PowerType
  body: VehicleBody
  hybrid?: boolean
  /** Real-world efficiency in km per unit (km/L, or km/kWh for EVs). */
  city: number
  highway: number
  /** Preferred fuel grade id within the country (e.g. petrol95 for turbo engines). */
  preferredFuel?: string
  /** ISO country codes where this vehicle is common. Empty = global. */
  markets?: string[]
}

export type RideKind = 'bike' | 'tuk' | 'car' | 'xl'

export interface RideCategory {
  id: string
  name: string
  kind: RideKind
  base: number
  perKm: number
  perMin: number
  minimum: number
}

export interface RideService {
  id: string
  name: string
  color: string
  categories: RideCategory[]
  /** Builds a link that opens the service with the route prefilled, if supported. */
  deepLink?: (from: Place, to: Place) => string
  appUrl: string
}

export interface Window {
  /** Inclusive start hour, exclusive end hour (can wrap past midnight). */
  from: number
  to: number
  days: 'weekday' | 'weekend' | 'all'
  label: string
  traffic: number
  surge: [number, number]
}

export interface Country {
  code: string
  name: string
  flag: string
  currency: string
  locale: string
  timeZone: string
  center: [number, number]
  fuels: FuelOption[]
  fuelAsOf: string
  fuelSource: string
  /** Rough running cost (tyres, servicing, wear) per km by body type. */
  wearPerKm: Partial<Record<VehicleBody, number>>
  services: RideService[]
  tariffNote?: string
  demandWindows: Window[]
}

export interface Place {
  name: string
  detail: string
  lat: number
  lon: number
  /** Google place id, when the place came from Google Places. */
  placeId?: string
}

/** An autocomplete result; coordinates may need a follow-up lookup. */
export interface PlaceSuggestion {
  id: string
  name: string
  detail: string
  resolve: () => Promise<Place>
}

export interface Route {
  distanceKm: number
  /** Typical travel time without live traffic. */
  durationMin: number
  /** Live/predicted traffic duration ÷ typical duration, when the provider knows it. */
  trafficRatio?: number
  provider: 'google' | 'osm'
  /** Simplified [lon, lat] geometry for the route sketch. */
  coords: [number, number][]
}
