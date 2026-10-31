import { convertWeatherCodeToIcon } from '~/services/providers/omIcons';
import type { Currently } from '~/services/providers/weather';

export interface MetarReport {
    icaoId: string;
    /** seconds */
    obsTime: number;
    /** °C */
    temp?: number;
    dewp?: number;
    wdir?: number | string;
    /** knots */
    wspd?: number;
    wgst?: number;
    /** hPa */
    altim?: number;
    slp?: number;
    cover?: string;
    wxString?: string;
    name?: string;
}

export const METAR_MAX_AGE_MS = 2 * 3600 * 1000;

const KMH_PER_KNOT = 1.852;
const MAGNUS_A = 17.625;
const MAGNUS_B = 243.04;

// Maps, so that inherited object keys are not taken for cover codes
const COVER_PERCENT = new Map(Object.entries({ SKC: 0, CLR: 0, NSC: 0, CAVOK: 0, FEW: 19, SCT: 44, BKN: 75, OVC: 100, OVX: 100 }));
const COVER_WEATHER_CODE = new Map(Object.entries({ SKC: 0, CLR: 0, NSC: 0, CAVOK: 0, FEW: 1, SCT: 2, BKN: 3, OVC: 3, OVX: 3 }));

// the API sends null for the values a station does not report
function isNumber(value: unknown): value is number {
    return typeof value === 'number';
}

export function knotsToKmh(knots: number) {
    return knots * KMH_PER_KNOT;
}

export function humidityFromDewpoint(temperature: number, dewpoint: number) {
    const gamma = (value: number) => (MAGNUS_A * value) / (MAGNUS_B + value);
    return 100 * Math.exp(gamma(dewpoint) - gamma(temperature));
}

export function cloudCoverFromCover(cover?: string) {
    return COVER_PERCENT.get(cover);
}

// WMO codes, so the result can go through the same icon and description mapping as Open-Meteo
export function weatherCodeFromMetar(cover?: string, wxString?: string) {
    const wx = wxString || '';
    const intensity = wx.includes('+') ? 2 : wx.includes('-') ? 0 : 1;
    const pick = (codes: number[]) => codes[intensity];
    if (wx.includes('TS')) {
        return 95;
    }
    if (wx.includes('FZRA')) {
        return 66;
    }
    if (wx.includes('FZDZ')) {
        return 56;
    }
    if (wx.includes('SHSN')) {
        return 85;
    }
    if (wx.includes('SHRA')) {
        return pick([80, 81, 82]);
    }
    if (wx.includes('SG')) {
        return 77;
    }
    if (wx.includes('SN')) {
        return pick([71, 73, 75]);
    }
    if (wx.includes('DZ')) {
        return pick([51, 53, 55]);
    }
    if (wx.includes('RA')) {
        return pick([61, 63, 65]);
    }
    if (wx.includes('FG')) {
        return 45;
    }
    return COVER_WEATHER_CODE.get(cover);
}

export function applyMetarToCurrently(currently: Currently, report: MetarReport | null, icao: string, now = Date.now(), describe?: (weatherCode: number) => string): Currently {
    const time = report?.obsTime * 1000;
    if (!report || !(now - time <= METAR_MAX_AGE_MS)) {
        return { ...currently, metar: { icao, failed: true } };
    }
    const result: Currently = { ...currently, metar: { icao, time } };
    if (isNumber(report.temp)) {
        result.temperature = report.temp;
        result.usingFeelsLike = false;
    }
    if (isNumber(report.dewp)) {
        result.dewpoint = report.dewp;
        if (isNumber(report.temp)) {
            result.relativeHumidity = humidityFromDewpoint(report.temp, report.dewp);
        }
    }
    if (isNumber(report.wspd)) {
        result.windSpeed = knotsToKmh(report.wspd);
    }
    if (isNumber(report.wgst)) {
        result.windGust = knotsToKmh(report.wgst);
    }
    if (isNumber(report.wdir)) {
        result.windBearing = report.wdir;
    }
    const pressure = isNumber(report.slp) ? report.slp : report.altim;
    if (isNumber(pressure)) {
        result.sealevelPressure = pressure;
    }
    const cloudCover = cloudCoverFromCover(report.cover);
    if (cloudCover !== undefined) {
        result.cloudCover = cloudCover;
    }
    const weatherCode = weatherCodeFromMetar(report.cover, report.wxString);
    if (weatherCode !== undefined) {
        result.iconId = convertWeatherCodeToIcon(weatherCode);
        if (describe) {
            result.description = describe(weatherCode);
        }
    }
    return result;
}

export type MetarSeriesProp = 'temperature' | 'windSpeed' | 'sealevelPressure';

export interface MetarPoint {
    /** milliseconds */
    time: number;
    value: number;
}

function metarValue(report: MetarReport, prop: MetarSeriesProp) {
    switch (prop) {
        case 'temperature':
            return isNumber(report.temp) ? report.temp : undefined;
        case 'windSpeed':
            return isNumber(report.wspd) ? knotsToKmh(report.wspd) : undefined;
        case 'sealevelPressure':
            return isNumber(report.slp) ? report.slp : isNumber(report.altim) ? report.altim : undefined;
    }
}

export function metarSeries(reports: MetarReport[], prop: MetarSeriesProp): MetarPoint[] {
    const points = new Map<number, MetarPoint>();
    for (const report of reports) {
        const value = metarValue(report, prop);
        if (value !== undefined) {
            points.set(report.obsTime, { time: report.obsTime * 1000, value });
        }
    }
    return [...points.values()].sort((first, second) => first.time - second.time);
}

// the indicator tells METAR is behind the shown data: it is dropped once that data is only cached,
// i.e. the observation is older than the max age
export function isMetarIndicatorShown(metar: Currently['metar'], now = Date.now()) {
    return !!metar && !metar.failed && now - metar.time <= METAR_MAX_AGE_MS;
}
