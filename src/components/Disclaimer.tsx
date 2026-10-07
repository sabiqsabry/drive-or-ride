import { PROVIDER } from '../lib/geo'
import type { Country } from '../types'

/** Plain-English disclaimers shown at the bottom of every page. */
export function Disclaimer({ country }: { country: Country }) {
  const maps = PROVIDER === 'google' ? 'Google Maps' : 'OpenStreetMap services (Photon and OSRM)'
  const points: [string, React.ReactNode][] = [
    [
      'Ride fares are estimates',
      <>
        PickMe and Uber don’t publish their prices, so the fares shown are modelled from published rates and reported
        trip prices. The real fare in the app can be higher or lower because of surge pricing, promotions, waiting time
        and tolls. Use “Got a quote?” to compare against the exact price from the app.
      </>,
    ],
    [
      'Not affiliated',
      <>
        This site is not affiliated with, endorsed by or sponsored by PickMe or Uber. All names and trademarks belong to
        their respective owners.
      </>,
    ],
    [
      'Fuel prices',
      <>
        Default prices come from the {country.fuelSource} ({country.fuelAsOf}) and may be out of date. Check the current
        price at your fuel station and edit it if it has changed.
      </>,
    ],
    [
      'Your vehicle',
      <>
        Mileage figures are typical real-world averages. Your actual fuel use depends on how you drive, traffic, AC use,
        passengers and luggage, tyre pressure and the condition of your vehicle.
      </>,
    ],
    [
      'What’s not included',
      <>
        The driving cost covers fuel only (plus wear and tear if you switch it on). It does not include parking, tolls,
        insurance, licence fees, depreciation or the value of your time.
      </>,
    ],
    [
      'Routes and traffic',
      <>
        Distances, travel times and traffic come from {maps} and may not reflect road closures, diversions or conditions
        on the day.
      </>,
    ],
    [
      'Your privacy',
      <>
        Places you search for are sent to {maps} to find the route, and your destination to Open-Meteo for the weather.
        Your location is only read if you tap the location button. There are no accounts. If you tick “Share
        anonymously” when entering a quote, the price, ride type, time and a rounded location (to about 1 km) are saved
        to improve the estimates, with no names or personal details. Your settings (country, vehicle, fuel price and
        theme) are saved only in your own browser.
      </>,
    ],
  ]

  return (
    <footer className="footer">
      <section className="disclaimer-card glass" aria-labelledby="disclaimer-title">
        <h2 id="disclaimer-title">Disclaimer</h2>
        <p className="disclaimer-card__lede">
          Drive or Ride is an independent personal project by Sabiq Sabry (novusian) that gives rough estimates to help
          you compare options. It is not a price quote, a booking service or financial advice.
        </p>
        <dl className="disclaimer-card__grid">
          {points.map(([title, body]) => (
            <div key={title}>
              <dt>{title}</dt>
              <dd>{body}</dd>
            </div>
          ))}
        </dl>
        <p className="disclaimer-card__foot">
          Provided “as is”, without any warranty. Always check the official app before relying on these figures.
        </p>
      </section>
      <div className="footer__bottom">
        <p className="footer__brand">
          Built by{' '}
          <a href="https://sabiq.dev" target="_blank" rel="noreferrer">
            Sabiq Sabry
          </a>{' '}
          · novusian · © {new Date().getFullYear()}
        </p>
        <p className="footer__credits">
          {PROVIDER === 'google' ? 'Places, routes and maps by Google Maps' : 'Routes © OpenStreetMap contributors via OSRM · Places by Photon'} ·
          Weather by Open-Meteo
        </p>
      </div>
    </footer>
  )
}
