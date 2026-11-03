import { describe, expect, it } from 'vitest';
import { DAY_X, labelPlacement, tideAtX, tideChartData, tideCurve } from './TidesChartView.logic';

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

describe('tideChartData', () => {
    const midnight = Date.UTC(2026, 10, 2);
    const tides = [
        { time: midnight + 4.5 * HOUR, height: -2, type: 'low' as const },
        { time: midnight + 11 * HOUR, height: 1, type: 'high' as const },
        { time: midnight + 17.5 * HOUR, height: -2.2, type: 'low' as const }
    ];

    it('has a point per tide, in 10 minutes since the start of the day', () => {
        expect(tideChartData(tides, midnight).points).toEqual([
            { x: 27, y: -2 },
            { x: 66, y: 1 },
            { x: 105, y: -2.2 }
        ]);
    });

    it('draws the curve over the whole day', () => {
        const { line } = tideChartData(tides, midnight);
        expect(line[0].x).toBe(0);
        expect(line[line.length - 1].x).toBe(DAY_X);
    });

    it('draws the tides themselves when there are not enough for a curve', () => {
        const { line, points } = tideChartData(tides.slice(0, 1), midnight);
        expect(line).toEqual(points);
    });

    it('keeps the sea level in the axis, with room around the tides', () => {
        const { axisMaximum, axisMinimum } = tideChartData(tides, midnight);
        expect(axisMaximum).toBeGreaterThan(1);
        expect(axisMinimum).toBeLessThan(-2.2);
        // all the tides over the sea level: the axis still reaches it
        const high = tideChartData(
            tides.map((tide) => ({ ...tide, height: tide.height + 10 })),
            midnight
        );
        expect(high.axisMinimum).toBeLessThan(0);
    });
});

describe('tideAtX', () => {
    const midnight = Date.UTC(2026, 10, 2);
    const tides = [{ time: midnight + 11 * HOUR, height: 1, type: 'high' as const }];

    it('finds the tide within 15 minutes of the touched x', () => {
        expect(tideAtX(tides, midnight, 66)).toBe(tides[0]);
        expect(tideAtX(tides, midnight, 67.5)).toBe(tides[0]);
        expect(tideAtX(tides, midnight, 64.5)).toBe(tides[0]);
    });

    it('finds nothing farther', () => {
        expect(tideAtX(tides, midnight, 70)).toBeUndefined();
    });
});

describe('labelPlacement', () => {
    it('centers a label on its tide', () => {
        expect(labelPlacement(200, 50, 0, 400)).toEqual({ x: 200, align: 'center' });
    });

    it('puts a label that would go out on the left against the left edge', () => {
        expect(labelPlacement(10, 50, 0, 400)).toEqual({ x: 2, align: 'left' });
    });

    it('puts a label that would go out on the right against the right edge', () => {
        expect(labelPlacement(395, 50, 0, 400)).toEqual({ x: 398, align: 'right' });
    });

    it('keeps a label that ends exactly on an edge', () => {
        expect(labelPlacement(50, 50, 0, 400)).toEqual({ x: 50, align: 'center' });
    });
});
