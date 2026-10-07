import { useMemo } from 'react'

/** A stylised, tile-free outline of the route path. */
export function RouteSketch({ coords }: { coords: [number, number][] }) {
  const { d, start, end } = useMemo(() => {
    const lat0 = coords.reduce((s, c) => s + c[1], 0) / coords.length
    const k = Math.cos((lat0 * Math.PI) / 180)
    const pts = coords.map(([lon, lat]) => [lon * k, -lat])
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const W = 320
    const H = 140
    const pad = 16
    const scale = Math.min((W - pad * 2) / (maxX - minX || 1), (H - pad * 2) / (maxY - minY || 1))
    const ox = (W - (maxX - minX) * scale) / 2
    const oy = (H - (maxY - minY) * scale) / 2
    const proj = pts.map(([x, y]) => [ox + (x - minX) * scale, oy + (y - minY) * scale])
    return {
      d: proj.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
      start: proj[0],
      end: proj[proj.length - 1],
    }
  }, [coords])

  return (
    <svg className="sketch" viewBox="0 0 320 140" role="img" aria-label="Route outline">
      <defs>
        <linearGradient id="routeGrad" x1="0" x2="1">
          <stop offset="0" stopColor="var(--from)" />
          <stop offset="1" stopColor="var(--to)" />
        </linearGradient>
      </defs>
      <path d={d} className="sketch__shadow" pathLength={1} />
      <path key={d} d={d} className="sketch__line" stroke="url(#routeGrad)" pathLength={1} />
      <circle cx={start[0]} cy={start[1]} r="5.5" className="sketch__from" />
      <circle cx={end[0]} cy={end[1]} r="5.5" className="sketch__to" />
    </svg>
  )
}
