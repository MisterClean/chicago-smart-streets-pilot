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

Smart Streets matches 128,017 records (97.9%) at 14,745 locations. The original city interpolation (118,628 records) and Census frontage projection (8,399 records) results are unchanged. County fallbacks add 990 records at 69 previously unresolved locations: 905 records at 54 county address points and 85 records at 15 parcel centroids. There are 2,771 unmapped records at 727 locations. They remain in totals, time charts, corridor/location rankings, and an explicit unmapped zone/unknown ward. Empty coordinates never become zero. Trimming whitespace reduces raw distinct location strings from 15,483 to 15,472.

743 locations move more than 100 meters from the legacy building lookup. None of the successful city/Census matches changes during the county fallback addition. The lookup includes the prior movement, street segment ID (`objectid`), method, precision, range and side. This is a method change as well as a data refresh; geographic changes between snapshots can reflect either.

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

## Cook County fallback — unresolved addresses only

The city address-range method and validated Census matches retain priority. County data may never replace a successful first-method location. The immutable `previous/smartstreetslocdecoder-frontage-20261002.csv` retains that baseline, including 410 S Morgan north of the Eisenhower. The requester observed a 410 S Morgan street address near Tilden that disagrees with the county parcel location south of the expressway; this is a documented reason not to treat a tax-parcel address as ground truth.

County requests on October 2, 2026 cover only the 795 parseable, unmasked unresolved address strings. The malformed remaining address is not forced into a match. Requests explicitly select address and geometry fields and exclude owner/mailing information. Sources: [county address points](https://datacatalog.cookcountyil.gov/Boundaries-Districts/Cook-County-Address-Points/78yw-iddh/about_data), [2026 assessor property addresses](https://datacatalog.cookcountyil.gov/Property-Taxation/Assessor-Parcel-Addresses/3723-97qp/about_data), [current parcel centroids](https://datacatalog.cookcountyil.gov/Property-Taxation/Assessor-Parcel-Universe-Current-Year-Only-/pabr-t5kh/about_data), [parcel polygons](https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0).

Prefer a unique county address point; otherwise use a unique property-address-to-physical-PIN10 match and centroid. Collapse condominium units sharing that footprint. Reject conflicting points/parcels, missing polygon checks, elevated/directional street features, competing street segments, block conflicts, and long snaps. Project in EPSG:26971 (Illinois East, meters), constrained to the original street and direction. Point snaps must be within 50 m and centroid snaps within 100 m; the point must be on its parcel or within 5 m and the parcel within 30 m of the named street. Flag possible cross-street frontage and exclude those candidates from the production cache. These thresholds are conservative screening rules, not an accuracy guarantee.

An explicit N Dearborn PKWY → ST suffix alias is limited to house numbers 1200–1399. It does not change the first-method geocoder. All 56 county fallbacks using this alias could also be resolved by adding that alias to the city method; they are not independent evidence that county geocoding is more accurate. County coordinates recover 13 other locations covering 81 records. Placement is unspecified on the accepted county address points, so they must not be described as surveyed entrances.

`county-geocoding-fallback.json` stores only the 69 accepted additions, original/snapped coordinates, source, PIN10/PIN14 where supplied, county object ID, city segment ID, distance, and warnings. Input hashes bind it to this FOIA, street snapshot, baseline, and unchanged masked-block lookup. `county-fallback-evidence.zip` includes all 108 scoped API response caches, the comparison and review CSVs, audit, and a local review map. Extract it into a working directory to rerun the Python fallback offline; Python 3.12+, Node, Shapely 2.1.2 and pyproj 3.8.0 are required. Masked conventional locations stay unchanged block estimates.

```bash
python3 -m venv .venv
.venv/bin/pip install -r packages/data/scripts/requirements-county-geocoding.txt
unzip packages/data/source/county-fallback-evidence.zip -d /tmp/county-fallback
.venv/bin/python packages/data/scripts/trial-county-geocoding.py --source packages/data/source --output /tmp/county-fallback
.venv/bin/python packages/data/scripts/test-county-geocoding.py --source packages/data/source --output /tmp/county-fallback
```

The Python script creates a proposed cache in the output directory, never overwrites production inputs, and refuses missing API cache entries unless explicitly run with `--fetch`. A refresh must be validated before copying that output cache into the source directory and rebuilding. The Node geocoder applies the accepted cache only after both first methods fail. The final archive includes the fallback cache, scoped evidence archive, and immutable baseline in addition to the original sources.
