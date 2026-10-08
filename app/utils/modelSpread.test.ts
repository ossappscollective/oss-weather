import { describe, expect, it } from 'vitest';
import { modelSpread } from './modelSpread';

describe('modelSpread', () => {
    it('gives the lowest and highest model and the gap', () => {
        expect(modelSpread([14, 12, 15])).toEqual({ min: 12, max: 15, spread: 3, count: 3 });
    });
    it('ignores models without a value', () => {
        expect(modelSpread([14, undefined, 11, NaN])).toEqual({ min: 11, max: 14, spread: 3, count: 2 });
    });
    it('needs two models', () => {
        expect(modelSpread([14])).toBeNull();
        expect(modelSpread([])).toBeNull();
    });
});
