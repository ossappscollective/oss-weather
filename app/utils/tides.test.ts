import { describe, expect, it } from 'vitest';
import { tideCurve } from './tides';

const HOUR = 3600 * 1000;

describe('tideCurve', () => {
    const midnight = Date.UTC(2026, 10, 2);
    const day = 24 * HOUR;
    const step = 10 * 60 * 1000;
    const tides = [
        { time: midnight + 4.5 * HOUR, height: -2, type: 'low' as const },
        { time: midnight + 11 * HOUR, height: 1, type: 'high' as const },
        { time: midnight + 17.5 * HOUR, height: -2.2, type: 'low' as const }
    ];

    it('covers the whole day at the step', () => {
        const curve = tideCurve(tides, midnight, midnight + day, step);
        expect(curve[0].time).toBe(midnight);
        expect(curve[curve.length - 1].time).toBe(midnight + day);
        expect(curve).toHaveLength(day / step + 1);
    });

    it('goes through the tides', () => {
        const curve = tideCurve(tides, midnight, midnight + day, step);
        tides.forEach((tide) => expect(curve.find((point) => point.time === tide.time).height).toBeCloseTo(tide.height, 5));
    });

    it('goes smoothly from a tide to the next, without crossing their heights', () => {
        const curve = tideCurve(tides, midnight, midnight + day, step);
        const between = curve.filter((point) => point.time > tides[0].time && point.time < tides[1].time);
        expect(between.length).toBeGreaterThan(0);
        between.forEach((point, index) => {
            expect(point.height).toBeGreaterThan(-2);
            expect(point.height).toBeLessThan(1);
            if (index > 0) {
                expect(point.height).toBeGreaterThan(between[index - 1].height);
            }
        });
    });

    it('goes on before the first and after the last tide of the day like the day', () => {
        const curve = tideCurve(tides, midnight, midnight + day, step);
        // 4.5 h before the first low tide, the same time as between the low and the high one: a high tide of the day height
        expect(curve[0].height).toBeGreaterThan(-2);
        expect(curve[0].height).toBeLessThanOrEqual(1);
        expect(curve[curve.length - 1].height).toBeGreaterThan(-2.2);
    });

    it('has no curve without two tides to go between', () => {
        expect(tideCurve(tides.slice(0, 1), midnight, midnight + day, step)).toEqual([]);
        expect(tideCurve([], midnight, midnight + day, step)).toEqual([]);
        expect(tideCurve([tides[1], tides[0]], midnight, midnight + day, step)).toEqual([]);
    });
});
