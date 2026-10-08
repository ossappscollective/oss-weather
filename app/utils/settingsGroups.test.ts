import { describe, expect, it } from 'vitest';
import { groupPosition } from './settingsGroups';

const types = ['header', 'sectionheader', undefined, 'switch', undefined, 'sectionheader', 'switch', 'info', undefined];
const typeAt = (index: number) => types[index];

describe('groupPosition', () => {
    it('places the rows between section headers in one card', () => {
        expect(groupPosition(2, types.length, typeAt)).toBe('first');
        expect(groupPosition(3, types.length, typeAt)).toBe('middle');
        expect(groupPosition(4, types.length, typeAt)).toBe('last');
    });
    it('gives a lone row its own card, also at the end of the list', () => {
        expect(groupPosition(6, types.length, typeAt)).toBe('single');
        expect(groupPosition(8, types.length, typeAt)).toBe('single');
    });
    it('leaves headers and info texts out of the cards', () => {
        expect(groupPosition(0, types.length, typeAt)).toBeUndefined();
        expect(groupPosition(1, types.length, typeAt)).toBeUndefined();
        expect(groupPosition(7, types.length, typeAt)).toBeUndefined();
    });
});
