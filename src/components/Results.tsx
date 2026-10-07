import { useRef, useState } from 'react'
import { CONTRIBUTIONS_ENABLED } from '../lib/contribute'
import type { Conditions, DriveEstimate, RideEstimate } from '../lib/estimate'
import { duration, km, money, symbol } from '../lib/format'
import type { Country, Place, RideKind, Route } from '../types'
import { AnimatedNumber } from './AnimatedNumber'
import { GoogleRouteMap } from './GoogleRouteMap'
import { RouteSketch } from './RouteSketch'

const KIND_ICON: Record<RideKind, string> = { bike: '🏍️', tuk: '🛺', car: '🚕', xl: '🚐' }

/** Listed in the order most people would book: tuk, bike, car, then larger vehicles. */
const GROUPS: { kind: RideKind; label: string }[] = [
  { kind: 'tuk', label: 'Tuks' },
  { kind: 'bike', label: 'Bikes' },
  { kind: 'car', label: 'Cars' },
  { kind: 'xl', label: 'Larger cars' },
]

interface Props {
  country: Country
  from: Place
  to: Place
  route: Route
  drive: DriveEstimate
  rides: RideEstimate[]
  conditions: Conditions
  quotes: Record<string, number>
  /** `share` = the user agreed to contribute this quote anonymously. */
  onQuote: (key: string, value: number | null, share?: boolean) => void
  vehicleName: string
  vehicleIcon: string
  fuelLabel: string
  fuelPrice: number
  roundTrip: boolean
}

/** A ride with the user's own quote (if any) applied. */
const effective = (r: RideEstimate, quotes: Record<string, number>) => {
  const q = quotes[r.key]
  return q ? { ...r, low: q, mid: q, high: q, quoted: true } : { ...r, quoted: false }
}

export function Results(p: Props) {
  const { country, drive, conditions } = p
  const cur = country.currency
  const fmt = (n: number) => money(n, cur)
  const rides = p.rides.map((r) => effective(r, p.quotes))
  const custom = p.quotes['custom']
  if (custom) {
    rides.push({
      key: 'custom', service: 'Ride-hailing', serviceId: 'custom', color: '#a78bfa', category: '', kind: 'car',
      low: custom, mid: custom, high: custom, appUrl: '', quoted: true,
    })
  }

  // The headline compares driving with what most people actually book: the cheapest tuk and the cheapest car.
  const cheapest = (kinds: RideKind[]) =>
    rides.filter((r) => kinds.includes(r.kind)).reduce<(typeof rides)[number] | undefined>((a, r) => (!a || r.mid < a.mid ? r : a), undefined)
  const tuk = cheapest(['tuk'])
  const car = cheapest(['car', 'xl'])
  const compare = [
    ...(tuk ? [{ ...tuk, noun: 'a tuk' }] : []),
    ...(car ? [{ ...car, noun: car.serviceId === 'custom' ? 'your ride quote' : 'a car' }] : []),
  ]
  const bike = cheapest(['bike'])
  const max = Math.max(drive.total, ...rides.map((r) => r.high))

  return (
    <section className="results" aria-live="polite">
      <Verdict drive={drive.total} rides={compare} bike={bike} fmt={fmt} vehicleIcon={p.vehicleIcon} />

      <div className="card glass trip rise" style={{ '--d': '60ms' } as React.CSSProperties}>
        <div className="trip__head">
          <div>
            <p className="eyebrow">Your trip{p.roundTrip ? ' · return' : ''}</p>
            <h2 className="trip__title">
              {p.from.name} <span className="arrow">→</span> {p.to.name}
            </h2>
            <p className="trip__meta">
              <span>{km(p.route.distanceKm)}</span>
              <span>~{duration(p.route.durationMin * conditions.traffic)} drive</span>
              <span>{conditions.label}</span>
            </p>
          </div>
        </div>
        {p.route.provider === 'google' ? <GoogleRouteMap coords={p.route.coords} /> : <RouteSketch coords={p.route.coords} />}
      </div>

      <div className="card glass rise" style={{ '--d': '120ms' } as React.CSSProperties}>
        <div className="card__head">
          <h3>Cost comparison</h3>
          <span className="pill">{conditions.label}</span>
        </div>

        <ul className="bars">
          <li className="bar bar--drive">
            <div className="bar__label">
              <span className="bar__icon">{p.vehicleIcon}</span>
              <div>
                <strong>Drive yourself</strong>
                <small>{p.vehicleName}</small>
              </div>
            </div>
            <div className="bar__value">
              <strong><AnimatedNumber value={drive.total} format={fmt} /></strong>
              <small>{drive.wearCost ? 'fuel + wear' : 'fuel only'}</small>
            </div>
            <Track low={drive.total} high={drive.total} max={max} color="var(--accent)" />
          </li>
        </ul>

        {GROUPS.map((g) => {
          const list = rides.filter((r) => r.kind === g.kind)
          return (
            list.length > 0 && (
              <div key={g.kind}>
                <p className="group-label">{g.label}</p>
                <ul className="bars">
                  {list.map((r) => (
                    <RideRow key={r.key} r={r} max={max} drive={drive.total} fmt={fmt} onQuote={p.onQuote} currency={cur} />
                  ))}
                </ul>
              </div>
            )
          )
        })}

        {country.services.length === 0 && (
          <CustomQuote currency={cur} value={custom} onQuote={(v, share) => p.onQuote('custom', v, share)} />
        )}
      </div>

      <div className="grid-2">
        <div className="card glass rise" style={{ '--d': '180ms' } as React.CSSProperties}>
          <div className="card__head"><h3>What affects the fare</h3></div>
          <ul className="factors">
            {conditions.factors.map((f) => (
              <li key={f.label} className={`factor factor--${f.tone}`}>
                <span className="factor__icon">{f.icon}</span>
                <div>
                  <strong>{f.label}</strong>
                  <small>{f.detail}</small>
                </div>
              </li>
            ))}
          </ul>
          {country.services.length > 0 && (
            <p className="fineprint">
              Demand multiplier for this time: ×{conditions.surge[0].toFixed(2)}-{conditions.surge[1].toFixed(2)}. Live surge
              can go higher - open the app to confirm.
            </p>
          )}
        </div>

        <div className="card glass rise" style={{ '--d': '240ms' } as React.CSSProperties}>
          <div className="card__head"><h3>How we got {fmt(drive.total)}</h3></div>
          <dl className="math">
            <div><dt>Distance{p.roundTrip ? ' (both ways)' : ''}</dt><dd>{km(p.route.distanceKm * (p.roundTrip ? 2 : 1))}</dd></div>
            <div>
              <dt>Expected efficiency</dt>
              <dd>{drive.efficiency.toFixed(1)} km/{drive.unit}</dd>
            </div>
            <div><dt>{drive.unit === 'L' ? 'Fuel used' : 'Energy used'}</dt><dd>{drive.units.toFixed(drive.units < 10 ? 2 : 1)} {drive.unit}</dd></div>
            <div><dt>{p.fuelLabel}</dt><dd>{money(p.fuelPrice, cur, { exact: true })}/{drive.unit}</dd></div>
            <div><dt>Fuel cost</dt><dd>{money(drive.fuelCost, cur, { exact: true })}</dd></div>
            {drive.wearCost > 0 && <div><dt>Wear &amp; servicing</dt><dd>{money(drive.wearCost, cur, { exact: true })}</dd></div>}
          </dl>
          <p className="fineprint">
            Efficiency blends city and highway figures by average speed ({Math.round(drive.avgSpeed)} km/h) and adjusts for
            congestion. Parking, tolls and depreciation aren’t included.
          </p>
        </div>
      </div>

      {country.tariffNote && <p className="disclaimer">ℹ️ {country.tariffNote} Tap “Got a quote?” to replace any estimate with the real price from the app.</p>}
    </section>
  )
}

