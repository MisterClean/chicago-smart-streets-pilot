const SMART_STREETS_DATA_URL = "data/chicago-smart-streets-pilot.json";
const SMART_STREETS_POINTS_URL = "data/chicago-smart-streets-points.geojson";
const SMART_STREETS_ZONES_URL = "data/chicago-smart-streets-zones.geojson";
const SMART_STREETS_WARDS_URL = "data/chicago-wards.geojson";
const SMART_STREETS_SOURCE_ARCHIVE_URL = window.__CONFIG__?.SMART_STREETS_SOURCE_ARCHIVE_URL || "data/source/chicago-smart-streets-pilot-source-files.zip";
const PROTOMAPS_KEY = window.__CONFIG__?.PROTOMAPS_KEY || "";
const CHICAGO_WARD_BOUNDARIES_URL = "https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Wards-2023-/p293-wvbd";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

const numberFmt = new Intl.NumberFormat("en-US");
const currencyFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});
const scheduleCurrencyFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const compactFmt = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
});
const percentFmt = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
});
const timingPercentFmt = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

const ANNUAL_COLORS = {
    2024: "#2a79c5",
    2025: "#ff8c1a",
    2026: "#2da44e",
};

const DEPARTMENT_COLORS = {
    finance: "#2364aa",
    transportation: "#009b3a",
    cta_bus: "#e9003a",
};

const VEHICLE_PALETTE = [
    "#2364aa",
    "#ff8c1a",
    "#009b3a",
    "#e9003a",
    "#12a6d8",
    "#09098f",
    "#7c3aed",
    "#d97706",
    "#0f766e",
    "#be123c",
    "#4f46e5",
    "#16a34a",
    "#ea580c",
    "#0891b2",
    "#9333ea",
    "#64748b",
    "#111827",
];

const MONTH_STACK_ORDER = [
    "install_warning",
    "zero_warning",
    "bus_lane",
    "bike_lane",
    "bus_stop",
    "expired_meter_non_central",
    "expired_meter_central",
    "commercial_loading_zone",
    "street_cleaning",
];

const MONTH_TICKS = [
    { day: 1, label: "Jan" },
    { day: 32, label: "Feb" },
    { day: 60, label: "Mar" },
    { day: 91, label: "Apr" },
    { day: 121, label: "May" },
    { day: 152, label: "Jun" },
    { day: 182, label: "Jul" },
    { day: 213, label: "Aug" },
    { day: 244, label: "Sep" },
    { day: 274, label: "Oct" },
    { day: 305, label: "Nov" },
    { day: 335, label: "Dec" },
];

const TIMING_DAY_NAMES = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
};

const WARD_TABLE_DEFAULT_ASC = new Set(["ward"]);

const FINE_SCHEDULE = [
    {
        code: "9-12-060",
        description: "Standing, Parking, or Other Use of Bus Lane",
        initialFine: 90,
        latePenalty: 90,
    },
    {
        code: "9-40-060",
        description: "Parking/Standing on Bicycle Path",
        initialFine: 250,
        latePenalty: 0,
    },
    {
        code: "9-64-140(b)",
        description: "Parking/Standing in a Bus Stop",
        initialFine: 100,
        latePenalty: 100,
    },
    {
        code: "9-64-190(a)",
        description: "Expired Meter Non-Central Business District",
        initialFine: 50,
        latePenalty: 50,
    },
    {
        code: "9-64-190(b)",
        description: "Expired Meter Central Business District",
        initialFine: 70,
        latePenalty: 70,
    },
    {
        code: "9-64-190(c)",
        description: "Non Payment/Non Commercial Vehicle Parking in a Commercial Loading Zone",
        initialFine: 140,
        latePenalty: 110,
    },
];

const MAP_BOUNDARY_COLORS = {
    expansion: "#2563eb",
    initial: "#db2777",
    selectedWard: "#d97706",
};

const MAP_ALL_KEY = "all_violations";
const MAP_ALL_LABEL = "All Violations";
const MAP_ALL_COLOR = "#334155";

const MAP_TYPE_COLORS = {
    zero_warning: "#5b6472",
    install_warning: "#8a6a2d",
};

const KINZIE_PROTECTED_COLOR = "#009b3a";
const KINZIE_UNPROTECTED_COLOR = "#d97706";
const KINZIE_POINT_COLOR = "#334155";
const KINZIE_BOUNDS = [
    [-87.64725, 41.88874],
    [-87.62705, 41.88962],
];
const KINZIE_PROTECTED_RANGE = {
    label: "Protected stretch",
    west: -87.6465,
    east: -87.6345,
};
const KINZIE_UNPROTECTED_RANGE = {
    label: "Paint-only / unprotected",
    west: -87.6336,
    east: -87.628,
};
const KINZIE_SEGMENTS_GEOJSON = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {
                kind: "protected",
                label: "Protected bike lane: Milwaukee to Wells",
                color: KINZIE_PROTECTED_COLOR,
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [-87.6465, 41.8891],
                    [-87.6345, 41.88922],
                ],
            },
        },
        {
            type: "Feature",
            properties: {
                kind: "unprotected",
                label: "Paint-only / unprotected area",
                color: KINZIE_UNPROTECTED_COLOR,
            },
            geometry: {
                type: "LineString",
                coordinates: [
                    [-87.63362, 41.88914],
                    [-87.6281, 41.88926],
                ],
            },
        },
    ],
};

const LIGHT_BASEMAP_PAINT = {
    background: {
        "background-color": "#d8d8d2",
    },
    earth: {
        "fill-color": "#e7e4dc",
    },
    landcover: {
        "fill-color": "#ddd9d0",
        "fill-opacity": 0.36,
    },
    landuse_park: {
        "fill-color": "#c7d4c6",
        "fill-opacity": 0.64,
    },
    landuse_urban_green: {
        "fill-color": "#c7d4c6",
        "fill-opacity": 0.46,
    },
    landuse_hospital: {
        "fill-color": "#dfd8d6",
    },
    landuse_industrial: {
        "fill-color": "#d4dad9",
    },
    landuse_school: {
        "fill-color": "#dedbd4",
    },
    landuse_beach: {
        "fill-color": "#ded9c8",
    },
    landuse_pedestrian: {
        "fill-color": "#ddd9d0",
    },
    landuse_pier: {
        "fill-color": "#dfddd7",
    },
    buildings: {
        "fill-color": "#bfc2bd",
        "fill-opacity": 0.36,
    },
    water: {
        "fill-color": "#b8cbd2",
    },
    water_stream: {
        "line-color": "#b8cbd2",
    },
    water_river: {
        "line-color": "#b8cbd2",
    },
    boundaries: {
        "line-color": "#9aa0a6",
        "line-opacity": 0.32,
    },
    boundaries_country: {
        "line-color": "#8f969d",
        "line-opacity": 0.4,
    },
};

let streetsData = null;
let categoryByKey = {};
let chartTooltip = null;
let streetsMap = null;
let streetsKinzieMap = null;
let streetsZoneGeoJSON = null;
let streetsWardGeoJSON = null;
let selectedMapLayer = MAP_ALL_KEY;
let selectedCorridorTypes = new Set();
let selectedMapWard = "all";
let vehicleMode = "department";
let selectedWardType = "all";
let wardDetailSort = { col: "records", asc: false };
let corridorSortMetric = "records";
let timeMetric = "records";
let timingResizeTimer = null;
let timingFocus = { row: 0, hour: 0 };

function fmt(value) {
    return numberFmt.format(Math.round(value || 0));
}

function money(value) {
    return currencyFmt.format(Math.round(value || 0));
}

function scheduleMoney(value) {
    return scheduleCurrencyFmt.format(value || 0);
}

function compact(value) {
    return compactFmt.format(Math.round(value || 0));
}

function pct(value) {
    return percentFmt.format(value || 0);
}

function compareSortValues(a, b) {
    if (typeof a === "number" && typeof b === "number") {
        if (!Number.isFinite(a) && !Number.isFinite(b)) return 0;
        if (!Number.isFinite(a)) return -1;
        if (!Number.isFinite(b)) return 1;
        return a - b;
    }

    return String(a ?? "").localeCompare(String(b ?? ""), "en-US", {
        numeric: true,
        sensitivity: "base",
    });
}

