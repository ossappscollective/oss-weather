import { describe, expect, it } from 'vitest';
import { chipsAlignment, layoutChips } from './chipsLayout';

describe('layoutChips', () => {
    it('returns no line for no chip', () => {
        expect(layoutChips([], 100, 5)).toEqual({ lineCount: 0, chips: [] });
    });
    it('places chips side by side with a gap', () => {
        expect(layoutChips([30, 40], 100, 5)).toEqual({
            lineCount: 1,
            chips: [
                { x: 0, line: 0 },
                { x: 35, line: 0 }
            ]
        });
    });
    it('keeps a chip that exactly reaches the max width on the line', () => {
        expect(layoutChips([50, 45], 100, 5).lineCount).toBe(1);
    });
    it('wraps a chip that does not fit to the next line', () => {
        expect(layoutChips([50, 46, 20], 100, 5)).toEqual({
            lineCount: 2,
            chips: [
                { x: 0, line: 0 },
                { x: 0, line: 1 },
                { x: 51, line: 1 }
            ]
        });
    });
    it('gives a chip wider than the max width its own line', () => {
        expect(layoutChips([20, 150, 20], 100, 5)).toEqual({
            lineCount: 3,
            chips: [
                { x: 0, line: 0 },
                { x: 0, line: 1 },
                { x: 0, line: 2 }
            ]
        });
    });
});

describe('layoutChips alignment', () => {
    it('centers each line in the available width', () => {
        expect(layoutChips([30, 40], 100, 5, 'center').chips).toEqual([
            { x: 12.5, line: 0 },
            { x: 47.5, line: 0 }
        ]);
    });
    it('right aligns each line on its own', () => {
        expect(layoutChips([50, 46, 20], 100, 5, 'right').chips).toEqual([
            { x: 50, line: 0 },
            { x: 29, line: 1 },
            { x: 80, line: 1 }
        ]);
    });
});

describe('chipsAlignment', () => {
    it('accepts the known alignments and falls back to left', () => {
        expect(chipsAlignment('center')).toBe('center');
        expect(chipsAlignment('right')).toBe('right');
        expect(chipsAlignment('whatever')).toBe('left');
    });
});
