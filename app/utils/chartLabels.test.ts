import { describe, expect, it } from 'vitest';
import { contentGradientRange, extremaIndexes, nightSpans, plotPadding } from './chartLabels';

describe('extremaIndexes', () => {
    it('keeps the ends and every local high and low', () => {
        expect(extremaIndexes([10, 12, 15, 13, 11, 12, 14, 16, 15], 1)).toEqual([0, 2, 4, 7, 8]);
    });
    it('places a flat peak in its middle', () => {
        expect(extremaIndexes([10, 14, 14, 14, 10], 1)).toEqual([0, 2, 4]);
    });
    it('skips extremes too close in value to the previous label', () => {
        expect(extremaIndexes([10, 10.4, 10.1, 15], 1)).toEqual([0, 3]);
    });
    it('handles short series', () => {
        expect(extremaIndexes([], 1)).toEqual([]);
        expect(extremaIndexes([12], 1)).toEqual([0]);
    });
});

describe('contentGradientRange', () => {
    it('extends the temperature range above the plot so the plot area maps exactly to min..max', () => {
        // plot from y=30 to y=130: y=0 is 30% of the range above max
        expect(contentGradientRange(0, 10, 30, 100)).toEqual({ min: 0, max: 13, height: 130 });
    });
    it('keeps the range when the plot starts at the top', () => {
        expect(contentGradientRange(-5, 15, 0, 200)).toEqual({ min: -5, max: 15, height: 200 });
    });
});

describe('plotPadding', () => {
    it('turns pixel paddings into axis spaces in data units', () => {
        // 100px plot, 20px under the data and 30px over it: the 10 degrees range gets 50px
        expect(plotPadding(0, 10, 100, 20, 30)).toEqual({ spaceMin: 4, spaceMax: 6 });
    });
    it('adds no space when there is no room or no range', () => {
        expect(plotPadding(0, 10, 40, 20, 30)).toEqual({ spaceMin: 0, spaceMax: 0 });
        expect(plotPadding(5, 5, 100, 20, 30)).toEqual({ spaceMin: 0, spaceMax: 0 });
    });
});

describe('nightSpans', () => {
    it('shades each night entry up to the middle of its neighbours, merged', () => {
        expect(
            nightSpans([
                { hours: 0, isDay: true },
                { hours: 1, isDay: false },
                { hours: 2, isDay: false },
                { hours: 3, isDay: true }
            ])
        ).toEqual([{ from: 0.5, to: 2.5 }]);
    });
    it('follows the entries times when the steps grow (3h forecasts after a few days)', () => {
        expect(
            nightSpans([
                { hours: 46, isDay: true },
                { hours: 47, isDay: false },
                { hours: 50, isDay: false },
                { hours: 53, isDay: true }
            ])
        ).toEqual([{ from: 46.5, to: 51.5 }]);
    });
    it('gives a half step around a night entry at the ends', () => {
        expect(
            nightSpans([
                { hours: 0, isDay: false },
                { hours: 1, isDay: true }
            ])
        ).toEqual([{ from: -0.5, to: 0.5 }]);
    });
});
