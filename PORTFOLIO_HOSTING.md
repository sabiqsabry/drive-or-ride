# Hosting "Drive or Ride?" on sabiq.dev

Instructions for an AI coding agent (or a person) working in **Sabiq Sabry's portfolio repo** who has
been asked to host this app on **sabiq.dev**. Read the whole file before changing anything.

## What this is

**Drive or Ride?** is a small web app by **Sabiq Sabry (brand: novusian, portfolio: https://sabiq.dev)**.
A user enters a start, a destination and their vehicle. The app compares the fuel cost of driving
against estimated PickMe / Uber fares (tuk, bike, car), adjusted for live traffic, time of day and
weather. Sri Lanka is the main market; a few other countries work with user-entered fares.

- Source: https://github.com/sabiqsabry/drive-or-ride (open source, MIT). On Sabiq's Mac it is also at
  `~/Desktop/Coding/Projects/Petrol Figurator`
- Stack: Vite + React 19 + TypeScript. Static site, no backend server.
- Build output: `dist/` (plain HTML/CSS/JS)
- Full technical notes: `README.md` in the repo

## Build commands

```bash
git clone https://github.com/sabiqsabry/drive-or-ride.git && cd drive-or-ride
npm install
npm run build                          # served from the domain root  -> dist/
BASE_PATH=/drive-or-ride/ npm run build  # served from a sub-path       -> dist/
npm run preview                        # check the production build at http://localhost:4173
```

`BASE_PATH` must match the URL path the app is served from, including the leading and trailing slashes.

## Environment variables (needed at build time)

They live in `.env.local` (git-ignored, so not in the GitHub repo; **never commit it**). Copy it from the
folder on Sabiq's Mac, or recreate it from `.env.example`.
Copy the same values into the hosting provider's environment settings if it builds the app itself.

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Places search, Routes (live traffic), map, and quote storage |
| `VITE_GCP_PROJECT_ID` | `driveorride-510823`, the Firestore project for anonymous quotes |
| `VITE_GOOGLE_MAP_ID` | Optional custom map style; leave empty |

The API key is visible in the browser **by design** (Google Maps browser keys always are). It is
protected by restrictions, not secrecy: it only works on the domains listed below and only for
Maps JavaScript, Places, Routes and Firestore. Without a key, the app falls back to free
OpenStreetMap services and quote sharing is turned off.

## Pick a hosting option

First inspect the portfolio repo: its framework, how it's deployed (Vercel, Netlify, Cloudflare
Pages, GitHub Pages…) and where static files go. Then choose:

### Option A: subdomain, e.g. `drive.sabiq.dev` (recommended)

Simplest and independent of the portfolio's framework.

1. Deploy the repo as its own static site on the same host the portfolio uses
   (Vercel: import `sabiqsabry/drive-or-ride` from GitHub, or `npx vercel --prod` from the folder; framework "Vite", build `npm run build`, output `dist`).
2. Add the three env vars in the host's project settings.
3. Add the custom domain `drive.sabiq.dev` in the host and create the DNS record it asks for.
4. Link to it from the portfolio's projects section.

### Option B: sub-path, e.g. `sabiq.dev/drive-or-ride/`

1. Build with `BASE_PATH=/drive-or-ride/ npm run build`.
2. Copy everything in `dist/` into the portfolio's static folder under `drive-or-ride/`
   (Next.js / Vite / Astro: `public/drive-or-ride/`).
3. Make `/drive-or-ride/` serve `drive-or-ride/index.html`. Some frameworks don't do this
   automatically. For example, in Next.js add a rewrite in `next.config`:
   `{ source: '/drive-or-ride', destination: '/drive-or-ride/index.html' }`, plus the same for
   `'/drive-or-ride/'`. The app has a single page, so no other routes are needed.
4. These are build artefacts: when the app changes, rebuild and re-copy. Consider a small script in
   the portfolio (e.g. `scripts/sync-drive-or-ride.sh`) that does both.

