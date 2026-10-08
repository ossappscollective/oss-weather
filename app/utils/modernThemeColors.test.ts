import { describe, expect, it } from 'vitest';
import { mixColors, modernThemeColors } from './modernThemeColors';

describe('mixColors', () => {
    it('blends two hex colors', () => {
        expect(mixColors('#ffffff', '#000000', 0)).toBe('#ffffff');
        expect(mixColors('#ffffff', '#000000', 1)).toBe('#000000');
        expect(mixColors('#ffffff', '#000000', 0.5)).toBe('#808080');
    });
});

describe('modernThemeColors', () => {
    it('uses a neutral white background in light themes, tints of the text color for cards and lines', () => {
        const colors = modernThemeColors('#1e1b16', 'light', false);
        expect(colors.colorModernBackground).toBe('#ffffff');
        expect(colors.colorModernCard).toBe(mixColors('#ffffff', '#1e1b16', 0.045));
        expect(colors.colorModernAccent).toBe('#378add');
    });
    it('uses near black in dark and pure black in the black theme', () => {
        expect(modernThemeColors('#e6e1e5', 'dark', true).colorModernBackground).toBe('#121212');
        expect(modernThemeColors('#e6e1e5', 'black', true).colorModernBackground).toBe('#000000');
    });
});
