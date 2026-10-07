import { useEffect, useId, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
  detail?: string
  icon?: string
}

interface Props {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  /** Which edge the popover lines up with. */
  align?: 'left' | 'right'
  /** What the closed trigger shows; defaults to the selected option's label. */
  display?: React.ReactNode
  className?: string
}

/** A listbox dropdown styled like the rest of the glass UI, replacing the native <select>. */
export function GlassSelect({ value, options, onChange, ariaLabel, align = 'left', display, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value) ?? options[0]

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const close = (refocus = false) => {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }
  const choose = (o: SelectOption) => {
    onChange(o.value)
    close(true)
  }

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        show()
      }
      return
    }
    const last = options.length - 1
    if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, last))
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(last)
    else if (e.key === 'Enter' || e.key === ' ') choose(options[active])
    else if (e.key === 'Escape') close(true)
    else if (e.key === 'Tab') return close()
    else return
    e.preventDefault()
  }

  return (
    <div className={`gselect ${className}`} ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className="gselect__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${ariaLabel}: ${selected?.label}`}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKey}
      >
        <span className="gselect__value">{display ?? selected?.label}</span>
        <svg className="gselect__chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className={`suggest gselect__list gselect__list--${align} glass`} id={listId} role="listbox" aria-label={ariaLabel}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={i === active ? 'is-active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
            >
              <span className="gselect__row">
                {o.icon && <span className="gselect__icon" aria-hidden>{o.icon}</span>}
                <span className="gselect__text">
                  <strong>{o.label}</strong>
                  {o.detail && <span>{o.detail}</span>}
                </span>
                {o.value === value && (
                  <svg className="gselect__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
