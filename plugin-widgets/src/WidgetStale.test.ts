import { describe, expect, it } from 'vitest';
import { staleForecast } from './WidgetStale';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const now = Date.UTC(2026, 9, 12, 10, 30);
const startOfDay = Date.UTC(2026, 9, 12);
const firstHour = Math.floor(now / HOUR) * HOUR;

function forecast(hourOffsetStart: number, hours: number, days: number) {
    return {
        hourly: Array.from({ length: hours }, (_, index) => ({ time: firstHour + (hourOffsetStart + index) * HOUR })),
        daily: { data: Array.from({ length: days }, (_, index) => ({ time: startOfDay + index * DAY })) }
    };
}

describe('staleForecast', () => {
    it('drops the hours already past', () => {
        const result = staleForecast(forecast(-5, 30, 7), now, startOfDay, 7);
        expect(result.hourly[0].time).toBe(firstHour);
        expect(result.hourly).toHaveLength(25);
    });

    it('keeps the other data untouched', () => {
        const data = { ...forecast(0, 30, 7), time: 1234 };
        expect(staleForecast(data, now, startOfDay, 7).time).toBe(1234);
    });

    it('refuses a forecast with too few upcoming hours', () => {
        expect(staleForecast(forecast(-20, 20, 7), now, startOfDay, 7)).toBeNull();
    });

    it('refuses a forecast with too few upcoming days', () => {
        expect(staleForecast(forecast(0, 30, 1), now, startOfDay, 7)).toBeNull();
    });
});
