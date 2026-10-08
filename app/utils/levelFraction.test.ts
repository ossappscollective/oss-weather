import { describe, expect, it } from 'vitest';
import { levelFraction } from './levelFraction';

describe('levelFraction', () => {
    it('is the part of the scale, clamped', () => {
        expect(levelFraction(25, 100)).toBe(0.25);
        expect(levelFraction(180, 100)).toBe(1);
        expect(levelFraction(-5, 100)).toBe(0);
        expect(levelFraction(null, 100)).toBe(0);
    });
});
