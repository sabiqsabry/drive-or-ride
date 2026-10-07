<p align="center"><img src="public/favicon.svg" width="88" height="88" alt="Drive or Ride logo"></p>

# Drive or Ride?

Is it cheaper to drive there yourself, or take PickMe / Uber? Enter a route, your vehicle and the
current fuel price, and see the comparison, adjusted for live traffic, time of day and weather.

Sri Lanka first; the architecture is country-driven so other markets can be added as data.

Built by **[Sabiq Sabry](https://sabiq.dev)** (novusian). Open source under the [MIT licence](LICENSE):
fork it, change it and use it however you like.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
```

No API keys are required: without one the app uses free OpenStreetMap services, and quote sharing
is switched off.

### Google Maps (recommended)

Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_MAPS_API_KEY`, then restart `npm run dev`.
In Google Cloud Console:

1. Create a project and attach a billing account. A card is required, but the free tier covers a portfolio app.
2. Enable **Maps JavaScript API**, **Places API (New)** and **Routes API**.
3. Restrict the key: *Application restrictions* → HTTP referrers (`http://localhost:5173/*`, your
   portfolio domain); *API restrictions* → the three APIs above.
4. Optionally create a Map ID (Map Management) for a custom map style and set `VITE_GOOGLE_MAP_ID`.

With a key, the app uses:
- **Places Autocomplete (New)**, biased to the selected country, with session tokens. Coordinates
  come from Place Details using only the `location` field (Essentials tier).
- **Routes API, `TRAFFIC_AWARE`**: real live traffic for "Leave now", and Google's predicted
  traffic for "Later". This replaces the time-of-day traffic guess.
- **Google route map** in the trip card. Google's terms require Routes/Places data to be shown on
  a Google map rather than a third-party one.

### Anonymous quote sharing (optional)

When someone enters a real fare under "Got a quote?" and leaves "Share anonymously" ticked, the app
saves it to a Firestore collection called `quotes`, so tariffs can be recalibrated from real prices.
It stores the price, ride type, the model's estimate, distance, duration, hour, weekday, rain,
traffic, and start/end rounded to 2 decimal places (about 1 km). There are no names, place names
or device ids. The security rules in [`firestore.rules`](firestore.rules) allow the public to
create well-formed documents only; nothing can be read back from a browser.

To enable it in your own fork:

1. In the same Google Cloud project, enable the **Cloud Firestore API**, then create a Native-mode
   database (e.g. `gcloud firestore databases create --location=asia-south1 --type=firestore-native`).
2. Deploy `firestore.rules` (Firebase CLI: `firebase deploy --only firestore:rules`, or the
   Firebase Rules REST API).
3. Add **Cloud Firestore API** to your key's API restrictions, and set `VITE_GCP_PROJECT_ID` in `.env.local`.

### Free tier

Approximate free monthly allowance per SKU (as of 2026): about 10k Autocomplete requests, 10k Place
Details Essentials and 10k Dynamic Maps loads. Traffic-aware Compute Routes is the Pro SKU, with
about 5k free per month. Set a budget alert in Cloud Billing.

## What's real-time vs estimated

| Input | Source | Live? |
|---|---|---|
| Place search | Google Places (with key), else Photon + Nominatim fallback | ✅ live |
| Route distance & duration | Google Routes with live traffic (with key), else OSRM | ✅ live |
| Weather at destination for the trip hour | Open-Meteo (free, keyless) | ✅ live |
| Fuel prices | Curated defaults per country (LK: CPC revision of 1 Oct 2026), user-editable | ⚠️ manual |
| Vehicle efficiency | Curated real-world dataset (`src/data/vehicles.ts`), user-overridable | ⚠️ curated |
| PickMe / Uber fares | Tariff model × time-of-day demand × weather | ❌ estimate (user can enter the real quote) |
| Traffic | Google live/predicted traffic (with key), else time-of-day profile | ✅ / ❌ |

## Research findings

**Uber.** The Riders API `GET /v1.2/estimates/price` still exists, but it's gated: you need
approval through an Uber business contact. Uber's API terms also explicitly prohibit using it to
compare prices against competitors, so it can't power this app even with access. What we *can* use
legitimately is Uber's universal deep link
(`m.uber.com/ul/?action=setPickup…`), which opens Uber with the route prefilled so the user sees the real price.

**PickMe.** There's no public developer API, SDK, fare endpoint or documented deep link. Their
fares live only inside the app. Scraping or reverse-engineering the app API would breach their
terms, and it would break whenever they change it. The only legitimate path to live prices is a
partnership with PickMe (Digital Mobility Solutions Lanka).

**So fares are modelled.** Each service/category has `base + perKm·km + perMin·min`, with a floor
at `minimum` (`src/data/countries.ts`). The rates are calibrated against published rate history
and recent reported trips (for example, CMB airport → Colombo ≈ LKR 3,000-3,500 by car, and
Fort → Pettah ≈ LKR 500-700). A demand multiplier range is then applied for rush hours, late
night, weekends and rain. The UI always shows a range, labels it an estimate, and lets the user
type the actual quote from the app ("Got a quote?") to get an exact comparison.

**Routing.** OSRM's public server is fine for development but has no SLA and a fair-use policy.
For production, use OpenRouteService (free key, 2k req/day), a self-hosted OSRM with the Sri Lanka
extract (small and cheap to host), or Google Routes / Mapbox if you want live traffic.

**Geocoding.** Photon's public instance is free but sometimes slow (5-7 s observed). Nominatim
responds faster but its policy forbids heavy or autocomplete use. For production, use a keyed
provider (LocationIQ, Mapbox, Google Places) or self-host Photon.

**Vehicle data.** No global API covers Sri Lankan market cars well:
- *fueleconomy.gov* (US EPA): free, excellent, but US-market models only. No Wagon R, Aqua (as sold here), Vezel and so on.
- *CarQuery / NHTSA vPIC*: specs and VIN decoding, but no reliable fuel economy.
- *Commercial (CarAPI, Auto-Data.net licensing, JATO)*: paid, and still built on lab cycles.
- Japanese JC08/WLTC and Indian ARAI ratings are 20-40% optimistic on Sri Lankan roads.

So the app ships a curated table of ~70 vehicles common in Sri Lanka from 2017-2025 (kei cars,
hybrids, sedans, SUVs, diesel pickups and vans, EVs, tuks and motorcycles). Each has real-world
city and highway figures. Users can override with their own km/L, or pick "Enter my own mileage".

**Fuel prices.** There's no free official API. CPC/LIOC publish revisions as press releases
(usually monthly). globalpetrolprices.com has a paid data feed covering about 150 countries.
Options: (a) keep the curated defaults with an "as of" date (current approach); (b) a small
scheduled job that scrapes the CPC announcement and updates `countries.ts`; (c) license the
GlobalPetrolPrices feed for international markets.

## How the driving cost is computed

1. Average speed = route distance ÷ (free-flow duration × traffic factor).
2. Efficiency blends city ↔ highway by average speed (≤25 km/h = city, ≥65 km/h = highway).
3. Stop-and-go penalty: petrol/diesel −up to ~15% in heavy traffic; hybrids and EVs barely affected.
4. Cost = km ÷ efficiency × fuel price (+ optional wear & tear per km by body type).
5. Traffic factors are diluted on long trips, since congestion mostly hits the urban ends.

Parking, tolls and depreciation aren't included.

## Liquid Glass

`src/components/LiquidBackdrop.tsx` adapts the refraction model from
[dashersw/liquid-glass-js](https://github.com/dashersw/liquid-glass-js) (MIT). That library refracts
a one-off html2canvas snapshot of the page per element. Here the background is procedural, so one
full-screen WebGL pass draws it and refracts it under every `.glass` element each frame. The pass
uses a rounded-rect SDF, edge and rim displacement along the surface normal, a tint gradient, a
specular rim and soft shadows. It works with animations and scrolling, and needs no snapshots.
Without WebGL, the CSS `backdrop-filter` glass is used instead.

## Project layout

```
src/
  data/countries.ts   country config: currency, fuels, ride services & tariffs, demand windows
  data/vehicles.ts    curated vehicle efficiency table
  lib/geo/            provider switch: google.ts (Places + Routes), osm.ts (Photon/Nominatim + OSRM)
  lib/weather.ts      Open-Meteo hourly forecast
  lib/estimate.ts     trip time, conditions, drive cost and ride fare models
  lib/contribute.ts   anonymous quote sharing (Firestore REST)
  lib/theme.ts        light/dark theme (light by default)
  components/         UI: pickers, results, Liquid Glass backdrop, disclaimer
firestore.rules       write-only security rules for shared quotes
PORTFOLIO_HOSTING.md  how this is hosted on sabiq.dev
```

Adding a country = one entry in `COUNTRIES` (fuels, currency, time zone, ride services).
Countries without calibrated tariffs still work: the user enters a quote from their app.

## Contributing

Issues and pull requests are welcome, especially for:

- **Better fare data.** If you know current PickMe / Uber rate cards for a city, update
  `src/data/countries.ts` and say where the numbers came from.
- **Vehicles.** Add a row to `src/data/vehicles.ts` with *real-world* city and highway figures
  (road tests or owner averages, not official claims) and a source in the PR description.
- **New countries.** Add an entry to `COUNTRIES` with fuel prices, currency and local ride services.

Please keep fares labelled as estimates and don't add scraping of PickMe, Uber or other apps.

## Next steps

- AI-assisted vehicle lookup: a small serverless endpoint that asks Claude (with web search) for
  real-world km/L of an unlisted model, caches the result and flags it as AI-sourced. Needs an
  Anthropic API key, kept server-side.
- Automated CPC fuel-price updates (scheduled job → JSON).
- Production geocoding and routing providers (see above), plus live traffic (Google/Mapbox).
- Crowd-sourced fare calibration: anonymous "Got a quote?" submissions are already collected
  (see above); the next step is a script that fits per-city tariffs from them.
- Holiday / Poya day demand calendar for Sri Lanka.
