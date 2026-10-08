import { describe, expect, it } from 'vitest';
import { variableFontWeight } from './fontWeight';

describe('variableFontWeight', () => {
    it('maps css weights to numbers', () => {
        expect(variableFontWeight('normal', 300, 700)).toBe(400);
        expect(variableFontWeight('bold', 300, 700)).toBe(700);
        expect(variableFontWeight('600', 300, 700)).toBe(600);
        expect(variableFontWeight(500, 300, 700)).toBe(500);
        expect(variableFontWeight(undefined, 300, 700)).toBe(400);
    });
    it('stays inside the font weight axis', () => {
        expect(variableFontWeight('100', 300, 700)).toBe(300);
        expect(variableFontWeight('900', 300, 700)).toBe(700);
    });
});