function Verdict({ drive, rides, bike, fmt, vehicleIcon }: {
  drive: number
  /** Cheapest tuk then cheapest car, each with a plain-English noun ("a tuk"). */
  rides: { service: string; category: string; mid: number; noun: string }[]
  bike?: { service: string; category: string; mid: number }
  fmt: (n: number) => string
  vehicleIcon: string
}) {
  if (!rides.length) {
    return (
      <div className="verdict glass rise">
        <p className="eyebrow">Driving will cost about</p>
        <p className="verdict__big"><AnimatedNumber value={drive} format={fmt} /></p>
        <p className="verdict__sub">Ride-hailing fares aren’t calibrated for this country yet - add a quote from your app below to compare.</p>
      </div>
    )
  }
  const diffs = rides.map((r) => r.mid - drive)
  const lo = Math.min(...diffs)
  const hi = Math.max(...diffs)
  const pct = (d: number, r: number) => Math.round((Math.abs(d) / r) * 100)
  const range = (a: number, b: number) => (Math.abs(b - a) < Math.max(20, drive * 0.03) ? fmt(b) : `${fmt(a)} - ${fmt(b)}`)
  const vs = (r: (typeof rides)[number]) => `${pct(r.mid - drive, r.mid)}% cheaper than ${r.noun} (~${fmt(r.mid)})`

  let tone: 'drive' | 'ride' | 'close'
  let headline: React.ReactNode
  let sub: string
  if (lo > drive * 0.1) {
    tone = 'drive'
    headline = <>Driving could save you <span className="nowrap">{range(lo, hi)}</span></>
    sub = `That’s about ${rides.map(vs).join(' and ')}.`
  } else if (hi < -drive * 0.1) {
    tone = 'ride'
    const best = rides.reduce((a, b) => (a.mid < b.mid ? a : b))
    headline = <>Taking {best.service} {best.category} is cheaper by <span className="nowrap">{fmt(drive - best.mid)}</span></>
    sub = `Your vehicle uses more fuel than a ride costs here - ${pct(drive - best.mid, drive)}% less than driving.`
  } else {
    tone = 'close'
    headline = <>It’s close - within <span className="nowrap">{fmt(Math.max(Math.abs(lo), Math.abs(hi)))}</span></>
    sub = 'Driving and riding cost about the same here. Convenience and parking might decide it.'
  }

  return (
    <div className={`verdict verdict--${tone} glass rise`}>
      <div className="verdict__icons" aria-hidden>
        <span>{tone === 'ride' ? '🚕' : vehicleIcon}</span>
      </div>
      <p className="eyebrow">{tone === 'drive' ? 'Verdict · drive' : tone === 'ride' ? 'Verdict · ride' : 'Verdict · toss-up'}</p>
      <h2 className="verdict__big">{headline}</h2>
      <p className="verdict__sub">{sub}</p>
      {tone === 'drive' && bike && bike.mid < drive && (
        <p className="verdict__tip">
          Travelling solo? A {bike.service} {bike.category} (~{fmt(bike.mid)}) beats driving.
        </p>
      )}
    </div>
  )
}

