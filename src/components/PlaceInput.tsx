import { useEffect, useId, useRef, useState } from 'react'
import { PROVIDER, newSession, reverseGeocode, searchPlaces } from '../lib/geo'
import type { Place, PlaceSuggestion } from '../types'

interface Props {
  label: string
  placeholder: string
  value: Place | null
  onChange: (p: Place | null) => void
  country: { code: string; center: [number, number] }
  tone: 'from' | 'to'
  allowLocate?: boolean
}

export function PlaceInput({ label, placeholder, value, onChange, country, tone, allowLocate }: Props) {
  const [text, setText] = useState(value?.name ?? '')
  const [results, setResults] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [locating, setLocating] = useState(false)
  const listId = useId()
  const typed = useRef(false)
  const session = useRef(newSession())

  // Sync from outside (swap, geolocation, restore) without wiping what the user is typing.
  useEffect(() => {
    if (value || !typed.current) setText(value?.name ?? '')
  }, [value])

  useEffect(() => {
    if (!typed.current) return
    const q = text.trim()
    if (q.length < 2) {
      setResults([])
      setStatus('')
      setBusy(false)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setBusy(true)
      try {
        await searchPlaces(q, country, session.current, ctrl.signal, (r) => {
          if (ctrl.signal.aborted) return
          setResults(r)
          setStatus(r.length ? '' : 'No matching places')
          setActive(0)
          setOpen(true)
        })
      } catch (e) {
        if (ctrl.signal.aborted) return
        setResults([])
        setStatus((e as Error).message)
        setOpen(true)
      } finally {
        if (!ctrl.signal.aborted) setBusy(false)
      }
    }, 280)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [text, country])

  const pick = (p: Place) => {
    typed.current = false
    onChange(p)
    setOpen(false)
    setResults([])
  }

  const choose = async (s: PlaceSuggestion) => {
    typed.current = false // filling in the chosen name must not trigger another search
    setText(s.name)
    setOpen(false)
    setBusy(true)
    try {
      pick(await s.resolve())
    } catch (e) {
      setStatus((e as Error).message)
      setOpen(true)
    } finally {
      setBusy(false)
    }
  }

  const locate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        pick(await reverseGeocode(pos.coords.latitude, pos.coords.longitude))
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') setActive((a) => (a + 1) % results.length)
    else if (e.key === 'ArrowUp') setActive((a) => (a - 1 + results.length) % results.length)
    else if (e.key === 'Enter') choose(results[active])
    else if (e.key === 'Escape') setOpen(false)
    else return
    e.preventDefault()
  }

  return (
    <div className={`place place--${tone}`}>
      <span className="place__dot" aria-hidden />
      <label className="place__field">
        <span className="place__label">{label}</span>
        <input
          className="place__input"
          value={text}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            typed.current = true
            setText(e.target.value)
            if (value) onChange(null)
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
        />
      </label>
      {busy && <span className="spinner" aria-label="Searching" />}
      {allowLocate && !busy && (
        <button type="button" className="icon-btn" onClick={locate} aria-label="Use my location" title="Use my location">
          {locating ? (
            <span className="spinner" />
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M21.7 2.3a1 1 0 0 0-1.06-.22l-18 7a1 1 0 0 0 .1 1.9l7.6 2.07 2.07 7.6a1 1 0 0 0 1.9.1l7-18a1 1 0 0 0-.21-1.06Z" />
            </svg>
          )}
        </button>
      )}
      {open && !results.length && status && <p className="suggest suggest--status glass">{status}</p>}
      {open && results.length > 0 && (
        <ul className="suggest glass" id={listId} role="listbox">
          {results.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(r)
              }}
            >
              <strong>{r.name}</strong>
              {r.detail && <span>{r.detail}</span>}
            </li>
          ))}
          {/* Google's terms require attribution when Places results are shown without a Google map. */}
          {PROVIDER === 'google' && (
            <li role="presentation" className="suggest__attrib">
              Powered by <b>Google</b>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
