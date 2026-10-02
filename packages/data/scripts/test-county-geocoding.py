#!/usr/bin/env python3
"""Validate the trial's source identity and spatial safety, using cached evidence."""
import argparse
import collections
import csv
import gzip
import hashlib
import importlib.util
import json
import pathlib

import shapely.geometry
import shapely.ops


def check(source: pathlib.Path, output: pathlib.Path) -> None:
    spec = importlib.util.spec_from_file_location("trial", pathlib.Path(__file__).with_name("trial-county-geocoding.py"))
    trial = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(trial)
    with (output / "county-geocoding-comparison.csv").open(encoding="utf-8", newline="") as handle:
        results = list(csv.DictReader(handle))
    audit = json.loads((output / "county-geocoding-audit.json").read_text(encoding="utf-8"))
    inputs = {row["orig_location"]: row for row in trial.descriptors(source)}
    with (source / "FOIA_Cannon_A52020_20260915.csv").open(encoding="utf-8-sig", newline="") as handle:
        foia_counts = collections.Counter(row["Location"].strip() for row in csv.DictReader(handle))
    assert foia_counts == {value: int(row["records"]) for value, row in inputs.items()}
    assert len(results) == len(inputs) == len({row["address"] for row in results})
    assert sum(int(row["records"]) for row in results) == audit["records"] == sum(int(row["records"]) for row in inputs.values())
    for name, digest in audit["inputHashes"].items():
        assert hashlib.sha256((source / name).read_bytes()).hexdigest() == digest, name
    roads = {str(row["objectid"]): (row, line) for candidates in trial.build_roads(source).values() for row, line in candidates}
    county_points, centroid_points = {}, {}
    for path in (output / "api-cache").glob("*.json.gz"):
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            cached = json.load(handle)
        select = cached["params"].get("$select", "")
        assert not any(field in select for field in ("mail_", "owner_", "address_name"))
        if cached["url"].endswith("78yw-iddh.json"):
            assert "upper(inc_muni)='CHICAGO'" in cached["params"]["$where"]
            for row in cached["response"]:
                county_points[row["objectid"]] = row
        elif cached["url"].endswith("pabr-t5kh.json"):
            for row in cached["response"]:
                centroid_points.setdefault(row["pin10"], []).append(row)
    visual = {item["properties"]["address"]: item for item in json.loads((output / "county-geocoding-map.json").read_text(encoding="utf-8"))}
    accepted = []
    for row in results:
        old = inputs[row["address"]]
        assert row["current_longitude"] == old["longitude"] and row["current_latitude"] == old["latitude"]
        assert int(row["records"]) == int(old["records"])
        assert row["alias_baseline_method"] == old["aliasBaselineMethod"]
        if row["longitude"]:
            road, line = roads[row["segment_id"]]
            address = old["address"]
            assert road["pre_dir"] == address["direction"] and trial.canonical_name(road["street_nam"]) == address["name"]
            assert trial.suffix_matches(address, road["street_typ"])
            snapped = trial.point(row["longitude"], row["latitude"])
            assert snapped.distance(line) < 0.005, row["address"]
        if row["status"] != "accepted":
            continue
        accepted.append(row)
        assert not row["reason"] and len(row["pin10"]) == 10 and "|" not in row["pin10"]
        raw = trial.point(row["raw_longitude"], row["raw_latitude"])
        limit = 50 if row["source"] == "county_address_point" else 100
        assert raw.distance(line) <= limit
        polygon = shapely.ops.transform(trial.TO_LOCAL.transform, shapely.geometry.shape(visual[row["address"]]["parcel"]))
        assert polygon.distance(raw) <= 5 and polygon.distance(line) <= 30
        if row["source"] == "county_address_point":
            candidate = county_points[row["county_objectids"].split("|")[0]]
            assert int(float(candidate["add_number"])) == address["number"]
            assert candidate["lst_predir"] == address["direction"]
            assert trial.canonical_name(candidate["st_name"]) == address["name"]
            assert trial.suffix_matches(address, candidate.get("lst_type", ""))
            assert trial.pin10(candidate["pin"]) == row["pin10"]
            assert raw.distance(trial.point(candidate["long"], candidate["lat"])) < 0.005
        else:
            assert any(raw.distance(trial.point(candidate.get("lon"), candidate.get("lat"))) < 0.005 for candidate in centroid_points[row["pin10"]])
    assert len(accepted) == audit["acceptedLocations"]
    assert sum(int(row["records"]) for row in accepted) == audit["acceptedRecords"]
    beyond_alias = [row for row in accepted if row["alias_baseline_method"] == "unresolved"]
    assert len(beyond_alias) == audit["countyRecoveredBeyondAliasLocations"]
    assert sum(int(row["records"]) for row in beyond_alias) == audit["countyRecoveredBeyondAliasRecords"]
    # The suffix equivalence must not leak to other directions, streets or blocks.
    for direction, name, number in [("S", "DEARBORN", 1221), ("N", "STATE", 1221), ("N", "DEARBORN", 1400)]:
        address = {"number": number, "direction": direction, "name": name, "suffix": "PKWY"}
        assert not trial.suffix_matches(address, "ST")
    print(f"Validated {len(results):,} locations and {len(accepted):,} accepted source/parcel/street matches; inputs unchanged.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    check(args.source, args.output)
