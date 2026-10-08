import { describe, expect, it } from 'vitest';
import { centeredBaseline, gridColumnCount, layoutGrid, rangeBarSpan } from './dataGrid';

describe('gridColumnCount', () => {
    it('fits as many columns as the min cell width allows, up to the max', () => {
        expect(gridColumnCount(330, 100, 3)).toBe(3);
        expect(gridColumnCount(250, 100, 3)).toBe(2);
        expect(gridColumnCount(500, 100, 3)).toBe(3);
    });
    it('always keeps one column', () => {
        expect(gridColumnCount(50, 100, 3)).toBe(1);
    });
});

describe('layoutGrid', () => {
    it('fills rows left to right', () => {
        expect(layoutGrid(4, 3)).toEqual({
            rowCount: 2,
            cells: [
                { column: 0, row: 0 },
                { column: 1, row: 0 },
                { column: 2, row: 0 },
                { column: 0, row: 1 }
            ]
        });
    });
    it('has no row for no cell', () => {
        expect(layoutGrid(0, 3)).toEqual({ rowCount: 0, cells: [] });
    });
});

describe('rangeBarSpan', () => {
    it('places the day range on the week scale', () => {
        expect(rangeBarSpan(11, 15, 8, 20)).toEqual({ start: 0.25, end: 7 / 12 });
    });
    it('clamps values outside the week range', () => {
        expect(rangeBarSpan(5, 25, 8, 20)).toEqual({ start: 0, end: 1 });
    });
    it('fills the bar when the week has a single temperature', () => {
        expect(rangeBarSpan(10, 10, 10, 10)).toEqual({ start: 0, end: 1 });
    });
});

describe('centeredBaseline', () => {
    it('puts the middle of the font box (ascent negative, descent positive) on the center line', () => {
        // icon font: box from 18.75 above to 1.25 under the baseline, 20px tall
        expect(centeredBaseline(50, -18.75, 1.25)).toBe(58.75);
    });
});
