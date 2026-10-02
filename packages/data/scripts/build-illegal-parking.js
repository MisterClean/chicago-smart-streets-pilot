const DEFINITIONS = {
    "PARK OR STAND IN BUS/TAXI/CARRIAGE STAND": { key: "bus_stop", label: "Bus/taxi/carriage stand" },
    "PARK/STAND ON BICYCLE PATH": { key: "bike_lane", label: "Bike lane" },
    "STAND, PARK, OR OTHER USE OF BUS LANE": { key: "bus_lane", label: "Bus lane" },
};

function buildIllegalParking(rows, locationRows, smartRecords) {
    const decoder = new Map(locationRows.map((row) => [row.orig_location, row]));
    const ids = new Set();
    const smartIds = new Set(smartRecords.map((record) => record.ticketNumber));
    const yearly = new Map(), monthly = new Map();
    const categories = Object.values(DEFINITIONS).map((d) => ({ ...d, records: 0 }));
    const dateKey = (row) => {
        const match = row["Date of Ticket"].match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (!match) throw new Error(`Invalid conventional ticket date: ${row["Date of Ticket"]}`);
        return `${match[3]}-${match[1]}-${match[2]}`;
    };
    const dates = rows.map(dateKey).sort();
    const commonStart = smartRecords[0].date > dates[0] ? smartRecords[0].date : dates[0];
    const commonEnd = smartRecords.at(-1).date < dates.at(-1) ? smartRecords.at(-1).date : dates.at(-1);
    const comparison = categories.map(({ key, label }) => ({ key, label, conventionalTickets: 0, smartStreetsFineTickets: 0 }));
    let mappedRecords = 0, missingLocationRecords = 0;
    for (const row of rows) {
        const ticket = row["Ticket Number"];
        if (!ticket || ids.has(ticket)) throw new Error(`Missing/duplicate conventional ticket: ${ticket}`);
        ids.add(ticket);
        if (smartIds.has(ticket)) throw new Error(`Ticket appears in both FOIA extracts: ${ticket}`);
        const type = DEFINITIONS[row["Violation Description"]];
        if (!type) throw new Error(`Unsupported conventional violation: ${row["Violation Description"]}`);
        const date = dateKey(row), year = date.slice(0, 4), month = date.slice(0, 7);
        for (const [map, key] of [[yearly, year], [monthly, month]]) {
            if (!map.has(key)) map.set(key, { period: key, records: 0, bike_lane: 0, bus_lane: 0, bus_stop: 0 });
            const aggregate = map.get(key); aggregate.records += 1; aggregate[type.key] += 1;
        }
        categories.find((c) => c.key === type.key).records += 1;
        if (!row.Location) missingLocationRecords += 1;
        if (decoder.get(row.Location)?.method !== "unresolved" && decoder.has(row.Location)) mappedRecords += 1;
        if (date >= commonStart && date <= commonEnd) comparison.find((c) => c.key === type.key).conventionalTickets += 1;
    }
    for (const record of smartRecords) {
        if (record.date >= commonStart && record.date <= commonEnd && record.fine > 0) {
            const category = comparison.find((c) => c.key === record.typeKey);
            if (category) category.smartStreetsFineTickets += 1;
        }
    }
    return { sourceFile: "_P197426_Illegal_Parking.xlsx", accurateAsOf: "2026-07-21", totalRecords: rows.length,
        dateRange: { start: dates[0], end: dates.at(-1) }, missingLocationRecords, mappedRecords,
        categories, yearly: [...yearly.values()].sort((a, b) => a.period.localeCompare(b.period)),
        monthly: [...monthly.values()].sort((a, b) => a.period.localeCompare(b.period)),
        commonPeriod: { start: commonStart, end: commonEnd, categories: comparison },
        note: "Conventional tickets cover Chicago citywide. Smart Streets covers its pilot area and changing camera coverage. Bus/taxi/carriage stand tickets are broader than Smart Streets bus-stop tickets. This comparison does not measure a reduction in illegal parking, enforcement effectiveness, or an equivalent geographic exposure. The conventional extract supplies no fine or payment amounts; its locations are masked to blocks and some are missing." };
}

module.exports = { buildIllegalParking };
