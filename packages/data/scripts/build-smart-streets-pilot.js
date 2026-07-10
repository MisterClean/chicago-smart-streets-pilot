#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");
const dataPackageRoot = path.resolve(__dirname, "..");
const webDataRoot = path.join(repoRoot, "apps", "web", "public", "data");
const sourceFilenames = {
    violations: "smartstreetsjune26.csv",
    locations: "smartstreetslocdecoder.csv",
    zones: "smartstreetszones.geojson",
};
const sourceRoot = process.env.SMART_STREETS_SOURCE_DIR
    ? path.resolve(process.env.SMART_STREETS_SOURCE_DIR)
    : path.join(dataPackageRoot, "source");
const sourceBaseUrl = trimTrailingSlash(process.env.SMART_STREETS_SOURCE_BASE_URL || "");
const publicSourceBaseUrl = trimTrailingSlash(process.env.SMART_STREETS_PUBLIC_SOURCE_BASE_URL || (sourceBaseUrl ? sourceBaseUrl : "data/source"));
const sourceArchiveUrl = process.env.SMART_STREETS_SOURCE_ARCHIVE_URL
    || (publicSourceBaseUrl ? `${publicSourceBaseUrl}/chicago-smart-streets-pilot-source-files.zip` : "");
const generatedAt = process.env.SMART_STREETS_GENERATED_AT || "2026-05-14T21:53:00.000Z";
const wardsPath = process.env.SMART_STREETS_WARDS_GEOJSON
    ? path.resolve(process.env.SMART_STREETS_WARDS_GEOJSON)
    : path.join(webDataRoot, "chicago-wards.geojson");
const chicagoWardBoundariesUrl = "https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Wards-2023-/p293-wvbd";

const sourcePaths = {
    violations: process.argv[2] || process.env.SMART_STREETS_VIOLATIONS_CSV || sourceLocation("violations"),
    locations: process.argv[3] || process.env.SMART_STREETS_LOCATIONS_CSV || sourceLocation("locations"),
    zones: process.argv[4] || process.env.SMART_STREETS_ZONES_GEOJSON || sourceLocation("zones"),
};

const outputPaths = {
    notebook: path.join(webDataRoot, "chicago-smart-streets-pilot.json"),
    points: path.join(webDataRoot, "chicago-smart-streets-points.geojson"),
    zones: path.join(webDataRoot, "chicago-smart-streets-zones.geojson"),
};

const TYPE_DEFINITIONS = {
    "ZERO FINE WARNING - SMRT ST": {
        key: "zero_warning",
        label: "Zero Fine Warning",
        shortLabel: "Zero Fine Warning",
        chartLabel: "Zero Fine Warning",
        color: "#c9c9c9",
        isWarning: true,
        sort: 5,
    },
    "30 DAY INSTALLATION WARNING - SMRT ST": {
        key: "install_warning",
        label: "30 Day Installation Warning",
        shortLabel: "Installation Warning",
        chartLabel: "30 Day Installation Warning",
        color: "#9c9c9c",
        isWarning: true,
        sort: 6,
    },
    "PARK/STAND ON BICYCLE PATH - SMRT ST": {
        key: "bike_lane",
        label: "Bike Lane Violation Fine Issued",
        shortLabel: "Bike Lane",
        chartLabel: "Bike Lane Violation",
        color: "#009b3a",
        isWarning: false,
        sort: 0,
    },
    "STND, PARK OR OTHER USE OF BUS LANE-SMRT ST": {
        key: "bus_lane",
        label: "Bus Lane Violation Fine Issued",
        shortLabel: "Bus Lane",
        chartLabel: "Bus Lane Violation",
        color: "#e9003a",
        isWarning: false,
        sort: 1,
    },
    "PARK OR STAND IN BUS STOP/STAND SMRT ST": {
        key: "bus_stop",
        label: "Parked In Bus Stop",
        shortLabel: "Bus Stop",
        chartLabel: "Parked In Bus Stop",
        color: "#ff4b20",
        isWarning: false,
        sort: 2,
    },
    "EXP. METER NON-CENTRAL BUS. DIST. - SMRT ST": {
        key: "expired_meter_non_central",
        label: "Exp. Meter Non-Central Bus. Dist.",
        shortLabel: "Expired Meter Non-CBD",
        chartLabel: "Exp. Meter Non-Central Bus. Dist.",
        color: "#12a6d8",
        isWarning: false,
        sort: 3,
    },
    "EXP. METER CENTRAL BUS. DIST. - SMRT ST": {
        key: "expired_meter_central",
        label: "Exp. Meter Central Bus Dist.",
        shortLabel: "Expired Meter CBD",
        chartLabel: "Exp. Meter Central Bus Dist.",
        color: "#09098f",
        isWarning: false,
        sort: 4,
    },
};

const STREET_SUFFIXES = new Set([
    "ST",
    "AVE",
    "AV",
    "BLVD",
    "PKWY",
    "DR",
    "RD",
    "PL",
    "CT",
    "TER",
    "LN",
    "WAY",
    "CIR",
]);

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SIGNIFICANT_EXPANSION_DAILY_VIOLATIONS = 50;

