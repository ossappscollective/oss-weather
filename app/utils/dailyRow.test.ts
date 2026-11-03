import { describe, expect, it } from 'vitest';
import { CLASSIC_DEFAULT_BLOCK_HEIGHT, classicDataRow, headerTextSamples, iconsFitting } from './dailyRow';

// chips lines of 26 with a gap of 5
const ONE_LINE = 26;
const TWO_LINES = 57;
const THREE_LINES = 88;

describe('classicDataRow', () => {
    it('keeps the minimum row height for a single line', () => {
        expect(classicDataRow(ONE_LINE, 1)).toEqual({ rowHeight: 100, blockTop: 40 });
    });
    it('grows the row to hold a wrapped block under the header', () => {
        expect(classicDataRow(TWO_LINES, 1)).toEqual({ rowHeight: 123, blockTop: 40 });
        expect(classicDataRow(THREE_LINES, 1)).toEqual({ rowHeight: 154, blockTop: 40 });
    });
    it('sizes the default layout block like the chips', () => {
        expect(classicDataRow(CLASSIC_DEFAULT_BLOCK_HEIGHT, 1)).toEqual({ rowHeight: 116, blockTop: 40 });
    });
    it('centers a small block in the row once it is clear of the header', () => {
        expect(classicDataRow(10, 1)).toEqual({ rowHeight: 100, blockTop: 45 });
    });
    it('scales with the font scale', () => {
        expect(classicDataRow(TWO_LINES * 1.5, 1.5)).toEqual({ rowHeight: 184.5, blockTop: 60 });
    });
});

describe('iconsFitting', () => {
    it('keeps every icon when there is room', () => {
        expect(iconsFitting([20, 20, 20], 100, 200)).toBe(3);
    });
    it('keeps the first icons only when the others would go over the limit', () => {
        expect(iconsFitting([20, 20, 20], 100, 150)).toBe(2);
    });
    it('keeps none when the first one does not fit, or when the limit is already passed', () => {
        expect(iconsFitting([20, 20], 100, 110)).toBe(0);
        expect(iconsFitting([20], 100, 90)).toBe(0);
    });
    it('keeps an icon ending exactly on the limit', () => {
        expect(iconsFitting([20, 20], 100, 140)).toBe(2);
    });
});

describe('headerTextSamples', () => {
    // a fake formatter: the pattern and the date of the time
    const format = (time: number, pattern: string) => `${pattern}:${new Date(time).toISOString().slice(0, 10)}`;
    const time = Date.UTC(2026, 10, 4);

    it('gives the day of each day of the week', () => {
        const { days } = headerTextSamples(format, time, 'ddd', 'DD/MM', false);
        expect(days).toHaveLength(7);
        expect(days[0]).toBe('ddd:2026-11-04');
        expect(days[6]).toBe('ddd:2026-11-10');
    });

    it('gives the date of the day with the widest digits, its format being the same on every row', () => {
        const dateFormat = (_: number, pattern: string) => (pattern === 'DD/MM' ? '04/11' : '');
        expect(headerTextSamples(dateFormat, time, 'ddd', 'DD/MM', false).dates).toEqual(['88/88']);
    });

    it('gives the date of every month for the full date, whose month name changes', () => {
        const { dates } = headerTextSamples(format, time, 'dddd', 'D MMMM', true);
        expect(dates).toHaveLength(12);
        expect(dates[0]).toBe('D MMMM:2026-01-28');
        expect(dates[11]).toBe('D MMMM:2026-12-28');
    });
});
