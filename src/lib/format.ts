const ZERO_DECIMAL = new Set(['LKR', 'INR', 'JPY', 'PKR', 'BDT', 'IDR', 'VND', 'KRW'])

/** How each currency is written locally; codes without an entry are shown as-is. */
const SYMBOLS: Record<string, string> = { LKR: 'Rs.', INR: '₹', GBP: '£', AUD: 'A$' }
export const symbol = (currency: string) => SYMBOLS[currency] ?? currency
const prefix = (currency: string) => {
  const s = symbol(currency)
  return /[A-Za-z.]$/.test(s) ? `${s} ` : s // "Rs. 1,450", "AED 3.69" - but "₹100", "£1.65"
}

export const decimalsFor = (currency: string) => (ZERO_DECIMAL.has(currency) ? 0 : 2)

/** Estimates are rounded so they don't look more precise than they are. */
export function roundEstimate(value: number, currency: string) {
  if (decimalsFor(currency) === 0) return value >= 200 ? Math.round(value / 10) * 10 : Math.round(value)
  return value >= 20 ? Math.round(value) : Math.round(value * 100) / 100
}

export function money(value: number, currency: string, opts: { exact?: boolean } = {}) {
  const v = opts.exact ? value : roundEstimate(value, currency)
  const decimals = opts.exact || v < 20 ? decimalsFor(currency) : 0
  return `${prefix(currency)}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export const km = (v: number) => `${v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US')} km`

export function duration(min: number) {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim()
}
