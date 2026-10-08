import { describe, expect, it } from 'vitest';
import { groupRowClass } from './groupClass';

describe('groupRowClass', () => {
    it('gives the row and position classes, nothing outside of a group', () => {
        expect(groupRowClass('first')).toBe('modernGroupRow modernGroupFirst');
        expect(groupRowClass('single')).toBe('modernGroupRow modernGroupSingle');
        expect(groupRowClass(null)).toBe('');
    });
});
