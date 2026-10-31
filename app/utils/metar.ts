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

const COVER_PERCENT: Record<string, number> = { SKC: 0, CLR: 0, NSC: 0, CAVOK: 0, FEW: 19, SCT: 44, BKN: 75, OVC: 100, OVX: 100 };
const COVER_WEATHER_CODE: Record<string, number> = { SKC: 0, CLR: 0, NSC: 0, CAVOK: 0, FEW: 1, SCT: 2, BKN: 3, OVC: 3, OVX: 3 };

export function knotsToKmh(knots: number) {
    return knots * KMH_PER_KNOT;
}

export function humidityFromDewpoint(temperature: number, dewpoint: number) {
    const gamma = (value: number) => (MAGNUS_A * value) / (MAGNUS_B + value);
    return 100 * Math.exp(gamma(dewpoint) - gamma(temperature));
}

export function cloudCoverFromCover(cover?: string) {
    return COVER_PERCENT[cover];
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
    return COVER_WEATHER_CODE[cover];
}

export function applyMetarToCurrently(currently: Currently, report: MetarReport | null, icao: string, now = Date.now(), describe?: (weatherCode: number) => string): Currently {
    const time = report?.obsTime * 1000;
    if (!report || !(now - time <= METAR_MAX_AGE_MS)) {
        return { ...currently, metar: { icao, failed: true } };
    }
    const result: Currently = { ...currently, metar: { icao, time } };
    if (report.temp !== undefined) {
        result.temperature = report.temp;
        result.usingFeelsLike = false;
    }
    if (report.dewp !== undefined) {
        result.dewpoint = report.dewp;
        if (report.temp !== undefined) {
            result.relativeHumidity = humidityFromDewpoint(report.temp, report.dewp);
        }
    }
    if (report.wspd !== undefined) {
        result.windSpeed = knotsToKmh(report.wspd);
    }
    if (report.wgst !== undefined) {
        result.windGust = knotsToKmh(report.wgst);
    }
    if (typeof report.wdir === 'number') {
        result.windBearing = report.wdir;
    }
    const pressure = report.slp ?? report.altim;
    if (pressure !== undefined) {
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
            return report.temp;
        case 'windSpeed':
            return report.wspd === undefined ? undefined : knotsToKmh(report.wspd);
        case 'sealevelPressure':
            return report.slp ?? report.altim;
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
