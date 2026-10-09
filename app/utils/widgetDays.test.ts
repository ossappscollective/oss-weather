import { describe, expect, it } from 'vitest';
import { upcomingDays } from './widgetDays';

describe('upcomingDays', () => {
    const days = [{ time: 100 }, { time: 200 }, { time: 300 }];

    it('skips the days before today', () => {
        expect(upcomingDays(days, 200)).toEqual([{ time: 200 }, { time: 300 }]);
    });

    it('keeps all days when the first is today', () => {
        expect(upcomingDays(days, 50)).toEqual(days);
    });

    it('returns nothing when every day is past', () => {
        expect(upcomingDays(days, 400)).toEqual([]);
    });
});
