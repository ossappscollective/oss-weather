import { describe, expect, it } from 'vitest';
import { alertStatus } from './alertStatus';

describe('alertStatus', () => {
    it('is active between its start and end', () => {
        expect(alertStatus({ start: 100, end: 200 }, 150)).toBe('active');
        expect(alertStatus({ start: 100, end: 200 }, 100)).toBe('active');
    });
    it('is upcoming before its start', () => {
        expect(alertStatus({ start: 100, end: 200 }, 50)).toBe('upcoming');
    });
    it('is active without a start', () => {
        expect(alertStatus({ start: undefined, end: 200 }, 50)).toBe('active');
    });
});
