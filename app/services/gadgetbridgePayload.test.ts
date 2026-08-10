import { describe, expect, it } from 'vitest';
import { buildGadgetbridgePayload } from './gadgetbridgePayload';
import type { WeatherLocation } from '~/services/api';
import type { CommonWeatherData, Currently, DailyData, Hourly, WeatherData } from '~/services/providers/weather';

const PARIS: WeatherLocation = { name: 'Paris', coord: { lat: 48.86, lon: 2.35 } };

// 2026-01-10 has no moonrise in Paris: suncalc returns `{ set }` only.
const NO_MOONRISE_DAY = Date.UTC(2026, 0, 10);
const DAY_MS = 24 * 3600 * 1000;

function commonData(time: number): CommonWeatherData {
    return { time, aqi: -1, iconId: 800, isDay: true };
}

function daily(time: number): DailyData {
    return {
        ...commonData(time),
        temperatureMax: 12.4,
        temperatureMin: 3.6,
        relativeHumidity: 71,
        windSpeed: 14.5,
        windBearing: 220,
        uvIndex: 1.2,
        precipProbability: 30
    };
}

function hourly(time: number): Hourly {
    return { ...commonData(time), temperature: 9.7, relativeHumidity: 65, windSpeed: 12, windBearing: 180, uvIndex: 0.5, precipProbability: 10 };
}

function currently(time: number): Currently {
    return {
        ...commonData(time),
        temperature: 10.9,
        apparentTemperature: 8.2,
        dewpoint: 6.1,
        relativeHumidity: 68,
        windSpeed: 13.3,
        windBearing: 200,
        uvIndex: 0.8,
        sealevelPressure: 1013.5,
        cloudCover: 40,
        description: 'Clear sky'
    };
}

function weatherData({ dailyCount = 1, hourlyCount = 0, time = NO_MOONRISE_DAY }: { time?: number; dailyCount?: number; hourlyCount?: number } = {}): WeatherData {
    return {
        time,
        currently: currently(time),
        daily: { data: Array.from({ length: dailyCount }, (_, index) => daily(time + index * DAY_MS)) },
        hourly: Array.from({ length: hourlyCount }, (_, index) => hourly(time + index * 3600 * 1000)),
        minutely: { data: [] },
        alerts: []
    };
}

describe('buildGadgetbridgePayload', () => {
    it('builds a payload on a day with no moonrise', () => {
        const payload = buildGadgetbridgePayload(PARIS, weatherData({ dailyCount: 3 }));

        expect(payload).toHaveLength(1);
        expect(payload[0].location).toBe('Paris');
        expect(payload[0].moonRise).toBeUndefined();
        expect(payload[0].moonSet).toBeGreaterThan(0);
    });

    it('omits sun times when the sun neither rises nor sets', () => {
        // Svalbard in January: polar night, suncalc returns Invalid Date for sunrise/sunset.
        const svalbard: WeatherLocation = { name: 'Longyearbyen', coord: { lat: 78.22, lon: 15.65 } };
        const payload = buildGadgetbridgePayload(svalbard, weatherData());

        expect(payload[0].sunRise).toBeUndefined();
        expect(payload[0].sunSet).toBeUndefined();
    });

    it('converts temperatures to Kelvin and timestamps to seconds', () => {
        const payload = buildGadgetbridgePayload(PARIS, weatherData());

        expect(payload[0].timestamp).toBe(NO_MOONRISE_DAY / 1000);
        expect(payload[0].currentTemp).toBe(284); // 10.9 + 273.15 truncated
        expect(payload[0].feelsLikeTemp).toBe(281);
        expect(payload[0].todayMaxTemp).toBe(285);
        expect(payload[0].todayMinTemp).toBe(276);
    });

    it('sends the location coordinates and an unknown current-location flag', () => {
        const payload = buildGadgetbridgePayload(PARIS, weatherData());

        expect(payload[0].latitude).toBe(48.86);
        expect(payload[0].longitude).toBe(2.35);
        expect(payload[0].isCurrentLocation).toBe(-1);
    });

    it('sends the moon phase in degrees', () => {
        const payload = buildGadgetbridgePayload(PARIS, weatherData());

        expect(payload[0].moonPhase).toBeGreaterThanOrEqual(0);
        expect(payload[0].moonPhase).toBeLessThan(360);
        // 2026-01-10 is a waning moon, past last quarter.
        expect(payload[0].moonPhase).toBeGreaterThan(180);
    });

    it('starts forecasts at tomorrow and caps them at 7 days', () => {
        const payload = buildGadgetbridgePayload(PARIS, weatherData({ dailyCount: 14 }));

        expect(payload[0].forecasts).toHaveLength(7);
        expect(payload[0].forecasts[0].sunRise).not.toBe(payload[0].sunRise);
    });

    it('caps hourly forecasts at 48 entries', () => {
        const payload = buildGadgetbridgePayload(PARIS, weatherData({ hourlyCount: 72 }));

        expect(payload[0].hourly).toHaveLength(48);
        expect(payload[0].hourly[0].temp).toBe(282);
    });

    it('omits air quality when there is no aqi', () => {
        const payload = buildGadgetbridgePayload(PARIS, weatherData());

        expect(payload[0].airQuality).toBeUndefined();
    });

    it('includes air quality and pollutants when available', () => {
        const data = weatherData();
        data.currently.aqi = 42;
        data.currently.pollutants = { pm2_5: { unit: 'µg/m³', value: 12.3 }, o3: { unit: 'µg/m³', value: 60 } };
        const payload = buildGadgetbridgePayload(PARIS, data);

        expect(payload[0].airQuality).toEqual({ aqi: 42, pm25: 12.3, o3: 60 });
    });
});