function vehicleSeriesColor(series, index) {
    if (series.longLabel && DEPARTMENT_COLORS[series.key]) return DEPARTMENT_COLORS[series.key];
    return VEHICLE_PALETTE[index % VEHICLE_PALETTE.length];
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function formatDate(dateString, options = {}) {
    return new Date(`${dateString}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
        ...options,
    });
}

function daysBetween(startDateString, endDateString) {
    const start = new Date(`${startDateString}T00:00:00Z`);
    const end = new Date(`${endDateString}T00:00:00Z`);
    return Math.max(0, Math.round((end - start) / 86400000));
}

function monthTicksBetween(startDateString, endDateString) {
    const start = new Date(`${startDateString}T00:00:00Z`);
    const end = new Date(`${endDateString}T00:00:00Z`);
    const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const ticks = [];

    for (
        let cursor = first;
        cursor <= end;
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    ) {
        const tickDate = cursor < start ? start : cursor;
        ticks.push({
            date: tickDate.toISOString().slice(0, 10),
            index: daysBetween(startDateString, tickDate.toISOString().slice(0, 10)),
            label: tickDate.toLocaleDateString("en-US", {
                month: "short",
                year: tickDate.getUTCMonth() === 0 || tickDate.getTime() === start.getTime() ? "numeric" : undefined,
                timeZone: "UTC",
            }),
        });
    }

    return ticks;
}

function filenameFromUrl(url) {
    try {
        return new URL(url, window.location.href).pathname.split("/").filter(Boolean).pop() || "source files ZIP";
    } catch {
        return "source files ZIP";
    }
}


function formatAxisCurrency(value) {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(value >= 2000000 ? 0 : 1)}M`;
    if (value >= 1000) return `$${Math.round(value / 1000)}k`;
    return `$${value}`;
}

function formatAxisNumber(value) {
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return fmt(value);
}

function formatHourLabel(hour) {
    if (hour === 0) return "12a";
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return "12p";
    return `${hour - 12}p`;
}

function formatMetricValue(metric, value) {
    return metric === "fines" ? money(value) : fmt(value);
}

function formatHourLong(hour) {
    const normalizedHour = hour % 12 || 12;
    return `${normalizedHour} ${hour < 12 ? "a.m." : "p.m."}`;
}

function formatHourRange(hour) {
    return `${formatHourLong(hour)}–${formatHourLong((hour + 1) % 24)}`;
}

function timingHeatIntensity(value, maxValue) {
    if (value <= 0 || maxValue <= 0) return 0;
    return Math.round((18 + Math.sqrt(value / maxValue) * 82) * 10) / 10;
}

function selectedCategoryLabel(keys) {
    if (keys.length === streetsData.categories.length) return "all categories";
    if (!keys.length) return "no categories";
    if (keys.length === 1) return categoryByKey[keys[0]].label;
    return `${keys.length} selected categories`;
}

function last(items) {
    return items[items.length - 1];
}

function showTooltip(event, html, options = {}) {
    chartTooltip.setAttribute("aria-hidden", options.announce === false ? "true" : "false");
    chartTooltip.innerHTML = html;
    chartTooltip.style.opacity = "1";

    const margin = 14;
    const tooltipRect = chartTooltip.getBoundingClientRect();
    const left = Math.min(event.clientX + margin, window.innerWidth - tooltipRect.width - margin);
    const top = Math.min(event.clientY + margin, window.innerHeight - tooltipRect.height - margin);

    chartTooltip.style.transform = `translate(${Math.max(margin, left)}px, ${Math.max(margin, top)}px)`;
}

function hideTooltip() {
    chartTooltip.style.opacity = "0";
    chartTooltip.style.transform = "translate(-999px, -999px)";
}

function tooltipRow(label, value) {
    return `<div class="streets-chart-tooltip-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function svgPoint(svg, event) {
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    return {
        x: (event.clientX - rect.left) * viewBox.width / rect.width,
        y: (event.clientY - rect.top) * viewBox.height / rect.height,
    };
}

function niceStep(value) {
    const magnitude = 10 ** Math.floor(Math.log10(value || 1));
    const normalized = value / magnitude;
    if (normalized <= 1) return magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
}

function niceTicks(maxValue, count = 5) {
    const step = niceStep(maxValue / Math.max(1, count - 1));
    const top = Math.ceil(maxValue / step) * step;
    const ticks = [];
    for (let value = 0; value <= top; value += step) {
        ticks.push(value);
    }
    return ticks;
}

function renderLegend(containerId, items, shape = "dot") {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map((item) => `
        <span class="streets-legend-item">
            <span class="streets-legend-swatch" style="background:${item.color};${shape === "line" ? "border-radius:2px;width:1.4rem;height:0.25rem;" : ""}"></span>
            ${escapeHtml(item.label)}
        </span>
    `).join("");
}

function chartContentWidth(container, fallbackWidth) {
    const styles = window.getComputedStyle(container);
    const horizontalPadding = Number.parseFloat(styles.paddingLeft || 0) + Number.parseFloat(styles.paddingRight || 0);
    return Math.floor((container.getBoundingClientRect().width || fallbackWidth) - horizontalPadding);
}

function responsiveChartLayout(container, desktopWidth, mobileHeight, desktopHeight) {
    const availableWidth = chartContentWidth(container, desktopWidth);
    const compact = availableWidth < 620;
    return {
        compact,
        width: compact ? Math.max(300, availableWidth) : desktopWidth,
        height: compact ? mobileHeight : desktopHeight,
    };
}

function responsiveMonthTicks(ticks, compact, every = 2) {
    if (!compact) return ticks;
    const filtered = ticks.filter((tick, index) => index % every === 0);
    const lastTick = last(ticks);
    const lastFilteredIndex = ticks.indexOf(last(filtered));
    if (lastTick && last(filtered) !== lastTick && ticks.length - 1 - lastFilteredIndex >= every) {
        filtered.push(lastTick);
    }
    return filtered;
}

function responsiveMonthTicksBetween(startDateString, endDateString, compact, every = 3) {
    const ticks = monthTicksBetween(startDateString, endDateString);
    return responsiveMonthTicks(ticks, compact, every);
}

function renderLede(data) {
    document.getElementById("streets-lede").innerHTML = `
        <p><strong>Smart Streets is Chicago's automated parking enforcement pilot.</strong> The program uses cameras on CTA buses, city vehicles, city property, and CDOT-identified locations to document vehicles blocking bus lanes, bike lanes, bus stops, and metered parking.</p>
        <p><strong>The pilot shifts some curb and lane enforcement from manual observation to camera review.</strong> Covered violations can start with warnings before citations, with the goal of keeping bus lanes, bike lanes, and high-demand curb space clear enough to function.</p>
    `;
}

function renderDatasetCopy(data) {
    const throughDate = formatDate(data.summary.dateRange.end, { month: "long" });
    const throughDateElement = document.getElementById("streets-through-date");
    const latestYearElement = document.getElementById("streets-latest-year");

    if (throughDateElement) throughDateElement.textContent = throughDate;
    if (latestYearElement) latestYearElement.textContent = data.summary.latestYear;
    const monthlyNote = document.getElementById("streets-monthly-note");
    if (monthlyNote) monthlyNote.textContent = `Stacked violations by violation description. The final month is partial, through ${throughDate}.`;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
        description.content = `Interactive notebook analysis of Chicago Smart Streets pilot warnings, tickets, fines, corridors, and infraction geography through ${throughDate}.`;
    }
}

function renderCards(data) {
    const { summary } = data;
    const recentYearFines = data.yearly
        .slice(-2)
        .map((item) => `${money(item.fines)} in ${item.year}`)
        .join("; ");

    const cards = [
        {
            label: "Violations",
            value: fmt(summary.totalRecords),
            detail: `${fmt(summary.uniqueLocations)} locations; ${fmt(summary.uniqueCameras)} cameras`,
        },
        {
            label: "Listed Fines",
            value: money(summary.totalFines),
            detail: recentYearFines,
        },
        {
            label: "Warnings",
            value: fmt(summary.warnings),
            detail: `${pct(summary.warnings / summary.totalRecords)} of all violations`,
        },
        {
            label: "Top Fine Type",
            value: money(summary.topTypeByFine.fines),
            detail: summary.topTypeByFine.label,
        },
        {
            label: "Peak Month",
            value: summary.peakMonth.label,
            detail: `${fmt(summary.peakMonth.records)} violations; ${money(summary.peakMonth.fines)}`,
        },
    ];

    document.getElementById("streets-cards").innerHTML = cards.map((card) => `
        <div class="ev-card">
            <div class="ev-card-label">${escapeHtml(card.label)}</div>
            <div class="ev-card-value">${escapeHtml(card.value)}</div>
            <div class="ev-card-detail">${escapeHtml(card.detail)}</div>
        </div>
    `).join("");
}

function renderRefreshAndComparison(data) {
    const refresh = data.refresh.smartStreets;
    document.getElementById("streets-refresh-note").textContent = `September FOIA refresh: ${fmt(refresh.addedTickets)} added tickets, including ${fmt(refresh.backfilledTickets)} issued within the previous reporting period. ${fmt(refresh.changedTickets)} prior tickets were revised; ${fmt(refresh.changedFields.Location || 0)} have revised locations. The new snapshot replaces the July export.`;
    const parking = data.illegalParking;
    document.getElementById("streets-geocoding-note").textContent = `Points are estimated on the named frontage street, rather than at building centroids. ${fmt(data.summary.unmappedRecords)} records have unresolved locations and remain in totals and charts. Ward assignments near a boundary are marked unknown.`;
    document.getElementById("streets-conventional-intro").textContent = `A separate FOIA contains ${fmt(parking.totalRecords)} conventional tickets for bike lanes, bus lanes, and bus/taxi/carriage stands across Chicago. These tickets remain separate from the Smart Streets dataset.`;
    document.getElementById("streets-conventional-period").textContent = `${formatDate(parking.dateRange.start)}–${formatDate(parking.dateRange.end)}. The 2026 period ends June 29; it is not a full year.`;
    document.getElementById("streets-conventional-years").innerHTML = parking.yearly.map((row) => `
        <tr><th scope="row">${row.period === "2026" ? "2026 (Jan 1–Jun 29)" : escapeHtml(row.period)}</th><td class="text-right">${fmt(row.bike_lane)}</td><td class="text-right">${fmt(row.bus_lane)}</td><td class="text-right">${fmt(row.bus_stop)}</td><td class="text-right">${fmt(row.records)}</td></tr>
    `).join("");
    document.getElementById("streets-comparison-period").textContent = `${formatDate(parking.commonPeriod.start)}–${formatDate(parking.commonPeriod.end)}. Smart Streets warnings and meter/loading-zone tickets are excluded from this table.`;
    document.getElementById("streets-conventional-comparison").innerHTML = parking.commonPeriod.categories.map((row) => `
        <tr><th scope="row">${row.key === "bus_stop" ? "Bus/taxi/carriage stand vs. Smart Streets bus stop" : escapeHtml(row.label)}</th><td class="text-right">${fmt(row.conventionalTickets)}</td><td class="text-right">${fmt(row.smartStreetsFineTickets)}</td></tr>
    `).join("");
    document.getElementById("streets-comparison-note").textContent = `${parking.note} ${fmt(parking.missingLocationRecords)} conventional tickets have no location.`;
}

function renderAnnualCumulativeChart(data) {
    const container = document.getElementById("streets-annual-chart");
    const layout = responsiveChartLayout(container, 980, 320, 410);
    const { width, height, compact } = layout;
    const margin = compact
        ? { top: 24, right: 14, bottom: 44, left: 54 }
        : { top: 22, right: 94, bottom: 48, left: 78 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxValue = Math.max(...data.annualCumulative.flatMap((series) => series.points.map((point) => point.cumulativeFines)));
    const yTicks = niceTicks(maxValue, compact ? 4 : 5);
    const yMax = last(yTicks);
    const x = (day) => margin.left + (day - 1) / 365 * plotWidth;
    const y = (value) => margin.top + (yMax - value) / yMax * plotHeight;
    const axisFontSize = compact ? 11 : 12;
    const labelFontSize = compact ? 12 : 13;
    const lineWidth = compact ? 4.5 : 4;
    const earliestYear = Math.min(...data.annualCumulative.map((series) => series.year));

    const grid = yTicks.map((tick) => `
        <line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="currentColor" stroke-opacity="${tick === 0 ? 0.35 : 0.12}"></line>
        <text x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end" font-size="${axisFontSize}" fill="currentColor">${formatAxisCurrency(tick)}</text>
    `).join("");

    const monthTicks = responsiveMonthTicks(MONTH_TICKS, compact, 2).map((tick) => `
        <line x1="${x(tick.day)}" x2="${x(tick.day)}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="currentColor" stroke-opacity="0.08"></line>
        <text x="${x(tick.day)}" y="${height - 15}" text-anchor="middle" font-size="${axisFontSize}" fill="currentColor">${tick.label}</text>
    `).join("");

    const lines = data.annualCumulative.map((series) => {
        const color = ANNUAL_COLORS[series.year] || "#64748b";
        const path = series.points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.dayOfYear)} ${y(point.cumulativeFines)}`).join(" ");
        const endpoint = last(series.points);
        const labelX = compact
            ? Math.min(width - margin.right, x(endpoint.dayOfYear) + 8)
            : Math.min(width - 78, x(endpoint.dayOfYear) + 8);
        const labelAnchor = compact && labelX > width - 72 ? "end" : "start";
        const labelText = `${series.year}: ${formatAxisCurrency(endpoint.cumulativeFines)}`;
        return `
            <path d="${path}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round"></path>
            <circle cx="${x(endpoint.dayOfYear)}" cy="${y(endpoint.cumulativeFines)}" r="${compact ? 4.2 : 4.5}" fill="${color}"></circle>
            ${compact && series.year === earliestYear ? "" : `<text x="${labelX}" y="${y(endpoint.cumulativeFines) - 8}" text-anchor="${labelAnchor}" font-size="${labelFontSize}" font-weight="700" fill="${color}">${labelText}</text>`}
        `;
    }).join("");

    container.innerHTML = `
        <svg class="streets-svg" role="img" aria-label="Cumulative annual Smart Streets fines by year" viewBox="0 0 ${width} ${height}">
            ${grid}
            ${monthTicks}
            ${lines}
            <line class="streets-annual-hover-line" x1="0" x2="0" y1="${margin.top}" y2="${height - margin.bottom}" stroke="currentColor" stroke-opacity="0" stroke-dasharray="4 4"></line>
            <g class="streets-annual-hover-dots"></g>
            <rect class="streets-hover-target" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="transparent"></rect>
        </svg>
    `;

    renderLegend("streets-annual-legend", data.annualCumulative.map((series) => ({
        label: `${series.year}`,
        color: ANNUAL_COLORS[series.year] || "#64748b",
    })), "line");

    const svg = container.querySelector("svg");
    const hoverLine = svg.querySelector(".streets-annual-hover-line");
    const hoverDots = svg.querySelector(".streets-annual-hover-dots");

    svg.addEventListener("mousemove", (event) => {
        const point = svgPoint(svg, event);
        if (point.x < margin.left || point.x > width - margin.right || point.y < margin.top || point.y > height - margin.bottom) {
            hideTooltip();
            hoverLine.setAttribute("stroke-opacity", "0");
            hoverDots.innerHTML = "";
            return;
        }

        const activeDay = Math.max(1, Math.min(366, Math.round(1 + (point.x - margin.left) / plotWidth * 365)));
        const rows = data.annualCumulative.map((series) => {
            const nearest = series.points.reduce((best, item) => (
                Math.abs(item.dayOfYear - activeDay) < Math.abs(best.dayOfYear - activeDay) ? item : best
            ), series.points[0]);
            return { series, point: nearest };
        }).filter((item) => Math.abs(item.point.dayOfYear - activeDay) <= 7);

        hoverLine.setAttribute("x1", x(activeDay));
        hoverLine.setAttribute("x2", x(activeDay));
        hoverLine.setAttribute("stroke-opacity", "0.35");
        hoverDots.innerHTML = rows.map(({ series, point: row }) => `
            <circle cx="${x(row.dayOfYear)}" cy="${y(row.cumulativeFines)}" r="5" fill="${ANNUAL_COLORS[series.year] || "#64748b"}" stroke="var(--bg)" stroke-width="2"></circle>
        `).join("");

        const html = `
            <strong>Nearest date on annual scale</strong>
            ${rows.map(({ series, point: row }) => tooltipRow(`${series.year} · ${formatDate(row.date, { month: "short", day: "numeric" })}`, money(row.cumulativeFines))).join("")}
        `;
        showTooltip(event, html);
    });

    svg.addEventListener("mouseleave", () => {
        hideTooltip();
        hoverLine.setAttribute("stroke-opacity", "0");
        hoverDots.innerHTML = "";
    });
}