## Google Cloud settings (already done)

- Project: **DriveOrRide** (`driveorride-510823`), under Sabiq's personal Google account
- APIs enabled: Maps JavaScript, Places (New), Routes, Firestore
- API key "Drive or Ride web" allows: `http://localhost:5173/*`, `http://127.0.0.1:5173/*`,
  `http://localhost:4173/*`, `https://sabiq.dev/*`, `https://www.sabiq.dev/*`, `https://*.sabiq.dev/*`

If the app is served from **any other domain** (e.g. a `*.vercel.app` preview URL), add it to the
key or search and maps will fail with a referrer error. Note that `update` replaces both lists, so
pass every existing value again:

```bash
gcloud services api-keys update \
  projects/784378833135/locations/global/keys/64b3ac49-4eec-448d-b8f8-869564d8b9c3 \
  --project=driveorride-510823 \
  --allowed-referrers="http://localhost:5173/*,http://127.0.0.1:5173/*,http://localhost:4173/*,https://sabiq.dev/*,https://www.sabiq.dev/*,https://*.sabiq.dev/*,https://NEW-DOMAIN/*" \
  --api-target=service=maps-backend.googleapis.com --api-target=service=places.googleapis.com \
  --api-target=service=routes.googleapis.com --api-target=service=firestore.googleapis.com
```

⚠️ **Billing:** as of 7 Oct 2026 the project had no billing account attached (the only one was
closed). Google currently answers anyway, but may stop at any time. Remind Sabiq to attach billing
in Cloud Console → Billing before sharing the link widely. Usage should stay inside the free tier.

## Anonymous quote data

When a user enters a real fare under "Got a quote?" and leaves "Share anonymously" ticked, one
document is added to the Firestore collection **`quotes`** (region `asia-south1`). It contains the
price, ride type, estimate, distance, duration, hour, weekday, rain and traffic, and start/end
rounded to about 1 km. There are no names, place names or device ids.

- Security rules: `firestore.rules` in the source folder. The public can only *create* valid
  documents; nobody can read, edit or delete them from a browser.
- To view the data: Cloud Console → Firestore → `quotes`, or
  `curl -H "Authorization: Bearer $(gcloud auth print-access-token)" "https://firestore.googleapis.com/v1/projects/driveorride-510823/databases/(default)/documents/quotes"`
- If the rules ever need changing, update `firestore.rules` and redeploy them through the Firebase
  Rules API (see `README.md`).

## Checklist after deploying

1. The page loads at the final URL with the Drive or Ride logo (no broken favicon or 404s).
2. Typing "Liberty Plaza" in **From** shows Google suggestions with "Powered by Google".
3. Picking two places shows a verdict, a Google map with the route, and the cost list in the order
   Tuks → Bikes → Cars.
4. The theme button (bottom right) switches light/dark; light is the default.
5. "Got a quote?" → enter a price → "Use" shows "Shared anonymously, thank you!".
   Check the browser console for errors. (Delete that test document from Firestore afterwards.)
6. The footer shows the Disclaimer and "Built by Sabiq Sabry · novusian".

## Please don't

- Commit `.env.local` or paste the API key into the portfolio repo's source.
- Remove or shorten the Disclaimer. It is there on purpose.
- Scrape PickMe or Uber for prices. Neither offers a public fare API, and their terms forbid it.
  Fares are modelled and clearly labelled as estimates.

## Suggested portfolio card

- **Title:** Drive or Ride?
- **One-liner:** Is it cheaper to drive there yourself or take PickMe / Uber? Fuel, live traffic and
  ride fares compared for Sri Lanka.
- **Tags:** React, TypeScript, Vite, WebGL, Google Maps Platform, Firestore
- **Highlights:** Liquid Glass UI rendered in a custom WebGL shader; traffic-aware routing; fare
  model calibrated from real trips and improved by anonymous user quotes.
