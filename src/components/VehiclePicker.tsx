import { useId, useMemo, useState } from 'react'
import { VEHICLES, vehicleLabel } from '../data/vehicles'
import type { Vehicle, VehicleBody } from '../types'

const BODY_ICON: Record<VehicleBody, string> = {
  hatch: '🚗',
  sedan: '🚘',
  suv: '🚙',
  van: '🚐',
  pickup: '🛻',
  tuk: '🛺',
  motorcycle: '🏍️',
}

export const bodyIcon = (b: VehicleBody) => BODY_ICON[b]
export const effUnit = (v: Vehicle) => (v.power === 'electric' ? 'km/kWh' : 'km/L')

interface Props {
  value: Vehicle | null
  onChange: (v: Vehicle | 'custom') => void
  isCustom: boolean
}

export function VehiclePicker({ value, onChange, isCustom }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  const matches = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    const list = VEHICLES.filter((v) => {
      const hay = `${vehicleLabel(v)} ${v.engine} ${v.hybrid ? 'hybrid' : ''} ${v.power} ${v.body}`.toLowerCase()
      return terms.every((t) => hay.includes(t))
    })
    return list.slice(0, 40)
  }, [query])

  const options: (Vehicle | 'custom')[] = [...matches, 'custom']

  const choose = (o: Vehicle | 'custom') => {
    onChange(o)
    setQuery('')
    setOpen(false)
  }

  const display = isCustom ? 'My own mileage' : value ? vehicleLabel(value) : ''

  return (
    <div className="vehicle">
      <label className="field">
        <span className="field__label">Vehicle</span>
        <div className="field__control">
          <span className="vehicle__icon" aria-hidden>
            {isCustom ? '⛽' : value ? BODY_ICON[value.body] : '🔍'}
          </span>
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            value={open ? query : display}
            placeholder={open ? 'Search make, model or “hybrid”' : 'e.g. Suzuki Wagon R'}
            onFocus={() => {
              setOpen(true)
              setActive(0)
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, options.length - 1))
              else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
              else if (e.key === 'Enter') choose(options[active])
              else if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
              else return
              e.preventDefault()
            }}
          />
        </div>
      </label>
      {open && (
        <ul className="suggest suggest--tall glass" id={listId} role="listbox">
          {options.map((o, i) =>
            o === 'custom' ? (
              <li
                key="custom"
                role="option"
                aria-selected={i === active}
                className={`suggest__custom ${i === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose('custom')
                }}
              >
                <strong>⛽ Enter my own mileage</strong>
                <span>Not listed? Use your car’s real km/L</span>
              </li>
            ) : (
              <li
                key={o.id}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'is-active' : ''}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(o)
                }}
              >
                <strong>
                  {BODY_ICON[o.body]} {o.make} {o.model}
                  {o.hybrid && <em className="tag tag--green">Hybrid</em>}
                  {o.power === 'electric' && <em className="tag tag--blue">EV</em>}
                  {o.power === 'diesel' && <em className="tag">Diesel</em>}
                </strong>
                <span>
                  {[o.variant, o.engine, `${o.years[0]}-${o.years[1]}`].filter(Boolean).join(' · ')} · ~{o.city} {effUnit(o)} city
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
