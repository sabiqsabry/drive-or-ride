import type { PowerType, Vehicle, VehicleBody } from '../types'

/**
 * Curated real-world efficiency figures for vehicles common in Sri Lanka.
 *
 * Japanese JC08/WLTC and Indian ARAI ratings are optimistic for Sri Lankan roads, so
 * city/highway values here are real-world estimates: manufacturer WLTC figures
 * de-rated using owner-reported averages (Fuelly, local owner groups and reviews).
 * EV figures are km per kWh at the wall, including charging losses.
 */
type Row = [
  make: string,
  model: string,
  variant: string,
  years: [number, number],
  engine: string,
  power: PowerType,
  body: VehicleBody,
  city: number,
  highway: number,
  opts?: { hybrid?: boolean; fuel?: string },
]

const LK = ['LK']

const rows: Row[] = [
  // Kei & small hatchbacks
  ['Suzuki', 'Wagon R', 'FX / FZ / Stingray (mild hybrid)', [2017, 2025], '658cc', 'petrol', 'hatch', 16.5, 20],
  ['Suzuki', 'Alto', 'K10 / 800', [2019, 2025], '796-998cc', 'petrol', 'hatch', 17, 21],
  ['Suzuki', 'Celerio', '', [2021, 2025], '998cc', 'petrol', 'hatch', 17, 21.5],
  ['Suzuki', 'S-Presso', '', [2020, 2025], '998cc', 'petrol', 'hatch', 16.5, 21],
  ['Suzuki', 'Spacia', 'Hybrid', [2018, 2025], '658cc', 'petrol', 'hatch', 15.5, 18.5],
  ['Suzuki', 'Hustler', 'Hybrid', [2020, 2025], '658cc', 'petrol', 'hatch', 15, 18],
  ['Suzuki', 'Swift', '1.2', [2018, 2024], '1197cc', 'petrol', 'hatch', 13.5, 18.5],
  ['Suzuki', 'Dzire', '1.2', [2018, 2025], '1197cc', 'petrol', 'sedan', 14, 19],
  ['Daihatsu', 'Mira e:S', '', [2017, 2025], '658cc', 'petrol', 'hatch', 17.5, 21.5],
  ['Daihatsu', 'Move', '', [2017, 2025], '658cc', 'petrol', 'hatch', 15.5, 19],
  ['Nissan', 'Dayz', '', [2019, 2025], '659cc', 'petrol', 'hatch', 15.5, 19],
  ['Perodua', 'Axia', '', [2019, 2025], '998cc', 'petrol', 'hatch', 15.5, 20],
  ['Perodua', 'Bezza', '1.0 / 1.3', [2019, 2025], '998-1329cc', 'petrol', 'sedan', 14.5, 19.5],
  ['Toyota', 'Vitz', '1.0', [2017, 2020], '996cc', 'petrol', 'hatch', 14, 18],
  ['Toyota', 'Wigo', '', [2020, 2025], '998cc', 'petrol', 'hatch', 15, 19.5],
  ['Toyota', 'Raize', '1.0 Turbo', [2020, 2025], '996cc turbo', 'petrol', 'suv', 12.5, 17, { fuel: 'petrol95' }],
  ['Kia', 'Picanto', '', [2018, 2025], '998cc', 'petrol', 'hatch', 13, 18],
  ['Hyundai', 'Grand i10', '', [2019, 2025], '1197cc', 'petrol', 'hatch', 13, 18],

  // Hybrids
  ['Toyota', 'Aqua', 'NHP10', [2017, 2021], '1.5 hybrid', 'petrol', 'hatch', 22, 20, { hybrid: true }],
  ['Toyota', 'Aqua', 'MXPK (2nd gen)', [2021, 2025], '1.5 hybrid', 'petrol', 'hatch', 24, 21.5, { hybrid: true }],
  ['Toyota', 'Prius', 'ZVW50', [2016, 2022], '1.8 hybrid', 'petrol', 'hatch', 21, 19.5, { hybrid: true }],
  ['Toyota', 'Prius', '5th gen', [2023, 2025], '2.0 hybrid', 'petrol', 'hatch', 20, 19, { hybrid: true }],
  ['Toyota', 'Yaris', 'Hybrid', [2020, 2025], '1.5 hybrid', 'petrol', 'hatch', 24, 21.5, { hybrid: true }],
  ['Toyota', 'Corolla Axio / Fielder', 'Hybrid', [2017, 2025], '1.5 hybrid', 'petrol', 'sedan', 19.5, 18.5, { hybrid: true }],
  ['Toyota', 'Corolla', 'Hybrid (E210)', [2019, 2025], '1.8 hybrid', 'petrol', 'sedan', 19, 18, { hybrid: true }],
  ['Toyota', 'C-HR', 'Hybrid', [2017, 2025], '1.8 hybrid', 'petrol', 'suv', 16.5, 16.5, { hybrid: true }],
  ['Toyota', 'Yaris Cross', 'Hybrid', [2021, 2025], '1.5 hybrid', 'petrol', 'suv', 20, 19, { hybrid: true }],
  ['Toyota', 'Urban Cruiser Hyryder', 'Strong Hybrid', [2022, 2025], '1.5 hybrid', 'petrol', 'suv', 20, 22.5, { hybrid: true }],
  ['Honda', 'Fit', 'GP5 Hybrid', [2017, 2020], '1.5 hybrid', 'petrol', 'hatch', 19, 19, { hybrid: true }],
  ['Honda', 'Fit', 'GR e:HEV', [2020, 2025], '1.5 hybrid', 'petrol', 'hatch', 21, 20, { hybrid: true }],
  ['Honda', 'Grace', 'Hybrid', [2017, 2020], '1.5 hybrid', 'petrol', 'sedan', 19, 19, { hybrid: true }],
  ['Honda', 'Vezel', 'RU3 Hybrid', [2017, 2021], '1.5 hybrid', 'petrol', 'suv', 16, 17, { hybrid: true }],
  ['Honda', 'Vezel / HR-V', 'RV e:HEV', [2021, 2025], '1.5 hybrid', 'petrol', 'suv', 18, 17.5, { hybrid: true }],
  ['Honda', 'Shuttle', 'Hybrid', [2017, 2022], '1.5 hybrid', 'petrol', 'hatch', 18.5, 18.5, { hybrid: true }],
  ['Nissan', 'Note', 'e-Power', [2017, 2025], '1.2 series hybrid', 'petrol', 'hatch', 19, 16.5, { hybrid: true }],
  ['Nissan', 'X-Trail', 'Hybrid', [2017, 2025], '2.0 hybrid', 'petrol', 'suv', 13, 14.5, { hybrid: true }],
  ['Suzuki', 'Swift', 'Hybrid', [2018, 2025], '1.2 hybrid', 'petrol', 'hatch', 17, 20, { hybrid: true }],

  // Petrol sedans & SUVs
  ['Toyota', 'Corolla', '1.6 / 1.8 petrol', [2017, 2025], '1598-1798cc', 'petrol', 'sedan', 10.5, 15.5],
  ['Toyota', 'Allion / Premio', '1.5', [2017, 2021], '1496cc', 'petrol', 'sedan', 11, 15.5],
  ['Toyota', 'Yaris', '1.3 / 1.5 sedan', [2018, 2025], '1329-1496cc', 'petrol', 'sedan', 12.5, 17.5],
  ['Toyota', 'Rush', '', [2018, 2025], '1496cc', 'petrol', 'suv', 10.5, 14],
  ['Toyota', 'Urban Cruiser Hyryder', 'Mild Hybrid (Neo Drive)', [2022, 2025], '1462cc', 'petrol', 'suv', 13, 18.5],
  ['Toyota', 'RAV4', '2.0 petrol', [2019, 2025], '1987cc', 'petrol', 'suv', 9.5, 14],
  ['Honda', 'Civic', '1.5 Turbo', [2017, 2025], '1498cc turbo', 'petrol', 'sedan', 10.5, 16, { fuel: 'petrol95' }],
  ['Honda', 'City', '1.5', [2020, 2025], '1498cc', 'petrol', 'sedan', 12, 17],
  ['Honda', 'WR-V', '1.2', [2023, 2025], '1199cc', 'petrol', 'suv', 12, 16.5],
  ['Suzuki', 'Vitara Brezza', '1.5', [2020, 2025], '1462cc', 'petrol', 'suv', 11.5, 16],
  ['Mitsubishi', 'Outlander', 'PHEV (hybrid mode)', [2017, 2025], '2.4 PHEV', 'petrol', 'suv', 13, 13, { hybrid: true }],
  ['Kia', 'Sportage', '1.6T', [2022, 2025], '1598cc turbo', 'petrol', 'suv', 9, 13.5, { fuel: 'petrol95' }],
  ['Hyundai', 'Tucson', '2.0', [2019, 2025], '1999cc', 'petrol', 'suv', 8.5, 13],

  // Diesel
  ['Toyota', 'Hilux', '2.4 D-4D', [2017, 2025], '2393cc diesel', 'diesel', 'pickup', 9, 12.5],
  ['Toyota', 'Land Cruiser Prado', '2.8 D-4D', [2017, 2025], '2755cc diesel', 'diesel', 'suv', 8, 11.5],
  ['Toyota', 'KDH HiAce', '3.0D', [2017, 2024], '2982cc diesel', 'diesel', 'van', 8, 10.5],
  ['Mitsubishi', 'Montero Sport', '2.4D', [2017, 2025], '2442cc diesel', 'diesel', 'suv', 9, 12.5],
  ['Isuzu', 'D-Max', '1.9 / 3.0D', [2017, 2025], '1898-2999cc diesel', 'diesel', 'pickup', 10, 13.5],
  ['Nissan', 'Navara', '2.5D', [2017, 2025], '2488cc diesel', 'diesel', 'pickup', 9, 12.5],

  // Electric
  ['Nissan', 'Leaf', '40 / 62 kWh', [2018, 2025], 'Electric', 'electric', 'hatch', 7, 5.8],
  ['BYD', 'Atto 3', '', [2022, 2025], 'Electric', 'electric', 'suv', 6.2, 5.2],
  ['BYD', 'Dolphin', '', [2023, 2025], 'Electric', 'electric', 'hatch', 7, 5.8],
  ['BYD', 'Seal', '', [2023, 2025], 'Electric', 'electric', 'sedan', 6.3, 5.4],
  ['MG', 'ZS EV', '', [2020, 2025], 'Electric', 'electric', 'suv', 6, 5],
  ['Tesla', 'Model 3', '', [2019, 2025], 'Electric', 'electric', 'sedan', 7, 6],

  // Three-wheelers & motorcycles
  ['Bajaj', 'RE', '4-stroke three-wheeler', [2017, 2025], '236cc', 'petrol', 'tuk', 25, 30],
  ['TVS', 'King', 'Three-wheeler', [2017, 2025], '199cc', 'petrol', 'tuk', 26, 31],
  ['Bajaj', 'CT 100', '', [2017, 2025], '102cc', 'petrol', 'motorcycle', 55, 65],
  ['Bajaj', 'Pulsar', '150', [2017, 2025], '149cc', 'petrol', 'motorcycle', 40, 47],
  ['Honda', 'Dio', '110', [2017, 2025], '110cc', 'petrol', 'motorcycle', 45, 50],
  ['Yamaha', 'FZ', 'FZ-S V3', [2019, 2025], '149cc', 'petrol', 'motorcycle', 42, 48],
  ['TVS', 'Ntorq', '125', [2019, 2025], '124cc', 'petrol', 'motorcycle', 40, 45],
  ['Hero', 'Splendor', '', [2017, 2025], '97cc', 'petrol', 'motorcycle', 55, 65],
]

export const VEHICLES: Vehicle[] = rows.map(([make, model, variant, years, engine, power, body, city, highway, opts]) => ({
  id: `${make}-${model}-${variant}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
  make,
  model,
  variant: variant || undefined,
  years,
  engine,
  power,
  body,
  city,
  highway,
  hybrid: opts?.hybrid,
  preferredFuel: opts?.fuel,
  markets: LK,
}))

export const vehicleLabel = (v: Vehicle) => `${v.make} ${v.model}${v.variant ? ` ${v.variant}` : ''}`

export const customVehicle = (power: PowerType, efficiency: number): Vehicle => ({
  id: 'custom',
  make: 'My',
  model: 'vehicle',
  years: [0, 0],
  engine: '',
  power,
  body: 'hatch',
  city: efficiency,
  highway: efficiency,
})
