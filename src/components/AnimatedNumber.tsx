import { useEffect, useRef, useState } from 'react'

/** Tweens between values with an ease-out curve, like iOS number tickers. */
export function AnimatedNumber({ value, format, duration = 700 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    const start = performance.now()
    const a = from.current
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = value
      setShown(value)
      return
    }
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      const v = a + (value - a) * eased
      from.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{format(shown)}</>
}
