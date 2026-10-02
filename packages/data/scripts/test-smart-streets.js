const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { parseCsv } = require("./build-smart-streets-pilot.js");
const { buildStreetIndex, matchAddress, censusFallback, countyFallback, applyFallbacks, addressSidePoint, project, distance } = require("./geocode-smart-streets.js");

function street(overrides = {}) {
    return { objectid: "1", pre_dir: "W", street_nam: "TEST", street_typ: "ST", suf_dir: "", tiered: "N", f_zlev: "0", t_zlev: "0",
        l_f_add: "101", l_t_add: "199", r_f_add: "100", r_t_add: "198", l_parity: "O", r_parity: "E",
        the_geom: { type: "MultiLineString", coordinates: [[[-87.64, 41.88], [-87.641, 41.88]]] }, ...overrides };
}

test("matches the named frontage, even when a cross street is nearby", () => {
    const index = buildStreetIndex([street(), street({ objectid: "2", pre_dir: "N", street_nam: "CROSS" })]);
    const match = matchAddress("151 W TEST STREET", index);
    assert.equal(match.method, "street_interpolation");
    assert.equal(match.segmentId, "1");
    assert.equal(match.side, "l");
    assert.ok(match.point[0] < -87.64 && match.point[0] > -87.641);
    const side = addressSidePoint(match);
    assert.ok(side[1] < match.point[1]); // Left of westbound geometry is south.
    assert.ok(Math.abs(distance(match.point, side) - 6) < 0.01);
});

test("honors reversed address ranges and parity", () => {
    const index = buildStreetIndex([street({ l_f_add: "199", l_t_add: "101" })]);
    assert.equal(matchAddress("101 W TEST ST", index).point[0], -87.641);
    assert.equal(matchAddress("198 W TEST ST", index).side, "r");
});

test("does not force ambiguous, tiered, or malformed addresses onto a road", () => {
    assert.equal(matchAddress("151 W TEST ST", buildStreetIndex([street(), street({ objectid: "2", the_geom: { type: "MultiLineString", coordinates: [[[-87.65, 41.88], [-87.651, 41.88]]] } })])).reason, "ambiguous_segments");
    assert.equal(matchAddress("151 W LOWER TEST ST", buildStreetIndex([street()])).reason, "tier_not_resolved");
    assert.equal(matchAddress("151 W TEST ST", buildStreetIndex([street({ suf_dir: "NB" })])).method, "unresolved");
    assert.equal(matchAddress("", buildStreetIndex([])).reason, "missing_location");
    assert.equal(matchAddress("NE2477 W TEST ST", buildStreetIndex([])).reason, "unparsed_address");
});

test("masked addresses stay block estimates", () => {
    const match = matchAddress("1XX W TEST", buildStreetIndex([street()]));
    assert.equal(match.method, "block_estimate");
    assert.equal(match.precision, "block");
});

test("Census fallback must match the number, direction, street and nearby block", () => {
    const index = buildStreetIndex([street()]);
    const cached = { match: "Match", matchedAddress: "150 W TEST ST, CHICAGO, IL", coordinates: "-87.6405,41.8801", tigerLineId: "123" };
    assert.equal(censusFallback("150 W TEST ST", index, cached).method, "census_street_projection");
    assert.equal(censusFallback("150 E TEST ST", index, cached), null);
    assert.equal(censusFallback("151 W TEST ST", index, cached), null);
    assert.equal(censusFallback("150 W TEST ST", index, { ...cached, coordinates: "-87.7,41.9" }), null);
    assert.ok(project([-87.6405, 41.8801], street().the_geom.coordinates[0]).meters < 35);
});

const dataRoot = process.env.SMART_STREETS_OUTPUT_DIR || path.resolve(__dirname, "../../../apps/web/public/data");
test("county fallback cannot override a city or Census success and rejects review flags", () => {
    const index = buildStreetIndex([street()]);
    const cached = { address: "150 W TEST ST", source: "county_address_point", status: "accepted", current_method: "unresolved", warnings: "", pin10: "1234567890",
        longitude: "-87.6405", latitude: "41.88", raw_longitude: "-87.6405", raw_latitude: "41.8801", snap_distance_m: "11.1", segment_id: "1", county_candidate_count: "1" };
    assert.equal(countyFallback(cached.address, index, cached).method, "county_address_point_projection");
    assert.equal(applyFallbacks(cached.address, index, null, cached).method, "street_interpolation");
    const gapIndex = buildStreetIndex([street({ l_f_add: "101", l_t_add: "149", r_f_add: "100", r_t_add: "148" })]);
    const census = { match: "Match", matchedAddress: "150 W TEST ST, CHICAGO, IL", coordinates: "-87.6406,41.8801", tigerLineId: "123" };
    assert.equal(applyFallbacks(cached.address, gapIndex, census, cached).method, "census_street_projection");
    assert.equal(applyFallbacks(cached.address, gapIndex, null, cached).method, "county_address_point_projection");
    assert.equal(countyFallback(cached.address, index, { ...cached, warnings: "other_street_frontage_review" }), null);
    assert.equal(countyFallback(cached.address, index, { ...cached, longitude: "-87.7" }), null);
    assert.equal(countyFallback("1XX W TEST ST", index, cached), null);
});

