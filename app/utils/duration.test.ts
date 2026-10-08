import { describe, expect, it } from 'vitest';
import { formatHoursMinutes } from './duration';

describe('formatHoursMinutes', () => {
    it('shows hours and zero padded minutes', () => {
        expect(formatHoursMinutes((10 * 60 + 51) * 60000)).toBe('10 h 51');
        expect(formatHoursMinutes((2 * 60 + 5) * 60000)).toBe('2 h 05');
    });
    it('shows only minutes under an hour', () => {
        expect(formatHoursMinutes(42 * 60000)).toBe('42 min');
    });
    it('is empty for negative or invalid durations', () => {
        expect(formatHoursMinutes(-1000)).toBe('');
        expect(formatHoursMinutes(NaN)).toBe('');
    });
});
