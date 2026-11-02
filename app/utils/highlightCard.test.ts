import { describe, expect, it } from 'vitest';
import { cardLeft, cardMetrics } from './highlightCard';

describe('cardLeft', () => {
    it('sits right of the highlight line when it fits', () => {
        expect(cardLeft(100, 80, 0, 400)).toBe(112);
    });
    it('flips to the left of the line near the right edge', () => {
        expect(cardLeft(380, 80, 0, 400)).toBe(288);
    });
    it('never goes past the left edge of the plot', () => {
        expect(cardLeft(30, 80, 20, 100)).toBe(20);
    });
});

describe('cardMetrics', () => {
    it('sizes the card from its widest title, row names and values, and the row count', () => {
        const metrics = cardMetrics({ titleWidth: 30, namesWidth: 50, valuesWidth: 40, rowCount: 3, hasTitle: true, scale: 1 });
        // dot 14 + names 50 + gap 12 + values 40 = 116 wider than the title, plus 2 * 10 padding
        expect(metrics.width).toBe(136);
        // (3 rows + title) * 18 + 2 * 10 padding
        expect(metrics.height).toBe(92);
    });
    it('uses the title width when it is the widest', () => {
        expect(cardMetrics({ titleWidth: 200, namesWidth: 50, valuesWidth: 40, rowCount: 1, hasTitle: true, scale: 1 }).width).toBe(220);
    });
    it('has no title line without a title', () => {
        expect(cardMetrics({ titleWidth: 0, namesWidth: 50, valuesWidth: 40, rowCount: 2, hasTitle: false, scale: 1 }).height).toBe(56);
    });
    it('scales with the font scale', () => {
        const metrics = cardMetrics({ titleWidth: 0, namesWidth: 50, valuesWidth: 40, rowCount: 1, hasTitle: false, scale: 2 });
        expect(metrics.padding).toBe(20);
        expect(metrics.lineHeight).toBe(36);
        expect(metrics.height).toBe(76);
    });
});
