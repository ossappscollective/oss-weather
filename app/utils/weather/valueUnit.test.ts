import { describe, expect, it } from 'vitest';
import { splitValueUnit } from './valueUnit';

describe('splitValueUnit', () => {
    it('splits a number from the unit glued to it', () => {
        expect(splitValueUnit('2.2 mm')).toEqual({ amount: '2.2', unit: 'mm', extra: undefined });
        expect(splitValueUnit('17°')).toEqual({ amount: '17', unit: '°', extra: undefined });
        expect(splitValueUnit('-3,5 °C')).toEqual({ amount: '-3,5', unit: '°C', extra: undefined });
    });
    it('takes the unit from a text-only subvalue', () => {
        expect(splitValueUnit('54', 'km/h')).toEqual({ amount: '54', unit: 'km/h', extra: undefined });
        expect(splitValueUnit(32, 'aqi')).toEqual({ amount: '32', unit: 'aqi', extra: undefined });
    });
    it('keeps a subvalue as extra when the value already has a unit or the subvalue is a measure', () => {
        expect(splitValueUnit('2.2 mm', '90 %')).toEqual({ amount: '2.2', unit: 'mm', extra: '90 %' });
        expect(splitValueUnit('15°', 'apparent')).toEqual({ amount: '15', unit: '°', extra: 'apparent' });
        expect(splitValueUnit('3', '1200 m')).toEqual({ amount: '3', unit: '', extra: '1200 m' });
    });
    it('leaves a non numeric value whole', () => {
        expect(splitValueUnit('Moon')).toEqual({ amount: 'Moon', unit: '', extra: undefined });
    });
});
