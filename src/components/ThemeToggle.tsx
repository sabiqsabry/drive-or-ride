import { setTheme, useTheme } from '../lib/theme'

export function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="theme-toggle glass"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {theme === 'dark' ? (
          // Sun: tap to go light
          <g key="sun" className="theme-toggle__icon">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
          </g>
        ) : (
          // Moon: tap to go dark
          <g key="moon" className="theme-toggle__icon">
            <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
          </g>
        )}
      </svg>
    </button>
  )
}
