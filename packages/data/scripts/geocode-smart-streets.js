#!/usr/bin/env node
// Offline frontage-street interpolation. No API key or runtime geocoding calls.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { parseCsv } = require("./build-smart-streets-pilot.js");

const STREET_URL = "https://data.cityofchicago.org/resource/pr57-gg9e.json";
const METERS_LAT = 111320;
const METERS_LON = METERS_LAT * Math.cos(41.88 * Math.PI / 180);
const SUFFIXES = { AV: "AVE", AVENUE: "AVE", STREET: "ST", BOULEVARD: "BLVD", DRIVE: "DR", ROAD: "RD", PLACE: "PL", PARKWAY: "PKWY", COURT: "CT", TERRACE: "TER", LANE: "LN" };
const TYPES = new Set(["AVE", "ST", "BLVD", "DR", "RD", "PL", "PKWY", "CT", "TER", "LN", "WAY", "CIR"]);
const DIRECTIONS = { NORTH: "N", SOUTH: "S", EAST: "E", WEST: "W" };
// Explicit street-name aliases only. Never change the supplied house number/direction.
const ALIASES = { LASALLE: "LA SALLE", "LA SALLE": "LA SALLE", "LAKE SHORE": "LAKE SHORE", "JEAN BAPTISTE POINT DUSABLE LAKE SHORE": "LAKE SHORE",
    KING: "DR MARTIN LUTHER KING JR", "MARTIN LUTHER KING": "DR MARTIN LUTHER KING JR", "COTTAGE GR": "COTTAGE GROVE" };

function words(value) {
    return String(value || "").toUpperCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
}

function parseAddress(value) {
    const match = words(value).match(/^(\d+|\d*X{2})\s+(N|S|E|W|NORTH|SOUTH|EAST|WEST)\s+(.+)$/);
    if (!match) return null;
    const tokens = match[3].split(" ");
    let suffix = SUFFIXES[tokens.at(-1)] || tokens.at(-1);
    if (TYPES.has(suffix)) tokens.pop(); else suffix = "";
    const tier = tokens.some((token) => ["LOWER", "UPPER"].includes(token));
    const name = tokens.filter((token) => !["LOWER", "UPPER"].includes(token)).join(" ");
    const masked = match[1].includes("X");
    return { direction: DIRECTIONS[match[2]] || match[2], name: ALIASES[name] || name, suffix,
        number: masked ? Number(match[1].replace(/XX$/, "00")) : Number(match[1]), masked, tier };
}

function distance(a, b) {
    return Math.hypot((a[0] - b[0]) * METERS_LON, (a[1] - b[1]) * METERS_LAT);
}

function lineLength(line) {
    return line.slice(1).reduce((sum, point, i) => sum + distance(line[i], point), 0);
}

function along(line, fraction) {
    let remaining = lineLength(line) * Math.max(0, Math.min(1, fraction));
    for (let i = 1; i < line.length; i += 1) {
        const length = distance(line[i - 1], line[i]);
        if (remaining <= length && length > 0) {
            const t = remaining / length;
            return [line[i - 1][0] + t * (line[i][0] - line[i - 1][0]), line[i - 1][1] + t * (line[i][1] - line[i - 1][1])];
        }
        remaining -= length;
    }
    return line.at(-1);
}