function Track({ low, high, max, color }: { low: number; high: number; max: number; color: string }) {
  return (
    <div className="track" aria-hidden>
      <div className="track__fill" style={{ width: `${(low / max) * 100}%`, background: color }} />
      {high > low && (
        <div
          className="track__range"
          style={{ left: `${(low / max) * 100}%`, width: `${((high - low) / max) * 100}%`, background: color }}
        />
      )}
    </div>
  )
}

function RideRow({ r, max, drive, fmt, onQuote, currency }: {
  r: RideEstimate & { quoted: boolean }
  max: number
  drive: number
  fmt: (n: number) => string
  onQuote: (key: string, v: number | null, share?: boolean) => void
  currency: string
}) {
  const [editing, setEditing] = useState(false)
  const [shared, setShared] = useState(false)
  const diff = r.mid - drive
  const pctVsDrive = Math.round((diff / drive) * 100)
  return (
    <li className="bar">
      <div className="bar__label">
        <span className="bar__icon" style={{ '--brand': r.color } as React.CSSProperties}>{KIND_ICON[r.kind]}</span>
        <div>
          <strong>
            {r.service} {r.category}
            {r.quoted && <em className="tag tag--green">Your quote</em>}
          </strong>
          <small className={diff > 0 ? 'up' : 'down'}>
            {diff > 0 ? '+' : '−'}
            {fmt(Math.abs(diff))} <span className="hide-sm">({diff > 0 ? '+' : ''}{pctVsDrive}%) </span>vs driving
          </small>
        </div>
      </div>
      <div className="bar__value">
        <strong><AnimatedNumber value={r.mid} format={fmt} /></strong>
        {r.quoted ? (
          <>
            {shared && <small className="thanks">Shared anonymously, thank you!</small>}
            <button className="link" onClick={() => onQuote(r.key, null)}>Clear quote</button>
          </>
        ) : (
          <small>{fmt(r.low)} - {fmt(r.high)}</small>
        )}
      </div>
      <Track low={r.low} high={r.high} max={max} color={r.color} />
      {r.serviceId !== 'custom' && !r.quoted && (
        <div className="bar__actions">
          {editing ? (
            <QuoteInput
              currency={currency}
              onDone={(v, share) => {
                if (v) {
                  onQuote(r.key, v, share)
                  setShared(share)
                }
                setEditing(false)
              }}
            />
          ) : (
            <>
              <button className="link" onClick={() => setEditing(true)}>Got a quote?</button>
              <a className="link" href={r.deepLink ?? r.appUrl} target="_blank" rel="noreferrer">
                Check in {r.service} ↗
              </a>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function QuoteInput({ currency, onDone }: { currency: string; onDone: (v: number | null, share: boolean) => void }) {
  const [v, setV] = useState('')
  const [share, setShare] = useState(true)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone(parseFloat(v) || null, CONTRIBUTIONS_ENABLED && share)
  }
  return (
    <form
      className="quote"
      onSubmit={(e) => {
        e.preventDefault()
        finish()
      }}
      // Close when focus leaves the whole box, so ticking the checkbox doesn't submit.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) finish()
      }}
    >
      <div className="quote__row">
        <span>{symbol(currency)}</span>
        <input autoFocus inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="Price shown in app" />
        <button className="btn-mini" type="submit">Use</button>
      </div>
      {CONTRIBUTIONS_ENABLED && (
        <label className="quote__share">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
          Share anonymously to help improve estimates (no names or exact locations)
        </label>
      )}
    </form>
  )
}

function CustomQuote({ currency, value, onQuote }: { currency: string; value?: number; onQuote: (v: number | null, share: boolean) => void }) {
  if (value) return null
  return (
    <div className="custom-quote">
      <p className="group-label">Compare with a ride</p>
      <QuoteInput currency={currency} onDone={onQuote} />
    </div>
  )
}
