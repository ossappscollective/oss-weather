import { describe, expect, it } from 'vitest';
import type { Currently } from '~/services/providers/weather';
import { MetarReport, applyMetarToCurrently, cloudCoverFromCover, humidityFromDewpoint, knotsToKmh, metarSeries, weatherCodeFromMetar } from './metar';

const OBS_TIME = 1793393460;
const OBS_MS = OBS_TIME * 1000;

const report: MetarReport = {
    icaoId: 'KJFK',
    obsTime: OBS_TIME,
    temp: 17.8,
    dewp: 2.2,
    wdir: 330,
    wspd: 17,
    wgst: 28,
    altim: 1019,
    slp: 1018.7,
    cover: 'FEW'
};

function baseCurrently(): Currently {
    return {
        time: OBS_MS,
        temperature: 20,
        apparentTemperature: 19,
        usingFeelsLike: true,
        windSpeed: 5,
        windBearing: 90,
        uvIndex: 3,
        iconId: 804,
        isDay: true,
        description: 'cloudy'
    } as Currently;
}

describe('knotsToKmh', () => {
    it('converts knots', () => {
        expect(knotsToKmh(10)).toBeCloseTo(18.52, 2);
    });
});

describe('humidityFromDewpoint', () => {
    it('is 100 when dewpoint equals temperature', () => {
        expect(humidityFromDewpoint(12, 12)).toBeCloseTo(100, 5);
    });
    it('uses the Magnus formula', () => {
        expect(humidityFromDewpoint(20, 10)).toBeCloseTo(52.5, 0);
    });
});

describe('cloudCoverFromCover', () => {
    it('maps cover codes to a percentage', () => {
        expect(cloudCoverFromCover('CLR')).toBe(0);
        expect(cloudCoverFromCover('CAVOK')).toBe(0);
        expect(cloudCoverFromCover('FEW')).toBe(19);
        expect(cloudCoverFromCover('SCT')).toBe(44);
        expect(cloudCoverFromCover('BKN')).toBe(75);
        expect(cloudCoverFromCover('OVC')).toBe(100);
    });
    it('is undefined for unknown cover', () => {
        expect(cloudCoverFromCover(undefined)).toBeUndefined();
        expect(cloudCoverFromCover('???')).toBeUndefined();
    });
});

describe('weatherCodeFromMetar', () => {
    it('uses cover when no weather phenomenon', () => {
        expect(weatherCodeFromMetar('CAVOK')).toBe(0);
        expect(weatherCodeFromMetar('FEW')).toBe(1);
        expect(weatherCodeFromMetar('SCT')).toBe(2);
        expect(weatherCodeFromMetar('BKN')).toBe(3);
        expect(weatherCodeFromMetar('OVC')).toBe(3);
    });
    it('gives precipitation priority over cover', () => {
        expect(weatherCodeFromMetar('BKN', '-RA')).toBe(61);
        expect(weatherCodeFromMetar('OVC', 'RA')).toBe(63);
        expect(weatherCodeFromMetar('OVC', '+RA')).toBe(65);
        expect(weatherCodeFromMetar('SCT', 'SHRA')).toBe(81);
        expect(weatherCodeFromMetar('OVC', '-DZ')).toBe(51);
        expect(weatherCodeFromMetar('OVC', 'SN')).toBe(73);
        expect(weatherCodeFromMetar('OVC', 'FZRA')).toBe(66);
    });
    it('detects thunderstorm and fog', () => {
        expect(weatherCodeFromMetar('OVC', '+TSRA')).toBe(95);
        expect(weatherCodeFromMetar('CLR', 'FG')).toBe(45);
    });
    it('ignores mist, which has no matching code', () => {
        expect(weatherCodeFromMetar('BKN', 'BR')).toBe(3);
    });
});

describe('applyMetarToCurrently', () => {
    const now = OBS_MS + 10 * 60000;

    it('overlays measured fields and keeps the others', () => {
        const result = applyMetarToCurrently(baseCurrently(), report, 'KJFK', now, (code) => `code-${code}`);
        expect(result.temperature).toBe(17.8);
        expect(result.usingFeelsLike).toBe(false);
        expect(result.dewpoint).toBe(2.2);
        expect(result.relativeHumidity).toBeCloseTo(35.2, 0);
        expect(result.windSpeed).toBeCloseTo(31.48, 2);
        expect(result.windGust).toBeCloseTo(51.86, 2);
        expect(result.windBearing).toBe(330);
        expect(result.sealevelPressure).toBe(1018.7);
        expect(result.cloudCover).toBe(19);
        expect(result.iconId).toBe(800);
        expect(result.description).toBe('code-1');
        expect(result.uvIndex).toBe(3);
        expect(result.apparentTemperature).toBe(19);
        expect(result.metar).toEqual({ icao: 'KJFK', time: OBS_MS });
    });

    it('falls back to altimeter when there is no sea level pressure', () => {
        const result = applyMetarToCurrently(baseCurrently(), { ...report, slp: undefined }, 'KJFK', now);
        expect(result.sealevelPressure).toBe(1019);
    });

    it('keeps provider values for missing or variable fields', () => {
        const result = applyMetarToCurrently(baseCurrently(), { icaoId: 'KJFK', obsTime: OBS_TIME, wdir: 'VRB' }, 'KJFK', now);
        expect(result.temperature).toBe(20);
        expect(result.windBearing).toBe(90);
        expect(result.metar).toEqual({ icao: 'KJFK', time: OBS_MS });
    });

    it('flags failure and keeps the provider data when the report is stale', () => {
        const result = applyMetarToCurrently(baseCurrently(), report, 'KJFK', OBS_MS + 3 * 3600 * 1000);
        expect(result.temperature).toBe(20);
        expect(result.metar).toEqual({ icao: 'KJFK', failed: true });
    });

    it('flags failure when there is no report', () => {
        const result = applyMetarToCurrently(baseCurrently(), null, 'KJFK', now);
        expect(result.temperature).toBe(20);
        expect(result.metar).toEqual({ icao: 'KJFK', failed: true });
    });
});

describe('metarSeries', () => {
    const reports: MetarReport[] = [
        { icaoId: 'KJFK', obsTime: 2000, temp: 12, wspd: 10, altim: 1012, slp: 1013.2 },
        { icaoId: 'KJFK', obsTime: 1000, temp: 10, wspd: 20, altim: 1010 },
        { icaoId: 'KJFK', obsTime: 3000 }
    ];

    it('sorts by time and skips reports without the value', () => {
        expect(metarSeries(reports, 'temperature')).toEqual([
            { time: 1000000, value: 10 },
            { time: 2000000, value: 12 }
        ]);
    });
    it('converts wind to km/h', () => {
        expect(metarSeries(reports, 'windSpeed')[0].value).toBeCloseTo(37.04, 2);
    });
    it('prefers sea level pressure over the altimeter', () => {
        expect(metarSeries(reports, 'sealevelPressure')).toEqual([
            { time: 1000000, value: 1010 },
            { time: 2000000, value: 1013.2 }
        ]);
    });
    it('keeps one point per observation time', () => {
        expect(metarSeries([reports[0], { ...reports[0], temp: 99 }], 'temperature')).toEqual([{ time: 2000000, value: 99 }]);
    });
    it('is empty without reports', () => {
        expect(metarSeries([], 'temperature')).toEqual([]);
    });
});