function buildStreetIndex(rows) {
    const index = new Map();
    for (const row of rows) {
        // Directional carriageways and ramps need an explicit directional address.
        if (words(row.suf_dir)) continue;
        const name = ALIASES[words(row.street_nam)] || words(row.street_nam);
        const key = `${words(row.pre_dir)}|${name}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(row);
    }
    return index;
}

function streetCandidates(address, index) {
    const rows = (index.get(`${address.direction}|${address.name}`) || [])
        .filter((row) => !address.suffix || words(row.street_typ) === address.suffix);
    // Street addresses do not establish elevation. Keep tiered locations for review.
    if (address.tier) return { candidates: [], reason: "tier_not_resolved" };
    const candidates = [];
    for (const row of rows) {
        if (words(row.tiered) === "Y" || Number(row.f_zlev || 0) !== 0 || Number(row.t_zlev || 0) !== 0) continue;
        const lines = row.the_geom?.coordinates;
        if (row.the_geom?.type !== "MultiLineString" || lines?.length !== 1 || lines[0].length < 2) continue;
        for (const side of ["l", "r"]) {
            const from = Number(row[`${side}_f_add`]);
            const to = Number(row[`${side}_t_add`]);
            if (!(from > 0 && to > 0)) continue;
            const min = Math.min(from, to), max = Math.max(from, to);
            if (address.masked) {
                if (address.number > max || address.number + 99 < min) continue;
            } else {
                if (address.number < min || address.number > max) continue;
                const parity = words(row[`${side}_parity`]);
                if ((parity === "O" && address.number % 2 !== 1) || (parity === "E" && address.number % 2 !== 0)) continue;
            }
            const number = address.masked ? (Math.max(min, address.number) + Math.min(max, address.number + 99)) / 2 : address.number;
            const fraction = from === to ? 0.5 : (number - from) / (to - from);
            const point = along(lines[0], fraction);
            candidates.push({ point, segmentId: String(row.objectid), side, from, to,
                street: `${words(row.pre_dir)} ${words(row.street_nam)} ${words(row.street_typ)}`.trim(),
                line: lines[0] });
        }
    }
    return { candidates, reason: rows.length ? "no_address_range_match" : "street_not_found" };
}

function matchAddress(value, index) {
    if (!value.trim()) return { method: "unresolved", reason: "missing_location", point: null };
    const address = parseAddress(value);
    if (!address) return { method: "unresolved", reason: "unparsed_address", point: null };
    const { candidates, reason } = streetCandidates(address, index);
    if (!candidates.length) return { method: "unresolved", reason, point: null };
    candidates.sort((a, b) => a.segmentId.localeCompare(b.segmentId, "en", { numeric: true }) || a.side.localeCompare(b.side));
    if (address.masked) {
        // Use the middle of the matching block extent, rather than a made-up address.
        // Multiple disconnected blocks or street types are ambiguous.
        if (new Set(candidates.map((c) => c.street)).size !== 1) return { method: "unresolved", reason: "ambiguous_street", point: null };
        const extent = candidates.flatMap((c) => c.line);
        const west = Math.min(...extent.map((p) => p[0])), east = Math.max(...extent.map((p) => p[0]));
        const south = Math.min(...extent.map((p) => p[1])), north = Math.max(...extent.map((p) => p[1]));
        if (distance([west, south], [east, north]) > 400) return { method: "unresolved", reason: "ambiguous_block", point: null };
        const center = [(west + east) / 2, (south + north) / 2];
        const selected = [...candidates].sort((a, b) => distance(a.point, center) - distance(b.point, center))[0];
        return { ...selected, method: "block_estimate", reason: "", precision: "block", candidateCount: candidates.length };
    }
    if (candidates.some((candidate) => distance(candidates[0].point, candidate.point) > 25)) {
        return { method: "unresolved", reason: "ambiguous_segments", point: null, candidateCount: candidates.length };
    }
    return { ...candidates[0], side: new Set(candidates.map((c) => c.side)).size === 1 ? candidates[0].side : "",
        method: "street_interpolation", reason: "", precision: "address_range", candidateCount: candidates.length };
}

function addressSidePoint(match) {
    // Map geometry stays on the street. Use the address-range side only for ward
    // attribution, where a ward boundary often follows the street centerline.
    if (!match.point || !match.side || match.method !== "street_interpolation") return match.point;
    let nearest = null;
    for (let i = 1; i < match.line.length; i += 1) {
        const a = match.line[i - 1], b = match.line[i];
        const meters = project(match.point, [a, b]).meters;
        const dx = (b[0] - a[0]) * METERS_LON, dy = (b[1] - a[1]) * METERS_LAT;
        const length = Math.hypot(dx, dy);
        if (length > 0 && (!nearest || meters < nearest.meters)) nearest = { dx, dy, length, meters };
    }
    if (!nearest) return match.point;
    const offset = match.side === "l" ? 6 : -6;
    return [match.point[0] - nearest.dy / nearest.length * offset / METERS_LON, match.point[1] + nearest.dx / nearest.length * offset / METERS_LAT];
}

function project(point, line) {
    let result = null;
    for (let i = 1; i < line.length; i += 1) {
        const a = line[i - 1], b = line[i];
        const dx = (b[0] - a[0]) * METERS_LON, dy = (b[1] - a[1]) * METERS_LAT;
        const denominator = dx * dx + dy * dy;
        const t = denominator === 0 ? 0 : Math.max(0, Math.min(1, (((point[0] - a[0]) * METERS_LON * dx + (point[1] - a[1]) * METERS_LAT * dy) / denominator)));
        const snapped = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
        const meters = distance(point, snapped);
        if (!result || meters < result.meters) result = { point: snapped, meters };
    }
    return result;
}

function censusFallback(value, index, cached) {
    const address = parseAddress(value);
    if (!address || address.masked || address.tier || cached?.match !== "Match") return null;
    const matched = parseAddress(cached.matchedAddress.split(",")[0]);
    if (!matched || matched.number !== address.number || matched.direction !== address.direction || matched.name !== address.name || (address.suffix && matched.suffix !== address.suffix)) return null;
    const point = cached.coordinates.split(",").map(Number);
    if (point.length !== 2 || !point.every(Number.isFinite) || point[0] < -88 || point[0] > -87.5 || point[1] < 41.6 || point[1] > 42.1) return null;
    const block = Math.floor(address.number / 100) * 100;
    const candidates = (index.get(`${address.direction}|${address.name}`) || [])
        .filter((row) => words(row.street_typ) === matched.suffix && words(row.tiered) !== "Y" && Number(row.f_zlev || 0) === 0 && Number(row.t_zlev || 0) === 0
            && row.the_geom?.type === "MultiLineString" && row.the_geom.coordinates.length === 1)
        .filter((row) => ["l", "r"].some((side) => {
            const from = Number(row[`${side}_f_add`]), to = Number(row[`${side}_t_add`]);
            return from > 0 && to > 0 && Math.max(from, to) >= block && Math.min(from, to) <= block + 99;
        }))
        .map((row) => ({ ...project(point, row.the_geom.coordinates[0]), segmentId: String(row.objectid), street: `${row.pre_dir} ${row.street_nam} ${row.street_typ}`, line: row.the_geom.coordinates[0] }))
        .filter((candidate) => candidate.point && candidate.meters <= 35)
        .sort((a, b) => a.meters - b.meters || a.segmentId.localeCompare(b.segmentId));
    if (!candidates.length || (candidates[1] && Math.abs(candidates[1].meters - candidates[0].meters) < 5 && distance(candidates[0].point, candidates[1].point) > 25)) return null;
    return { ...candidates[0], method: "census_street_projection", precision: "address_range", reason: "", candidateCount: candidates.length, tigerLineId: cached.tigerLineId };
}

async function loadCensusCache(directory, values, index) {
    const cachePath = path.join(directory, "census-geocoding-cache.json");
    const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : { benchmark: "Public_AR_Current", retrievedOn: "", results: {} };
    if (!process.argv.includes("--census-fallback")) return cache;
    const pending = values.filter((value) => {
        const address = parseAddress(value);
        return address && !address.masked && !address.tier && !cache.results[value] && matchAddress(value, index).method === "unresolved";
    });
    for (let offset = 0; offset < pending.length; offset += 5000) {
        const batch = pending.slice(offset, offset + 5000);
        const form = new FormData();
        const input = batch.map((value, id) => ({ id, street: value, city: "Chicago", state: "IL", zip: "" }));
        form.append("addressFile", new Blob([csv(input, ["id", "street", "city", "state", "zip"]).split("\n").slice(1).join("\n")], { type: "text/csv" }), "addresses.csv");
        form.append("benchmark", "Public_AR_Current");
        const response = await fetch("https://geocoding.geo.census.gov/geocoder/locations/addressbatch", { method: "POST", body: form, signal: AbortSignal.timeout(180000) });
        if (!response.ok) throw new Error(`Census batch HTTP ${response.status}`);
        const results = parseCsv(`id,input,match,matchType,matchedAddress,coordinates,tigerLineId,side\n${await response.text()}`);
        if (results.length !== batch.length || new Set(results.map((row) => row.id)).size !== batch.length) throw new Error("Incomplete Census batch response");
        for (const row of results) {
            if (!batch[Number(row.id)]) throw new Error(`Invalid Census batch ID: ${row.id}`);
            cache.results[batch[Number(row.id)]] = row;
        }
        cache.retrievedOn = new Date().toISOString().slice(0, 10);
        fs.writeFileSync(cachePath, `${JSON.stringify(cache)}\n`);
        console.log(`Cached Census results for ${batch.length} unresolved addresses`);
    }
    return cache;
}

function csv(rows, headers) {
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    return `${headers.map(quote).join(",")}\n${rows.map((row) => headers.map((h) => quote(row[h])).join(",")).join("\n")}\n`;
}

async function downloadStreets(destination) {
    const response = await fetch(`${STREET_URL}?$select=count(*)`);
    if (!response.ok) throw new Error(`Street count HTTP ${response.status}`);
    const [{ count }] = await response.json();
    const rows = [];
    for (let offset = 0; offset < Number(count); offset += 10000) {
        const page = await fetch(`${STREET_URL}?$limit=10000&$offset=${offset}&$order=objectid`);
        if (!page.ok) throw new Error(`Street download HTTP ${page.status}`);
        rows.push(...await page.json());
    }
    if (rows.length !== Number(count) || new Set(rows.map((row) => row.objectid)).size !== rows.length) {
        throw new Error("Incomplete or duplicate street snapshot");
    }
    const fields = ["objectid", "trans_id", "pre_dir", "street_nam", "street_typ", "suf_dir", "l_f_add", "l_t_add", "r_f_add", "r_t_add", "l_parity", "r_parity", "tiered", "f_zlev", "t_zlev", "the_geom"];
    const snapshot = { source: STREET_URL, retrievedOn: new Date().toISOString().slice(0, 10), rows: rows.map((row) => Object.fromEntries(fields.map((key) => [key, row[key] ?? ""]))) };
    const payload = `${JSON.stringify(snapshot)}\n`;
    fs.writeFileSync(destination, destination.endsWith(".gz") ? zlib.gzipSync(payload) : payload);
    return snapshot;
}

async function main() {
    const directory = path.resolve(process.argv[2] || process.env.SMART_STREETS_SOURCE_DIR || path.join(__dirname, "../source"));
    const compressedPath = path.join(directory, "chicago-street-centerlines.json.gz");
    const roadsPath = fs.existsSync(compressedPath) ? compressedPath : path.join(directory, "chicago-street-centerlines.json");
    const content = fs.existsSync(roadsPath) ? fs.readFileSync(roadsPath) : null;
    const snapshot = content && !process.argv.includes("--refresh-streets")
        ? JSON.parse(roadsPath.endsWith(".gz") ? zlib.gunzipSync(content).toString("utf8") : content.toString("utf8")) : await downloadStreets(roadsPath);
    const index = buildStreetIndex(snapshot.rows);
    const smartRows = parseCsv(fs.readFileSync(path.join(directory, "FOIA_Cannon_A52020_20260915.csv"), "utf8"));
    const census = await loadCensusCache(directory, [...new Set(smartRows.map((row) => row.Location))].sort(), index);
    const legacyPath = path.join(directory, "previous", "smartstreetslocdecoder-2.csv");
    const legacy = fs.existsSync(legacyPath) ? new Map(parseCsv(fs.readFileSync(legacyPath, "utf8")).map((row) => [row.orig_location, [Number(row.longitude), Number(row.latitude)]])) : new Map();
    const reports = {};
    for (const [key, filename] of [["smartStreets", "FOIA_Cannon_A52020_20260915.csv"], ["illegalParking", "_P197426_Illegal_Parking.csv"]]) {
        const records = parseCsv(fs.readFileSync(path.join(directory, filename), "utf8"));
        const counts = new Map();
        for (const row of records) counts.set(row.Location, (counts.get(row.Location) || 0) + 1);
        const locations = [...counts.keys()].sort().map((value) => {
            let match = matchAddress(value, index);
            if (match.method === "unresolved") match = censusFallback(value, index, census.results[value]) || match;
            const wardPoint = addressSidePoint(match);
            const prior = legacy.get(value);
            return { orig_location: value, address_clean: value ? `${words(value)}, Chicago, IL` : "", longitude: match.point?.[0] ?? "", latitude: match.point?.[1] ?? "",
                method: match.method, precision: match.precision || "unknown", reason: match.reason,
                segment_id: match.segmentId || "", street: match.street || "", side: match.side || "", range_from: match.from ?? "", range_to: match.to ?? "",
                ward_longitude: wardPoint?.[0] ?? "", ward_latitude: wardPoint?.[1] ?? "",
                candidate_count: match.candidateCount || 0, census_tigerline_id: match.tigerLineId || "", records: counts.get(value),
                previous_movement_m: prior && match.point ? Math.round(distance(prior, match.point)) : "" };
        });
        const output = key === "smartStreets" ? "smartstreetslocdecoder-frontage.csv" : "illegal-parking-locations.csv";
        fs.writeFileSync(path.join(directory, output), csv(locations, Object.keys(locations[0])));
        reports[key] = { uniqueLocations: locations.length, records: records.length, matchedLocations: locations.filter((l) => l.method !== "unresolved").length,
            mappedRecords: locations.filter((l) => l.method !== "unresolved").reduce((sum, l) => sum + l.records, 0),
            methods: {}, reasons: {}, movedOver100m: locations.filter((l) => l.previous_movement_m !== "" && l.previous_movement_m > 100).length };
        for (const row of locations) {
            const method = reports[key].methods[row.method] ||= { locations: 0, records: 0 };
            method.locations += 1; method.records += row.records;
        }
        for (const row of locations.filter((l) => l.method === "unresolved")) {
            const reason = reports[key].reasons[row.reason] ||= { locations: 0, records: 0 };
            reason.locations += 1; reason.records += row.records;
        }
        const unresolved = locations.filter((l) => l.method === "unresolved").sort((a, b) => b.records - a.records || a.orig_location.localeCompare(b.orig_location));
        fs.writeFileSync(path.join(directory, `${key}-geocoding-review.csv`), csv(unresolved, Object.keys(locations[0])));
    }
    const audit = { streetSource: snapshot.source, streetSnapshotDate: snapshot.retrievedOn,
        censusBenchmark: census.benchmark, censusRetrievedOn: census.retrievedOn, censusCachedAddresses: Object.keys(census.results).length,
        streetSnapshotSha256: crypto.createHash("sha256").update(fs.readFileSync(roadsPath)).digest("hex"), streetSegments: snapshot.rows.length, ...reports };
    fs.writeFileSync(path.join(directory, "geocoding-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
    console.log(JSON.stringify(audit, null, 2));
}

module.exports = { parseAddress, buildStreetIndex, matchAddress, censusFallback, addressSidePoint, distance, along, project, csv };
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