function renderVehicleCumulativeChart(data) {
    const container = document.getElementById("streets-vehicle-chart");
    const series = vehicleMode === "department"
        ? data.vehicleCumulative.departments
        : data.vehicleCumulative.cameras;
    const layout = responsiveChartLayout(container, 980, 340, 440);
    const { width, height, compact } = layout;
    const margin = compact
        ? { top: 24, right: 14, bottom: 54, left: 54 }
        : { top: 22, right: vehicleMode === "department" ? 124 : 92, bottom: 62, left: 78 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const totalDays = daysBetween(data.vehicleCumulative.dateRange.start, data.vehicleCumulative.dateRange.end);
    const maxValue = Math.max(...series.flatMap((item) => item.points.map((point) => point.cumulativeFines)), 1);
    const yTicks = niceTicks(maxValue, compact ? 4 : 5);
    const yMax = last(yTicks) || 1;
    const x = (index) => margin.left + index / Math.max(1, totalDays) * plotWidth;
    const y = (value) => margin.top + (yMax - value) / yMax * plotHeight;
    const monthTicks = responsiveMonthTicksBetween(data.vehicleCumulative.dateRange.start, data.vehicleCumulative.dateRange.end, compact, 4);
    const labelLimit = vehicleMode === "department" ? 3 : 7;
    const endpointSeries = [...series]
        .sort((a, b) => b.fines - a.fines || a.label.localeCompare(b.label))
        .slice(0, labelLimit);
    const endpointKeys = new Set(endpointSeries.map((item) => item.key));
    const axisFontSize = compact ? 11 : 12;

    const grid = yTicks.map((tick) => `
        <line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="currentColor" stroke-opacity="${tick === 0 ? 0.35 : 0.12}"></line>
        <text x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end" font-size="${axisFontSize}" fill="currentColor">${formatAxisCurrency(tick)}</text>
    `).join("");

    const monthGrid = monthTicks.map((tick) => `
        <line x1="${x(tick.index)}" x2="${x(tick.index)}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="currentColor" stroke-opacity="0.08"></line>
        <text x="${x(tick.index)}" y="${height - 24}" text-anchor="middle" font-size="${compact ? 10 : 11}" fill="currentColor">${escapeHtml(tick.label)}</text>
    `).join("");

    const lines = series.map((item, index) => {
        const color = vehicleSeriesColor(item, index);
        const path = item.points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${x(point.index)} ${y(point.cumulativeFines)}`).join(" ");
        const endpoint = last(item.points);
        const label = !compact && endpointKeys.has(item.key) && endpoint.cumulativeFines > 0
            ? `<text x="${width - margin.right + 8}" y="${y(endpoint.cumulativeFines) + 4}" font-size="12" font-weight="700" fill="${color}">${escapeHtml(item.label)}</text>`
            : "";
        return `
            <path d="${path}" fill="none" stroke="${color}" stroke-width="${vehicleMode === "department" ? (compact ? 4.5 : 4) : (compact ? 3 : 2.6)}" stroke-linecap="round" stroke-linejoin="round" opacity="${vehicleMode === "department" ? 0.96 : 0.82}"></path>
            <circle cx="${x(endpoint.index)}" cy="${y(endpoint.cumulativeFines)}" r="${vehicleMode === "department" ? 4.5 : 3.6}" fill="${color}"></circle>
            ${label}
        `;
    }).join("");

    container.innerHTML = `
        <svg class="streets-svg" role="img" aria-label="Cumulative Smart Streets fines by ${vehicleMode === "department" ? "vehicle department" : "camera ID"}" viewBox="0 0 ${width} ${height}">
            ${grid}
            ${monthGrid}
            ${lines}
            <line class="streets-vehicle-hover-line" x1="0" x2="0" y1="${margin.top}" y2="${height - margin.bottom}" stroke="currentColor" stroke-opacity="0" stroke-dasharray="4 4"></line>
            <g class="streets-vehicle-hover-dots"></g>
            <rect class="streets-hover-target" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="transparent"></rect>
        </svg>
    `;

    renderLegend("streets-vehicle-legend", series.map((item, index) => ({
        label: item.longLabel || `${item.label}${item.departmentLabel ? ` · ${item.departmentLabel}` : ""}`,
        color: vehicleSeriesColor(item, index),
    })), "line");

    const svg = container.querySelector("svg");
    const hoverLine = svg.querySelector(".streets-vehicle-hover-line");
    const hoverDots = svg.querySelector(".streets-vehicle-hover-dots");

    svg.addEventListener("mousemove", (event) => {
        const point = svgPoint(svg, event);
        if (point.x < margin.left || point.x > width - margin.right || point.y < margin.top || point.y > height - margin.bottom) {
            hideTooltip();
            hoverLine.setAttribute("stroke-opacity", "0");
            hoverDots.innerHTML = "";
            return;
        }

        const activeIndex = Math.max(0, Math.min(totalDays, Math.round((point.x - margin.left) / plotWidth * totalDays)));
        const rows = series
            .map((item, index) => ({
                item,
                index,
                point: item.points[activeIndex] || last(item.points),
            }))
            .filter((row) => row.point.cumulativeFines > 0 || row.point.records > 0)
            .sort((a, b) => b.point.cumulativeFines - a.point.cumulativeFines || a.item.label.localeCompare(b.item.label));

        hoverLine.setAttribute("x1", x(activeIndex));
        hoverLine.setAttribute("x2", x(activeIndex));
        hoverLine.setAttribute("stroke-opacity", "0.35");
        hoverDots.innerHTML = rows.map((row) => `
            <circle cx="${x(row.point.index)}" cy="${y(row.point.cumulativeFines)}" r="4" fill="${vehicleSeriesColor(row.item, row.index)}" stroke="var(--bg)" stroke-width="2"></circle>
        `).join("");

        showTooltip(event, `
            <strong>${formatDate(rows[0]?.point.date || data.vehicleCumulative.dateRange.start)}</strong>
            ${rows.map((row) => tooltipRow(row.item.label, money(row.point.cumulativeFines))).join("")}
        `);
    });

    svg.addEventListener("mouseleave", () => {
        hideTooltip();
        hoverLine.setAttribute("stroke-opacity", "0");
        hoverDots.innerHTML = "";
    });
}

function renderMonthlyChart(data) {
    const container = document.getElementById("streets-monthly-chart");
    const layout = responsiveChartLayout(container, 980, 340, 420);
    const { width, height, compact } = layout;
    const margin = compact
        ? { top: 22, right: 12, bottom: 54, left: 48 }
        : { top: 22, right: 24, bottom: 68, left: 70 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const months = data.monthly;
    const maxValue = Math.max(...months.map((month) => month.records));
    const yTicks = niceTicks(maxValue, compact ? 4 : 5);
    const yMax = last(yTicks);
    const y = (value) => margin.top + (yMax - value) / yMax * plotHeight;
    const slot = plotWidth / months.length;
    const barWidth = Math.min(compact ? 13 : 42, slot * 0.72);
    const expansion = data.summary.pilotExpansion;
    const firstBusViolation = data.vehicleCumulative?.departments
        ?.find((series) => series.key === "cta_bus")
        ?.points.find((point) => point.records > 0 || point.fines > 0);

    function dateAnnotation(date, label, options = {}) {
        const monthIndex = months.findIndex((month) => month.month === date.slice(0, 7));
        if (monthIndex < 0) return "";

        const [year, month, day] = date.split("-").map(Number);
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const annotationX = margin.left + monthIndex * slot + ((day - 0.5) / daysInMonth) * slot;
        if (compact) return "";
        const anchor = annotationX > width - 220 ? "end" : "start";
        const labelX = annotationX + (anchor === "start" ? 8 : -8);
        const labelY = margin.top + (options.yOffset ?? 14);
        const color = options.color || "currentColor";

        return `
            <line class="streets-annotation-line" x1="${annotationX}" x2="${annotationX}" y1="${margin.top}" y2="${height - margin.bottom + 9}" stroke="${color}" stroke-opacity="0.68" stroke-dasharray="4 4"></line>
            <circle class="streets-annotation-dot" cx="${annotationX}" cy="${height - margin.bottom}" r="4" fill="${color}"></circle>
            <text class="streets-chart-annotation" x="${labelX}" y="${labelY}" text-anchor="${anchor}">
                <tspan x="${labelX}" dy="0">${escapeHtml(label)}</tspan>
                <tspan x="${labelX}" dy="14">${formatDate(date, { month: "short", day: "numeric", year: "numeric" })}</tspan>
            </text>
        `;
    }

    const grid = yTicks.map((tick) => `
        <line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="currentColor" stroke-opacity="${tick === 0 ? 0.35 : 0.12}"></line>
        <text x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end" font-size="${compact ? 10.5 : 12}" fill="currentColor">${formatAxisNumber(tick)}</text>
    `).join("");

    const bars = months.map((month, monthIndex) => {
        const x0 = margin.left + monthIndex * slot + (slot - barWidth) / 2;
        let cumulative = 0;
        const segments = MONTH_STACK_ORDER.map((typeKey) => {
            const value = month.byType[typeKey] || 0;
            if (!value) return "";
            const yTop = y(cumulative + value);
            const heightValue = Math.max(1, y(cumulative) - yTop);
            cumulative += value;
            const category = categoryByKey[typeKey];
            return `
                <rect class="monthly-segment"
                    x="${x0}" y="${yTop}" width="${barWidth}" height="${heightValue}"
                    fill="${category.color}" data-month="${month.month}" data-type="${typeKey}"
                    data-value="${value}" data-total="${month.records}" data-fines="${month.fines}">
                </rect>
            `;
        }).join("");
        const [year, monthNumber] = month.month.split("-");
        const showCompactLabel = monthIndex % 3 === 0 || monthIndex === months.length - 1;
        const label = monthNumber === "01" || monthIndex === 0 ? `${month.label.split(" ")[0]}\n${year}` : month.label.split(" ")[0];
        const labelLines = label.split("\n").map((line, lineIndex) => `
            ${compact && !showCompactLabel ? "" : `<text x="${x0 + barWidth / 2}" y="${height - 30 + lineIndex * 14}" text-anchor="middle" font-size="${compact ? 10 : (lineIndex ? 11 : 12)}" fill="currentColor">${line}</text>`}
        `).join("");
        return `${segments}${labelLines}`;
    }).join("");

    const expansionAnnotation = expansion ? dateAnnotation(expansion.date, "Expansion", { yOffset: 14 }) : "";
    const busAnnotation = firstBusViolation
        ? dateAnnotation(firstBusViolation.date, "First CTA bus violation", { color: DEPARTMENT_COLORS.cta_bus, yOffset: 48 })
        : "";

    container.innerHTML = `
        <svg class="streets-svg" role="img" aria-label="Monthly Smart Streets violations by violation category" viewBox="0 0 ${width} ${height}">
            ${grid}
            ${bars}
            ${expansionAnnotation}
            ${busAnnotation}
        </svg>
    `;

    renderLegend("streets-monthly-legend", MONTH_STACK_ORDER.map((typeKey) => ({
        label: categoryByKey[typeKey].label,
        color: categoryByKey[typeKey].color,
    })));

    const svg = container.querySelector("svg");
    svg.addEventListener("mousemove", (event) => {
        const target = event.target.closest?.(".monthly-segment");
        if (!target) {
            hideTooltip();
            return;
        }

        const category = categoryByKey[target.dataset.type];
        const month = months.find((item) => item.month === target.dataset.month);
        showTooltip(event, `
            <strong>${month.label}</strong>
            ${tooltipRow(category.label, fmt(Number(target.dataset.value)))}
            ${tooltipRow("All violations", fmt(Number(target.dataset.total)))}
            ${tooltipRow("Listed fines", money(Number(target.dataset.fines)))}
        `);
    });
    svg.addEventListener("mouseleave", hideTooltip);
}

function renderTimingHeatmap(data) {
    const container = document.getElementById("streets-timing-heatmap");
    const cells = Array.isArray(data.timingHeatmap) ? data.timingHeatmap : [];

    if (cells.length !== 168) {
        container.innerHTML = '<p class="streets-empty-state">Timing detail is unavailable in this data release.</p>';
        return;
    }

    const metricLabel = timeMetric === "fines" ? "listed fines" : "violations";
    const metricLabelTitle = timeMetric === "fines" ? "Listed fines" : "Violations";
    const grandTotal = timeMetric === "fines" ? data.summary.totalFines : data.summary.totalRecords;
    const maxValue = Math.max(...cells.map((cell) => Number(cell[timeMetric]) || 0), 1);
    const cellByKey = new Map(cells.map((cell) => [`${cell.day}|${cell.hour}`, cell]));
    const weekdays = data.weekdays.slice(0, 7);
    const hours = Array.from({ length: 24 }, (_, hour) => hour);

    timingFocus = {
        row: Math.max(0, Math.min(weekdays.length - 1, timingFocus.row)),
        hour: Math.max(0, Math.min(23, timingFocus.hour)),
    };

    const hourHeadings = hours.map((hour) => `
        <th class="streets-hour-heading" scope="col" title="${escapeHtml(formatHourLong(hour))}">
            <span class="streets-hour-label-full" aria-hidden="true">${formatHourLabel(hour)}</span>
            <span class="streets-hour-label-compact" aria-hidden="true">${hour}</span>
            <span class="streets-visually-hidden">${escapeHtml(formatHourLong(hour))}</span>
        </th>
    `).join("");

    const rows = weekdays.map((day, rowIndex) => {
        const fullDayName = TIMING_DAY_NAMES[day.day] || day.day;
        const totalValue = Number(day[timeMetric]) || 0;
        const totalShare = grandTotal ? totalValue / grandTotal : 0;
        const dayCells = hours.map((hour) => {
            const cell = cellByKey.get(`${day.day}|${hour}`) || {
                day: day.day,
                hour,
                records: 0,
                fineRecords: 0,
                warnings: 0,
                fines: 0,
            };
            const selectedValue = Number(cell[timeMetric]) || 0;
            const selectedShare = grandTotal ? selectedValue / grandTotal : 0;
            const complementaryMetric = timeMetric === "fines"
                ? `${fmt(cell.records)} violation${Number(cell.records) === 1 ? "" : "s"}`
                : `${money(cell.fines)} listed fines`;
            const fineRecordLabel = `${fmt(cell.fineRecords)} fine-bearing violation${Number(cell.fineRecords) === 1 ? "" : "s"}`;
            const warningLabel = `${fmt(cell.warnings)} warning${Number(cell.warnings) === 1 ? "" : "s"}`;
            const ariaLabel = `${fullDayName}, ${formatHourRange(hour)}: ${formatMetricValue(timeMetric, selectedValue)} ${metricLabel}, ${timingPercentFmt.format(selectedShare)} of all ${metricLabel}; ${complementaryMetric}; ${fineRecordLabel}; ${warningLabel}.`;
            const tabindex = timingFocus.row === rowIndex && timingFocus.hour === hour ? 0 : -1;

            return `
                <td class="streets-heatmap-data">
                    <button type="button"
                        class="streets-heat-cell"
                        style="--streets-heat-intensity: ${timingHeatIntensity(selectedValue, maxValue)}%"
                        data-row="${rowIndex}" data-hour="${hour}"
                        data-day="${escapeHtml(day.day)}" data-day-name="${escapeHtml(fullDayName)}"
                        data-records="${Number(cell.records) || 0}"
                        data-fine-records="${Number(cell.fineRecords) || 0}"
                        data-warnings="${Number(cell.warnings) || 0}"
                        data-fines="${Number(cell.fines) || 0}"
                        aria-label="${escapeHtml(ariaLabel)}" tabindex="${tabindex}">
                    </button>
                </td>
            `;
        }).join("");

        return `
            <tr>
                <th class="streets-day-heading" scope="row"><span aria-hidden="true">${escapeHtml(day.day)}</span><span class="streets-visually-hidden">${escapeHtml(fullDayName)}</span></th>
                ${dayCells}
                <td class="streets-timing-total streets-day-total" aria-label="${escapeHtml(`${fullDayName} total: ${formatMetricValue(timeMetric, totalValue)}, ${timingPercentFmt.format(totalShare)} of all ${metricLabel}.`)}">
                    <strong>${formatMetricValue(timeMetric, totalValue)}</strong>
                    <span>${timingPercentFmt.format(totalShare)}</span>
                </td>
            </tr>
        `;
    }).join("");

    const hourTotals = hours.map((hour) => {
        const hourItem = data.hourly.find((item) => item.hour === hour) || {};
        const totalValue = Number(hourItem[timeMetric]) || 0;
        const totalShare = grandTotal ? totalValue / grandTotal : 0;
        return `
            <td class="streets-timing-total streets-hour-total" aria-label="${escapeHtml(`${formatHourRange(hour)} total: ${formatMetricValue(timeMetric, totalValue)}, ${timingPercentFmt.format(totalShare)} of all ${metricLabel}.`)}">
                <div class="streets-hour-total-stack">
                    <strong>${formatMetricValue(timeMetric, totalValue)}</strong>
                    <span>${timingPercentFmt.format(totalShare)}</span>
                </div>
            </td>
        `;
    }).join("");

    container.dataset.metric = timeMetric;
    container.innerHTML = `
        <p class="streets-visually-hidden" role="status">Showing ${metricLabel} by weekday and hour.</p>
        <div class="streets-heatmap-scroll" role="region" aria-label="${metricLabelTitle} by weekday and hour">
            <table class="streets-timing-table">
                <caption class="streets-visually-hidden">${metricLabelTitle} by day of week and hour of day. Use arrow keys to move between cells. Day totals are on the right and hour totals are below.</caption>
                <colgroup>
                    <col class="streets-day-column">
                    ${hours.map(() => "<col>").join("")}
                    <col class="streets-day-total-column">
                </colgroup>
                <thead>
                    <tr>
                        <th class="streets-day-heading streets-corner-heading" scope="col">Day</th>
                        ${hourHeadings}
                        <th class="streets-day-total streets-total-heading" scope="col">Day total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr>
                        <th class="streets-hour-total-label" scope="row">Hour total</th>
                        ${hourTotals}
                        <td class="streets-timing-total streets-grand-total" aria-label="Grand total: ${escapeHtml(formatMetricValue(timeMetric, grandTotal))}.">
                            <strong>${formatMetricValue(timeMetric, grandTotal)}</strong>
                            <span>${timingPercentFmt.format(grandTotal ? 1 : 0)}</span>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div class="streets-heatmap-meta">
            <div class="streets-heatmap-legend" aria-label="Color intensity from fewer to more ${metricLabel}">
                <span>Less</span>
                <span class="streets-heat-gradient" aria-hidden="true"></span>
                <span>More ${metricLabel}</span>
            </div>
        </div>
    `;

    const table = container.querySelector(".streets-timing-table");
    const showCellTooltip = (button, event) => {
        const records = Number(button.dataset.records);
        const fineRecords = Number(button.dataset.fineRecords);
        const warnings = Number(button.dataset.warnings);
        const fines = Number(button.dataset.fines);
        const selectedValue = timeMetric === "fines" ? fines : records;
        const selectedShare = grandTotal ? selectedValue / grandTotal : 0;
        const anchor = event?.clientX !== undefined
            ? event
            : (() => {
                const rect = button.getBoundingClientRect();
                return { clientX: rect.right, clientY: rect.top };
            })();

        showTooltip(anchor, `
            <strong>${button.dataset.dayName}, ${formatHourRange(Number(button.dataset.hour))}</strong>
            ${tooltipRow(metricLabelTitle, formatMetricValue(timeMetric, selectedValue))}
            ${tooltipRow(`Share of all ${metricLabel}`, timingPercentFmt.format(selectedShare))}
            ${timeMetric === "records" ? tooltipRow("Listed fines", money(fines)) : tooltipRow("Violations", fmt(records))}
            ${tooltipRow("Fine-bearing violations", fmt(fineRecords))}
            ${tooltipRow("Warnings", fmt(warnings))}
        `, { announce: false });
    };

    table.addEventListener("mousemove", (event) => {
        const button = event.target.closest?.(".streets-heat-cell");
        if (!button) {
            hideTooltip();
            return;
        }
        showCellTooltip(button, event);
    });
    table.addEventListener("mouseleave", hideTooltip);
    table.addEventListener("focusin", (event) => {
        const button = event.target.closest?.(".streets-heat-cell");
        if (button) showCellTooltip(button);
    });
    table.addEventListener("focusout", (event) => {
        if (!event.relatedTarget?.closest?.(".streets-heat-cell")) hideTooltip();
    });
    table.addEventListener("click", (event) => {
        const button = event.target.closest?.(".streets-heat-cell");
        if (!button) return;
        timingFocus = { row: Number(button.dataset.row), hour: Number(button.dataset.hour) };
        table.querySelectorAll(".streets-heat-cell").forEach((cell) => {
            cell.tabIndex = cell === button ? 0 : -1;
        });
        showCellTooltip(button, event);
        window.setTimeout(() => {
            document.addEventListener("pointerdown", hideTooltip, { capture: true, once: true });
        }, 0);
    });
    table.addEventListener("keydown", (event) => {
        const button = event.target.closest?.(".streets-heat-cell");
        if (!button) return;

        let row = Number(button.dataset.row);
        let hour = Number(button.dataset.hour);
        const commandKey = event.ctrlKey || event.metaKey;

        if (event.key === "ArrowLeft") hour = Math.max(0, hour - 1);
        else if (event.key === "ArrowRight") hour = Math.min(23, hour + 1);
        else if (event.key === "ArrowUp") row = Math.max(0, row - 1);
        else if (event.key === "ArrowDown") row = Math.min(weekdays.length - 1, row + 1);
        else if (event.key === "Home") {
            hour = 0;
            if (commandKey) row = 0;
        } else if (event.key === "End") {
            hour = 23;
            if (commandKey) row = weekdays.length - 1;
        } else {
            return;
        }

        event.preventDefault();
        timingFocus = { row, hour };
        table.querySelectorAll(".streets-heat-cell").forEach((cell) => {
            cell.tabIndex = -1;
        });
        const target = table.querySelector(`.streets-heat-cell[data-row="${row}"][data-hour="${hour}"]`);
        if (target) {
            target.tabIndex = 0;
            target.focus();
        }
    });
}

function stackedAreaPath(items, x, y) {
    const top = items.map((item, index) => `${index === 0 ? "M" : "L"} ${x(item.dayOfYear)} ${y(item.upper)}`).join(" ");
    const bottom = [...items].reverse().map((item) => `L ${x(item.dayOfYear)} ${y(item.lower)}`).join(" ");
    return `${top} ${bottom} Z`;
}

function renderTypeAreaChart(data) {
    const container = document.getElementById("streets-type-area-chart");
    const layout = responsiveChartLayout(container, 980, 320, 410);
    const { width, height, compact } = layout;
    const margin = compact
        ? { top: 22, right: 12, bottom: 44, left: 54 }
        : { top: 22, right: 92, bottom: 50, left: 78 };
    const points = data.latestYearTypeCumulative.points;
    const typeKeys = data.latestYearTypeCumulative.typeKeys;
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const xMin = points[0].dayOfYear;
    const xMax = last(points).dayOfYear;
    const yTicks = niceTicks(last(points).total, compact ? 4 : 5);
    const yMax = last(yTicks);
    const x = (day) => margin.left + (day - xMin) / (xMax - xMin || 1) * plotWidth;
    const y = (value) => margin.top + (yMax - value) / yMax * plotHeight;

    const layers = [];
    for (const typeKey of typeKeys) {
        const items = points.map((point) => {
            const lower = layers.reduce((sum, layer) => sum + (layer.valuesByDate.get(point.date) || 0), 0);
            const value = point.byType[typeKey] || 0;
            return {
                date: point.date,
                dayOfYear: point.dayOfYear,
                lower,
                upper: lower + value,
                value,
            };
        });
        layers.push({
            typeKey,
            valuesByDate: new Map(points.map((point) => [point.date, point.byType[typeKey] || 0])),
            items,
        });
    }

    const grid = yTicks.map((tick) => `
        <line x1="${margin.left}" x2="${width - margin.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="currentColor" stroke-opacity="${tick === 0 ? 0.35 : 0.12}"></line>
        <text x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end" font-size="${compact ? 11 : 12}" fill="currentColor">${formatAxisCurrency(tick)}</text>
    `).join("");

    const monthTicks = MONTH_TICKS
        .filter((tick) => tick.day >= xMin && tick.day <= xMax)
        .map((tick) => `
            <line x1="${x(tick.day)}" x2="${x(tick.day)}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="currentColor" stroke-opacity="0.08"></line>
            <text x="${x(tick.day)}" y="${height - 15}" text-anchor="middle" font-size="${compact ? 11 : 12}" fill="currentColor">${tick.label}</text>
        `).join("");

    const areas = layers.map((layer) => `
        <path d="${stackedAreaPath(layer.items, x, y)}" fill="${categoryByKey[layer.typeKey].color}" opacity="0.92"></path>
    `).join("");

    const endpointRows = layers.map((layer) => {
        const endpoint = last(layer.items);
        if (endpoint.value <= 0) return "";
        if (compact) return "";
        return `<text x="${width - margin.right + 8}" y="${y(endpoint.lower + endpoint.value / 2) + 4}" font-size="12" font-weight="700" fill="${categoryByKey[layer.typeKey].color}">${formatAxisCurrency(endpoint.value)}</text>`;
    }).join("");

    container.innerHTML = `
        <svg class="streets-svg" role="img" aria-label="${data.latestYearTypeCumulative.year} cumulative Smart Streets fines by infraction type" viewBox="0 0 ${width} ${height}">
            ${grid}
            ${monthTicks}
            ${areas}
            ${endpointRows}
            <line class="streets-area-hover-line" x1="0" x2="0" y1="${margin.top}" y2="${height - margin.bottom}" stroke="currentColor" stroke-opacity="0" stroke-dasharray="4 4"></line>
            <rect class="streets-hover-target" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="transparent"></rect>
        </svg>
    `;

    renderLegend("streets-type-area-legend", typeKeys.map((typeKey) => ({
        label: categoryByKey[typeKey].label,
        color: categoryByKey[typeKey].color,
    })));

    const svg = container.querySelector("svg");
    const hoverLine = svg.querySelector(".streets-area-hover-line");
    svg.addEventListener("mousemove", (event) => {
        const point = svgPoint(svg, event);
        if (point.x < margin.left || point.x > width - margin.right || point.y < margin.top || point.y > height - margin.bottom) {
            hideTooltip();
            hoverLine.setAttribute("stroke-opacity", "0");
            return;
        }

        const activeDay = Math.round(xMin + (point.x - margin.left) / plotWidth * (xMax - xMin));
        const nearest = points.reduce((best, item) => (
            Math.abs(item.dayOfYear - activeDay) < Math.abs(best.dayOfYear - activeDay) ? item : best
        ), points[0]);

        hoverLine.setAttribute("x1", x(nearest.dayOfYear));
        hoverLine.setAttribute("x2", x(nearest.dayOfYear));
        hoverLine.setAttribute("stroke-opacity", "0.35");

        const rows = typeKeys
            .map((typeKey) => ({ category: categoryByKey[typeKey], value: nearest.byType[typeKey] || 0 }))
            .filter((row) => row.value > 0)
            .reverse()
            .map((row) => tooltipRow(row.category.shortLabel, money(row.value)))
            .join("");

        showTooltip(event, `
            <strong>${formatDate(nearest.date)}</strong>
            ${tooltipRow("Total", money(nearest.total))}
            ${rows}
        `);
    });

    svg.addEventListener("mouseleave", () => {
        hideTooltip();
        hoverLine.setAttribute("stroke-opacity", "0");
    });
}

function renderTypeAnalysis(data) {
    const fineCategories = data.categories.filter((category) => !category.isWarning);
    const topFine = [...fineCategories].sort((a, b) => b.fines - a.fines)[0];
    const topRecords = [...fineCategories].sort((a, b) => b.records - a.records)[0];
    const totalFines = data.summary.totalFines;

    document.getElementById("streets-type-analysis").innerHTML = `
        <p><strong>${topFine.label}</strong> is the largest fine category by dollars even though <strong>${topRecords.label}</strong> has more fine-bearing violations.</p>
        <div class="streets-analysis-list">
            <div class="streets-analysis-row">
                <div class="streets-analysis-value">${pct(topFine.fines / totalFines)}</div>
                <div class="streets-analysis-label">Share of all listed fines from ${escapeHtml(topFine.shortLabel.toLowerCase())} violations</div>
            </div>
            <div class="streets-analysis-row">
                <div class="streets-analysis-value">${money(data.summary.latestYearAverageDailyFines)}</div>
                <div class="streets-analysis-label">Average listed fines per active ${data.summary.latestYear} enforcement day</div>
            </div>
            <div class="streets-analysis-row">
                <div class="streets-analysis-value">${formatDate(data.summary.firstFineDate)}</div>
                <div class="streets-analysis-label">First fine-bearing violation in the extract</div>
            </div>
        </div>
    `;
}

function summarizeItemForSelection(item, keys) {
    return {
        ...item,
        records: keys.reduce((sum, key) => sum + (item.byType?.[key] || 0), 0),
        fines: keys.reduce((sum, key) => sum + (item.finesByType?.[key] || 0), 0),
    };
}

function rankItemsForSelection(items, keys, metric) {
    return items
        .map((item) => summarizeItemForSelection(item, keys))
        .filter((item) => item.records > 0 || item.fines > 0)
        .sort((a, b) => (
            b[metric] - a[metric] ||
            b.records - a.records ||
            b.fines - a.fines ||
            a.name.localeCompare(b.name)
        ));
}

function renderCorridorBars(data) {
    const keys = [...selectedCorridorTypes];
    const source = rankItemsForSelection(data.corridors, keys, corridorSortMetric).slice(0, 12);
    const maxRecords = Math.max(...source.map((row) => row.records), 0);
    const maxFines = Math.max(...source.map((row) => row.fines), 0);
    const container = document.getElementById("streets-corridor-bars");
    const note = document.getElementById("streets-corridor-filter-note");
    const sortLabel = corridorSortMetric === "fines" ? "fine dollars" : "violation volume";

    note.textContent = `Aggregated from the violation location string for ${selectedCategoryLabel(keys)}; sorted by ${sortLabel} descending.`;

    if (!keys.length) {
        container.innerHTML = `<div class="streets-empty-state">Select at least one category to rank corridors.</div>`;
        return;
    }

    if (!source.length) {
        container.innerHTML = `<div class="streets-empty-state">No violations found for the selected categories.</div>`;
        return;
    }

    container.innerHTML = source.map((row) => {
        const recordWidth = maxRecords ? row.records / maxRecords * 100 : 0;
        const fineWidth = maxFines ? row.fines / maxFines * 100 : 0;
        return `
            <div class="streets-grouped-bar-row" data-name="${escapeHtml(row.name)}" data-records="${row.records}" data-fines="${row.fines}">
                <div class="streets-bar-name">${escapeHtml(row.name)}</div>
                <div class="streets-grouped-bars">
                    <div class="streets-grouped-bar-line">
                        <span class="streets-bar-metric">Violations</span>
                        <div class="streets-bar-track" aria-hidden="true"><div class="streets-bar-fill streets-bar-fill-records" style="width:${recordWidth ? Math.max(2, recordWidth) : 0}%"></div></div>
                        <span class="streets-bar-value">${fmt(row.records)}</span>
                    </div>
                    <div class="streets-grouped-bar-line">
                        <span class="streets-bar-metric">Fines</span>
                        <div class="streets-bar-track" aria-hidden="true"><div class="streets-bar-fill streets-bar-fill-fines" style="width:${fineWidth ? Math.max(2, fineWidth) : 0}%"></div></div>
                        <span class="streets-bar-value">${money(row.fines)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".streets-grouped-bar-row").forEach((row) => {
        row.addEventListener("mousemove", (event) => {
            showTooltip(event, `
                <strong>${escapeHtml(row.dataset.name)}</strong>
                ${tooltipRow("Violations", fmt(Number(row.dataset.records)))}
                ${tooltipRow("Listed fines", money(Number(row.dataset.fines)))}
            `);
        });
        row.addEventListener("mouseleave", hideTooltip);
    });
}

function renderLocationTable(data) {
    const keys = [...selectedCorridorTypes];
    const rows = rankItemsForSelection(data.locations, keys, corridorSortMetric).slice(0, 12);
    const tbody = document.getElementById("streets-location-table-body");

    if (!keys.length) {
        tbody.innerHTML = `<tr><td colspan="3">Select at least one category to rank locations.</td></tr>`;
        return;
    }

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="3">No violations found for the selected categories.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((location) => `
        <tr>
            <td>
                <span class="streets-table-label">${escapeHtml(location.name)}</span>
                <div class="ev-card-detail">${escapeHtml(location.corridor)} · ${escapeHtml(location.zone)}</div>
            </td>
            <td class="text-right">${fmt(location.records)}</td>
            <td class="text-right">${money(location.fines)}</td>
        </tr>
    `).join("");
}

function renderCategoryTable(data) {
    const totalFines = data.summary.totalFines || 1;
    document.getElementById("streets-category-table-body").innerHTML = data.categories.map((category) => `
        <tr>
            <td>
                <span class="streets-table-label">
                    <span class="streets-legend-swatch" style="background:${category.color}"></span>
                    ${escapeHtml(category.label)}
                </span>
            </td>
            <td class="text-right">${fmt(category.records)}</td>
            <td class="text-right">${fmt(category.fineRecords)}</td>
            <td class="text-right">${fmt(category.warnings)}</td>
            <td class="text-right">${money(category.fines)}</td>
            <td class="text-right">${category.fines ? pct(category.fines / totalFines) : "0.0%"}</td>
        </tr>
    `).join("");
}

function wardTypeKeys(data) {
    if (selectedWardType === "all") return data.categories.map((category) => category.key);
    return [selectedWardType];
}

function renderWardTypeFilter(data) {
    const container = document.getElementById("streets-ward-type-filter");
    const buttons = [
        { key: "all", label: "All" },
        ...data.categories.map((category) => ({ key: category.key, label: category.shortLabel })),
    ];

    container.innerHTML = buttons.map((button) => `
        <button type="button" class="${button.key === selectedWardType ? "active" : ""}" data-type="${button.key}">${escapeHtml(button.label)}</button>
    `).join("");

    container.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
            selectedWardType = button.dataset.type;
            container.querySelectorAll("button").forEach((item) => {
                item.classList.toggle("active", item === button);
            });
            renderWardTable(data);
        });
    });
}

