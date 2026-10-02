# Chicago Smart Streets Pilot

Open, reproducible analysis of Chicago Smart Streets pilot warnings, citations, listed fines, corridors, wards, and frontage-street geography through September 12, 2026, with a separate conventional parking-ticket history for 2022–June 2026.

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
- Python 3.12+ and `openpyxl` only when converting new XLSX workbooks. Ordinary data/geocoding builds need only Node.js and the committed sources.

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

- `FOIA_Cannon_A52020_20260915.xlsx` and its normalized CSV
- `_P197426_Illegal_Parking.xlsx` and its normalized CSV
- `smartstreetslocdecoder-frontage.csv` and `illegal-parking-locations.csv`
- `chicago-street-centerlines.json.gz`, `census-geocoding-cache.json`, and `county-geocoding-fallback.json`
- `county-fallback-evidence.zip` with scoped API responses and review outputs
- `foia-reconciliation.json`, `geocoding-audit.json`, and review queues
- `smartstreetszones.geojson`

See [source notes](packages/data/source/SOURCE-NOTES.md) for reconciliation findings, checksums, precision, and comparison limits. The April CSV and decoder remain for historical inspection; `previous/` contains the July snapshot used for reconciliation.

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

The default `generatedAt` timestamp is pinned to this October 2, 2026 refresh so repeated builds are stable. Set `SMART_STREETS_GENERATED_AT` if you intentionally refresh the source snapshot.

Rebuild the frontage lookup with `npm run geocode:data`. This uses pinned city geometry, Census responses, and an accepted county fallback cache without network calls or API keys. County data is considered only after city and Census methods fail; it never replaces a successful first-method match. See [county fallback findings](COUNTY-GEOCODING.md). `npm run test:data` verifies matching edge cases, every point's frontage segment, and aggregate totals. See the source notes for intentional reference-data refresh options.

To normalize a new delivery, install `openpyxl` in a local Python environment, then use:

```bash
python3 packages/data/scripts/prepare-smart-streets-foia.py \
  --smart-streets /path/to/FOIA_Cannon_A52020_20260915.xlsx \
  --illegal-parking /path/to/_P197426_Illegal_Parking.xlsx \
  --previous packages/data/source/previous/FOIA_Cannon_A52020_20260702.csv \
  --output-dir /path/to/new-snapshot
```

The XLSX files are copied unchanged. Review reconciliation and geocoding exceptions before replacing committed inputs. Both build scripts currently name this delivery explicitly; update those filenames when accepting a future delivery.

## Build For Deployment

```bash
npm run build
```

The static site is emitted to `apps/web/dist/`.

## Data Notes

- Violations are from a Chicago Department of Finance FOIA export obtained by Alex Cannon.
- Listed fines sum the FOIA `Fine Level 1` values; they do not measure payment, collection, or adjudication outcomes.
- Ticket points are estimated on their named frontage streets using city address ranges, with validated cached Census matches for gaps and county address/parcel frontage projections only for remaining failures. Unresolved records stay in totals and charts. Zone polygons were supplied by Alex Cannon.
- Conventional tickets are citywide and have masked block locations; they remain separate from Smart Streets totals. Their reporting period and broader bus/taxi/carriage category prevent equivalent-exposure or causal comparisons.
- Issued dates are treated as Chicago local wall time because the source CSV does not include timezone offsets.
- The analysis is provided as-is for informational and reproducibility purposes.
