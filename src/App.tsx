import { useEffect, useMemo, useState } from 'react'
import { Disclaimer } from './components/Disclaimer'
import { GlassSelect } from './components/GlassSelect'
import { LiquidBackdrop } from './components/LiquidBackdrop'
import { Results } from './components/Results'
import { ThemeToggle } from './components/ThemeToggle'
import { PlaceInput } from './components/PlaceInput'
import { VehiclePicker, bodyIcon, effUnit } from './components/VehiclePicker'
import { COUNTRIES, countryByCode } from './data/countries'
import { VEHICLES, customVehicle, vehicleLabel } from './data/vehicles'
import { estimateDrive, estimateRides, fromLocalInput, getConditions, hourKey, nowIn, toInstant, toLocalInput } from './lib/estimate'
import { PROVIDER, getRoute } from './lib/geo'
import { money, symbol } from './lib/format'
import { contributeQuote } from './lib/contribute'
import { getWeather, type Weather } from './lib/weather'
import type { Place, PowerType, Route } from './types'

const EXAMPLES: { label: string; from: Place; to: Place }[] = [
  {
    label: 'Colombo Fort → Kandy',
    from: { name: 'Colombo Fort', detail: 'Colombo', lat: 6.9344, lon: 79.8428 },
    to: { name: 'Kandy', detail: 'Central Province', lat: 7.2906, lon: 80.6337 },
  },
  {
    label: 'Dehiwala → Battaramulla',
    from: { name: 'Dehiwala', detail: 'Colombo District', lat: 6.8513, lon: 79.866 },
    to: { name: 'Battaramulla', detail: 'Colombo District', lat: 6.9006, lon: 79.918 },
  },
  {
    label: 'Airport → Galle Face',
    from: { name: 'Bandaranaike Int’l Airport', detail: 'Katunayake', lat: 7.1808, lon: 79.8841 },
    to: { name: 'Galle Face Green', detail: 'Colombo 3', lat: 6.9271, lon: 79.8455 },
  },
]