function formatTopType(topType, formatter = fmt) {
    if (!topType) return "None";
    return `${escapeHtml(topType.label)} (${formatter(topType.value)})`;
}

function wardSortValue(column, row) {
    switch (column) {
    case "ward":
        return Number(row.ward) || 0;
    case "records":
        return row.selected.records;
    case "fineRecords":
        return row.selected.fineRecords;
    case "warnings":
        return row.selected.warnings;
    case "fines":
        return row.selected.fines;
    default:
        return row.selected.records;
    }
}

function sortWardRows(rows) {
    return [...rows].sort((rowA, rowB) => {
        const result = compareSortValues(
            wardSortValue(wardDetailSort.col, rowA),
            wardSortValue(wardDetailSort.col, rowB),
        );
        if (result !== 0) return wardDetailSort.asc ? result : -result;
        return (Number(rowA.ward) || 0) - (Number(rowB.ward) || 0);
    });
}

function syncWardTableSortUi() {
    const table = document.getElementById("streets-ward-table");
    if (!table) return;

    table.querySelectorAll("thead th[data-sort]").forEach((header) => {
        const arrow = header.querySelector(".ev-sort-arrow");
        const active = header.dataset.sort === wardDetailSort.col;

        header.setAttribute("aria-sort", active ? (wardDetailSort.asc ? "ascending" : "descending") : "none");
        if (arrow) {
            arrow.classList.toggle("active", active);
            arrow.innerHTML = active && !wardDetailSort.asc ? "&#9660;" : "&#9650;";
        }
    });
}

