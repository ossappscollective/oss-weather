import { describe, expect, it } from 'vitest';
import { computeDataRange, getNaturalRange, makeScaler, pickReferenceProp, resolveRange } from './chartScale';

describe('getNaturalRange', () => {
    it('returns the fixed scale of a bounded metric', () => {
        expect(getNaturalRange('relativeHumidity')).toEqual({ min: 0, max: 100 });
        expect(getNaturalRange('uvIndex')).toEqual({ min: 0, max: 11 });
        expect(getNaturalRange('sealevelPressure')).toEqual({ min: 950, max: 1050 });
    });
    it('returns undefined for a metric with no natural bounds', () => {
        expect(getNaturalRange('windSpeed')).toBeUndefined();
        expect(getNaturalRange('temperature')).toBeUndefined();
    });
});

describe('computeDataRange', () => {
    it('returns the min and max of the usable values', () => {
        expect(computeDataRange([12, 3, 27, 8])).toEqual({ min: 3, max: 27 });
    });
    it('skips null, undefined and NaN', () => {
        expect(computeDataRange([null, 12, undefined, NaN, 4])).toEqual({ min: 4, max: 12 });
    });
    it('returns undefined when nothing is usable', () => {
        expect(computeDataRange([])).toBeUndefined();
        expect(computeDataRange([null, undefined, NaN])).toBeUndefined();
    });
});

describe('pickReferenceProp', () => {
    it('prefers temperature wherever it sits', () => {
        expect(pickReferenceProp(['relativeHumidity', 'windSpeed', 'temperature'])).toBe('temperature');
        expect(pickReferenceProp(['temperature', 'relativeHumidity'])).toBe('temperature');
    });
    it('falls back to the first entry', () => {
        expect(pickReferenceProp(['windSpeed', 'relativeHumidity'])).toBe('windSpeed');
    });
    it('returns undefined for an empty list', () => {
        expect(pickReferenceProp([])).toBeUndefined();
    });
});

describe('makeScaler', () => {
    const scale = makeScaler({ min: 0, max: 100 }, { min: 8, max: 26 });
    it('maps the source bounds onto the target bounds', () => {
        expect(scale(0)).toBe(8);
        expect(scale(100)).toBe(26);
    });
    it('maps linearly in between', () => {
        expect(scale(50)).toBe(17);
    });
    it('extrapolates instead of clamping', () => {
        expect(scale(110)).toBeCloseTo(27.8, 10);
        expect(scale(-10)).toBeCloseTo(6.2, 10);
    });
    it('does not produce NaN for a degenerate source range', () => {
        const degenerate = makeScaler({ min: 5, max: 5 }, { min: 8, max: 26 });
        expect(degenerate(5)).toBe(17);
        expect(degenerate(12)).toBe(17);
    });
});

describe('resolveRange', () => {
    const fallback = { min: 8, max: 26 };
    it('returns the axis bounds when they are usable', () => {
        expect(resolveRange(2, 30, fallback)).toEqual({ min: 2, max: 30 });
    });
    it('falls back on non finite bounds', () => {
        expect(resolveRange(-Infinity, Infinity, fallback)).toEqual(fallback);
        expect(resolveRange(NaN, 30, fallback)).toEqual(fallback);
    });
    it('falls back on inverted or empty bounds', () => {
        expect(resolveRange(30, 2, fallback)).toEqual(fallback);
        expect(resolveRange(10, 10, fallback)).toEqual(fallback);
    });
});
