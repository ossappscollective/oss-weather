import { describe, expect, it } from 'vitest';
import { highlightRows } from './highlightRows';

describe('highlightRows', () => {
    it('lists the models from the highest value, rounded to one decimal', () => {
        const rows = highlightRows(
            [
                { name: 'ICON', color: '#ff0000', value: 12.34 },
                { name: 'AROME', color: '#00ff00', value: 14 },
                { name: 'GFS', color: '#0000ff', value: 13.06 }
            ],
            '°C'
        );
        expect(rows).toEqual([
            { name: 'AROME', color: '#00ff00', text: '14°C' },
            { name: 'GFS', color: '#0000ff', text: '13.1°C' },
            { name: 'ICON', color: '#ff0000', text: '12.3°C' }
        ]);
    });
    it('skips models without a value', () => {
        expect(highlightRows([{ name: 'ICON', color: '#ff0000', value: undefined }, { name: 'GFS', color: '#0000ff', value: 2 }], ' mm')).toEqual([
            { name: 'GFS', color: '#0000ff', text: '2 mm' }
        ]);
    });
});