const STORE_KEY = 'drive-or-ride:v1'
interface Saved {
  country?: string
  vehicleId?: string
  customEff?: string
  customPower?: PowerType
  prices?: Record<string, string>
  fuelId?: string
}
const load = (): Saved => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export default function App() {
  const saved = useMemo(load, [])
  const [countryCode, setCountryCode] = useState(saved.country ?? 'LK')
  const country = countryByCode(countryCode)

  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)
  const [vehicleId, setVehicleId] = useState(saved.vehicleId ?? 'suzuki-wagon-r-fx-fz-stingray-mild-hybrid')
  const [customPower, setCustomPower] = useState<PowerType>(saved.customPower ?? 'petrol')
  const [customEff, setCustomEff] = useState(saved.customEff ?? '')
  const [effOverride, setEffOverride] = useState('')
  const [fuelPick, setFuelPick] = useState(saved.fuelId ?? '')
  const [prices, setPrices] = useState<Record<string, string>>(saved.prices ?? {})
  const [timeMode, setTimeMode] = useState<'now' | 'later'>('now')
  const [later, setLater] = useState(() => toLocalInput(nowIn(country.timeZone)))
  const [roundTrip, setRoundTrip] = useState(false)
  const [includeWear, setIncludeWear] = useState(false)
  const [quotes, setQuotes] = useState<Record<string, number>>({})

  const [route, setRoute] = useState<Route | null>(null)
  const [routeError, setRouteError] = useState('')
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const isCustom = vehicleId === 'custom'
  const baseVehicle = VEHICLES.find((v) => v.id === vehicleId) ?? null
  const power: PowerType = isCustom ? customPower : (baseVehicle?.power ?? 'petrol')
  const fuels = country.fuels.filter((f) => f.power === power)
  const fuel =
    fuels.find((f) => f.id === fuelPick) ??
    fuels.find((f) => f.id === baseVehicle?.preferredFuel) ??
    fuels[0]
  const priceKey = `${country.code}:${fuel?.id}`
  const priceText = prices[priceKey] ?? String(fuel?.price ?? '')
  const fuelPrice = parseFloat(priceText)

  const vehicle = useMemo(() => {
    if (isCustom) {
      const e = parseFloat(customEff)
      return e > 0 ? customVehicle(customPower, e) : null
    }
    const o = parseFloat(effOverride)
    return baseVehicle && o > 0 ? { ...baseVehicle, city: o, highway: o } : baseVehicle
  }, [isCustom, customEff, customPower, baseVehicle, effOverride])

  const tripTime = useMemo(
    () => (timeMode === 'now' ? nowIn(country.timeZone) : (fromLocalInput(later) ?? nowIn(country.timeZone))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeMode, later, country.timeZone, tick],
  )

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ country: countryCode, vehicleId, customEff, customPower, prices, fuelId: fuelPick } satisfies Saved),
      )
    } catch {
      /* storage unavailable */
    }
  }, [countryCode, vehicleId, customEff, customPower, prices, fuelPick])

  // Google's traffic-aware routing can predict a future departure; OSM ignores time.
  const departureKey = PROVIDER === 'google' && timeMode === 'later' ? later : ''
  const [departure, setDeparture] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setDeparture(departureKey), 600)
    return () => clearTimeout(id)
  }, [departureKey])

  // Route
  useEffect(() => {
    setRoute(null)
    setRouteError('')
    setQuotes({})
    if (!from || !to) return
    const ctrl = new AbortController()
    setLoading(true)
    const t = departure ? fromLocalInput(departure) : null
    const at = t ? toInstant(t, country.timeZone) : undefined
    getRoute(from, to, at && at.getTime() > Date.now() + 60_000 ? at : undefined, ctrl.signal)
      .then(setRoute)
      .catch((e) => !ctrl.signal.aborted && setRouteError(e.message))
      .finally(() => !ctrl.signal.aborted && setLoading(false))
    return () => ctrl.abort()
  }, [from, to, departure, country.timeZone])

  // Weather at the destination for the trip hour
  const wKey = hourKey(tripTime)
  useEffect(() => {
    if (!to) return setWeather(null)
    let live = true
    getWeather(to.lat, to.lon, wKey).then((w) => live && setWeather(w))
    return () => {
      live = false
    }
  }, [to, wKey])

  const result = useMemo(() => {
    if (!route || !from || !to || !vehicle || !fuel || !(fuelPrice > 0)) return null
    const conditions = getConditions(country, tripTime, weather, route, !departure)
    const drive = estimateDrive({
      vehicle,
      fuelPrice,
      unit: fuel.unit,
      route,
      conditions,
      wearPerKm: country.wearPerKm[vehicle.body] ?? 0,
      includeWear,
      roundTrip,
    })
    const rides = estimateRides(country, route, conditions, roundTrip, from, to)
    return { conditions, drive, rides }
  }, [route, from, to, vehicle, fuel, fuelPrice, country, tripTime, weather, includeWear, roundTrip, departure])

  const missing = !from || !to ? 'route' : !vehicle ? 'vehicle' : !(fuelPrice > 0) ? 'fuel' : null

  return (
    <div className="app">
      <LiquidBackdrop />
      <ThemeToggle />

      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="28" height="28" />
          <span>Drive or Ride</span>
        </div>
        <GlassSelect
          className="country glass"
          ariaLabel="Country"
          align="right"
          value={countryCode}
          display={
            <>
              <span aria-hidden>{country.flag}</span> {country.name} · {symbol(country.currency)}
            </>
          }
          options={COUNTRIES.map((c) => ({ value: c.code, icon: c.flag, label: c.name, detail: symbol(c.currency) === c.currency ? c.currency : `${symbol(c.currency)} · ${c.currency}` }))}
          onChange={(code) => {
            if (code === countryCode) return
            setCountryCode(code)
            setFrom(null)
            setTo(null)
            setFuelPick('')
          }}
        />
      </header>

      <main className="layout">
        <section className="intro">
          <h1>
            Drive <span className="or">or</span> ride?
          </h1>
          <p className="lede">
            See what a trip really costs in your own vehicle versus {country.services.length ? country.services.map((s) => s.name).join(' or ') : 'a ride-hailing app'}
            {' '}- with fuel prices, traffic and time of day built in.
          </p>
        </section>

        <form className="panel glass" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="route-fields">
            <legend className="sr-only">Route</legend>
            <PlaceInput label="From" placeholder="Starting point" value={from} onChange={setFrom} country={country} tone="from" allowLocate />
            <button
              type="button"
              className="swap"
              aria-label="Swap start and destination"
              onClick={() => {
                setFrom(to)
                setTo(from)
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
              </svg>
            </button>
            <PlaceInput label="To" placeholder="Destination" value={to} onChange={setTo} country={country} tone="to" />
          </fieldset>

          {!from && !to && country.code === 'LK' && (
            <div className="examples">
              <span>Try</span>
              {EXAMPLES.map((ex) => (
                <button
                  type="button"
                  key={ex.label}
                  className="chip"
                  onClick={() => {
                    setFrom(ex.from)
                    setTo(ex.to)
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          )}

          <VehiclePicker
            value={baseVehicle}
            isCustom={isCustom}
            onChange={(v) => {
              setVehicleId(v === 'custom' ? 'custom' : v.id)
              setEffOverride('')
              setFuelPick('')
            }}
          />

          {isCustom ? (
            <div className="row">
              <div className="segmented" role="radiogroup" aria-label="Power type">
                {(['petrol', 'diesel', 'electric'] as const).map((p) => (
                  <button
                    type="button"
                    key={p}
                    role="radio"
                    aria-checked={customPower === p}
                    className={customPower === p ? 'is-on' : ''}
                    onClick={() => {
                      setCustomPower(p)
                      setFuelPick('')
                    }}
                  >
                    {p[0].toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <label className="field field--compact">
                <span className="field__label">Real-world mileage</span>
                <div className="field__control">
                  <input inputMode="decimal" value={customEff} onChange={(e) => setCustomEff(e.target.value)} placeholder="e.g. 14" />
                  <span className="suffix">{customPower === 'electric' ? 'km/kWh' : 'km/L'}</span>
                </div>
              </label>
            </div>
          ) : (
            baseVehicle && (
              <div className="mileage">
                <span>
                  Typical <b>{baseVehicle.city}</b> city · <b>{baseVehicle.highway}</b> highway {effUnit(baseVehicle)}
                </span>
                <label className="mini-input">
                  <span>Yours</span>
                  <input inputMode="decimal" value={effOverride} onChange={(e) => setEffOverride(e.target.value)} placeholder="-" aria-label={`Your real ${effUnit(baseVehicle)}`} />
                </label>
              </div>
            )
          )}

          <div className="row">
            <div className="field">
              <span className="field__label">{power === 'electric' ? 'Charging' : 'Fuel'}</span>
              <GlassSelect
                className="field__control field__control--select"
                ariaLabel={power === 'electric' ? 'Charging' : 'Fuel'}
                value={fuel?.id ?? ''}
                options={fuels.map((f) => ({ value: f.id, label: f.label, detail: `${money(f.price, country.currency, { exact: true })}/${f.unit}` }))}
                onChange={setFuelPick}
              />
            </div>
            <label className="field">
              <span className="field__label">Price per {fuel?.unit === 'kWh' ? 'kWh' : 'litre'}</span>
              <div className="field__control">
                <span className="prefix">{symbol(country.currency)}</span>
                <input
                  inputMode="decimal"
                  value={priceText}
                  onChange={(e) => setPrices((p) => ({ ...p, [priceKey]: e.target.value }))}
                />
              </div>
            </label>
          </div>
          <p className="caption">
            {prices[priceKey] !== undefined && parseFloat(prices[priceKey]) !== fuel?.price ? (
              <>
                Using your price ·{' '}
                <button type="button" className="link" onClick={() => setPrices(({ [priceKey]: _, ...rest }) => rest)}>
                  Reset to {money(fuel?.price ?? 0, country.currency, { exact: true })}
                </button>
              </>
            ) : (
              <>
                {fuel?.unit === 'kWh' ? 'Approx. tariff' : country.fuelSource} · {country.fuelAsOf}. Edit if it has changed.
              </>
            )}
          </p>

          <div className="row row--time">
            <div className="segmented" role="radiogroup" aria-label="Trip time">
              <button type="button" role="radio" aria-checked={timeMode === 'now'} className={timeMode === 'now' ? 'is-on' : ''} onClick={() => setTimeMode('now')}>
                Leave now
              </button>
              <button type="button" role="radio" aria-checked={timeMode === 'later'} className={timeMode === 'later' ? 'is-on' : ''} onClick={() => setTimeMode('later')}>
                Later
              </button>
            </div>
            {timeMode === 'later' && (
              <input className="datetime" type="datetime-local" value={later} onChange={(e) => setLater(e.target.value)} aria-label="Departure time" />
            )}
          </div>

          <div className="toggles">
            <Toggle checked={roundTrip} onChange={setRoundTrip} label="Return trip" hint="Doubles both sides" />
            <Toggle checked={includeWear} onChange={setIncludeWear} label="Include wear & tear" hint="Tyres, servicing, oil" />
          </div>
        </form>

        <div className="output">
          {routeError && <div className="card glass notice">⚠️ {routeError}</div>}
          {!routeError && missing && !loading && (
            <div className="card glass empty">
              <div className="empty__art" aria-hidden>🚗 <span>vs</span> 🚕</div>
              <p>
                {missing === 'route'
                  ? 'Pick a start and destination to compare.'
                  : missing === 'vehicle'
                    ? 'Enter your vehicle’s mileage to compare.'
                    : 'Enter the current fuel price to compare.'}
              </p>
            </div>
          )}
          {loading && <Skeleton />}
          {result && route && from && to && vehicle && fuel && (
            <Results
              country={country}
              from={from}
              to={to}
              route={route}
              drive={result.drive}
              rides={result.rides}
              conditions={result.conditions}
              quotes={quotes}
              onQuote={(k, v, share) => {
                setQuotes(({ [k]: _, ...rest }) => (v ? { ...rest, [k]: v } : rest))
                if (!v || !share) return
                const ride = result.rides.find((r) => r.key === k)
                contributeQuote({
                  country: country.code,
                  service: ride?.service ?? 'custom',
                  category: ride?.category ?? '',
                  kind: ride?.kind ?? 'car',
                  quote: v,
                  estimate: ride ? { low: ride.low, mid: ride.mid, high: ride.high } : { low: 0, mid: 0, high: 0 },
                  route,
                  from,
                  to,
                  trip: tripTime,
                  rain: !!weather && (weather.rainMm >= 0.3 || weather.code >= 61),
                })
              }}
              vehicleName={isCustom ? `Your vehicle · ${customEff} ${customPower === 'electric' ? 'km/kWh' : 'km/L'}` : baseVehicle ? vehicleLabel(baseVehicle) : ''}
              vehicleIcon={isCustom ? '🚗' : bodyIcon(vehicle.body)}
              fuelLabel={fuel.label}
              fuelPrice={fuelPrice}
              roundTrip={roundTrip}
            />
          )}
        </div>
      </main>

      <Disclaimer country={country} />
    </div>
  )
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="toggle">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden />
    </label>
  )
}

function Skeleton() {
  return (
    <div className="results">
      <div className="card glass skeleton" style={{ height: 180 }} />
      <div className="card glass skeleton" style={{ height: 120 }} />
      <div className="card glass skeleton" style={{ height: 260 }} />
    </div>
  )
}
