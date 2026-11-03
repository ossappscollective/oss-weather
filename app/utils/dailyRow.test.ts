import { describe, expect, it } from 'vitest';
import { CLASSIC_DEFAULT_BLOCK_HEIGHT, classicDataRow, iconsFitting } from './dailyRow';

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
