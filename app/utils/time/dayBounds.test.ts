import { describe, expect, it } from 'vitest';
import { endOfDay, startOfDay } from './dayBounds';

const timestamp = Date.UTC(2026, 9, 22, 23, 30);

describe('startOfDay', () => {
    it('starts the day in the given timezone offset (minutes)', () => {
        expect(startOfDay(timestamp, 120).valueOf()).toBe(Date.UTC(2026, 9, 22, 22));
    });
    it('uses the device timezone when the location has no offset', () => {
        expect(startOfDay(timestamp, undefined).valueOf()).toBe(new Date(timestamp).setHours(0, 0, 0, 0));
    });
});

describe('endOfDay', () => {
    it('ends the day in the given timezone offset (minutes)', () => {
        expect(endOfDay(timestamp, 120).valueOf()).toBe(Date.UTC(2026, 9, 23, 21, 59, 59, 999));
    });
    it('uses the device timezone when the location has no offset', () => {
        expect(endOfDay(timestamp, undefined).valueOf()).toBe(new Date(timestamp).setHours(23, 59, 59, 999));
    });
});
