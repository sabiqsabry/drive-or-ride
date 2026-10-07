import type { Country, Place, Window } from '../types'

const uberLink = (from: Place, to: Place) => {
  const p = new URLSearchParams({
    action: 'setPickup',
    'pickup[latitude]': String(from.lat),
    'pickup[longitude]': String(from.lon),
    'pickup[nickname]': from.name,
    'dropoff[latitude]': String(to.lat),
    'dropoff[longitude]': String(to.lon),
    'dropoff[nickname]': to.name,
  })
  return `https://m.uber.com/ul/?${p}`
}

/** Generic urban demand pattern; countries can override. */
const genericWindows: Window[] = [
  { from: 7, to: 10, days: 'weekday', label: 'Morning rush', traffic: 1.4, surge: [1.1, 1.45] },
  { from: 16, to: 20, days: 'weekday', label: 'Evening rush', traffic: 1.5, surge: [1.15, 1.55] },
  { from: 22, to: 5, days: 'all', label: 'Late night', traffic: 0.9, surge: [1.05, 1.3] },
  { from: 17, to: 23, days: 'weekend', label: 'Weekend evening', traffic: 1.2, surge: [1.05, 1.3] },
]

export const COUNTRIES: Country[] = [
  {
    code: 'LK',
    name: 'Sri Lanka',
    flag: '🇱🇰',
    currency: 'LKR',
    locale: 'en-LK',
    timeZone: 'Asia/Colombo',
    center: [6.9271, 79.8612],
    fuels: [
      { id: 'petrol92', label: 'Petrol 92', power: 'petrol', price: 414, unit: 'L' },
      { id: 'petrol95', label: 'Petrol 95', power: 'petrol', price: 475, unit: 'L' },
      { id: 'diesel', label: 'Auto Diesel', power: 'diesel', price: 392, unit: 'L' },
      { id: 'superDiesel', label: 'Super Diesel', power: 'diesel', price: 528, unit: 'L' },
      { id: 'electric', label: 'Electricity (home)', power: 'electric', price: 65, unit: 'kWh' },
    ],
    fuelAsOf: '1 Oct 2026',
    fuelSource: 'Ceylon Petroleum Corporation price revision',
    wearPerKm: { hatch: 12, sedan: 16, suv: 25, van: 25, pickup: 22, tuk: 6, motorcycle: 3 },
    tariffNote:
      'PickMe and Uber do not publish fare APIs. Fares are modelled from published rate history and recent reported trip prices, then adjusted for time of day and weather.',
    services: [
      {
        id: 'pickme',
        name: 'PickMe',
        color: '#ffc107',
        appUrl: 'https://pickme.lk',
        categories: [
          { id: 'bike', name: 'Bike', kind: 'bike', base: 100, perKm: 52, perMin: 2, minimum: 150 },
          { id: 'tuk', name: 'Tuk', kind: 'tuk', base: 120, perKm: 70, perMin: 2, minimum: 200 },
          { id: 'flex', name: 'Flex', kind: 'car', base: 200, perKm: 80, perMin: 4, minimum: 400 },
          { id: 'car', name: 'Car', kind: 'car', base: 250, perKm: 90, perMin: 4, minimum: 500 },
        ],
      },
      {
        id: 'uber',
        name: 'Uber',
        color: '#e5e5ea',
        appUrl: 'https://www.uber.com/lk/en/',
        deepLink: uberLink,
        categories: [
          { id: 'moto', name: 'Moto', kind: 'bike', base: 90, perKm: 50, perMin: 2, minimum: 150 },
          { id: 'tuk', name: 'Tuk', kind: 'tuk', base: 130, perKm: 73, perMin: 2, minimum: 220 },
          { id: 'zip', name: 'Zip', kind: 'car', base: 220, perKm: 84, perMin: 4, minimum: 450 },
          { id: 'uberx', name: 'UberX', kind: 'car', base: 280, perKm: 96, perMin: 5, minimum: 550 },
        ],
      },
    ],
    demandWindows: [
      { from: 7, to: 10, days: 'weekday', label: 'Morning rush', traffic: 1.45, surge: [1.15, 1.5] },
      { from: 16, to: 20, days: 'weekday', label: 'Evening rush', traffic: 1.55, surge: [1.2, 1.6] },
      { from: 22, to: 5, days: 'all', label: 'Late night', traffic: 0.9, surge: [1.1, 1.35] },
      { from: 17, to: 22, days: 'weekend', label: 'Weekend evening', traffic: 1.2, surge: [1.05, 1.3] },
    ],
  },
  // International markets: fuel defaults converted from globalpetrolprices.com (28 Sep 2026, USD/L)
  // at approximate exchange rates. Ride tariffs are not calibrated yet - users can enter a quote.
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    locale: 'en-IN',
    timeZone: 'Asia/Kolkata',
    center: [28.6139, 77.209],
    fuels: [
      { id: 'petrol', label: 'Petrol', power: 'petrol', price: 100.6, unit: 'L' },
      { id: 'diesel', label: 'Diesel', power: 'diesel', price: 94.3, unit: 'L' },
      { id: 'electric', label: 'Electricity', power: 'electric', price: 8, unit: 'kWh' },
    ],
    fuelAsOf: '28 Sep 2026 (approx.)',
    fuelSource: 'globalpetrolprices.com national average',
    wearPerKm: { hatch: 2.5, sedan: 3.5, suv: 5, van: 5, pickup: 5, tuk: 1.5, motorcycle: 0.8 },
    services: [],
    demandWindows: genericWindows,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: 'AED',
    locale: 'en-AE',
    timeZone: 'Asia/Dubai',
    center: [25.2048, 55.2708],
    fuels: [
      { id: 'special95', label: 'Special 95', power: 'petrol', price: 3.69, unit: 'L' },
      { id: 'diesel', label: 'Diesel', power: 'diesel', price: 4.81, unit: 'L' },
      { id: 'electric', label: 'Electricity', power: 'electric', price: 0.7, unit: 'kWh' },
    ],
    fuelAsOf: '28 Sep 2026 (approx.)',
    fuelSource: 'globalpetrolprices.com national average',
    wearPerKm: { hatch: 0.12, sedan: 0.15, suv: 0.22, van: 0.22, pickup: 0.2, motorcycle: 0.05 },
    services: [],
    demandWindows: genericWindows,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    locale: 'en-GB',
    timeZone: 'Europe/London',
    center: [51.5072, -0.1276],
    fuels: [
      { id: 'unleaded', label: 'Unleaded', power: 'petrol', price: 1.65, unit: 'L' },
      { id: 'diesel', label: 'Diesel', power: 'diesel', price: 1.56, unit: 'L' },
      { id: 'electric', label: 'Electricity (home)', power: 'electric', price: 0.25, unit: 'kWh' },
    ],
    fuelAsOf: '28 Sep 2026 (approx.)',
    fuelSource: 'globalpetrolprices.com national average',
    wearPerKm: { hatch: 0.06, sedan: 0.08, suv: 0.11, van: 0.11, pickup: 0.1, motorcycle: 0.03 },
    services: [],
    demandWindows: genericWindows,
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD',
    locale: 'en-AU',
    timeZone: 'Australia/Sydney',
    center: [-33.8688, 151.2093],
    fuels: [
      { id: 'ulp91', label: 'Unleaded 91', power: 'petrol', price: 2.33, unit: 'L' },
      { id: 'diesel', label: 'Diesel', power: 'diesel', price: 2.07, unit: 'L' },
      { id: 'electric', label: 'Electricity (home)', power: 'electric', price: 0.32, unit: 'kWh' },
    ],
    fuelAsOf: '28 Sep 2026 (approx.)',
    fuelSource: 'globalpetrolprices.com national average',
    wearPerKm: { hatch: 0.1, sedan: 0.12, suv: 0.16, van: 0.16, pickup: 0.16, motorcycle: 0.05 },
    services: [],
    demandWindows: genericWindows,
  },
]

export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]
