# County geocoding fallback, October 2, 2026

County data is used only after the original Chicago street-range and checked Census methods fail. All 14,676 successful locations covering 127,027 records retain every original decoder field and coordinate. Conventional masked-block geocodes are unchanged. The new branch retains the September FOIA update and adds the fallback.

| Result | Locations | Ticket records |
| --- | ---: | ---: |
| Existing city/Census matches retained | 14,676 | 127,027 |
| County address points added | 54 | 905 |
| County parcel centroids added | 15 | 85 |
| Still unresolved | 727 | 2,771 |

Coverage rises from 97.1% to 97.9% (128,017 / 130,788). Totals and listed fines remain 130,788 tickets and $4,215,140. Unmapped records remain in totals and non-geographic charts. County requests cover only 795 parseable full addresses from the 796 original failures; the malformed address is preserved unresolved. Of those failures, 69 pass all checks, 225 have review flags or ambiguous source/geometry, and 502 have no accepted county match, including the malformed address. Review candidates are not production fallbacks.

The initial county trial showed a conflict at 410 S Morgan: the assessor parcel is south of the Eisenhower, while the requester saw a 410 S Morgan address near Tilden north of it in Google Street View. This is user-provided visual evidence, not independently verified ground truth. The preserved city geocode is north of the expressway; its entire decoder row stays unchanged. The county-only trial cannot establish ground-truth accuracy from agreement with parcel records.

The N Dearborn PKWY/ST alias is limited to the 1200–1399 house-number range and county fallback only. It accounts for 56 additions covering 909 records. The same alias could resolve 61 locations / 951 records in the city method, but that primary method was deliberately left unchanged. County coordinates add 13 other locations / 81 records. Do not present alias gains as independent county-method accuracy gains.

Use a unique county point before a unique physical parcel centroid, collapse unit PINs only within one PIN10 footprint, and snap in EPSG:26971 onto the named street and direction. Retain original and snapped points, PINs, method, street segment, distance and review notes. Reject missing geometry, multiple physical parcels, conflicting coordinates, long snaps, competing streets or block conflicts. Flag possible other-street frontage without snapping to that cross street. Accepted address-point placement is unspecified. These are estimated frontage positions, not surveyed curb or incident coordinates.

Sources and detailed thresholds are documented in `SOURCE-NOTES.md`, distributed in the source download. The county cache is pinned, ordinary builds are offline, and hashes bind it to the source FOIA, street geometry, immutable baseline, and unchanged block lookup. The evidence ZIP includes 108 requests explicitly restricted to our unresolved addresses/PINs and address/geometry fields.

Validation checks every accepted point against its named street and parcel and verifies exact source identity, unchanged baseline fields, totals, and hashes. Regression tests enforce city → Census → county priority, reject flagged county candidates and masked addresses, and specifically protect 410 S Morgan. A failed safety check leaves a location unresolved.

Reproduction commands and source links: [source notes](packages/data/source/SOURCE-NOTES.md).
