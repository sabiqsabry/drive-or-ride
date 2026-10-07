/** Open-Meteo forecast (free, keyless). Returns conditions for the trip hour. */
export interface Weather {
  rainMm: number
  code: number
  tempC: number
  label: string
  icon: string
}

const describe = (code: number): [string, string] => {
  if (code >= 95) return ['Thunderstorms', '⛈️']
  if (code >= 80) return ['Rain showers', '🌦️']
  if (code >= 61) return ['Rain', '🌧️']
  if (code >= 51) return ['Drizzle', '🌦️']
  if (code >= 45) return ['Fog', '🌫️']
  if (code >= 2) return ['Cloudy', '☁️']
  return ['Clear', '☀️']
}

/** `localHourKey` is the trip time in the destination time zone, formatted YYYY-MM-DDTHH:00. */
export async function getWeather(lat: number, lon: number, localHourKey: string): Promise<Weather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,weather_code,temperature_2m&timezone=auto&forecast_days=7`
    const res = await fetch(url)
    if (!res.ok) return null
    const { hourly } = await res.json()
    const i = (hourly.time as string[]).indexOf(localHourKey)
    if (i < 0) return null
    const code = hourly.weather_code[i] as number
    const [label, icon] = describe(code)
    return { rainMm: hourly.precipitation[i], code, tempC: hourly.temperature_2m[i], label, icon }
  } catch {
    return null
  }
}
