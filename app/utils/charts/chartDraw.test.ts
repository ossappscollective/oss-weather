import { describe, expect, it, vi } from 'vitest';

// the drawing functions of the module need the canvas runtime: only its layout functions are tested here
vi.mock('@nativescript-community/ui-canvas', () => ({ Align: {}, Canvas: class {}, Cap: {}, DashPathEffect: class {}, Paint: class { constructor() { return new Proxy({}, { get: () => () => {}, set: () => true }); } }, Rect: class {}, RectF: class {}, Style: {} }));
vi.mock('@nativescript-community/ui-chart/components/YAxis', () => ({ AxisDependency: {} }));
vi.mock('~/variables', () => ({ accentFontWeight: {} }));

import { cardLayout, cardLeft, ellipsize } from './chartDraw';

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

const base = { headerWidth: 30, headerHeight: 18, columnWidth: 116, rowCount: 3, rowHeight: 18, padding: 10, columnGap: 16, availableHeight: 1000 };

describe('cardLayout', () => {
    it('stacks the rows in one column when the card fits', () => {
        const layout = cardLayout(base);
        expect(layout).toEqual({ columns: 1, rowsPerColumn: 3, rowHeight: 18, width: 136, height: 92 });
    });
    it('uses the header width when it is the widest', () => {
        expect(cardLayout({ ...base, headerWidth: 200 }).width).toBe(220);
    });
    it('has no header line without a header', () => {
        expect(cardLayout({ ...base, headerWidth: 0, headerHeight: 0, rowCount: 2 }).height).toBe(56);
    });
    it('goes to two columns when one column is too tall', () => {
        const layout = cardLayout({ ...base, rowCount: 10, availableHeight: 150 });
        expect(layout.columns).toBe(2);
        expect(layout.rowsPerColumn).toBe(5);
        expect(layout.rowHeight).toBe(18);
        // two columns and the gap, plus the paddings
        expect(layout.width).toBe(2 * 116 + 16 + 20);
        expect(layout.height).toBe(20 + 18 + 5 * 18);
    });
    it('shrinks the rows in one column before using two', () => {
        const layout = cardLayout({ ...base, rowCount: 10, availableHeight: 180 });
        expect(layout.columns).toBe(1);
        expect(layout.rowHeight).toBeCloseTo(14.2, 5);
        expect(layout.height).toBeCloseTo(180, 5);
    });
    it('shrinks the rows when two columns are still too tall', () => {
        const layout = cardLayout({ ...base, rowCount: 10, availableHeight: 110 });
        expect(layout.columns).toBe(2);
        expect(layout.rowHeight).toBeCloseTo(14.4, 5);
        expect(layout.height).toBeCloseTo(110, 5);
    });
    it('does not shrink the rows under the minimum scale', () => {
        const layout = cardLayout({ ...base, rowCount: 10, availableHeight: 40 });
        expect(layout.rowHeight).toBeCloseTo(18 * 0.7, 5);
    });
    it('keeps the layout when nothing is known about the space', () => {
        expect(cardLayout({ ...base, rowCount: 10, availableHeight: 0 }).columns).toBe(1);
    });
});

describe('ellipsize', () => {
    const measure = (text: string) => text.length * 10;
    it('keeps a text that fits', () => {
        expect(ellipsize('Cloudy', 100, measure)).toBe('Cloudy');
    });
    it('cuts a long text and adds an ellipsis', () => {
        expect(ellipsize('Light rain showers', 100, measure)).toBe('Light rai…');
    });
    it('returns the ellipsis only when nothing else fits', () => {
        expect(ellipsize('Cloudy', 5, measure)).toBe('…');
    });
});
