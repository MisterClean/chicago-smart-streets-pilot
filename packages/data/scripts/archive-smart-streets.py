#!/usr/bin/env python3
"""Create a deterministic, self-contained FOIA source archive."""

import argparse
import hashlib
import zipfile
from pathlib import Path


SOURCE_FILES: tuple[str, ...] = (
    "FOIA_Cannon_A52020_20260915.xlsx", "FOIA_Cannon_A52020_20260915.csv",
    "_P197426_Illegal_Parking.xlsx", "_P197426_Illegal_Parking.csv",
    "smartstreetslocdecoder-frontage.csv", "illegal-parking-locations.csv",
    "chicago-street-centerlines.json.gz", "census-geocoding-cache.json",
    "county-geocoding-fallback.json", "county-fallback-evidence.zip",
    "geocoding-audit.json", "foia-reconciliation.json",
    "smartStreets-geocoding-review.csv", "illegalParking-geocoding-review.csv",
    "smartstreetszones.geojson", "SOURCE-NOTES.md",
    "previous/FOIA_Cannon_A52020_20260702.csv", "previous/smartstreetslocdecoder-2.csv",
    "previous/smartstreetslocdecoder-frontage-20261002.csv",
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    missing = [name for name in SOURCE_FILES if not (args.source_dir / name).is_file()]
    if missing:
        raise ValueError(f"Missing source files: {', '.join(missing)}")
    with zipfile.ZipFile(args.output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name in SOURCE_FILES:
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 2, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, (args.source_dir / name).read_bytes())
    with zipfile.ZipFile(args.output) as archive:
        bad_file = archive.testzip()
        if bad_file is not None:
            raise ValueError(f"Invalid ZIP member: {bad_file}")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(f"{args.output.name}: {len(SOURCE_FILES)} files, SHA-256 {digest}")


if __name__ == "__main__":
    main()