function bindWardTableSort() {
    const table = document.getElementById("streets-ward-table");
    if (!table || table.dataset.sortReady === "true") {
        syncWardTableSortUi();
        return;
    }

    const activateSort = (header) => {
        const nextColumn = header.dataset.sort;
        if (!nextColumn) return;

        if (wardDetailSort.col === nextColumn) {
            wardDetailSort.asc = !wardDetailSort.asc;
        } else {
            wardDetailSort.col = nextColumn;
            wardDetailSort.asc = WARD_TABLE_DEFAULT_ASC.has(nextColumn);
        }

        syncWardTableSortUi();
        renderWardTable(streetsData);
    };

    table.addEventListener("click", (event) => {
        const header = event.target.closest("th[data-sort]");
        if (!header || !table.contains(header)) return;
        activateSort(header);
    });

    table.addEventListener("keydown", (event) => {
        const header = event.target.closest("th[data-sort]");
        if (!header || !table.contains(header)) return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        activateSort(header);
    });

    table.dataset.sortReady = "true";
    syncWardTableSortUi();
}

function renderWardTable(data) {
    const keys = wardTypeKeys(data);
    const selectedCategory = selectedWardType === "all" ? null : categoryByKey[selectedWardType];
    const rows = sortWardRows(data.wards
        .map((ward) => ({
            ...ward,
            selected: summarizeMetricsForKeys(ward, keys),
        }))
        .filter((ward) => ward.selected.records > 0));

    document.getElementById("streets-ward-filter-note").textContent = selectedCategory
        ? `Showing wards with at least one ${selectedCategory.shortLabel.toLowerCase()} violation. Top columns still compare fine-bearing violation categories within each ward.`
        : "Showing wards with at least one violation. Top columns compare fine-bearing violation categories within each ward.";
    syncWardTableSortUi();

    document.getElementById("streets-ward-table-body").innerHTML = rows.length ? rows.map((ward) => `
        <tr>
            <td>${escapeHtml(ward.name)}</td>
            <td class="text-right">${fmt(ward.selected.records)}</td>
            <td class="text-right">${fmt(ward.selected.fineRecords)}</td>
            <td class="text-right">${fmt(ward.selected.warnings)}</td>
            <td class="text-right">${money(ward.selected.fines)}</td>
            <td>${formatTopType(ward.topViolationType)}</td>
            <td>${formatTopType(ward.topFineCategory, money)}</td>
        </tr>
    `).join("") : `<tr><td colspan="7">No wards contain the selected violation type.</td></tr>`;
}

