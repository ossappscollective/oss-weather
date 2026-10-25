import { describe, expect, it } from 'vitest';
import { einkChipStyle } from './eink';

describe('einkChipStyle', () => {
    it('never fills a chip: a fill dithers to black and hides the text', () => {
        expect(einkChipStyle(false, '#000000')).not.toHaveProperty('fillColor');
        expect(einkChipStyle(true, '#000000')).not.toHaveProperty('fillColor');
    });
    it('draws the text in the line color', () => {
        const style = einkChipStyle(true, '#000000');
        expect(style.textColor).toBe(style.strokeColor);
    });
    it('draws a warning with a thicker line than a regular chip', () => {
        expect(einkChipStyle(true, '#000000').strokeWidth).toBeGreaterThan(einkChipStyle(false, '#000000').strokeWidth);
    });
});
