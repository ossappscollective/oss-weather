import { describe, expect, it } from 'vitest';
import { isBRALocation } from './braBounds';

describe('isBRALocation', () => {
    it('accepts the Alps in the Paris timezone', () => {
        expect(isBRALocation({ coord: { lat: 45.9, lon: 6.87 }, timezone: 'Europe/Paris' })).toBe(true);
    });

    it('rejects a location outside the bounds', () => {
        expect(isBRALocation({ coord: { lat: 52.5, lon: 13.4 }, timezone: 'Europe/Paris' })).toBe(false);
        expect(isBRALocation({ coord: { lat: 45.9, lon: 10 }, timezone: 'Europe/Paris' })).toBe(false);
    });

    it('rejects another timezone inside the bounds', () => {
        expect(isBRALocation({ coord: { lat: 45.9, lon: 6.87 }, timezone: 'Europe/Zurich' })).toBe(false);
    });
});
