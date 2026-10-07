import { useEffect, useRef, useState } from 'react'
import { GOOGLE_MAP_ID, loadGoogle } from '../lib/geo/google'
import { useTheme } from '../lib/theme'

const pin = (kind: 'from' | 'to') => {
  const el = document.createElement('div')
  el.className = `map-pin map-pin--${kind}`
  return el
}

/** Route drawn on a real Google map (required by Google's terms for Routes data). */
export function GoogleRouteMap({ coords }: { coords: [number, number][] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const theme = useTheme()

  useEffect(() => {
    let disposed = false
    const cleanup: (() => void)[] = []
    ;(async () => {
      try {
        const [{ Map, Polyline }, { AdvancedMarkerElement }, core] = await Promise.all([
          loadGoogle('maps'),
          loadGoogle('marker'),
          loadGoogle('core'),
        ])
        if (disposed || !ref.current) return
        const path = coords.map(([lng, lat]) => ({ lat, lng }))
        const map = new Map(ref.current, {
          mapId: GOOGLE_MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          // Colour scheme is fixed at creation, so the map is rebuilt when the theme changes.
          colorScheme: theme === 'dark' ? 'DARK' : 'LIGHT',
          clickableIcons: false,
        })
        const bounds = new core.LatLngBounds()
        path.forEach((p) => bounds.extend(p))
        map.fitBounds(bounds, 36)

        const halo = new Polyline({ path, map, strokeColor: '#ffffff', strokeOpacity: 0.9, strokeWeight: 9 })
        const line = new Polyline({ path, map, strokeColor: '#0a84ff', strokeOpacity: 1, strokeWeight: 5 })
        const a = new AdvancedMarkerElement({ map, position: path[0], content: pin('from') })
        const b = new AdvancedMarkerElement({ map, position: path[path.length - 1], content: pin('to') })
        cleanup.push(() => {
          halo.setMap(null)
          line.setMap(null)
          a.map = null
          b.map = null
        })
      } catch {
        if (!disposed) setFailed(true)
      }
    })()
    return () => {
      disposed = true
      cleanup.forEach((f) => f())
    }
  }, [coords, theme])

  if (failed) return <p className="fineprint">Map couldn’t load - check the Maps JavaScript API is enabled for your key.</p>
  return <div key={theme} ref={ref} className="gmap" role="img" aria-label="Route map" />
}
