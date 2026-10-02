#!/usr/bin/env python3
"""Scoped Cook County fallback for failures of the city/Census method.

Requires Python 3.12+, Node, shapely and pyproj. All requests explicitly select
address/geometry fields; taxpayer, owner and mailing fields are never requested.
"""
import argparse
import collections
import collections.abc
import concurrent.futures
import csv
import datetime
import gzip
import hashlib
import json
import pathlib
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

import pyproj
import shapely.geometry
import shapely.ops
import shapely.strtree

BASE = "https://datacatalog.cookcountyil.gov/resource/"
PARCEL_URL = "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0/query"
POINT_FIELDS = "objectid,add_number,addnum_pre,addnum_suf,lst_predir,st_name,lst_type,st_posdir,inc_muni,pin,placement,lat,long"
ADDRESS_FIELDS = "pin10,pin,year,prop_address_full,prop_address_city_name"
CENTROID_FIELDS = "pin10,year,lat,lon"
# Reviewed, geographically limited county spelling: county N Dearborn ST is
# Chicago's N Dearborn PKWY in the 1200/1300 blocks sampled by the requester.
# Do not extend this equivalence to every Dearborn address or every street.
SUFFIX_ALIAS = ("N", "DEARBORN", "PKWY", "ST", 1200, 1399)
COUNTY_NAMES = {"LA SALLE": ["LA SALLE", "LASALLE"],
                "DR MARTIN LUTHER KING JR": ["DR MARTIN LUTHER KING JR", "MARTIN LUTHER KING", "KING"],
                "COTTAGE GROVE": ["COTTAGE GROVE", "COTTAGE GR"]}
TO_LOCAL = pyproj.Transformer.from_crs(4326, 26971, always_xy=True)
TO_GEO = pyproj.Transformer.from_crs(26971, 4326, always_xy=True)


