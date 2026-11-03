import { describe, expect, it, vi } from 'vitest';

// the service imports the app request helper: only its station helpers are tested here
vi.mock('~/services/api', () => ({}));

import { MetarStation, bboxAround, isStationCode, sortByDistance, stationFromInfo } from './metar';

describe('isStationCode', () => {
    it('accepts 4 character codes, trimmed', () => {
        expect(isStationCode('KLGA')).toBe(true);
        expect(isStationCode(' lfpo ')).toBe(true);
        expect(isStationCode('K1A2')).toBe(true);
    });
    it('rejects names and other lengths', () => {
        expect(isStationCode('la guardia')).toBe(false);
        expect(isStationCode('LGA')).toBe(false);
        expect(isStationCode('')).toBe(false);
        expect(isStationCode('KL-A')).toBe(false);
    });
});

describe('bboxAround', () => {
    it('builds the lat0,lon0,lat1,lon1 box', () => {
        expect(bboxAround({ lat: 40.7757, lon: -73.8733 })).toBe('40.7257,-73.9233,40.8257,-73.8233');
    });
    it('uses the given delta', () => {
        expect(bboxAround({ lat: 10, lon: 20 }, 0.5)).toBe('9.5,19.5,10.5,20.5');
    });
});

describe('stationFromInfo', () => {
    const info = { icaoId: 'KLGA', site: 'New York/La Guardia Arpt', country: 'US', lat: 40.77945, lon: -73.88027, siteType: ['METAR', 'TAF'] };

    it('maps a METAR station', () => {
        expect(stationFromInfo(info)).toEqual({
            icao: 'KLGA',
            name: 'New York/La Guardia Arpt',
            country: 'US',
            coord: { lat: 40.77945, lon: -73.88027 }
        });
    });
    it('drops stations that do not report METAR', () => {
        expect(stationFromInfo({ ...info, siteType: [] })).toBeUndefined();
        expect(stationFromInfo({ ...info, siteType: ['TAF'] })).toBeUndefined();
        expect(stationFromInfo({ ...info, siteType: undefined })).toBeUndefined();
    });
    it('drops stations without id or position', () => {
        expect(stationFromInfo({ ...info, icaoId: undefined })).toBeUndefined();
        expect(stationFromInfo({ ...info, lat: undefined })).toBeUndefined();
    });
});

describe('sortByDistance', () => {
    const near: MetarStation = { icao: 'NEAR', name: 'near', coord: { lat: 40.78, lon: -73.88 } };
    const far: MetarStation = { icao: 'FAR0', name: 'far', coord: { lat: 40.64, lon: -73.76 } };

    it('puts the closest station first without mutating the input', () => {
        const input = [far, near];
        expect(sortByDistance(input, { lat: 40.7757, lon: -73.8733 }).map((station) => station.icao)).toEqual(['NEAR', 'FAR0']);
        expect(input[0]).toBe(far);
    });
});