function renderSources(data) {
    const sourceArchive = data.sources.sourceArchive || (SMART_STREETS_SOURCE_ARCHIVE_URL ? {
        filename: filenameFromUrl(SMART_STREETS_SOURCE_ARCHIVE_URL),
        href: SMART_STREETS_SOURCE_ARCHIVE_URL,
    } : null);
    const wardBoundariesUrl = data.sources.wardBoundariesUrl || CHICAGO_WARD_BOUNDARIES_URL;
    const violationsFile = data.sources.violationsFile || data.sources.violationsCsv || "FOIA export";

    document.getElementById("streets-sources").innerHTML = `
        <h3>Sources And Methodology</h3>
        ${sourceArchive ? `
            <p class="streets-source-download">
                <a href="${escapeHtml(sourceArchive.href)}" download>Download source files (.zip)</a>
            </p>
        ` : ""}
        <ul>
            ${data.sources.primaryLinks.map((link) => `<li><a href="${link.href}">${escapeHtml(link.label)}</a></li>`).join("")}
            <li>Violation data: Chicago Department of Finance FOIA export, ${escapeHtml(violationsFile)}, through ${formatDate(data.summary.dateRange.end)}.</li>
            <li>Metrics: "Listed fines" sums the FOIA <code>Fine Level 1</code> values. "Fine-bearing violations" are records where that field is greater than zero; listed fines do not measure payment, collection, or adjudication outcomes.</li>
            <li>Geography: ${escapeHtml(data.methodology.geocoding)} Street geometry and address ranges from <a href="https://data.cityofchicago.org/d/pr57-gg9e">Chicago street centerlines</a>, downloaded ${escapeHtml(data.geocoding.streetSnapshotDate)}. Difficult addresses use a cached <a href="https://geocoding.geo.census.gov/geocoder/">Census Geocoder</a> match projected onto the same named street and block, within 35 meters. Ward boundaries from the <a href="${escapeHtml(wardBoundariesUrl)}">City of Chicago Data Portal</a>.</li>
            <li>Ward estimates: ${escapeHtml(data.methodology.wardAssignment)}</li>
            <li>Conventional enforcement: ${escapeHtml(data.illegalParking.sourceFile)}, records through ${formatDate(data.illegalParking.dateRange.end)}, accurate as of ${formatDate(data.illegalParking.accurateAsOf)}. Fine and payment amounts are not supplied.</li>
            <li>Open source repository: <a href="https://github.com/MisterClean/chicago-smart-streets-pilot">MisterClean/chicago-smart-streets-pilot</a>.</li>
            ${sourceArchive ? `<li>Download archive: ${escapeHtml(sourceArchive.filename)} contains both original FOIA workbooks, normalized CSVs, frontage and block location lookups, reference street data, cached Census results, geocoding review files, reconciliation notes, and zone GeoJSON.</li>` : ""}
            <li>Disclaimer: This analysis and derived data are provided as-is for informational purposes only, without warranties of accuracy, completeness, or fitness for any use.</li>
        </ul>
        <div class="streets-fine-schedule">
            <h4>Fine Schedule</h4>
            <div class="streets-table-wrap streets-fine-schedule-wrap">
                <table class="ev-table streets-table">
                    <thead>
                        <tr>
                            <th>Violation code</th>
                            <th>Description of violation</th>
                            <th class="text-right">Initial fine</th>
                            <th class="text-right">Late penalty amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${FINE_SCHEDULE.map((row) => `
                            <tr>
                                <td>${escapeHtml(row.code)}</td>
                                <td>${escapeHtml(row.description)}</td>
                                <td class="text-right">${scheduleMoney(row.initialFine)}</td>
                                <td class="text-right">${scheduleMoney(row.latePenalty)}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function getStyleUrl() {
    if (!PROTOMAPS_KEY) {
        return {
            version: 8,
            sources: {},
            layers: [
                {
                    id: "background",
                    type: "background",
                    paint: {
                        "background-color": prefersDark.matches ? "#171717" : "#f2efe8",
                    },
                },
            ],
        };
    }

    const flavor = prefersDark.matches ? "dark" : "light";
    return `https://api.protomaps.com/styles/v5/${flavor}/en.json?key=${PROTOMAPS_KEY}`;
}

function setPaintIfLayer(map, layerId, property, value) {
    if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, property, value);
    }
}

function applySmartStreetsBasemapTheme(map) {
    if (prefersDark.matches) return;

    Object.entries(LIGHT_BASEMAP_PAINT).forEach(([layerId, paint]) => {
        Object.entries(paint).forEach(([property, value]) => {
            setPaintIfLayer(map, layerId, property, value);
        });
    });

    for (const layer of map.getStyle()?.layers ?? []) {
        if (!layer.id.startsWith("roads_") || layer.type !== "line") continue;

        if (layer.id.includes("rail")) {
            setPaintIfLayer(map, layer.id, "line-color", "#9ca3af");
            setPaintIfLayer(map, layer.id, "line-opacity", 0.38);
            continue;
        }

        const isCasing = layer.id.includes("casing");
        const isMajor = layer.id.includes("major") || layer.id.includes("highway");
        setPaintIfLayer(map, layer.id, "line-color", isCasing ? "#d1cdc4" : "#f7f5ee");
        setPaintIfLayer(map, layer.id, "line-opacity", isMajor ? 0.82 : 0.62);
    }

    for (const layerId of ["address_label", "water_waterway_label", "water_label_ocean", "earth_label_islands", "water_label_lakes", "pois", "places_subplace", "places_region", "places_country"]) {
        setPaintIfLayer(map, layerId, "text-color", "#6b7280");
        setPaintIfLayer(map, layerId, "text-halo-color", "#e7e4dc");
    }
}

function getFirstSymbolLayerId(map) {
    const layers = map.getStyle()?.layers ?? [];
    return layers.find((layer) => layer.type === "symbol")?.id;
}

function hideBasemapLabelLayers(map) {
    for (const id of ["roads_labels_minor", "roads_labels_major", "roads_shields", "places_locality"]) {
        if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", "none");
        }
    }
}

function extendBounds(bounds, coordinates) {
    if (!Array.isArray(coordinates?.[0])) {
        bounds.extend(coordinates);
        return;
    }

    for (const coordinate of coordinates) {
        extendBounds(bounds, coordinate);
    }
}

function zoneBounds(maplibregl, featureCollection) {
    const bounds = new maplibregl.LngLatBounds();
    featureCollection.features.forEach((feature) => extendBounds(bounds, feature.geometry.coordinates));
    return bounds;
}

function featureBounds(maplibregl, feature) {
    const bounds = new maplibregl.LngLatBounds();
    extendBounds(bounds, feature.geometry.coordinates);
    return bounds;
}

function fitMapToSelectedWard() {
    if (!streetsMap || !streetsWardGeoJSON) return;

    if (selectedMapWard === "all") {
        if (streetsZoneGeoJSON) {
            streetsMap.fitBounds(zoneBounds(maplibregl, streetsZoneGeoJSON), {
                padding: window.innerWidth < 720 ? 28 : 54,
                duration: 450,
            });
        }
        return;
    }

    const feature = streetsWardGeoJSON.features.find((ward) => String(ward.properties.ward) === selectedMapWard);
    if (!feature) return;

    streetsMap.fitBounds(featureBounds(maplibregl, feature), {
        padding: window.innerWidth < 720 ? 30 : 64,
        duration: 450,
    });
}

function categoryMapColor(category) {
    return MAP_TYPE_COLORS[category.key] || category.color;
}

function typeColorExpression() {
    const expression = ["match", ["get", "typeKey"]];
    streetsData.categories.forEach((category) => {
        expression.push(category.key, categoryMapColor(category));
    });
    expression.push("#64748b");
    return expression;
}

function aggregateMapFilterExpression() {
    if (selectedMapLayer !== MAP_ALL_KEY) return ["==", ["get", "typeKey"], "__none__"];
    if (selectedMapWard !== "all") return ["==", ["get", "ward"], selectedMapWard];
    return null;
}

function categoryMapFilterExpression() {
    const filters = [];
    if (selectedMapLayer === MAP_ALL_KEY) filters.push(["==", ["get", "typeKey"], "__none__"]);
    else filters.push(["==", ["get", "typeKey"], selectedMapLayer]);
    if (selectedMapWard !== "all") filters.push(["==", ["get", "ward"], selectedMapWard]);
    if (filters.length === 1) return filters[0];
    return ["all", ...filters];
}

function selectedWardRow() {
    if (selectedMapWard === "all") return null;
    return streetsData.wards.find((ward) => ward.ward === selectedMapWard) || null;
}

function wardLayerFilter() {
    if (selectedMapWard === "all") return ["==", ["get", "ward"], "__none__"];
    return ["==", ["get", "ward"], selectedMapWard];
}

function selectedMapCategory() {
    if (selectedMapLayer === MAP_ALL_KEY) return null;
    return categoryByKey[selectedMapLayer] || null;
}

function selectedMapKeys() {
    return selectedMapLayer === MAP_ALL_KEY
        ? streetsData.categories.map((category) => category.key)
        : [selectedMapLayer];
}

function summarizeMetricsForKeys(item, keys) {
    const records = keys.reduce((sum, key) => sum + (item.byType?.[key] || 0), 0);
    const fines = keys.reduce((sum, key) => sum + (item.finesByType?.[key] || 0), 0);
    const fineRecords = item.finesByType
        ? keys.reduce((sum, key) => {
            const fineAmount = item.finesByType?.[key] || 0;
            if (!fineAmount) return sum;
            return sum + (item.byType?.[key] || 0);
        }, 0)
        : item.fineRecords || 0;
    return {
        records,
        fines,
        fineRecords,
        warnings: Math.max(0, records - fineRecords),
    };
}