def write_json(path: pathlib.Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def canonical_name(value: str) -> str:
    name = value.strip().upper()
    return next((canonical for canonical, spellings in COUNTY_NAMES.items() if name in spellings), name)


def sql_list(values: list) -> str:
    return ",".join(quote(str(value)) for value in values)


def batches[T](values: list[T], size: int = 100) -> collections.abc.Iterator[list[T]]:
    for offset in range(0, len(values), size):
        yield values[offset:offset + size]


class Requests:
    def __init__(self, directory: pathlib.Path, fetch: bool):
        self.directory = directory
        self.fetch = fetch
        directory.mkdir(parents=True, exist_ok=True)

    def get(self, url: str, params: dict) -> object:
        key = hashlib.sha256(json.dumps([url, params], sort_keys=True).encode()).hexdigest()
        path = self.directory / (key + ".json.gz")
        if path.exists():
            with gzip.open(path, "rt", encoding="utf-8") as handle:
                return json.load(handle)["response"]
        if not self.fetch:
            raise RuntimeError(f"Missing scoped API cache {key}; run with --fetch")
        full_url = url + "?" + urllib.parse.urlencode(params)
        for attempt in range(4):
            try:
                with urllib.request.urlopen(full_url, timeout=60) as response:
                    result = json.load(response)
                if isinstance(result, dict) and "error" in result:
                    raise RuntimeError(str(result["error"]))
                with gzip.open(path, "wt", encoding="utf-8") as handle:
                    json.dump({"url": url, "params": params, "retrievedOn": datetime.date.today().isoformat(), "response": result}, handle)
                return result
            except (urllib.error.URLError, TimeoutError):
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        raise RuntimeError("Request did not complete")

    def socrata(self, dataset: str, select: str, where: str, order: str, group: str = "") -> list:
        result = []
        for offset in range(0, 1000000, 2000):
            params = {"$select": select, "$where": where, "$order": order, "$limit": 2000, "$offset": offset}
            if group:
                params["$group"] = group
            page = self.get(BASE + dataset + ".json", params)
            if not isinstance(page, list):
                raise RuntimeError("Unexpected Socrata response")
            result.extend(page)
            if len(page) < 2000:
                return result
        raise RuntimeError("Pagination limit exceeded")


def descriptors(source: pathlib.Path) -> list:
    # Reuse the production parser instead of maintaining a competing normalizer.
    code = """const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
    const {parseAddress,matchAddress,buildStreetIndex}=require(path.resolve(process.argv[1]));
    const {parseCsv}=require(path.resolve(process.argv[1].replace('geocode-smart-streets','build-smart-streets-pilot')));
    const rows=parseCsv(fs.readFileSync(process.argv[2],'utf8'));
    const roads=buildStreetIndex(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(process.argv[3],'chicago-street-centerlines.json.gz')))).rows);
    process.stdout.write(JSON.stringify(rows.map(r=>{const a=parseAddress(r.orig_location);let aliasMethod=r.method;
      if(a?.direction==='N'&&a.name==='DEARBORN'&&a.suffix==='PKWY'&&a.number>=1200&&a.number<=1399&&r.method==='unresolved')
        aliasMethod=matchAddress(`${a.number} N DEARBORN ST`,roads).method;
      return {...r,address:a,aliasBaselineMethod:aliasMethod};})));"""
    script = pathlib.Path(__file__).with_name("geocode-smart-streets.js")
    baseline = source / "previous" / "smartstreetslocdecoder-frontage-20261002.csv"
    # The baseline is immutable so reruns cannot replace successful first-method
    # results or lose fallbacks already incorporated in the production decoder.
    return json.loads(subprocess.check_output(["node", "-e", code, str(script), str(baseline), str(source)], text=True))


def variants(address: dict) -> list[str]:
    names = COUNTY_NAMES.get(address["name"], [address["name"]])
    suffixes = [address["suffix"]]
    direction, name, original, alternative, low, high = SUFFIX_ALIAS
    if (address["direction"], address["name"], address["suffix"]) == (direction, name, original) and low <= address["number"] <= high:
        suffixes.append(alternative)
    return [f"{address['number']} {address['direction']} {name} {suffix}".strip() for name in names for suffix in suffixes]


def point(longitude: object, latitude: object) -> shapely.geometry.Point | None:
    try:
        lon, lat = float(longitude), float(latitude)
        if not (-88 < lon < -87.5 and 41.6 < lat < 42.1):
            return None
        return shapely.geometry.Point(TO_LOCAL.transform(lon, lat))
    except (TypeError, ValueError):
        return None


def pin10(value: str) -> str:
    digits = "".join(char for char in value if char.isdigit())
    return digits[:10] if len(digits) in (10, 14) else ""


def suffix_matches(address: dict, suffix: str) -> bool:
    if not address["suffix"] or address["suffix"] == suffix:
        return True
    direction, name, original, alternative, low, high = SUFFIX_ALIAS
    return (address["direction"], address["name"], address["suffix"], suffix) == (direction, name, original, alternative) and low <= address["number"] <= high


def spread(points: list) -> float:
    return max((a.distance(b) for a in points for b in points), default=0)


def build_roads(source: pathlib.Path) -> dict:
    with gzip.open(source / "chicago-street-centerlines.json.gz", "rt", encoding="utf-8") as handle:
        snapshot = json.load(handle)
    index = collections.defaultdict(list)
    for row in snapshot["rows"]:
        if row.get("suf_dir", "").strip() or row.get("tiered") == "Y" or float(row.get("f_zlev", 0) or 0) != 0 or float(row.get("t_zlev", 0) or 0) != 0:
            continue
        geometry = row.get("the_geom", {})
        if geometry.get("type") != "MultiLineString" or len(geometry["coordinates"]) != 1:
            continue
        line = shapely.ops.transform(TO_LOCAL.transform, shapely.geometry.LineString(geometry["coordinates"][0]))
        if line.length > 0:
            name = canonical_name(row.get("street_nam", ""))
            index[(row.get("pre_dir", "").strip(), name)].append((row, line))
    return index


def in_range(address: dict, road: dict) -> bool:
    for side in ("l", "r"):
        low, high = float(road.get(side + "_f_add", 0) or 0), float(road.get(side + "_t_add", 0) or 0)
        parity = road.get(side + "_parity", "")
        if min(low, high) <= address["number"] <= max(low, high) and low > 0 and high > 0 and (parity not in ("O", "E") or address["number"] % 2 == (1 if parity == "O" else 0)):
            return True
    return False


def run(args: argparse.Namespace) -> None:
    source, output = args.source.resolve(), args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    requests = Requests(output / "api-cache", args.fetch)
    rows = descriptors(source)
    eligible = [row for row in rows if row["method"] == "unresolved" and row["address"] and not row["address"]["masked"] and not row["address"]["tier"]]
    groups = collections.defaultdict(set)
    for row in eligible:
        address = row["address"]
        for name in COUNTY_NAMES.get(address["name"], [address["name"]]):
            groups[(address["direction"], name)].add(address["number"])
    queries = [(direction, name, batch) for (direction, name), numbers in sorted(groups.items()) for batch in batches(sorted(numbers), 200)]

    def get_points(query):
        direction, name, numbers = query
        where = f"upper(inc_muni)='CHICAGO' and lst_predir={quote(direction)} and upper(st_name)={quote(name)} and add_number in ({','.join(map(str,numbers))})"
        return requests.socrata("78yw-iddh", POINT_FIELDS, where, "objectid")

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        point_rows = [row for batch in pool.map(get_points, queries) for row in batch]
    print(f"Address points: {len(point_rows):,} scoped rows, {len(queries)} batches", flush=True)
    points_by_key = collections.defaultdict(list)
    for row in point_rows:
        if row.get("addnum_pre", "").strip() or row.get("addnum_suf", "").strip() or row.get("st_posdir", "").strip():
            continue
        name = canonical_name(row["st_name"])
        points_by_key[(int(float(row["add_number"])), row.get("lst_predir", ""), name)].append(row)
    matches = {}
    for row in eligible:
        address = row["address"]
        candidates = [candidate for candidate in points_by_key[(address["number"], address["direction"], address["name"])] if suffix_matches(address, candidate.get("lst_type", "")) and point(candidate.get("long"), candidate.get("lat")) is not None]
        matches[row["orig_location"]] = candidates
    years = requests.get(BASE + "3723-97qp.json", {"$select": "max(year) as year"})
    year = int(float(years[0]["year"]))
    fallback = [row for row in eligible if not matches[row["orig_location"]]]
    addresses = sorted({variant for row in fallback for variant in variants(row["address"])})

    def get_addresses(batch):
        where = f"year={year} and upper(prop_address_city_name)='CHICAGO' and prop_address_full in ({sql_list(batch)})"
        return requests.socrata("3723-97qp", ADDRESS_FIELDS, where, "pin,prop_address_full")

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        address_rows = [row for batch in pool.map(get_addresses, list(batches(addresses, 100))) for row in batch]
    print(f"Parcel addresses: {len(address_rows):,} scoped rows, tax year {year}", flush=True)
    parcel_addresses = collections.defaultdict(set)
    for row in address_rows:
        parcel_addresses[row["prop_address_full"]].add(row["pin10"])
    fallback_pins = sorted({row["pin10"] for row in address_rows})

    def get_centroids(batch):
        return requests.socrata("pabr-t5kh", CENTROID_FIELDS, f"pin10 in ({sql_list(batch)})", "pin10,lat,lon", CENTROID_FIELDS)

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        centroid_rows = [row for batch in pool.map(get_centroids, list(batches(fallback_pins))) for row in batch]
    centroids = collections.defaultdict(list)
    for row in centroid_rows:
        candidate = point(row.get("lon"), row.get("lat"))
        if candidate is not None:
            centroids[row["pin10"]].append(candidate)
    all_pins = sorted(set(fallback_pins) | {pin10(row.get("pin", "")) for row in point_rows} - {""})

    def get_polygons(batch):
        # Collapse overlapping condominium units by physical footprint, not PIN14.
        result = []
        for offset in range(0, 1000000, 2000):
            params = {"where": f"pin10 in ({sql_list(batch)})", "outFields": "objectid,pin10,parceltype", "returnGeometry": "true", "outSR": 4326,
                      "f": "geojson", "orderByFields": "objectid", "resultOffset": offset, "resultRecordCount": 2000}
            page = requests.get(PARCEL_URL, params)
            features = page.get("features", [])
            result.extend(features)
            if not page.get("exceededTransferLimit", False) and len(features) < 2000:
                return result
        raise RuntimeError("Parcel pagination limit exceeded")

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        parcel_features = [row for batch in pool.map(get_polygons, list(batches(all_pins))) for row in batch]
    polygons = collections.defaultdict(list)
    for feature in parcel_features:
        if feature.get("geometry") and feature["properties"].get("parceltype") not in (2, 5, 7):
            shape = shapely.ops.transform(TO_LOCAL.transform, shapely.geometry.shape(feature["geometry"]))
            if shape.is_valid:
                polygons[feature["properties"]["pin10"]].append(shape)
    parcels = {pin: shapely.ops.unary_union(shapes) for pin, shapes in polygons.items()}
    print(f"Parcel geometry: {len(parcels):,} physical PIN10s", flush=True)
    roads = build_roads(source)
    nearby_roads = [(row, line) for candidates in roads.values() for row, line in candidates if row.get("street_typ") in {"ST", "AVE", "RD", "BLVD", "DR", "PKWY", "PL", "CT", "TER", "LN", "WAY", "CIR"}]
    road_tree = shapely.strtree.STRtree([line for _, line in nearby_roads])
    results = []
    visual = []
    for old in rows:
        address = old["address"]
        result = {"address": old["orig_location"], "records": int(old["records"]), "status": "no_match", "source": "", "reason": "no_county_match",
                  "pin10": "", "county_pin14": "", "county_objectids": "", "county_candidate_count": 0, "placement": "", "raw_longitude": "", "raw_latitude": "", "longitude": "", "latitude": "",
                  "snap_distance_m": "", "segment_id": "", "range_match": "", "parcel_street_distance_m": "", "other_street": "", "other_street_parcel_distance_m": "", "movement_m": "",
                  "current_longitude": old["longitude"], "current_latitude": old["latitude"], "current_method": old["method"], "alias_baseline_method": old["aliasBaselineMethod"], "warnings": ""}
        results.append(result)
        if old["method"] != "unresolved":
            result.update(status="retained", source="primary_method", reason="")
            continue
        if not address or address["masked"] or address["tier"]:
            result["reason"] = "masked_address" if address and address["masked"] else "unsupported_address"
            continue
        candidates = matches[old["orig_location"]]
        starting = None
        issues, warnings = [], []
        pins = set()
        if candidates:
            positions = [point(candidate.get("long"), candidate.get("lat")) for candidate in candidates]
            pins = {pin10(candidate.get("pin", "")) for candidate in candidates} - {""}
            result.update(source="county_address_point", county_candidate_count=len(candidates), placement="|".join(sorted({candidate.get("placement", "") for candidate in candidates})),
                          county_pin14="|".join(sorted({candidate.get("pin", "") for candidate in candidates})), county_objectids="|".join(sorted({candidate["objectid"] for candidate in candidates})))
            if spread(positions) > 5 or len(pins) > 1:
                result.update(status="review", reason="ambiguous_county_points", pin10="|".join(sorted(pins)))
                continue
            starting = positions[0]
            if not result["placement"]:
                warnings.append("placement_unspecified")
        else:
            pins = {pin for variant in variants(address) for pin in parcel_addresses[variant]}
            result.update(source="county_parcel_centroid" if pins else "", county_candidate_count=len(pins))
            if len(pins) > 1:
                result.update(status="review", reason="multiple_physical_parcels", pin10="|".join(sorted(pins)))
                continue
            if pins:
                positions = centroids[next(iter(pins))]
                if not positions or spread(positions) > 5:
                    result.update(status="review", reason="missing_or_conflicting_centroids", pin10="|".join(pins))
                    continue
                starting = positions[0]
        result["pin10"] = "|".join(sorted(pins))
        if starting is None:
            continue
        lon, lat = TO_GEO.transform(starting.x, starting.y)
        result.update(raw_longitude=lon, raw_latitude=lat)
        if any(variant.endswith("DEARBORN ST") for variant in variants(address)) and address["suffix"] == "PKWY":
            warnings.append("reviewed_dearborn_suffix_alias")
        road_candidates = [(row, line, starting.distance(line)) for row, line in roads[(address["direction"], address["name"])] if suffix_matches(address, row.get("street_typ", ""))]
        road_candidates.sort(key=lambda item: (item[2], int(item[0]["objectid"])))
        if not road_candidates:
            result.update(status="review", reason="named_surface_street_missing")
            continue
        road, line, snap_distance = road_candidates[0]
        snapped = line.interpolate(line.project(starting))
        if any(distance <= snap_distance + 5 and snapped.distance(candidate_line.interpolate(candidate_line.project(starting))) > 25 for _, candidate_line, distance in road_candidates[1:]):
            issues.append("competing_street_segments")
        if snap_distance > (50 if candidates else 100):
            issues.append("long_snap")
        range_match = in_range(address, road)
        if not range_match:
            warnings.append("city_range_gap")
            # A trusted point may resolve a gap; a contradictory valid range is different.
            ranges = [(float(road.get(side + "_f_add", 0) or 0), float(road.get(side + "_t_add", 0) or 0)) for side in ("l", "r")]
            if all(low > 0 and high > 0 and (address["number"] < min(low, high) - 100 or address["number"] > max(low, high) + 100) for low, high in ranges):
                issues.append("block_range_conflict")
        parcel = parcels.get(next(iter(pins))) if len(pins) == 1 else None
        if parcel is None:
            issues.append("parcel_geometry_missing")
        else:
            result["parcel_street_distance_m"] = round(parcel.distance(line), 2)
            if parcel.distance(starting) > 5:
                issues.append("source_point_outside_parcel")
            if parcel.distance(line) > 30:
                issues.append("parcel_frontage_uncertain")
            alternatives = [(other_row, other_line) for index in road_tree.query(parcel.buffer(30)) for other_row, other_line in [nearby_roads[index]]
                            if (other_row.get("pre_dir", "").strip(), canonical_name(other_row.get("street_nam", ""))) != (address["direction"], address["name"])]
            if alternatives:
                other_row, other_line = min(alternatives, key=lambda item: parcel.distance(item[1]))
                if parcel.distance(line) > 15 and parcel.distance(other_line) + 5 < parcel.distance(line) and starting.distance(other_line) + 10 < snap_distance:
                    # Flag possible cross-street frontage; never snap to that street.
                    warnings.append("other_street_frontage_review")
                    result["other_street"] = " ".join(other_row.get(field, "") for field in ("pre_dir", "street_nam", "street_typ")).strip()
                    result["other_street_parcel_distance_m"] = round(parcel.distance(other_line), 2)
        lon, lat = TO_GEO.transform(snapped.x, snapped.y)
        previous = point(old["longitude"], old["latitude"])
        movement = snapped.distance(previous) if previous is not None else None
        if movement is not None and movement > 100:
            warnings.append("large_change_from_current")
        result.update(longitude=lon, latitude=lat, snap_distance_m=round(snap_distance, 2), segment_id=str(road["objectid"]), range_match=range_match,
                      movement_m=round(movement, 2) if movement is not None else "", warnings="|".join(warnings), status="review" if issues else "accepted", reason="|".join(issues))
        visual.append({"properties": result, "raw": [result["raw_longitude"], result["raw_latitude"]], "snapped": [lon, lat],
                       "current": [float(old["longitude"]), float(old["latitude"])] if previous is not None else None,
                       "street": shapely.geometry.mapping(shapely.ops.transform(TO_GEO.transform, line)),
                       "parcel": shapely.geometry.mapping(shapely.ops.transform(TO_GEO.transform, parcel)) if parcel is not None else None})
    with (output / "county-geocoding-comparison.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(results[0]))
        writer.writeheader()
        writer.writerows(results)
    review = [row for row in results if row["status"] == "review" or "large_change_from_current" in row["warnings"] or "other_street_frontage_review" in row["warnings"]]
    review.sort(key=lambda row: (-row["records"], row["address"]))
    with (output / "county-geocoding-review.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(results[0]))
        writer.writeheader()
        writer.writerows(review)
    accepted = [row for row in results if row["status"] == "accepted"]
    recovered = [row for row in accepted if row["current_method"] == "unresolved"]
    aliases_alone = [row for row in results if row["current_method"] == "unresolved" and row["alias_baseline_method"] != "unresolved"]
    additional = [row for row in recovered if row["alias_baseline_method"] == "unresolved"]
    counts = {}
    for row in results:
        key = row["source"] + ":" + row["status"]
        counts.setdefault(key, {"locations": 0, "records": 0})
        counts[key]["locations"] += 1
        counts[key]["records"] += row["records"]
    audit = {"policy": "unresolved_only", "projection": "EPSG:26971 (NAD83 / Illinois East, meters)", "parcelAddressYear": year,
             "locations": len(rows), "records": sum(row["records"] for row in results), "eligibleFullAddresses": len(eligible), "methods": counts,
             "acceptedLocations": len(accepted), "acceptedRecords": sum(row["records"] for row in accepted), "recoveredLocations": len(recovered),
             "recoveredRecords": sum(row["records"] for row in recovered), "acceptedMovementOver25m": sum(row["movement_m"] != "" and row["movement_m"] > 25 for row in accepted),
             "aliasAloneRecoveredLocations": len(aliases_alone), "aliasAloneRecoveredRecords": sum(row["records"] for row in aliases_alone),
             "countyRecoveredBeyondAliasLocations": len(additional), "countyRecoveredBeyondAliasRecords": sum(row["records"] for row in additional),
             "acceptedMovementOver100m": sum(row["movement_m"] != "" and row["movement_m"] > 100 for row in accepted),
             "otherStreetFrontageFlags": sum("other_street_frontage_review" in row["warnings"] for row in results), "reviewQueueLocations": len(review),
             "reasonCounts": dict(collections.Counter(reason for row in results for reason in row["reason"].split("|") if reason)),
             "inputHashes": {name: hashlib.sha256((source / name).read_bytes()).hexdigest() for name in ["previous/smartstreetslocdecoder-frontage-20261002.csv", "chicago-street-centerlines.json.gz", "FOIA_Cannon_A52020_20260915.csv", "illegal-parking-locations.csv"]},
             "cacheFiles": len(list((output / "api-cache").glob("*.json.gz")))}
    write_json(output / "county-geocoding-audit.json", audit)
    # Sort for a review queue; each feature includes only the chosen address's street/parcel.
    visual.sort(key=lambda item: (-item["properties"]["records"], item["properties"]["address"]))
    write_json(output / "county-geocoding-map.json", visual)
    safe = [row for row in accepted if "other_street_frontage_review" not in row["warnings"] and "large_change_from_current" not in row["warnings"]]
    fallback = {"policy": "unresolved_only", "retrievedOn": datetime.date.today().isoformat(), "projection": audit["projection"], "inputHashes": audit["inputHashes"],
                "results": {row["address"]: row for row in safe}}
    write_json(output / "county-geocoding-fallback.json", fallback)
    (output / "index.html").write_text(pathlib.Path(__file__).with_name("county-geocoding-review.html").read_text(encoding="utf-8"), encoding="utf-8")
    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--fetch", action="store_true", help="Fetch only missing, scoped API requests; default is offline")
    run(parser.parse_args())
