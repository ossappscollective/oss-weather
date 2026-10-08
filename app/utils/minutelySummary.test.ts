import { describe, expect, it } from 'vitest';
import { minutelyAxisLabel, minutelyAxisTicks, minutelyIntensity, minutelySummary } from './minutelySummary';

const now = 1_000_000_000_000;
const minutes = (count: number) => now + count * 60 * 1000;
const entries = (intensities: number[]) => intensities.map((intensity, index) => ({ time: minutes(index * 10), intensity }));

describe('minutelySummary', () => {
    it('reports no precipitation', () => {
        expect(minutelySummary(entries([0, 0, 0]), now)).toEqual({ kind: 'none' });
        expect(minutelySummary([], now)).toEqual({ kind: 'none' });
    });
    it('reports precipitation for the whole period', () => {
        expect(minutelySummary(entries([1, 2, 1]), now)).toEqual({ kind: 'all' });
    });
    it('reports when precipitation starts', () => {
        expect(minutelySummary(entries([0, 0, 1, 2]), now)).toEqual({ kind: 'starting', minutes: 20 });
    });
    it('reports when precipitation stops', () => {
        expect(minutelySummary(entries([2, 1, 0, 0]), now)).toEqual({ kind: 'stopping', minutes: 20 });
    });
    it('reports intermittent precipitation', () => {
        expect(minutelySummary(entries([0, 1, 0, 1]), now)).toEqual({ kind: 'intermittent' });
    });
});

describe('minutelyIntensity', () => {
    it('names the strongest intensity of the period', () => {
        expect(minutelyIntensity(entries([0, 0.5, 0.8]))).toBe('light');
        expect(minutelyIntensity(entries([0.5, 1.5]))).toBe('medium');
        expect(minutelyIntensity(entries([1, 2.5, 0]))).toBe('heavy');
    });
    it('has no name without precipitation', () => {
        expect(minutelyIntensity(entries([0, 0]))).toBeUndefined();
    });
});

describe('minutelyAxisLabel', () => {
    it('names the start, keeps plain minutes and puts the unit on the last label only', () => {
        expect(minutelyAxisLabel(0, false, 'now')).toBe('now');
        expect(minutelyAxisLabel(20, false, 'now')).toBe('20');
        expect(minutelyAxisLabel(60, true, 'now')).toBe('60 min');
    });
});

describe('minutelyAxisTicks', () => {
    it('puts a tick every 15 minutes, the first left aligned and the last right aligned', () => {
        expect(minutelyAxisTicks(60)).toEqual([
            { minutes: 0, fraction: 0, align: 'left' },
            { minutes: 15, fraction: 0.25, align: 'center' },
            { minutes: 30, fraction: 0.5, align: 'center' },
            { minutes: 45, fraction: 0.75, align: 'center' },
            { minutes: 60, fraction: 1, align: 'right' }
        ]);
    });
    it('uses 30 minute steps for long periods', () => {
        expect(minutelyAxisTicks(120).map((tick) => tick.minutes)).toEqual([0, 30, 60, 90, 120]);
    });
    it('has no tick for an empty period', () => {
        expect(minutelyAxisTicks(0)).toEqual([]);
    });
});
