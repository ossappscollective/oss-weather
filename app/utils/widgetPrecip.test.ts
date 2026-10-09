import { describe, expect, it } from 'vitest';
import { precipBars, precipTexts } from './widgetPrecip';

describe('precipBars', () => {
    it('draws one bar from the amount, like the app hourly item', () => {
        expect(precipBars({ precipProbability: 100, precipAccumulation: 1 })).toEqual([{ start: 0, end: 1, top: 0.9, color: '#378ADD73' }]);
    });
    it('uses the square root above 1 mm and the probability as opacity', () => {
        expect(precipBars({ precipProbability: 40, precipAccumulation: 4 })).toEqual([{ start: 0, end: 1, top: 0.8, color: '#378ADD2E' }]);
    });
    it('draws the snowfall when snow is shown', () => {
        expect(precipBars({ precipProbability: 100, precipAccumulation: 1, snowfall: 4, precipShowSnow: true })[0]).toMatchObject({ top: 0.8, color: '#00CDE673' });
    });
    it('splits mixed rain and snow in two halves', () => {
        const bars = precipBars({ precipProbability: 100, precipAccumulation: 5, rain: 1, snowfall: 4, mixedRainSnow: true });
        expect(bars.map((bar) => [bar.start, bar.end, bar.top])).toEqual([
            [0, 0.5, 0.9],
            [0.5, 1, 0.8]
        ]);
    });
    it('draws nothing without probability or amount', () => {
        expect(precipBars({ precipProbability: 0, precipAccumulation: 2 })).toEqual([]);
        expect(precipBars({ precipProbability: 50, precipAccumulation: 0 })).toEqual([]);
    });
});

describe('precipTexts', () => {
    it('shows the amount and probability above 10% and 0.1 mm', () => {
        expect(precipTexts(40, 0.5, false)).toEqual({ amount: true, probability: true });
    });
    it('hides both for a low probability', () => {
        expect(precipTexts(8, 0.5, false)).toEqual({ amount: false, probability: false });
    });
    it('always shows the probability with the setting', () => {
        expect(precipTexts(8, 0, true)).toEqual({ amount: false, probability: true });
    });
});
