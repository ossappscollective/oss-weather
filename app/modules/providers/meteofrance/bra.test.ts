import { readFileSync } from 'fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@nativescript/core', () => ({
    File: { fromPath: () => ({ readTextSync: () => readFileSync('app/assets/meteofrance/massifs.geojson', 'utf8') }) },
    knownFolders: { currentApp: () => ({ path: 'app' }) },
    path: { join: (...parts: string[]) => parts.join('/') }
}));
vi.mock('@nativescript/core/utils', () => ({ openFile: () => {} }));
vi.mock('@nativescript-community/ui-bottomsheet/svelte', () => ({}));
vi.mock('@nativescript-community/ui-popover/svelte', () => ({}));
vi.mock('@shared/utils/showError', () => ({}));
vi.mock('~/helpers/locale', () => ({}));
vi.mock('~/utils/ui', () => ({}));
vi.mock('./mf', () => ({ MFProvider: {} }));

import type { WeatherLocation } from '~/services/api';
import { braAction } from './bra';

const location = (lon: number, lat: number, timezone = 'Europe/Paris') => ({ coord: { lon, lat }, timezone }) as WeatherLocation;

describe('braAction.isAvailable', () => {
    it('is available in a massif', () => {
        expect(braAction.isAvailable(location(5.7245, 45.1885))).toBe(true);
    });

    it('is not available in France outside the massifs', () => {
        expect(braAction.isAvailable(location(2.35, 48.85))).toBe(false);
        expect(braAction.isAvailable(location(4.83, 45.76))).toBe(false);
    });

    it('is not available outside France', () => {
        expect(braAction.isAvailable(location(-0.12, 51.5, 'Europe/London'))).toBe(false);
    });
});
