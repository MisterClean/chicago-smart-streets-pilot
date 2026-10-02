# Source snapshot: September 2026

This snapshot uses two Chicago Department of Finance FOIA workbooks obtained by Alex Cannon. Original workbooks are preserved without changes. CSVs trim surrounding whitespace, retain ticket identifiers, and format dates without shifting Chicago wall time.

| Source | Records | Issued-date coverage |
| --- | ---: | --- |
| FOIA_Cannon_A52020_20260915.xlsx, Sheet 1 | 130,788 | November 6, 2024–September 12, 2026 |
| _P197426_Illegal_Parking.xlsx, Data | 43,745 | January 1, 2022–June 29, 2026 |

The conventional workbook's Header sheet says accurate as of July 21, 2026. Its scope is bike lanes, bus lanes, and bus/taxi/carriage stands. It supplies no fine amounts. The original notes and SHA-256 hashes of both workbooks are preserved in `foia-reconciliation.json`.

## Changes from the July Smart Streets snapshot

All 104,753 previous ticket IDs remain. There are 26,035 added tickets, including 2,699 issued by the old final timestamp, and 4,735 revised prior tickets. Location fields change for 4,730 prior tickets. Ten prior tickets change violation/fine fields. Listed fines increase from $3,268,640 to $4,215,140. Use the latest snapshot as a replacement, not an append. The July normalized CSV and decoder are retained in `previous/`.

The original April source CSV and decoder remain in the repository for historical inspection. The current default build uses the September snapshot.

Street cleaning is a new fine-bearing category: 54 tickets and $3,240 listed fines. Blank fine values are zero-fine records; listed fines do not measure payments, collections, or adjudication outcomes.

## Free frontage-street geocoding

`chicago-street-centerlines.json.gz` contains 56,338 pinned Chicago street features, downloaded October 2, 2026 from the [city's street dataset](https://data.cityofchicago.org/d/pr57-gg9e). This download date is not a claim that the underlying geometry was updated that day. The snapshot stores only the geometry and fields needed for matching. Its checksum is in `geocoding-audit.json`.

The local geocoder requires the named street and direction, an optional supplied suffix, and a matching address range/parity. It interpolates along the actual geometry. It excludes directional carriageways/ramps, unresolved elevations, unsupported formats, and conflicting candidates. Explicit street-name aliases are in the script; house numbers and directions are never guessed.

`census-geocoding-cache.json` pins 2,854 [Census Geocoder](https://geocoding.geo.census.gov/geocoder/) responses using Public_AR_Current, obtained October 2, 2026. A fallback must match the original number, street, direction and supplied suffix, then project within 35 meters onto the same street and block. Ordinary builds read the cache without requests. References: [Census user guide](https://www2.census.gov/geo/pdfs/maps-data/data/Census_Geocoder_User_Guide.pdf), [city street metadata](https://catalog.data.gov/dataset/transportation-1b2cf).

Smart Streets matches 127,027 records (97.1%) at 14,676 normalized locations: 118,628 records use city interpolation and 8,399 use Census frontage projection. There are 3,761 unmapped records at 796 locations. They remain in totals, time charts, corridor/location rankings, and an explicit unmapped zone/unknown ward. Empty coordinates never become zero. Trimming whitespace reduces raw distinct location strings from 15,483 to 15,472.

741 locations move more than 100 meters from a prior lookup. The lookup includes the prior movement, street segment ID (`objectid`), method, precision, range and side. This is a method change as well as a data refresh; geographic changes between snapshots can reflect either.

Ward attribution may use a separate six-meter offset toward an unambiguous address-range side. Displayed points stay on the centerline. Attribution near a ward boundary remains unknown; Census and masked block matches do not infer an undocumented side. These are estimated geographic assignments, not verified vehicle or curb positions. Distances use local Chicago meter scaling.

Conventional locations are masked blocks. The lookup maps 32,104 records as block estimates; 8,392 have no location and other unresolved blocks remain in the review queue. No conventional record is assigned an invented house number. The page displays conventional counts separately; its point map is Smart Streets only.

Review queues are `smartStreets-geocoding-review.csv` and `illegalParking-geocoding-review.csv`, ordered by record count. Address corrections require supporting evidence; preserve originals and document overrides rather than silently changing numbers.

## Comparison limits

The shared reporting period is November 6, 2024–June 29, 2026. The table compares conventional citywide tickets with Smart Streets fine-bearing bike-lane, bus-lane and bus-stop tickets in its pilot area. Warnings and other Smart Streets categories are excluded. Bus/taxi/carriage stands are broader than Smart Streets bus stops. Different coverage prevents equivalent-exposure comparisons and causal conclusions about reductions in illegal parking.

## Rebuild

From the repository root:

```bash
npm run geocode:data
npm run build:data
npm run test:data
python3 packages/data/scripts/archive-smart-streets.py packages/data/source /tmp/chicago-smart-streets-pilot-source-files.zip
```

Normal geocoding and browser builds are offline and deterministic. `--census-fallback` requests only uncached unresolved full addresses; `--refresh-streets` explicitly downloads a new city snapshot. Preserve the old pinned sources before intentional refreshes.

The source archive includes both original workbooks, normalized CSVs, both location lookups, city geometry, cached Census results, audits, review queues, source notes, zone polygons, and the previous July CSV/decoder. The scripts and ward polygons are in the repository. `LICENSE` applies to this project's code; retain the original source attributions when redistributing data.
