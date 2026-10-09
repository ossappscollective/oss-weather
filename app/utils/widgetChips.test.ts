import { describe, expect, it } from 'vitest';
import { packChips, widgetChip } from './widgetChips';

describe('widgetChip', () => {
    it('keeps the value and its unit', () => {
        expect(widgetChip({ value: '14', subvalue: 'km/h' }, 'icon.png', true)).toEqual({ iconPath: 'icon.png', value: '14', unit: 'km/h', tint: '', barFraction: 0, barColor: '' });
    });
    it('tints the chip by the data intensity, as a translucent color', () => {
        const chip = widgetChip({ value: '70', subvalue: '%', tint: { color: '#888780', fraction: 1 } }, 'icon.png', true);
        expect(chip.tint).toBe('#88878050');
    });
    it('draws the precipitation probability as a bar in the data color', () => {
        const chip = widgetChip({ value: '2.4', subvalue: '60%', probability: 60, color: '#378ADD', tint: { color: '#378ADD', fraction: 0.5 } }, 'icon.png', true);
        expect(chip).toMatchObject({ unit: '', barFraction: 0.6, barColor: '#378ADD' });
    });
    it('does not tint when the data intensity is off', () => {
        expect(widgetChip({ value: '70', tint: { color: '#888780', fraction: 1 } }, 'icon.png', false).tint).toBe('');
    });
});

describe('packChips', () => {
    it('keeps the chips that fit on one row', () => {
        expect(packChips([40, 40, 40], 100, 4, 1)).toEqual([[0, 1]]);
    });
    it('wraps to the next rows', () => {
        expect(packChips([40, 40, 40, 40], 100, 4, 2)).toEqual([
            [0, 1],
            [2, 3]
        ]);
    });
    it('stops at the first chip that does not fit, to keep the data order', () => {
        expect(packChips([40, 90, 20], 100, 4, 1)).toEqual([[0]]);
    });
    it('shows nothing when the first chip is too wide', () => {
        expect(packChips([120], 100, 4, 2)).toEqual([]);
    });
});
