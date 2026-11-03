import { describe, expect, it } from 'vitest';
import { contentGradientRange, extremaIndexes, gridLineKind, highlightHour, highlightedAlpha, isChartedKey, nightSpans, plotPadding } from './chartLabels';

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

describe('highlightHour', () => {
    const start = 1792756800000;

    it('gives the hours since the start', () => {
        expect(highlightHour(start + 90 * 60 * 1000, start)).toBe(1.5);
    });

    it('gives null without a timestamp', () => {
        expect(highlightHour(undefined, start)).toBeNull();
        expect(highlightHour(null, start)).toBeNull();
    });

    it('gives null for a timestamp that is not a number', () => {
        expect(highlightHour(NaN, start)).toBeNull();
        expect(highlightHour(Infinity, start)).toBeNull();
    });

    it('gives null without a usable start of the data', () => {
        expect(highlightHour(start, NaN)).toBeNull();
        expect(highlightHour(start, undefined)).toBeNull();
        expect(highlightHour(start, Infinity)).toBeNull();
    });
});

describe('gridLineKind', () => {
    it('modern keeps only the day separation', () => {
        expect(gridLineKind(0, true)).toBe('solid');
        expect(gridLineKind(4, true)).toBeNull();
        expect(gridLineKind(12, true)).toBeNull();
    });
    it('classic draws every 4 hours, solid at midnight', () => {
        expect(gridLineKind(0, false)).toBe('solid');
        expect(gridLineKind(8, false)).toBe('dashed');
        expect(gridLineKind(5, false)).toBeNull();
    });
});

describe('isChartedKey', () => {
    it('keeps the lines of the chart', () => {
        expect(isChartedKey('temperature', ['temperature', 'windSpeed'])).toBe(true);
    });

    it('drops the data the chart does not show, like the uv index or the air quality', () => {
        expect(isChartedKey('uvIndex', ['temperature', 'windSpeed'])).toBe(false);
        expect(isChartedKey('aqi', ['temperature'])).toBe(false);
    });

    it('keeps every precipitation row when the chart shows one precipitation bar', () => {
        expect(isChartedKey('rainPrecipitation', ['temperature', 'precipAccumulation'])).toBe(true);
        expect(isChartedKey('snowfall', ['temperature', 'precipAccumulation'])).toBe(true);
    });

    it('drops the precipitation rows when the chart shows none', () => {
        expect(isChartedKey('snowfall', ['temperature'])).toBe(false);
    });
});

describe('highlightedAlpha', () => {
    it('keeps the alpha of a bar that is not highlighted', () => {
        expect(highlightedAlpha(100, false)).toBe(100);
    });

    it('makes a highlighted bar more opaque', () => {
        expect(highlightedAlpha(100, true)).toBe(160);
    });

    it('never goes over fully opaque', () => {
        expect(highlightedAlpha(200, true)).toBe(255);
        expect(highlightedAlpha(255, true)).toBe(255);
    });

    it('keeps a transparent bar transparent', () => {
        expect(highlightedAlpha(0, true)).toBe(0);
    });
});
