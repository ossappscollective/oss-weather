import { describe, expect, it, vi } from 'vitest';

// the provider imports the NativeScript runtime and the app services: only its pure functions are tested here
vi.mock('@nativescript/core', () => ({ ApplicationSettings: {} }));
vi.mock('~/helpers/constants', () => ({}));
vi.mock('~/helpers/formatter', () => ({}));
vi.mock('~/helpers/locale', () => ({}));
vi.mock('~/utils/dailyTrim', () => ({}));
vi.mock('~/services/airQualityData', () => ({ Pollutants: new Proxy({}, { get: (_, key) => key }), prepareAirQualityData: () => ({}) }));
vi.mock('~/services/api', () => ({}));
vi.mock('~/services/weatherData', () => ({ WeatherProps: new Proxy({}, { get: (_, key) => key }), weatherDataService: {} }));
vi.mock('~/services/providers/airqualityprovider', () => ({}));
vi.mock('~/services/providers/omIcons', () => ({}));
vi.mock('~/services/providers/weatherprovider', () => ({ WeatherProvider: class {} }));

import { openMeteoMarineData, tideExtremes } from './om';

const HOUR = 3600 * 1000;
const TIDE_PERIOD = 12.42 * HOUR;
// a semi-diurnal tide of 2 m amplitude, high tide at the start, sampled every hour
function tideSeries(hours: number) {
    const times = Array.from({ length: hours }, (_, index) => Date.UTC(2026, 10, 2) + index * HOUR);
    const heights = times.map((time) => 2 * Math.cos(((time - times[0]) / TIDE_PERIOD) * 2 * Math.PI));
    return { times, heights };
}

describe('tideExtremes', () => {
    it('finds the high and low tides of a sampled tide, between the samples', () => {
        const { heights, times } = tideSeries(30);
        const tides = tideExtremes(times, heights);
        // the first high tide is at the first sample: no extremum can be told there, the next ones are
        expect(tides.map((tide) => tide.type)).toEqual(['low', 'high', 'low', 'high']);
        expect(Math.abs(tides[0].time - (times[0] + TIDE_PERIOD / 2))).toBeLessThan(5 * 60 * 1000);
        expect(Math.abs(tides[1].time - (times[0] + TIDE_PERIOD))).toBeLessThan(5 * 60 * 1000);
        expect(tides[0].height).toBeCloseTo(-2, 1);
        expect(tides[1].height).toBeCloseTo(2, 1);
    });

    it('finds nothing in a flat series, or too short to have an extremum', () => {
        const times = [0, HOUR, 2 * HOUR, 3 * HOUR];
        expect(tideExtremes(times, [1, 1, 1, 1])).toEqual([]);
        expect(tideExtremes(times.slice(0, 2), [1, 2])).toEqual([]);
    });

    it('skips the hours without value', () => {
        const { heights, times } = tideSeries(30);
        heights[3] = null;
        const tides = tideExtremes(times, heights);
        expect(tides.every((tide) => Number.isFinite(tide.time) && Number.isFinite(tide.height))).toBe(true);
    });
});

describe('openMeteoMarineData', () => {
    // 2 days from the first midnight of Paris winter time (UTC+1)
    const start = Date.UTC(2026, 10, 1, 23);
    const time = Array.from({ length: 48 }, (_, index) => (start + index * HOUR) / 1000);
    const hourly = {
        time,
        wave_height: time.map(() => 1),
        swell_wave_height: time.map(() => 0.5),
        sea_surface_temperature: time.map((_, index) => (index < 24 ? 14 : 16)),
        sea_level_height_msl: tideSeries(48).heights
    };

    it('maps the hourly values on the app hourly data', () => {
        const result = openMeteoMarineData(hourly, 1);
        expect(result.hourly).toHaveLength(48);
        expect(result.hourly[0]).toEqual({ time: start, waveHeight: 1, swellHeight: 0.5, seaTemperature: 14 });
    });

    it('builds a day per local midnight with the averages, the highest wave and its tides', () => {
        const result = openMeteoMarineData({ ...hourly, wave_height: time.map((_, index) => (index === 5 ? 3 : 1)) }, 1);
        expect(result.daily.data.map((day) => day.time)).toEqual([start, start + 24 * HOUR]);
        expect(result.daily.data[0].seaTemperature).toBe(14);
        expect(result.daily.data[1].seaTemperature).toBe(16);
        expect(result.daily.data[0].waveHeightMax).toBe(3);
        expect(result.daily.data[1].waveHeightMax).toBe(1);
        expect(result.daily.data[0].tides.length).toBeGreaterThanOrEqual(2);
        result.daily.data.forEach((day) => day.tides.forEach((tide) => expect(tide.time >= day.time && tide.time < day.time + 24 * HOUR).toBe(true)));
    });

    it('has no tide when the sea level is missing', () => {
        const result = openMeteoMarineData({ ...hourly, sea_level_height_msl: time.map(() => null) }, 1);
        expect(result.daily.data[0].tides).toBeUndefined();
    });

    it('returns nothing for a point without sea data, like an inland one', () => {
        const nulls = time.map(() => null);
        expect(openMeteoMarineData({ time, wave_height: nulls, swell_wave_height: nulls, sea_surface_temperature: nulls, sea_level_height_msl: nulls }, 1)).toBeUndefined();
    });
});
