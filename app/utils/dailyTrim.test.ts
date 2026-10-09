import { describe, expect, it } from 'vitest';
import { keptDayCount } from './dailyTrim';

describe('keptDayCount', () => {
    it('keeps a partial first day (the rest of today)', () => {
        expect(keptDayCount([1, 24, 24, 23], 3)).toBe(4);
    });
    it('drops partial days at the end', () => {
        expect(keptDayCount([10, 24, 24, 2], 3)).toBe(3);
        expect(keptDayCount([10, 24, 1, 0], 3)).toBe(2);
    });
    it('keeps everything when all days are complete', () => {
        expect(keptDayCount([24, 24], 3)).toBe(2);
    });
});
