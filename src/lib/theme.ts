import { useSyncExternalStore } from 'react'

/**
 * Light/dark theme. `<html data-theme>` is the single source of truth: an inline script in
 * index.html sets it before first paint (saved choice, else light), and
 * everything - CSS, the WebGL glass, the Google map - follows that attribute.
 */
export type Theme = 'light' | 'dark'

const KEY = 'theme'
const root = document.documentElement

export const currentTheme = (): Theme => (root.dataset.theme === 'dark' ? 'dark' : 'light')

function apply(t: Theme) {
  root.dataset.theme = t
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#07090f' : '#eef1f8')
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* storage unavailable - still switch for this visit */
  }
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(() => apply(t))
  else apply(t)
}

export function onThemeChange(cb: () => void) {
  const o = new MutationObserver(cb)
  o.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  return () => o.disconnect()
}

export const useTheme = () => useSyncExternalStore(onThemeChange, currentTheme)
