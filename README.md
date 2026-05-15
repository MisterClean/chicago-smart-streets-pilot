# Chicago Smart Streets Pilot

Open, reproducible analysis of Chicago Smart Streets pilot warnings, citations, listed fines, corridors, wards, and infraction geography through April 25, 2026.

This repo isolates the Smart Streets pilot page from the original private website. The raw source files, derived web data, build script, static page, and source-download archive all live in this monorepo.

## Repository Layout

- `apps/web/` - static MapLibre web page.
- `apps/web/public/data/` - derived browser data.
- `apps/web/public/data/source/` - raw source files and the downloadable source archive served by the page.
- `packages/data/source/` - raw source files used by the reproducible data build.
- `packages/data/scripts/build-smart-streets-pilot.js` - build script that regenerates the derived JSON and GeoJSON assets.

## Requirements

- Node.js 24 or newer.
- A Protomaps API key for full basemap tiles. The page still renders the data overlays without a key, but the basemap is intentionally plain.

## Setup

```bash
npm install
```

Edit `apps/web/public/config.js` and set:

```js
window.__CONFIG__ = {
    PROTOMAPS_KEY: "YOUR_PROTOMAPS_KEY",
    SMART_STREETS_SOURCE_ARCHIVE_URL: "data/source/chicago-smart-streets-pilot-source-files.zip",
};
```

## Getting A Protomaps API Key

The hosted Protomaps API requires an API key. Sign up from the [Protomaps API page](https://protomaps.com/api), create a key from the account portal, and configure its allowed CORS origins for the domains where you will host the page. Localhost requests with a valid key are supported for development, according to the Protomaps API docs.

This page uses Protomaps style JSON URLs like:

```text
https://api.protomaps.com/styles/v5/light/en.json?key=YOUR_PROTOMAPS_KEY
```

## Run The Web Page

```bash
npm run dev
```

Vite will print a local URL, usually `http://127.0.0.1:5173/`.

## Rebuild The Data

The raw source inputs are committed in `packages/data/source/`:

- `smartstreetsapril26.csv`
- `smartstreetslocdecoder.csv`
- `smartstreetszones.geojson`

Regenerate the browser assets with:

```bash
npm run build:data
```

That rewrites:

- `apps/web/public/data/chicago-smart-streets-pilot.json`
- `apps/web/public/data/chicago-smart-streets-points.geojson`
- `apps/web/public/data/chicago-smart-streets-zones.geojson`

Ward boundaries are read from `apps/web/public/data/chicago-wards.geojson`, sourced from the City of Chicago Data Portal. To test another ward file:

```bash
SMART_STREETS_WARDS_GEOJSON=/path/to/chicago-wards.geojson npm run build:data
```

The default `generatedAt` timestamp is pinned to the source snapshot date so repeated builds are stable. Set `SMART_STREETS_GENERATED_AT` if you intentionally refresh the source snapshot.

## Build For Deployment

```bash
npm run build
```

The static site is emitted to `apps/web/dist/`.

## Data Notes

- Violations are from a Chicago Department of Finance FOIA export obtained by Alex Cannon.
- Listed fines sum the FOIA `Fine Level 1` values; they do not measure payment, collection, or adjudication outcomes.
- Ticket addresses and Smart Streets zone polygons were geocoded by Alex Cannon.
- Issued dates are treated as Chicago local wall time because the source CSV does not include timezone offsets.
- The analysis is provided as-is for informational and reproducibility purposes.
