import { describe, expect, it } from 'vitest';
import { curvePositions } from './widgetCurve';

describe('curvePositions', () => {
    it('places each value between the lowest (0) and the highest (1)', () => {
        expect(curvePositions([10, 15, 20])).toEqual([0, 0.5, 1]);
    });
    it('keeps a flat curve in the middle', () => {
        expect(curvePositions([12, 12])).toEqual([0.5, 0.5]);
    });
    it('ignores missing values for the range and puts them in the middle', () => {
        expect(curvePositions([10, undefined, 20])).toEqual([0, 0.5, 1]);
    });
});