function syncMapFilterUi() {
    document.querySelectorAll("#streets-map-type-list input").forEach((input) => {
        input.checked = selectedMapLayer === input.value;
    });

    document.querySelectorAll("#streets-map-legend [data-map-layer]").forEach((button) => {
        const isActive = selectedMapLayer === button.dataset.mapLayer;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
}

function updateMapStatus() {
    const keys = selectedMapKeys();
    const category = selectedMapCategory();
    const ward = selectedWardRow();
    const metrics = ward
        ? summarizeMetricsForKeys(ward, keys)
        : category
            ? {
                records: category.records,
                fines: category.fines,
            }
            : {
                records: streetsData.summary.totalRecords,
                fines: streetsData.summary.totalFines,
            };
    const typeLabel = category ? category.label : "all categories";
    const wardLabel = ward ? ` in ${ward.name}` : "";
    const mapped = streetsData.locations.filter((location) => Number.isFinite(location.longitude) && Number.isFinite(location.latitude)
        && (selectedMapWard === "all" || location.ward === selectedMapWard))
        .reduce((sum, location) => sum + summarizeMetricsForKeys(location, keys).records, 0);
    document.getElementById("streets-map-caption").textContent = `${fmt(mapped)} of ${fmt(metrics.records)} reported violations mapped across ${typeLabel}${wardLabel}. ${money(metrics.fines)} in listed fines across all matching records.`;
    document.getElementById("streets-map-ward-note").textContent = ward
        ? `${ward.name}: ${fmt(metrics.records)} violations and ${money(metrics.fines)} in listed fines for the active layer.`
        : "Map includes all wards.";
    document.getElementById("streets-map-status").textContent = PROTOMAPS_KEY
        ? "Map loaded with Protomaps basemap."
        : "Map loaded with local fallback basemap.";
}

function updateMapLayers() {
    syncMapFilterUi();
    updateMapStatus();
    renderMapTopLocations(streetsData);
    if (!streetsMap || !streetsMap.getLayer("streets-infraction-points")) return;

    const aggregateFilter = aggregateMapFilterExpression();
    const categoryFilter = categoryMapFilterExpression();
    streetsMap.setFilter("streets-all-infraction-heat", aggregateFilter);
    streetsMap.setFilter("streets-all-infraction-points", aggregateFilter);
    streetsMap.setFilter("streets-infraction-heat", categoryFilter);
    streetsMap.setFilter("streets-infraction-points", categoryFilter);
    if (streetsMap.getLayer("streets-selected-ward-fill")) {
        streetsMap.setFilter("streets-selected-ward-fill", wardLayerFilter());
        streetsMap.setFilter("streets-selected-ward-line", wardLayerFilter());
    }
}

function renderMapControls(data) {
    const list = document.getElementById("streets-map-type-list");
    const options = [
        {
            key: MAP_ALL_KEY,
            label: MAP_ALL_LABEL,
            color: MAP_ALL_COLOR,
            records: data.summary.totalRecords,
        },
        ...data.categories.map((category) => ({
            key: category.key,
            label: category.label,
            color: categoryMapColor(category),
            records: category.records,
        })),
    ];

    list.innerHTML = options.map((option) => `
        <label class="streets-type-row">
            <input type="radio" name="streets-map-layer" value="${option.key}" ${selectedMapLayer === option.key ? "checked" : ""}>
            <span class="streets-type-title">
                <span class="streets-legend-swatch" style="background:${option.color}"></span>
                ${escapeHtml(option.label)}
            </span>
            <span class="streets-type-count">${fmt(option.records)}</span>
        </label>
    `).join("");

    list.querySelectorAll("input").forEach((input) => {
        input.addEventListener("change", () => {
            if (!input.checked) return;
            selectedMapLayer = input.value;
            updateMapLayers();
        });
    });
}

function renderWardMapControl(data) {
    const select = document.getElementById("streets-map-ward-select");
    const wardRows = data.wards.filter((ward) => ward.records > 0).sort((a, b) => {
        if (a.ward === "Unknown") return 1;
        if (b.ward === "Unknown") return -1;
        return Number(a.ward) - Number(b.ward);
    });
    const wardValues = new Set(wardRows.map((ward) => ward.ward));
    if (selectedMapWard !== "all" && !wardValues.has(selectedMapWard)) {
        selectedMapWard = "all";
    }
    select.innerHTML = `
        <option value="all">All wards</option>
        ${wardRows.map((ward) => `<option value="${escapeHtml(ward.ward)}">${escapeHtml(ward.name)}</option>`).join("")}
    `;
    select.value = selectedMapWard;
    select.addEventListener("change", () => {
        selectedMapWard = select.value;
        updateMapLayers();
        fitMapToSelectedWard();
    });
}

function renderCorridorCategoryFilter(data) {
    const list = document.getElementById("streets-corridor-type-list");
    list.innerHTML = data.categories.map((category) => `
        <label class="streets-filter-chip">
            <input type="checkbox" value="${category.key}" checked>
            <span class="streets-legend-swatch" style="background:${category.color}"></span>
            ${escapeHtml(category.label)}
        </label>
    `).join("");

    function setTypes(keys) {
        selectedCorridorTypes = new Set(keys);
        list.querySelectorAll("input").forEach((input) => {
            input.checked = selectedCorridorTypes.has(input.value);
        });
        renderCorridorBars(data);
        renderLocationTable(data);
    }

    list.querySelectorAll("input").forEach((input) => {
        input.addEventListener("change", () => {
            if (input.checked) selectedCorridorTypes.add(input.value);
            else selectedCorridorTypes.delete(input.value);
            renderCorridorBars(data);
            renderLocationTable(data);
        });
    });

    document.getElementById("streets-corridor-select-all").addEventListener("click", () => {
        setTypes(data.categories.map((category) => category.key));
    });
    document.getElementById("streets-corridor-select-fines").addEventListener("click", () => {
        setTypes(data.categories.filter((category) => !category.isWarning).map((category) => category.key));
    });
    document.getElementById("streets-corridor-select-warnings").addEventListener("click", () => {
        setTypes(data.categories.filter((category) => category.isWarning).map((category) => category.key));
    });
}

function renderMapLegend(data) {
    const legend = document.getElementById("streets-map-legend");
    legend.innerHTML = `
        <button class="streets-map-legend-item streets-map-legend-toggle is-active" type="button" data-map-layer="${MAP_ALL_KEY}" aria-pressed="true">
            <span class="streets-legend-swatch" style="background:${MAP_ALL_COLOR}"></span>
            ${MAP_ALL_LABEL}
        </button>
        ${data.categories.map((category) => `
            <button class="streets-map-legend-item streets-map-legend-toggle" type="button" data-map-layer="${category.key}" aria-pressed="false">
                <span class="streets-legend-swatch" style="background:${categoryMapColor(category)}"></span>
                ${escapeHtml(category.shortLabel)}
            </button>
        `).join("")}
        <span class="streets-map-legend-item streets-map-legend-boundary"><span class="streets-boundary-swatch" style="color:${MAP_BOUNDARY_COLORS.expansion}"></span> Expansion zone</span>
        <span class="streets-map-legend-item streets-map-legend-boundary"><span class="streets-boundary-swatch" style="color:${MAP_BOUNDARY_COLORS.initial}"></span> Initial pilot zone</span>
        <span class="streets-map-legend-item streets-map-legend-boundary"><span class="streets-boundary-swatch" style="color:${MAP_BOUNDARY_COLORS.selectedWard}"></span> Selected ward</span>
    `;

    legend.querySelectorAll("[data-map-layer]").forEach((button) => {
        button.addEventListener("click", () => {
            selectedMapLayer = button.dataset.mapLayer;
            updateMapLayers();
        });
    });

    syncMapFilterUi();
}

function renderMapTopLocations(data) {
    const keys = selectedMapKeys();
    const rows = rankItemsForSelection(data.locations, keys, "records")
        .filter((location) => Number.isFinite(location.longitude) && Number.isFinite(location.latitude))
        .filter((location) => selectedMapWard === "all" || location.ward === selectedMapWard)
        .slice(0, 6);
    const container = document.getElementById("streets-map-top-locations");

    if (!rows.length) {
        container.innerHTML = `<div class="streets-empty-state">No locations found for the selected filters.</div>`;
        return;
    }

    container.innerHTML = rows.map((location) => `
        <div class="streets-location-item">
            <div class="streets-location-title">${escapeHtml(location.name)}</div>
            <div class="streets-location-detail">${fmt(location.records)} violations · ${money(location.fines)} listed fines · Ward ${escapeHtml(location.ward)}</div>
        </div>
    `).join("");
}

function buildAllViolationFeatureCollection(data) {
    return {
        type: "FeatureCollection",
        features: data.locations.filter((location) => Number.isFinite(location.longitude) && Number.isFinite(location.latitude)).map((location, index) => ({
            type: "Feature",
            id: index + 1,
            properties: {
                location: location.name,
                corridor: location.corridor,
                ward: location.ward,
                typeKey: MAP_ALL_KEY,
                typeLabel: MAP_ALL_LABEL,
                typeColor: MAP_ALL_COLOR,
                zone: location.zone,
                records: location.records,
                fineRecords: location.fineRecords,
                warnings: location.warnings,
                fines: location.fines,
                firstDate: location.firstDate,
                lastDate: location.lastDate,
            },
            geometry: {
                type: "Point",
                coordinates: [location.longitude, location.latitude],
            },
        })),
    };
}

function popupHtml(properties) {
    return `
        <div class="streets-popup">
            <div class="streets-popup-title">${escapeHtml(properties.location)}</div>
            <div class="streets-popup-detail">${escapeHtml(properties.typeLabel)}<br>Ward ${escapeHtml(properties.ward)} · ${escapeHtml(properties.zone)}<br>${escapeHtml(properties.firstDate)} to ${escapeHtml(properties.lastDate)}</div>
            <div class="streets-popup-stats">
                <span class="streets-popup-pill">${fmt(properties.records)} violations</span>
                <span class="streets-popup-pill">${fmt(properties.fineRecords)} fines</span>
                <span class="streets-popup-pill">${money(properties.fines)}</span>
            </div>
        </div>
    `;
}

function kinzieLocations(data) {
    return data.locations.filter((location) => (
        location.corridor === "KINZIE"
        && location.longitude >= KINZIE_BOUNDS[0][0]
        && location.longitude <= KINZIE_BOUNDS[1][0]
    ));
}

function summarizeKinzieRange(data, range) {
    return kinzieLocations(data)
        .filter((location) => location.longitude >= range.west && location.longitude <= range.east)
        .reduce((summary, location) => {
            summary.records += location.records;
            summary.fines += location.fines;
            summary.bikeRecords += location.byType?.bike_lane || 0;
            summary.bikeFines += location.finesByType?.bike_lane || 0;
            summary.fineRecords += location.fineRecords || 0;
            summary.warnings += location.warnings || 0;
            return summary;
        }, {
            records: 0,
            fines: 0,
            bikeRecords: 0,
            bikeFines: 0,
            fineRecords: 0,
            warnings: 0,
        });
}

function renderKinzieDesignStats(data) {
    const protectedSummary = summarizeKinzieRange(data, KINZIE_PROTECTED_RANGE);
    const unprotectedSummary = summarizeKinzieRange(data, KINZIE_UNPROTECTED_RANGE);
    const container = document.getElementById("streets-kinzie-stats");
    const protectedLocation = data.locations.find((location) => location.name === "230 W KINZIE ST");
    const unprotectedLocation = data.locations.find((location) => location.name === "169 W KINZIE ST");

    const protectedCaption = document.getElementById("streets-kinzie-protected-caption");
    const unprotectedCaption = document.getElementById("streets-kinzie-unprotected-caption");
    if (protectedCaption && protectedLocation) {
        protectedCaption.textContent = `${fmt(protectedLocation.records)} total violations, including ${fmt(protectedLocation.byType?.bike_lane || 0)} bike-lane tickets and ${money(protectedLocation.fines)} in listed fines.`;
    }
    if (unprotectedCaption && unprotectedLocation) {
        unprotectedCaption.textContent = `${fmt(unprotectedLocation.records)} violations, including ${fmt(unprotectedLocation.byType?.bike_lane || 0)} bike-lane tickets and ${money(unprotectedLocation.fines)} in listed fines.`;
    }

    if (!container) return;

    container.innerHTML = `
        <div class="streets-kinzie-stat">
            <div class="streets-kinzie-stat-label">Protected stretch</div>
            <div class="streets-kinzie-stat-value">${fmt(protectedSummary.bikeRecords)}</div>
            <div class="streets-kinzie-stat-detail">bike-lane tickets from Milwaukee to Wells; ${money(protectedSummary.bikeFines)} listed bike-lane fines</div>
        </div>
        <div class="streets-kinzie-stat">
            <div class="streets-kinzie-stat-label">Paint-only area</div>
            <div class="streets-kinzie-stat-value">${fmt(unprotectedSummary.bikeRecords)}</div>
            <div class="streets-kinzie-stat-detail">bike-lane tickets; ${money(unprotectedSummary.bikeFines)} listed bike-lane fines</div>
        </div>
    `;
}

function buildKinziePointCollection(data) {
    return {
        type: "FeatureCollection",
        features: kinzieLocations(data).map((location, index) => ({
            type: "Feature",
            id: index + 1,
            properties: {
                location: location.name,
                ward: location.ward,
                zone: location.zone,
                records: location.records,
                fineRecords: location.fineRecords,
                warnings: location.warnings,
                fines: location.fines,
                bikeRecords: location.byType?.bike_lane || 0,
                bikeFines: location.finesByType?.bike_lane || 0,
                firstDate: location.firstDate,
                lastDate: location.lastDate,
            },
            geometry: {
                type: "Point",
                coordinates: [location.longitude, location.latitude],
            },
        })),
    };
}

function kinzieExample(data, address, treatment, detail, color, offset) {
    const location = data.locations.find((item) => item.name === address);
    if (!location) return null;

    return {
        location,
        treatment,
        detail: detail || `${fmt(location.records)} violations, including ${fmt(location.byType?.bike_lane || 0)} bike-lane tickets and ${money(location.fines)} in listed fines.`,
        color,
        offset,
    };
}

function kinziePopupHtml(properties) {
    return `
        <div class="streets-popup">
            <div class="streets-popup-title">${escapeHtml(properties.location)}</div>
            <div class="streets-popup-detail">Kinzie Street · Ward ${escapeHtml(properties.ward)}<br>${escapeHtml(properties.firstDate)} to ${escapeHtml(properties.lastDate)}</div>
            <div class="streets-popup-stats">
                <span class="streets-popup-pill">${fmt(properties.records)} violations</span>
                <span class="streets-popup-pill">${fmt(properties.bikeRecords)} bike-lane tickets</span>
                <span class="streets-popup-pill">${money(properties.fines)}</span>
            </div>
        </div>
    `;
}

function addKinzieExampleMarker(map, example) {
    const element = document.createElement("div");
    element.className = "streets-kinzie-marker";
    element.style.setProperty("--marker-color", example.color);
    element.innerHTML = `
        <span>${escapeHtml(example.location.name.replace(" ST", ""))}</span>
    `;

    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "280px" })
        .setHTML(`
            <div class="streets-popup">
                <div class="streets-popup-title">${escapeHtml(example.location.name)}</div>
                <div class="streets-popup-detail">${escapeHtml(example.treatment)}<br>${escapeHtml(example.detail)}</div>
                <div class="streets-popup-stats">
                    <span class="streets-popup-pill">${fmt(example.location.records)} violations</span>
                    <span class="streets-popup-pill">${fmt(example.location.byType?.bike_lane || 0)} bike-lane tickets</span>
                    <span class="streets-popup-pill">${money(example.location.fines)}</span>
                </div>
            </div>
        `);

    new maplibregl.Marker({ element, anchor: "bottom", offset: example.offset || [0, 0] })
        .setLngLat([example.location.longitude, example.location.latitude])
        .setPopup(popup)
        .addTo(map);
}

