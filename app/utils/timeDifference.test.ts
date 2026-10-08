import { describe, expect, it } from 'vitest';
import { timeDifferenceLabel } from './timeDifference';

describe('timeDifferenceLabel', () => {
    it('shows the hours ahead or behind the selected location', () => {
        expect(timeDifferenceLabel(9, 2)).toBe('+7 h');
        expect(timeDifferenceLabel(-4, 2)).toBe('−6 h');
    });
    it('is empty for the same time zone or a missing one', () => {
        expect(timeDifferenceLabel(2, 2)).toBe('');
        expect(timeDifferenceLabel(undefined, 2)).toBe('');
    });
});
