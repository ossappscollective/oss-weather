import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => vi.stubGlobal('PRODUCTION', true));

// api.ts imports the NativeScript runtime and the app helpers: only prepareItems is tested here
vi.mock('@nativescript-community/geocoding', () => ({}));
vi.mock('@nativescript-community/https', () => ({}));
vi.mock('@nativescript-community/observable', () => ({ default: class {} }));
vi.mock('@nativescript/core', () => ({ ApplicationSettings: { getBoolean: (unusedKey: string, fallback: boolean) => fallback } }));
vi.mock('@nativescript/core/connectivity', () => ({ connectionType: { none: 0 } }));
vi.mock('@akylas/nativescript-app-utils/error', () => ({}));
vi.mock('@shared/utils/svelte/ui', () => ({ createGlobalEventListener: () => ({}), globalObservable: {} }));
vi.mock('~/helpers/constants', () => ({ SETTINGS_SHOW_CURRENT_DAY_DAILY: 'a', SETTINGS_SHOW_DAILY_IN_CURRENTLY: 'b', SHOW_CURRENT_DAY_DAILY: false, SHOW_DAILY_IN_CURRENTLY: false }));
vi.mock('~/helpers/favorites', () => ({}));
vi.mock('~/helpers/locale', () => ({ getStartOfDay: (date: dayjs.Dayjs) => date.startOf('d'), lang: 'en' }));
vi.mock('~/services/weatherData', () => ({ WeatherProps: new Proxy({}, { get: (unusedTarget, key) => key }) }));
vi.mock('~/modules/providers/openmeteo/om', () => ({}));
vi.mock('~/services/providers/omIcons', () => ({}));

import { type WeatherLocation, prepareItems } from './api';

dayjs.extend(utc);

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const now = dayjs.utc('2026-11-13T12:20:00Z');
const weatherLocation: WeatherLocation = { name: 'Dublin', coord: { lat: 53.4, lon: -6.3 }, timezone: 'Europe/Dublin', timezoneOffset: 0 };
const METAR_ICON = 300;
const PROVIDER_ICON = 804;

function weatherData(currently: object) {
    const startOfHour = now.startOf('h').valueOf();
    return {
        time: now.valueOf(),
        currently,
        daily: { data: [{ time: now.startOf('d').valueOf(), iconId: PROVIDER_ICON }] },
        hourly: [{ time: startOfHour, iconId: PROVIDER_ICON, temperature: 10 }],
        alerts: []
    } as any;
}

function currentItem(currently: object) {
    return prepareItems(weatherLocation, weatherData(currently), now.valueOf(), now)[0];
}

describe('prepareItems current conditions', () => {
    const metarCurrently = (age: number, metarAge: number) => ({
        time: now.valueOf() - age,
        iconId: METAR_ICON,
        temperature: 5,
        windIcon: 'wi-metar-wind',
        metar: { icao: 'EIDW', time: now.valueOf() - metarAge }
    });

    it('uses the current conditions when they are recent', () => {
        expect(currentItem(metarCurrently(10 * MINUTE, 30 * MINUTE)).iconId).toBe(METAR_ICON);
    });

    it('keeps the METAR conditions, derived fields included, when the provider time is over 20 minutes old', () => {
        const current = currentItem(metarCurrently(26 * MINUTE, 30 * MINUTE));
        expect(current.iconId).toBe(METAR_ICON);
        expect(current.temperature).toBe(5);
        expect(current.windIcon).toBe('wi-metar-wind');
    });

    it('falls back to the hourly data when they are old and there is no METAR', () => {
        expect(currentItem({ time: now.valueOf() - 26 * MINUTE, iconId: METAR_ICON }).iconId).toBe(PROVIDER_ICON);
    });

    it('falls back to the hourly data when the METAR observation is too old', () => {
        expect(currentItem(metarCurrently(26 * MINUTE, 3 * HOUR)).iconId).toBe(PROVIDER_ICON);
    });
});
