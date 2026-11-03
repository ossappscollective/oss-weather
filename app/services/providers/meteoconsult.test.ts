import { describe, expect, it, vi } from 'vitest';

vi.mock('@nativescript/core', () => ({ ApplicationSettings: {} }));
vi.mock('../api', () => ({}));
vi.mock('~/services/providers/marineweatherprovider', () => ({ MarineWeatherProvider: class {} }));

import { hasMarineData, isMarineSearchCacheValid, localDayStart, pickMarineLocation } from './meteoconsult';

const empty = { avis: null, marees: [], previs: { simple: [{ hauteurvague: null }], detail: [{ teau: null, hauteurvague: null, hauteurvaguemax: null, hauteurhoule: null }] } };

describe('hasMarineData', () => {
    it('is false for an inland point, where the service answers without any sea data', () => {
        expect(hasMarineData(empty)).toBe(false);
    });

    it('is false without a response', () => {
        expect(hasMarineData(undefined)).toBe(false);
        expect(hasMarineData({})).toBe(false);
    });

    it('is true when there are tides', () => {
        expect(hasMarineData({ ...empty, marees: [{ etales: [] }] })).toBe(true);
    });

    it.each(['teau', 'hauteurvague', 'hauteurvaguemax', 'hauteurhoule'])('is true when an hour has %s', (field) => {
        expect(hasMarineData({ ...empty, previs: { detail: [{ teau: null }, { [field]: 0.2 }] } })).toBe(true);
    });

    it('counts a calm sea at 0 as data', () => {
        expect(hasMarineData({ ...empty, previs: { detail: [{ hauteurvague: 0 }] } })).toBe(true);
    });
});

const brest = { lat: 48.3828, lon: -4.4948 };
const station = { id: 1, nom: 'Brest', lat: 48.38, lon: -4.49, presence_houle: false, presence_maree: true, presence_coef_maree: true };

describe('pickMarineLocation', () => {
    it('takes the first station when it is close enough', () => {
        expect(pickMarineLocation([station, { ...station, id: 2 }], brest, 10)).toBe(station);
    });

    it('refuses a station too far away', () => {
        expect(pickMarineLocation([{ ...station, lat: 48.6, lon: -4.9 }], brest, 10)).toBeNull();
    });

    it('refuses a station without waves, tides or coefficients', () => {
        expect(pickMarineLocation([{ ...station, presence_maree: false, presence_coef_maree: false }], brest, 10)).toBeNull();
    });

    it('is null when the search finds nothing', () => {
        expect(pickMarineLocation([], brest, 10)).toBeNull();
        expect(pickMarineLocation(undefined, brest, 10)).toBeNull();
    });
});

describe('isMarineSearchCacheValid', () => {
    const DAY = 24 * 3600 * 1000;
    const now = Date.UTC(2026, 10, 2);

    it('keeps a found station for a long time', () => {
        expect(isMarineSearchCacheValid({ cachedAt: now - 300 * DAY, data: station }, now)).toBe(true);
    });

    it('expires a found station after a year', () => {
        expect(isMarineSearchCacheValid({ cachedAt: now - 366 * DAY, data: station }, now)).toBe(false);
    });

    it('keeps an empty result only a short while, the search can be down or fixed', () => {
        expect(isMarineSearchCacheValid({ cachedAt: now - 3600 * 1000, data: null }, now)).toBe(true);
        expect(isMarineSearchCacheValid({ cachedAt: now - 2 * DAY, data: null }, now)).toBe(false);
    });
});

describe('localDayStart', () => {
    const marseilleMidnight = Date.UTC(2026, 10, 1, 23);

    it('puts a day the service dates in UTC on the local midnight of the location', () => {
        expect(localDayStart('2026-11-02T00:00:00+00:00', 1)).toBe(marseilleMidnight);
    });

    it('gives the same day when the service dates it in the local offset', () => {
        expect(localDayStart('2026-11-02T00:00:00+01:00', 1)).toBe(marseilleMidnight);
    });

    it('follows the location offset in summer time', () => {
        expect(localDayStart('2026-07-14T00:00:00+00:00', 2)).toBe(Date.UTC(2026, 6, 13, 22));
    });

    it('works west of UTC', () => {
        expect(localDayStart('2026-11-02T00:00:00+00:00', -5)).toBe(Date.UTC(2026, 10, 2, 5));
    });
});