async function initializeKinzieMap(data) {
    const status = document.getElementById("streets-kinzie-map-status");
    const container = document.getElementById("streets-kinzie-map");
    if (!container) return;
    if (!window.maplibregl) {
        status.textContent = "Map library did not load.";
        return;
    }

    streetsKinzieMap = new maplibregl.Map({
        container: "streets-kinzie-map",
        style: getStyleUrl(),
        center: [-87.6314, 41.8892],
        zoom: 15.5,
        attributionControl: false,
    });

    streetsKinzieMap.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-left");
    streetsKinzieMap.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    streetsKinzieMap.on("load", () => {
        applySmartStreetsBasemapTheme(streetsKinzieMap);
        hideBasemapLabelLayers(streetsKinzieMap);
        const beforeId = getFirstSymbolLayerId(streetsKinzieMap);

        streetsKinzieMap.addSource("kinzie-segments", {
            type: "geojson",
            data: KINZIE_SEGMENTS_GEOJSON,
        });
        streetsKinzieMap.addSource("kinzie-points", {
            type: "geojson",
            data: buildKinziePointCollection(data),
        });

        streetsKinzieMap.addLayer({
            id: "kinzie-segments-casing",
            type: "line",
            source: "kinzie-segments",
            paint: {
                "line-color": "#ffffff",
                "line-width": 12,
                "line-opacity": 0.9,
            },
        }, beforeId);
        streetsKinzieMap.addLayer({
            id: "kinzie-segments",
            type: "line",
            source: "kinzie-segments",
            paint: {
                "line-color": ["get", "color"],
                "line-width": 7,
                "line-opacity": 0.98,
            },
        }, beforeId);
        streetsKinzieMap.addLayer({
            id: "kinzie-points",
            type: "circle",
            source: "kinzie-points",
            layout: {
                "circle-sort-key": ["get", "records"],
            },
            paint: {
                "circle-color": [
                    "case",
                    [">", ["get", "bikeRecords"], 0],
                    "#e9003a",
                    KINZIE_POINT_COLOR,
                ],
                "circle-radius": [
                    "interpolate", ["linear"], ["get", "records"],
                    1, 4,
                    25, 7,
                    100, 12,
                    400, 18,
                ],
                "circle-opacity": 0.88,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-opacity": 0.95,
                "circle-stroke-width": 1.15,
            },
        }, beforeId);

        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px" });
        streetsKinzieMap.on("mouseenter", "kinzie-points", () => {
            streetsKinzieMap.getCanvas().style.cursor = "pointer";
        });
        streetsKinzieMap.on("mouseleave", "kinzie-points", () => {
            streetsKinzieMap.getCanvas().style.cursor = "";
        });
        streetsKinzieMap.on("click", "kinzie-points", (event) => {
            const feature = event.features?.[0];
            if (!feature) return;
            popup
                .setLngLat(feature.geometry.coordinates)
                .setHTML(kinziePopupHtml(feature.properties))
                .addTo(streetsKinzieMap);
        });

        [
            kinzieExample(data, "169 W KINZIE ST", "Paint-only bike lane", "Highest Kinzie location in the extract.", KINZIE_UNPROTECTED_COLOR, [42, 0]),
            kinzieExample(data, "230 W KINZIE ST", "Protected bike lane", null, KINZIE_PROTECTED_COLOR, [-36, 0]),
        ].filter(Boolean).forEach((example) => addKinzieExampleMarker(streetsKinzieMap, example));

        streetsKinzieMap.fitBounds(KINZIE_BOUNDS, {
            padding: window.innerWidth < 720 ? 36 : 64,
            duration: 0,
        });
        status.textContent = PROTOMAPS_KEY
            ? "Kinzie map loaded with Protomaps basemap."
            : "Kinzie map loaded with a local fallback basemap.";
    });
}

async function initializeMap(data) {
    if (!window.maplibregl) {
        document.getElementById("streets-map-status").textContent = "Map library did not load.";
        return;
    }

    const [zones, wards] = await Promise.all([
        fetch(SMART_STREETS_ZONES_URL).then((response) => response.json()),
        fetch(SMART_STREETS_WARDS_URL).then((response) => response.json()),
    ]);
    streetsZoneGeoJSON = zones;
    streetsWardGeoJSON = wards;
    streetsMap = new maplibregl.Map({
        container: "streets-map",
        style: getStyleUrl(),
        center: [-87.635, 41.89],
        zoom: 11.2,
        attributionControl: false,
    });

    streetsMap.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-left");
    streetsMap.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    streetsMap.on("load", () => {
        applySmartStreetsBasemapTheme(streetsMap);
        hideBasemapLabelLayers(streetsMap);
        const beforeId = getFirstSymbolLayerId(streetsMap);

        streetsMap.addSource("streets-zones", {
            type: "geojson",
            data: SMART_STREETS_ZONES_URL,
        });
        streetsMap.addSource("streets-wards", {
            type: "geojson",
            data: SMART_STREETS_WARDS_URL,
        });
        streetsMap.addSource("streets-all-infractions", {
            type: "geojson",
            data: buildAllViolationFeatureCollection(data),
        });
        streetsMap.addSource("streets-infractions", {
            type: "geojson",
            data: SMART_STREETS_POINTS_URL,
        });

        streetsMap.addLayer({
            id: "streets-expansion-fill",
            type: "fill",
            source: "streets-zones",
            filter: ["==", ["get", "Boundary"], "Expansion Zone"],
            paint: {
                "fill-color": MAP_BOUNDARY_COLORS.expansion,
                "fill-opacity": 0.06,
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-initial-fill",
            type: "fill",
            source: "streets-zones",
            filter: ["==", ["get", "Boundary"], "Initial Pilot Zone"],
            paint: {
                "fill-color": MAP_BOUNDARY_COLORS.initial,
                "fill-opacity": 0.07,
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-expansion-line",
            type: "line",
            source: "streets-zones",
            filter: ["==", ["get", "Boundary"], "Expansion Zone"],
            paint: {
                "line-color": MAP_BOUNDARY_COLORS.expansion,
                "line-width": 2.6,
                "line-opacity": 0.95,
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-initial-line",
            type: "line",
            source: "streets-zones",
            filter: ["==", ["get", "Boundary"], "Initial Pilot Zone"],
            paint: {
                "line-color": MAP_BOUNDARY_COLORS.initial,
                "line-width": 2.8,
                "line-opacity": 0.95,
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-ward-lines",
            type: "line",
            source: "streets-wards",
            paint: {
                "line-color": prefersDark.matches ? "#f8fafc" : "#111827",
                "line-width": 0.8,
                "line-opacity": 0.22,
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-selected-ward-fill",
            type: "fill",
            source: "streets-wards",
            filter: wardLayerFilter(),
            paint: {
                "fill-color": MAP_BOUNDARY_COLORS.selectedWard,
                "fill-opacity": 0.12,
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-selected-ward-line",
            type: "line",
            source: "streets-wards",
            filter: wardLayerFilter(),
            paint: {
                "line-color": MAP_BOUNDARY_COLORS.selectedWard,
                "line-width": 3.2,
                "line-opacity": 0.95,
            },
        }, beforeId);

        streetsMap.addLayer({
            id: "streets-all-infraction-heat",
            type: "heatmap",
            source: "streets-all-infractions",
            maxzoom: 14,
            paint: {
                "heatmap-weight": [
                    "interpolate", ["linear"], ["get", "records"],
                    1, 0.08,
                    25, 0.35,
                    100, 0.9,
                    500, 1.6,
                    1000, 2.4,
                ],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 14, 1.45],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 14, 14, 30],
                "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.34, 14, 0.08],
                "heatmap-color": [
                    "interpolate", ["linear"], ["heatmap-density"],
                    0, "rgba(15, 23, 42, 0)",
                    0.18, "rgba(51, 65, 85, 0.16)",
                    0.42, "rgba(37, 99, 235, 0.26)",
                    0.68, "rgba(245, 158, 11, 0.36)",
                    1, "rgba(220, 38, 38, 0.52)",
                ],
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-all-infraction-points",
            type: "circle",
            source: "streets-all-infractions",
            layout: {
                "circle-sort-key": ["get", "records"],
            },
            paint: {
                "circle-color": MAP_ALL_COLOR,
                "circle-radius": [
                    "interpolate", ["linear"], ["get", "records"],
                    1, 4,
                    25, 6,
                    100, 9,
                    500, 15,
                    1000, 22,
                ],
                "circle-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.78, 14, 0.92],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-opacity": 0.9,
                "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 1.35],
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-infraction-heat",
            type: "heatmap",
            source: "streets-infractions",
            maxzoom: 14,
            paint: {
                "heatmap-weight": [
                    "interpolate", ["linear"], ["get", "records"],
                    1, 0.08,
                    25, 0.35,
                    100, 0.9,
                    500, 1.6,
                    1000, 2.4,
                ],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 14, 1.4],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 14, 14, 28],
                "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.36, 14, 0.1],
                "heatmap-color": [
                    "interpolate", ["linear"], ["heatmap-density"],
                    0, "rgba(15, 23, 42, 0)",
                    0.18, "rgba(37, 99, 235, 0.14)",
                    0.42, "rgba(37, 99, 235, 0.26)",
                    0.68, "rgba(245, 158, 11, 0.36)",
                    1, "rgba(220, 38, 38, 0.52)",
                ],
            },
        }, beforeId);
        streetsMap.addLayer({
            id: "streets-infraction-points",
            type: "circle",
            source: "streets-infractions",
            layout: {
                "circle-sort-key": ["get", "records"],
            },
            paint: {
                "circle-color": typeColorExpression(),
                "circle-radius": [
                    "interpolate", ["linear"], ["get", "records"],
                    1, 4,
                    25, 6,
                    100, 9,
                    500, 14,
                    1000, 19,
                ],
                "circle-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.78, 14, 0.92],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-opacity": 0.9,
                "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 1.35],
            },
        }, beforeId);

        streetsMap.fitBounds(zoneBounds(maplibregl, zones), {
            padding: window.innerWidth < 720 ? 28 : 54,
            duration: 0,
        });
        updateMapLayers();
    });

    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px" });
    for (const layerId of ["streets-all-infraction-points", "streets-infraction-points"]) {
        streetsMap.on("mouseenter", layerId, () => {
            streetsMap.getCanvas().style.cursor = "pointer";
        });
        streetsMap.on("mouseleave", layerId, () => {
            streetsMap.getCanvas().style.cursor = "";
        });
        streetsMap.on("click", layerId, (event) => {
            const feature = event.features?.[0];
            if (!feature) return;
            popup
                .setLngLat(feature.geometry.coordinates)
                .setHTML(popupHtml(feature.properties))
                .addTo(streetsMap);
        });
    }
}

function bindCorridorSortControl() {
    const select = document.getElementById("streets-corridor-sort");
    select.addEventListener("change", () => {
        corridorSortMetric = select.value;
        renderCorridorBars(streetsData);
        renderLocationTable(streetsData);
    });
}

function bindTimeMetricControls() {
    document.querySelectorAll("#streets-time-metric button").forEach((button) => {
        button.addEventListener("click", () => {
            timeMetric = button.dataset.metric;
            document.querySelectorAll("#streets-time-metric button").forEach((item) => {
                const isActive = item === button;
                item.classList.toggle("active", isActive);
                item.setAttribute("aria-pressed", String(isActive));
            });
            renderTimingHeatmap(streetsData);
        });
    });
}

function bindVehicleModeControls() {
    document.querySelectorAll("#streets-vehicle-mode button").forEach((button) => {
        button.addEventListener("click", () => {
            vehicleMode = button.dataset.mode;
            document.querySelectorAll("#streets-vehicle-mode button").forEach((item) => {
                item.classList.toggle("active", item === button);
            });
            renderVehicleCumulativeChart(streetsData);
        });
    });
}

function bindTimingResize() {
    window.addEventListener("resize", () => {
        if (!streetsData) return;
        window.clearTimeout(timingResizeTimer);
        timingResizeTimer = window.setTimeout(() => {
            renderAnnualCumulativeChart(streetsData);
            renderVehicleCumulativeChart(streetsData);
            renderMonthlyChart(streetsData);
            renderTypeAreaChart(streetsData);
        }, 120);
    });
}

async function initSmartStreets() {
    chartTooltip = document.getElementById("streets-chart-tooltip");
    streetsData = await fetch(SMART_STREETS_DATA_URL).then((response) => response.json());
    categoryByKey = Object.fromEntries(streetsData.categories.map((category) => [category.key, category]));
    selectedMapLayer = MAP_ALL_KEY;
    selectedCorridorTypes = new Set(streetsData.categories.map((category) => category.key));

    renderDatasetCopy(streetsData);
    renderLede(streetsData);
    renderCards(streetsData);
    renderRefreshAndComparison(streetsData);
    renderMapControls(streetsData);
    renderWardMapControl(streetsData);
    renderMapLegend(streetsData);
    renderMapTopLocations(streetsData);
    renderAnnualCumulativeChart(streetsData);
    renderVehicleCumulativeChart(streetsData);
    bindVehicleModeControls();
    renderMonthlyChart(streetsData);
    renderTimingHeatmap(streetsData);
    bindTimeMetricControls();
    bindTimingResize();
    renderTypeAreaChart(streetsData);
    renderTypeAnalysis(streetsData);
    renderCorridorCategoryFilter(streetsData);
    renderCorridorBars(streetsData);
    bindCorridorSortControl();
    renderLocationTable(streetsData);
    renderWardTypeFilter(streetsData);
    bindWardTableSort();
    renderWardTable(streetsData);
    renderKinzieDesignStats(streetsData);
    renderCategoryTable(streetsData);
    renderSources(streetsData);
    updateMapStatus();
    initializeMap(streetsData);
    initializeKinzieMap(streetsData);
}

document.addEventListener("DOMContentLoaded", () => {
    initSmartStreets().catch((error) => {
        console.error(error);
        const localServerUrl = "http://127.0.0.1:5173/";
        const message = window.location.protocol === "file:"
            ? `Smart Streets data cannot load from a direct file URL. Open this page through the local server instead: <a href="${localServerUrl}">${localServerUrl}</a>.`
            : "Smart Streets data failed to load.";
        document.getElementById("streets-lede").innerHTML = `<p>${message}</p>`;
    });
});