test("all successful first-method locations, including 410 S Morgan, remain unchanged", () => {
    const directory = process.env.SMART_STREETS_SOURCE_DIR;
    if (!directory) return;
    const baseline = parseCsv(fs.readFileSync(path.join(directory, "previous/smartstreetslocdecoder-frontage-20261002.csv"), "utf8"));
    const current = new Map(parseCsv(fs.readFileSync(path.join(directory, "smartstreetslocdecoder-frontage.csv"), "utf8")).map((row) => [row.orig_location, row]));
    const county = JSON.parse(fs.readFileSync(path.join(directory, "county-geocoding-fallback.json"), "utf8"));
    for (const old of baseline.filter((row) => row.method !== "unresolved")) {
        for (const [field, value] of Object.entries(old)) assert.equal(current.get(old.orig_location)[field], value, `${old.orig_location}: ${field}`);
        assert.equal(county.results[old.orig_location], undefined);
    }
    const morgan = current.get("410 S MORGAN ST");
    assert.equal(morgan.method, "street_interpolation");
    assert.ok(Number(morgan.latitude) > 41.876);
    const additions = baseline.filter((row) => row.method === "unresolved" && current.get(row.orig_location).method !== "unresolved");
    assert.equal(additions.length, 69);
    assert.equal(additions.reduce((sum, row) => sum + Number(row.records), 0), 990);
});
test("published summaries account for every record, including unmapped tickets", () => {
    const data = JSON.parse(fs.readFileSync(path.join(dataRoot, "chicago-smart-streets-pilot.json"), "utf8"));
    const points = JSON.parse(fs.readFileSync(path.join(dataRoot, "chicago-smart-streets-points.geojson"), "utf8"));
    const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
    assert.equal(data.summary.totalRecords, 130788);
    assert.equal(data.summary.totalFines, 4215140);
    assert.equal(data.summary.mappedRecords + data.summary.unmappedRecords, data.summary.totalRecords);
    for (const rows of [data.categories, data.yearly, data.monthly, data.daily, data.wards, data.zones, data.locations, data.corridors, data.hourly, data.weekdays]) {
        assert.equal(sum(rows, "records"), data.summary.totalRecords);
        assert.equal(sum(rows, "fines"), data.summary.totalFines);
    }
    assert.equal(sum(points.features.map((p) => p.properties), "records"), data.summary.mappedRecords);
    assert.equal(data.geocoding.smartStreets.mappedRecords, data.summary.mappedRecords);
    assert.equal(data.illegalParking.totalRecords, 43745);
    assert.equal(sum(data.illegalParking.yearly, "records"), 43745);
    assert.equal(sum(data.illegalParking.monthly, "records"), 43745);
    assert.equal(sum(data.illegalParking.categories, "records"), 43745);
    assert.equal(data.refresh.smartStreets.addedTickets, 26035);
    assert.equal(data.refresh.smartStreets.removedTickets, 0);
    assert.ok(points.features.every((feature) => feature.geometry.coordinates.every(Number.isFinite)));
});

test("every published point lies on its recorded frontage segment", () => {
    const directory = process.env.SMART_STREETS_SOURCE_DIR;
    if (!directory) return;
    const zlib = require("node:zlib");
    const snapshot = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(directory, "chicago-street-centerlines.json.gz"))));
    const roads = new Map(snapshot.rows.map((row) => [String(row.objectid), row]));
    for (const filename of ["smartstreetslocdecoder-frontage.csv", "illegal-parking-locations.csv"]) {
        const rows = parseCsv(fs.readFileSync(path.join(directory, filename), "utf8"));
        for (const row of rows.filter((r) => r.method !== "unresolved")) {
            const road = roads.get(row.segment_id);
            assert.ok(road, `${row.orig_location}: missing segment`);
            assert.equal(row.street, `${road.pre_dir} ${road.street_nam} ${road.street_typ}`.trim());
            assert.ok(project([Number(row.longitude), Number(row.latitude)], road.the_geom.coordinates[0]).meters < 0.01, row.orig_location);
        }
    }
});
