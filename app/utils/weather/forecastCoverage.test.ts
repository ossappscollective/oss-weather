import { describe, expect, it } from 'vitest';
import { hasEnoughForecast } from './forecastCoverage';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const now = Date.UTC(2026, 9, 12, 10, 30);
const startOfDay = Date.UTC(2026, 9, 12);

function forecast(hoursAhead: number, daysAhead: number) {
    const firstHour = Math.floor(now / HOUR) * HOUR;
    return {
        hourly: Array.from({ length: hoursAhead + 24 }, (_, index) => ({ time: firstHour - 24 * HOUR + index * HOUR })),
        daily: { data: Array.from({ length: daysAhead + 3 }, (_, index) => ({ time: startOfDay - 3 * DAY + index * DAY })) }
    };
}

describe('hasEnoughForecast', () => {
    it('accepts a fresh forecast', () => {
        expect(hasEnoughForecast(forecast(48, 7), now, startOfDay)).toBe(true);
    });
    it('rejects a forecast whose hours are all in the past', () => {
        expect(hasEnoughForecast(forecast(0, 1), now, startOfDay)).toBe(false);
    });
    it('rejects a forecast with only a few hours left', () => {
        expect(hasEnoughForecast(forecast(3, 5), now, startOfDay)).toBe(false);
    });
    it('rejects a forecast with a single day left', () => {
        expect(hasEnoughForecast(forecast(48, 1), now, startOfDay)).toBe(false);
    });
    it('does not ask for more days than the forecast length setting', () => {
        expect(hasEnoughForecast(forecast(48, 1), now, startOfDay, 1)).toBe(true);
    });
    it('does not ask for hours from a provider without hourly data', () => {
        expect(hasEnoughForecast({ ...forecast(0, 5), hourly: [] }, now, startOfDay)).toBe(true);
    });
});