const VEHICLE_DEPARTMENTS = {
    finance: {
        key: "finance",
        label: "Finance",
        longLabel: "Department of Finance",
    },
    transportation: {
        key: "transportation",
        label: "Transportation",
        longLabel: "Chicago Department of Transportation",
    },
    cta_bus: {
        key: "cta_bus",
        label: "CTA Bus",
        longLabel: "CTA Bus",
    },
};

function trimTrailingSlash(value) {
    return value.replace(/\/+$/, "");
}

function sourceLocation(key) {
    const filename = sourceFilenames[key];
    return sourceBaseUrl ? `${sourceBaseUrl}/${filename}` : path.join(sourceRoot, filename);
}

function isHttpUrl(value) {
    return /^https?:\/\//i.test(value);
}

function basenameFromSource(source) {
    if (isHttpUrl(source)) {
        return path.basename(new URL(source).pathname);
    }

    return path.basename(source);
}

function publicSourceFile(label, key) {
    if (!publicSourceBaseUrl) return null;

    const filename = sourceFilenames[key];
    return {
        label,
        filename,
        href: `${publicSourceBaseUrl}/${filename}`,
    };
}

async function readTextSource(label, source) {
    if (isHttpUrl(source)) {
        const response = await fetch(source);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${label} from ${source}: ${response.status} ${response.statusText}`);
        }
        return response.text();
    }

    try {
        return fs.readFileSync(source, "utf8");
    } catch (error) {
        error.message = [
            `Could not read ${label} source file at ${source}.`,
            "Expected source files in packages/data/source,",
            "or set SMART_STREETS_SOURCE_DIR / SMART_STREETS_SOURCE_BASE_URL to override the source location.",
            `Original error: ${error.message}`,
        ].join(" ");
        throw error;
    }
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];

        if (char === '"') {
            if (inQuotes && text[index + 1] === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === "," && !inQuotes) {
            row.push(current);
            current = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && text[index + 1] === "\n") {
                index += 1;
            }
            row.push(current);
            current = "";
            if (row.some((value) => value.length > 0)) {
                rows.push(row);
            }
            row = [];
            continue;
        }

        current += char;
    }

    if (current.length || row.length) {
        row.push(current);
        if (row.some((value) => value.length > 0)) {
            rows.push(row);
        }
    }

    const [headers, ...body] = rows;
    return body.map((values) => Object.fromEntries(headers.map((header, index) => [
        header.replace(/^\uFEFF/, ""),
        values[index] ?? "",
    ])));
}

function parseIssuedDate(value) {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) {
        throw new Error(`Could not parse issued date: ${value}`);
    }

    const [, month, day, year, hour, minute, second] = match.map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function dateKey(date) {
    return date.toISOString().slice(0, 10);
}

function monthKey(date) {
    return date.toISOString().slice(0, 7);
}

function dayOfYear(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    return Math.floor((date.getTime() - start) / 86400000) + 1;
}

function eachDate(startDate, endDate, callback) {
    for (
        let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
        cursor <= endDate;
        cursor = new Date(cursor.getTime() + 86400000)
    ) {
        callback(new Date(cursor));
    }
}

function monthLabel(key) {
    const [year, month] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
}

function getTypeDefinition(description) {
    return TYPE_DEFINITIONS[description] ?? {
        key: description.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
        label: description,
        shortLabel: description,
        chartLabel: description,
        color: "#64748b",
        isWarning: false,
        sort: 99,
    };
}

function pointOnSegment(point, start, end) {
    const [px, py] = point;
    const [x1, y1] = start;
    const [x2, y2] = end;
    const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
    if (Math.abs(cross) > 1e-12) return false;
    const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
    return dot <= 1e-12;
}

function pointInRing(point, ring) {
    let inside = false;

    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
        const current = ring[index];
        const prior = ring[previous];

        if (pointOnSegment(point, current, prior)) {
            return true;
        }

        const intersects =
            (current[1] > point[1]) !== (prior[1] > point[1]) &&
            point[0] <
                ((prior[0] - current[0]) * (point[1] - current[1])) /
                    (prior[1] - current[1] || Number.EPSILON) +
                    current[0];

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}

function pointInPolygon(point, polygon) {
    if (!pointInRing(point, polygon[0])) return false;
    return !polygon.slice(1).some((ring) => pointInRing(point, ring));
}

function pointInGeometry(point, geometry) {
    if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
    if (geometry.type === "MultiPolygon") return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
    return false;
}

function classifyZone(point, zoneFeatures) {
    const initial = zoneFeatures.find((feature) => feature.properties.Boundary === "Initial Pilot Zone");
    const expansion = zoneFeatures.find((feature) => feature.properties.Boundary === "Expansion Zone");

    if (initial && pointInGeometry(point, initial.geometry)) return "Initial Pilot Zone";
    if (expansion && pointInGeometry(point, expansion.geometry)) return "Expansion Zone";
    return "Outside Supplied Zones";
}

function classifyWard(point, wardFeatures) {
    const ward = wardFeatures.find((feature) => pointInGeometry(point, feature.geometry));
    return ward?.properties?.ward ? String(ward.properties.ward) : "Unknown";
}

function vehicleDepartment(cameraId) {
    const normalized = String(cameraId || "").trim().toUpperCase();
    if (normalized.startsWith("FI")) return VEHICLE_DEPARTMENTS.finance;
    if (normalized.startsWith("DT")) return VEHICLE_DEPARTMENTS.transportation;
    return VEHICLE_DEPARTMENTS.cta_bus;
}

function naturalCameraCompare(a, b) {
    return a.localeCompare(b, "en-US", { numeric: true, sensitivity: "base" });
}

function extractCorridor(location) {
    const parts = location.replace(/\s+/g, " ").trim().split(" ");
    if (parts.length < 3) return location.trim();

    const startIndex = ["N", "S", "E", "W"].includes(parts[1]) ? 2 : 1;
    let endIndex = parts.length;
    const lastToken = parts[endIndex - 1].replace(/\./g, "").toUpperCase();
    if (STREET_SUFFIXES.has(lastToken)) {
        endIndex -= 1;
    }

    return parts.slice(startIndex, endIndex).join(" ").trim() || location.trim();
}

function incrementTypeBucket(bucket, typeKey, amount = 1) {
    bucket[typeKey] = (bucket[typeKey] || 0) + amount;
}

function emptyTypeObject(typeKeys) {
    return Object.fromEntries(typeKeys.map((key) => [key, 0]));
}

function topEntries(map, sortField, limit) {
    return [...map.values()]
        .sort((a, b) => b[sortField] - a[sortField] || a.name.localeCompare(b.name))
        .slice(0, limit);
}

function topTypeSummary(bucket, typeKeys, typeByKey) {
    const [typeKey, value] = typeKeys
        .map((key) => [key, bucket[key] || 0])
        .sort((a, b) => b[1] - a[1] || typeByKey[a[0]].sort - typeByKey[b[0]].sort)[0] ?? [null, 0];

    if (!typeKey || value <= 0) return null;

    return {
        key: typeKey,
        label: typeByKey[typeKey].shortLabel,
        value,
    };
}

function buildCumulativeSeries(groups, records, startDate, endDate, groupForRecord) {
    const dailyByGroup = new Map(groups.map((group) => [group.key, new Map()]));

    for (const record of records) {
        const group = groupForRecord(record);
        if (!group || !dailyByGroup.has(group.key)) continue;

        const daily = dailyByGroup.get(group.key);
        if (!daily.has(record.date)) {
            daily.set(record.date, {
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
            });
        }

        const day = daily.get(record.date);
        const isFineRecord = record.fine > 0;
        day.records += 1;
        day.fineRecords += isFineRecord ? 1 : 0;
        day.warnings += isFineRecord ? 0 : 1;
        day.fines += record.fine;
    }

    return groups.map((group) => {
        const daily = dailyByGroup.get(group.key);
        let index = -1;
        let cumulativeRecords = 0;
        let cumulativeFines = 0;
        const points = [];

        eachDate(startDate, endDate, (date) => {
            index += 1;
            const key = dateKey(date);
            const day = daily.get(key) ?? {
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
            };
            cumulativeRecords += day.records;
            cumulativeFines += day.fines;
            points.push({
                date: key,
                index,
                records: day.records,
                fineRecords: day.fineRecords,
                warnings: day.warnings,
                fines: day.fines,
                cumulativeRecords,
                cumulativeFines,
            });
        });

        return {
            ...group,
            records: cumulativeRecords,
            fines: cumulativeFines,
            points,
        };
    }).filter((series) => series.records > 0 || series.fines > 0);
}

async function main() {
    const [violationsText, locationsText, zonesText] = await Promise.all([
        readTextSource("violations", sourcePaths.violations),
        readTextSource("locations", sourcePaths.locations),
        readTextSource("zones", sourcePaths.zones),
    ]);
    const violations = parseCsv(violationsText);
    const locationRows = parseCsv(locationsText);
    const zones = JSON.parse(zonesText);
    const wards = JSON.parse(fs.readFileSync(wardsPath, "utf8"));

    const locations = new Map(locationRows.map((row) => [
        row.orig_location,
        {
            longitude: Number(row.longitude),
            latitude: Number(row.latitude),
            addressClean: row.address_clean,
            ward: classifyWard([Number(row.longitude), Number(row.latitude)], wards.features),
        },
    ]));

    const typeList = Object.values(TYPE_DEFINITIONS).sort((a, b) => a.sort - b.sort);
    const typeKeys = typeList.map((type) => type.key);
    const fineTypeKeys = typeList.filter((type) => !type.isWarning).map((type) => type.key);
    const typeByKey = Object.fromEntries(typeList.map((type) => [type.key, type]));

    const records = violations.map((row) => {
        const location = locations.get(row.Location);
        if (!location) {
            throw new Error(`Location decoder missing: ${row.Location}`);
        }

        const issuedAt = parseIssuedDate(row["Issued Date"]);
        const type = getTypeDefinition(row["Violation Description"]);
        const fine = Number(row["Fine Level 1"] || 0);
        const point = [location.longitude, location.latitude];
        const department = vehicleDepartment(row["Camera ID"]);

        return {
            ticketNumber: row["Ticket Number"],
            issuedAt,
            date: dateKey(issuedAt),
            month: monthKey(issuedAt),
            year: issuedAt.getUTCFullYear(),
            dayOfYear: dayOfYear(issuedAt),
            dayOfWeek: WEEKDAY_LABELS[issuedAt.getUTCDay()],
            dayOfWeekIndex: issuedAt.getUTCDay(),
            hour: issuedAt.getUTCHours(),
            location: row.Location,
            corridor: extractCorridor(row.Location),
            violationCode: row["Violation Code"],
            violationDescription: row["Violation Description"],
            typeKey: type.key,
            fine,
            cameraId: row["Camera ID"],
            cameraDepartmentKey: department.key,
            cameraDepartmentLabel: department.label,
            longitude: location.longitude,
            latitude: location.latitude,
            ward: location.ward,
            zone: classifyZone(point, zones.features),
        };
    });

    records.sort((a, b) => a.issuedAt - b.issuedAt);

    const expansionDailyMap = new Map();
    for (const record of records) {
        if (record.zone !== "Expansion Zone") continue;
        if (!expansionDailyMap.has(record.date)) {
            expansionDailyMap.set(record.date, {
                date: record.date,
                records: 0,
                fineRecords: 0,
                fines: 0,
            });
        }
        const day = expansionDailyMap.get(record.date);
        day.records += 1;
        day.fineRecords += record.fine > 0 ? 1 : 0;
        day.fines += record.fine;
    }
    const significantExpansionDay = [...expansionDailyMap.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
        .find((day) => day.records >= SIGNIFICANT_EXPANSION_DAILY_VIOLATIONS);

    const dateStart = records[0].date;
    const dateEnd = records[records.length - 1].date;
    const startDate = new Date(`${dateStart}T00:00:00Z`);
    const endDate = new Date(`${dateEnd}T00:00:00Z`);
    const calendarDays = Math.floor((endDate - startDate) / 86400000) + 1;

    const categories = typeList.map((type) => ({
        key: type.key,
        label: type.label,
        shortLabel: type.shortLabel,
        chartLabel: type.chartLabel,
        color: type.color,
        isWarning: type.isWarning,
        records: 0,
        fineRecords: 0,
        warnings: 0,
        fines: 0,
    }));
    const categoryByKey = Object.fromEntries(categories.map((category) => [category.key, category]));

    const monthlyMap = new Map();
    const dailyMap = new Map();
    const yearlyMap = new Map();
    const weekdayMap = new Map();
    const hourlyMap = new Map();
    const locationMap = new Map();
    const corridorMap = new Map();
    const zoneMap = new Map();
    const cameraMap = new Map();
    const wardMap = new Map(wards.features.map((feature) => {
        const ward = String(feature.properties.ward);
        return [ward, {
            ward,
            name: `Ward ${ward}`,
            records: 0,
            fineRecords: 0,
            warnings: 0,
            fines: 0,
            byType: emptyTypeObject(typeKeys),
            finesByType: emptyTypeObject(typeKeys),
        }];
    }));
    const mapPointMap = new Map();
    const uniqueDates = new Set();
    const uniqueLocations = new Set();
    const uniqueCameras = new Set();

    for (const record of records) {
        const type = categoryByKey[record.typeKey];
        const isFineRecord = record.fine > 0;
        type.records += 1;
        type.fineRecords += isFineRecord ? 1 : 0;
        type.warnings += isFineRecord ? 0 : 1;
        type.fines += record.fine;

        uniqueDates.add(record.date);
        uniqueLocations.add(record.location);
        uniqueCameras.add(record.cameraId);

        if (!monthlyMap.has(record.month)) {
            monthlyMap.set(record.month, {
                month: record.month,
                label: monthLabel(record.month),
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const month = monthlyMap.get(record.month);
        month.records += 1;
        month.fineRecords += isFineRecord ? 1 : 0;
        month.warnings += isFineRecord ? 0 : 1;
        month.fines += record.fine;
        incrementTypeBucket(month.byType, record.typeKey);
        incrementTypeBucket(month.finesByType, record.typeKey, record.fine);

        if (!dailyMap.has(record.date)) {
            dailyMap.set(record.date, {
                date: record.date,
                year: record.year,
                dayOfYear: record.dayOfYear,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const day = dailyMap.get(record.date);
        day.records += 1;
        day.fineRecords += isFineRecord ? 1 : 0;
        day.warnings += isFineRecord ? 0 : 1;
        day.fines += record.fine;
        incrementTypeBucket(day.byType, record.typeKey);
        incrementTypeBucket(day.finesByType, record.typeKey, record.fine);

        if (!yearlyMap.has(record.year)) {
            yearlyMap.set(record.year, {
                year: record.year,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const year = yearlyMap.get(record.year);
        year.records += 1;
        year.fineRecords += isFineRecord ? 1 : 0;
        year.warnings += isFineRecord ? 0 : 1;
        year.fines += record.fine;
        incrementTypeBucket(year.byType, record.typeKey);
        incrementTypeBucket(year.finesByType, record.typeKey, record.fine);

        if (!weekdayMap.has(record.dayOfWeek)) {
            weekdayMap.set(record.dayOfWeek, {
                day: record.dayOfWeek,
                dayIndex: record.dayOfWeekIndex,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const weekday = weekdayMap.get(record.dayOfWeek);
        weekday.records += 1;
        weekday.fineRecords += isFineRecord ? 1 : 0;
        weekday.warnings += isFineRecord ? 0 : 1;
        weekday.fines += record.fine;
        incrementTypeBucket(weekday.byType, record.typeKey);
        incrementTypeBucket(weekday.finesByType, record.typeKey, record.fine);

        if (!hourlyMap.has(record.hour)) {
            hourlyMap.set(record.hour, {
                hour: record.hour,
                label: `${String(record.hour).padStart(2, "0")}:00`,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const hour = hourlyMap.get(record.hour);
        hour.records += 1;
        hour.fineRecords += isFineRecord ? 1 : 0;
        hour.warnings += isFineRecord ? 0 : 1;
        hour.fines += record.fine;
        incrementTypeBucket(hour.byType, record.typeKey);
        incrementTypeBucket(hour.finesByType, record.typeKey, record.fine);

        if (!locationMap.has(record.location)) {
            locationMap.set(record.location, {
                name: record.location,
                corridor: record.corridor,
                longitude: record.longitude,
                latitude: record.latitude,
                ward: record.ward,
                zone: record.zone,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
                firstDate: record.date,
                lastDate: record.date,
            });
        }
        const location = locationMap.get(record.location);
        location.records += 1;
        location.fineRecords += isFineRecord ? 1 : 0;
        location.warnings += isFineRecord ? 0 : 1;
        location.fines += record.fine;
        location.firstDate = record.date < location.firstDate ? record.date : location.firstDate;
        location.lastDate = record.date > location.lastDate ? record.date : location.lastDate;
        incrementTypeBucket(location.byType, record.typeKey);
        incrementTypeBucket(location.finesByType, record.typeKey, record.fine);

        if (!corridorMap.has(record.corridor)) {
            corridorMap.set(record.corridor, {
                name: record.corridor,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const corridor = corridorMap.get(record.corridor);
        corridor.records += 1;
        corridor.fineRecords += isFineRecord ? 1 : 0;
        corridor.warnings += isFineRecord ? 0 : 1;
        corridor.fines += record.fine;
        incrementTypeBucket(corridor.byType, record.typeKey);
        incrementTypeBucket(corridor.finesByType, record.typeKey, record.fine);

        if (!zoneMap.has(record.zone)) {
            zoneMap.set(record.zone, {
                name: record.zone,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const zone = zoneMap.get(record.zone);
        zone.records += 1;
        zone.fineRecords += isFineRecord ? 1 : 0;
        zone.warnings += isFineRecord ? 0 : 1;
        zone.fines += record.fine;
        incrementTypeBucket(zone.byType, record.typeKey);
        incrementTypeBucket(zone.finesByType, record.typeKey, record.fine);

        if (!wardMap.has(record.ward)) {
            wardMap.set(record.ward, {
                ward: record.ward,
                name: record.ward === "Unknown" ? "Unknown Ward" : `Ward ${record.ward}`,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const ward = wardMap.get(record.ward);
        ward.records += 1;
        ward.fineRecords += isFineRecord ? 1 : 0;
        ward.warnings += isFineRecord ? 0 : 1;
        ward.fines += record.fine;
        incrementTypeBucket(ward.byType, record.typeKey);
        incrementTypeBucket(ward.finesByType, record.typeKey, record.fine);

        if (!cameraMap.has(record.cameraId)) {
            const department = vehicleDepartment(record.cameraId);
            cameraMap.set(record.cameraId, {
                name: record.cameraId,
                departmentKey: department.key,
                departmentLabel: department.label,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                firstDate: record.date,
                lastDate: record.date,
                byType: emptyTypeObject(typeKeys),
                finesByType: emptyTypeObject(typeKeys),
            });
        }
        const camera = cameraMap.get(record.cameraId);
        camera.records += 1;
        camera.fineRecords += isFineRecord ? 1 : 0;
        camera.warnings += isFineRecord ? 0 : 1;
        camera.fines += record.fine;
        camera.firstDate = record.date < camera.firstDate ? record.date : camera.firstDate;
        camera.lastDate = record.date > camera.lastDate ? record.date : camera.lastDate;
        incrementTypeBucket(camera.byType, record.typeKey);
        incrementTypeBucket(camera.finesByType, record.typeKey, record.fine);

        const mapKey = `${record.location}|||${record.typeKey}`;
        if (!mapPointMap.has(mapKey)) {
            mapPointMap.set(mapKey, {
                location: record.location,
                corridor: record.corridor,
                ward: record.ward,
                typeKey: record.typeKey,
                typeLabel: typeByKey[record.typeKey].label,
                typeColor: typeByKey[record.typeKey].color,
                longitude: record.longitude,
                latitude: record.latitude,
                zone: record.zone,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
                firstDate: record.date,
                lastDate: record.date,
                cameras: new Set(),
            });
        }
        const mapPoint = mapPointMap.get(mapKey);
        mapPoint.records += 1;
        mapPoint.fineRecords += isFineRecord ? 1 : 0;
        mapPoint.warnings += isFineRecord ? 0 : 1;
        mapPoint.fines += record.fine;
        mapPoint.firstDate = record.date < mapPoint.firstDate ? record.date : mapPoint.firstDate;
        mapPoint.lastDate = record.date > mapPoint.lastDate ? record.date : mapPoint.lastDate;
        mapPoint.cameras.add(record.cameraId);
    }

    const months = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));
    const dailySeries = [];
    eachDate(startDate, endDate, (date) => {
        const key = dateKey(date);
        dailySeries.push(dailyMap.get(key) ?? {
            date: key,
            year: date.getUTCFullYear(),
            dayOfYear: dayOfYear(date),
            records: 0,
            fineRecords: 0,
            warnings: 0,
            fines: 0,
            byType: emptyTypeObject(typeKeys),
            finesByType: emptyTypeObject(typeKeys),
        });
    });

    const annualCumulative = [...yearlyMap.keys()].sort().map((year) => {
        const yearDays = dailySeries.filter((item) => item.year === year);
        let cumulativeRecords = 0;
        let cumulativeFines = 0;

        return {
            year,
            records: yearlyMap.get(year).records,
            fines: yearlyMap.get(year).fines,
            points: yearDays.map((item) => {
                cumulativeRecords += item.records;
                cumulativeFines += item.fines;
                return {
                    date: item.date,
                    dayOfYear: item.dayOfYear,
                    records: item.records,
                    fines: item.fines,
                    cumulativeRecords,
                    cumulativeFines,
                };
            }),
        };
    });

    const latestYear = Math.max(...yearlyMap.keys());
    const typeCumulative = [];
    const cumulativeByType = emptyTypeObject(fineTypeKeys);

    for (const day of dailySeries.filter((item) => item.year === latestYear)) {
        for (const typeKey of fineTypeKeys) {
            cumulativeByType[typeKey] += day.finesByType[typeKey] || 0;
        }
        typeCumulative.push({
            date: day.date,
            dayOfYear: day.dayOfYear,
            total: fineTypeKeys.reduce((sum, typeKey) => sum + cumulativeByType[typeKey], 0),
            byType: { ...cumulativeByType },
        });
    }

    const weekdays = WEEKDAY_ORDER.map((day) => weekdayMap.get(day) ?? {
        day,
        dayIndex: WEEKDAY_LABELS.indexOf(day),
        records: 0,
        fineRecords: 0,
        warnings: 0,
        fines: 0,
        byType: emptyTypeObject(typeKeys),
        finesByType: emptyTypeObject(typeKeys),
    });
    const hourly = Array.from({ length: 24 }, (_, hour) => hourlyMap.get(hour) ?? {
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        records: 0,
        fineRecords: 0,
        warnings: 0,
        fines: 0,
        byType: emptyTypeObject(typeKeys),
        finesByType: emptyTypeObject(typeKeys),
    });

    const wardRows = [...wardMap.values()]
        .map((ward) => ({
            ...ward,
            topViolationType: topTypeSummary(ward.byType, fineTypeKeys, typeByKey),
            topFineCategory: topTypeSummary(ward.finesByType, fineTypeKeys, typeByKey),
        }))
        .sort((a, b) => {
            if (a.ward === "Unknown") return 1;
            if (b.ward === "Unknown") return -1;
            return Number(a.ward) - Number(b.ward);
        });

    const cameraGroups = [...cameraMap.values()]
        .map((camera) => ({
            key: camera.name,
            label: camera.name,
            departmentKey: camera.departmentKey,
            departmentLabel: camera.departmentLabel,
        }))
        .sort((a, b) => naturalCameraCompare(a.key, b.key));
    const departmentGroups = Object.values(VEHICLE_DEPARTMENTS).map((department) => ({
        key: department.key,
        label: department.label,
        longLabel: department.longLabel,
    }));
    const vehicleCumulative = {
        dateRange: { start: dateStart, end: dateEnd },
        departments: buildCumulativeSeries(departmentGroups, records, startDate, endDate, (record) => VEHICLE_DEPARTMENTS[record.cameraDepartmentKey])
            .sort((a, b) => b.fines - a.fines || a.label.localeCompare(b.label)),
        cameras: buildCumulativeSeries(cameraGroups, records, startDate, endDate, (record) => ({
            key: record.cameraId,
        })),
    };

    const topTypeByFine = [...categories].sort((a, b) => b.fines - a.fines)[0];
    const topTypeByRecords = [...categories].sort((a, b) => b.records - a.records)[0];
    const peakMonth = [...months].sort((a, b) => b.records - a.records)[0];
    const peakFineMonth = [...months].sort((a, b) => b.fines - a.fines)[0];
    const peakDay = [...dailyMap.values()].sort((a, b) => b.records - a.records)[0];
    const peakFineDay = [...dailyMap.values()].sort((a, b) => b.fines - a.fines)[0];
    const peakWeekday = [...weekdays].sort((a, b) => b.records - a.records)[0];
    const peakFineWeekday = [...weekdays].sort((a, b) => b.fines - a.fines)[0];
    const peakHour = [...hourly].sort((a, b) => b.records - a.records)[0];
    const peakFineHour = [...hourly].sort((a, b) => b.fines - a.fines)[0];
    const firstFineDate = records.find((record) => record.fine > 0)?.date ?? null;

    const summary = {
        totalRecords: records.length,
        totalFines: records.reduce((sum, record) => sum + record.fine, 0),
        fineRecords: records.filter((record) => record.fine > 0).length,
        warnings: records.filter((record) => record.fine === 0).length,
        zeroFineWarnings: categoryByKey.zero_warning.records,
        installationWarnings: categoryByKey.install_warning.records,
        uniqueLocations: uniqueLocations.size,
        uniqueCameras: uniqueCameras.size,
        activeRecordDays: uniqueDates.size,
        calendarDays,
        dateRange: { start: dateStart, end: dateEnd },
        firstFineDate,
        latestYear,
        latestYearFines: yearlyMap.get(latestYear).fines,
        latestYearRecords: yearlyMap.get(latestYear).records,
        latestYearAverageDailyFines: yearlyMap.get(latestYear).fines / dailySeries.filter((item) => item.year === latestYear && item.records > 0).length,
        topTypeByFine: {
            key: topTypeByFine.key,
            label: topTypeByFine.label,
            fines: topTypeByFine.fines,
            records: topTypeByFine.records,
        },
        topTypeByRecords: {
            key: topTypeByRecords.key,
            label: topTypeByRecords.label,
            records: topTypeByRecords.records,
            fines: topTypeByRecords.fines,
        },
        peakMonth: {
            month: peakMonth.month,
            label: peakMonth.label,
            records: peakMonth.records,
            fines: peakMonth.fines,
        },
        peakFineMonth: {
            month: peakFineMonth.month,
            label: peakFineMonth.label,
            records: peakFineMonth.records,
            fines: peakFineMonth.fines,
        },
        peakDay: {
            date: peakDay.date,
            records: peakDay.records,
            fines: peakDay.fines,
        },
        peakFineDay: {
            date: peakFineDay.date,
            records: peakFineDay.records,
            fines: peakFineDay.fines,
        },
        peakWeekday: {
            day: peakWeekday.day,
            records: peakWeekday.records,
            fines: peakWeekday.fines,
        },
        peakFineWeekday: {
            day: peakFineWeekday.day,
            records: peakFineWeekday.records,
            fines: peakFineWeekday.fines,
        },
        peakHour: {
            hour: peakHour.hour,
            label: peakHour.label,
            records: peakHour.records,
            fines: peakHour.fines,
        },
        peakFineHour: {
            hour: peakFineHour.hour,
            label: peakFineHour.label,
            records: peakFineHour.records,
            fines: peakFineHour.fines,
        },
        pilotExpansion: significantExpansionDay ? {
            date: significantExpansionDay.date,
            dailyViolations: significantExpansionDay.records,
            fineBearingViolations: significantExpansionDay.fineRecords,
            fines: significantExpansionDay.fines,
            threshold: SIGNIFICANT_EXPANSION_DAILY_VIOLATIONS,
            note: "First day with at least 50 violations inside the expansion zone and outside the initial pilot zone.",
        } : null,
    };

    const sourceFiles = [
        publicSourceFile("Violation FOIA export", "violations"),
        publicSourceFile("Location decoder", "locations"),
        publicSourceFile("Smart Streets zones", "zones"),
    ].filter(Boolean);
    const sources = {
        violationsCsv: basenameFromSource(sourcePaths.violations),
        locationDecoderCsv: basenameFromSource(sourcePaths.locations),
        zonesGeojson: basenameFromSource(sourcePaths.zones),
        wardsGeojson: path.basename(wardsPath),
        wardBoundariesUrl: chicagoWardBoundariesUrl,
        note: "Violations are from a Chicago Department of Finance FOIA export obtained by Alex Cannon.",
        primaryLinks: [
            {
                label: "Chicago.gov Smart Streets program page",
                href: "https://www.chicago.gov/SmartStreets",
            },
            {
                label: "Municipal Code Chapter 9-108",
                href: "https://codelibrary.amlegal.com/codes/chicago/latest/chicago_il/0-0-0-2647996",
            },
            {
                label: "2023 Smart Streets ordinance",
                href: "https://chicago.legistar.com/View.ashx?GUID=615C8724-6B43-4A5B-9DFF-D03A0D071320&ID=11745727&M=F",
            },
            {
                label: "CTA Smart Streets launch release",
                href: "https://www.transitchicago.com/city-of-chicago-and-cta-expand-smart-streets-pilot-with-automated-bus-lane-enforcement-technology-aimed-at-improving-safety-and-bus-service-reliability/",
            },
            {
                label: "CTA March 2025 board briefing",
                href: "https://www.transitchicago.com/assets/1/6/March_2025_CAB_-_Smart_Streets_Board_Briefing_FINAL.pdf",
            },
        ],
    };

    if (sourceArchiveUrl) {
        sources.sourceArchive = {
            filename: "chicago-smart-streets-pilot-source-files.zip",
            href: sourceArchiveUrl,
        };
    }

    if (sourceFiles.length) {
        sources.sourceFiles = sourceFiles;
    }

    const notebook = {
        generatedAt,
        sources,
        methodology: {
            dataRange: "Violations are included when they appear in the FOIA extract dated through June 27, 2026.",
            fineAmounts: "Listed fines sum the FOIA Fine Level 1 values. Fine-bearing violations are records where Fine Level 1 is greater than zero; listed fines do not measure payment, collection, or adjudication outcomes.",
            geocoding: "Ticket addresses and zone polygons were geocoded by Alex Cannon. The map aggregates points by location and infraction type for browser performance.",
            timestamps: "Issued Date values have no timezone offset in the source CSV. The build treats them as Chicago local wall time and does not shift hours or weekdays.",
            zoneAssignment: "Points are classified against the supplied Smart Streets zone polygons. A small number of decoded points fall just outside the supplied polygons and are retained.",
            wardAssignment: "Each decoded violation point is assigned to a Chicago ward polygon from the City of Chicago Data Portal ward boundaries.",
            cameraDepartments: "Camera IDs beginning with FI are grouped as Finance, IDs beginning with DT are grouped as Transportation, and IDs without those prefixes are grouped as CTA Bus.",
        },
        summary,
        categories,
        yearly: [...yearlyMap.values()].sort((a, b) => a.year - b.year),
        monthly: months,
        daily: dailySeries,
        vehicleCumulative,
        weekdays,
        hourly,
        annualCumulative,
        latestYearTypeCumulative: {
            year: latestYear,
            typeKeys: fineTypeKeys,
            points: typeCumulative,
        },
        wards: wardRows,
        zones: [...zoneMap.values()].sort((a, b) => b.records - a.records),
        locations: [...locationMap.values()].sort((a, b) => b.records - a.records || b.fines - a.fines || a.name.localeCompare(b.name)),
        corridors: [...corridorMap.values()].sort((a, b) => b.records - a.records || b.fines - a.fines || a.name.localeCompare(b.name)),
        topLocationsByRecords: topEntries(locationMap, "records", 20),
        topLocationsByFines: topEntries(locationMap, "fines", 20),
        topCorridorsByRecords: topEntries(corridorMap, "records", 20),
        topCorridorsByFines: topEntries(corridorMap, "fines", 20),
        cameras: topEntries(cameraMap, "records", 30),
    };

    const pointFeatures = [...mapPointMap.values()].map((point, index) => ({
        type: "Feature",
        id: index + 1,
        properties: {
            location: point.location,
            corridor: point.corridor,
            ward: point.ward,
            typeKey: point.typeKey,
            typeLabel: point.typeLabel,
            typeColor: point.typeColor,
            zone: point.zone,
            records: point.records,
            fineRecords: point.fineRecords,
            warnings: point.warnings,
            fines: point.fines,
            firstDate: point.firstDate,
            lastDate: point.lastDate,
            cameras: [...point.cameras].sort().join(", "),
        },
        geometry: {
            type: "Point",
            coordinates: [point.longitude, point.latitude],
        },
    }));

    fs.mkdirSync(path.dirname(outputPaths.notebook), { recursive: true });
    fs.writeFileSync(outputPaths.notebook, `${JSON.stringify(notebook)}\n`);
    fs.writeFileSync(outputPaths.points, `${JSON.stringify({ type: "FeatureCollection", features: pointFeatures })}\n`);
    fs.writeFileSync(outputPaths.zones, `${JSON.stringify(zones)}\n`);

    console.log(`Wrote ${outputPaths.notebook}`);
    console.log(`Wrote ${outputPaths.points} (${pointFeatures.length.toLocaleString("en-US")} aggregated points)`);
    console.log(`Wrote ${outputPaths.zones}`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
