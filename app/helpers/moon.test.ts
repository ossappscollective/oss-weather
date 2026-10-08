import { describe, expect, it } from 'vitest';
import { getMoonIlluminationPercent } from './moon';

describe('getMoonIlluminationPercent', () => {
    it('is near 0 at a new moon and near 100 at a full moon', () => {
        // 2024-01-11 new moon, 2024-01-25 full moon
        expect(getMoonIlluminationPercent(new Date(Date.UTC(2024, 0, 11, 11, 57)))).toBeLessThanOrEqual(1);
        expect(getMoonIlluminationPercent(new Date(Date.UTC(2024, 0, 25, 17, 54)))).toBeGreaterThanOrEqual(99);
    });
    it('is a whole percentage', () => {
        expect(Number.isInteger(getMoonIlluminationPercent(new Date(Date.UTC(2024, 0, 18))))).toBe(true);
    });
});
