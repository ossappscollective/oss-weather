import { readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';

// the service imports the NativeScript runtime: only the icon mapping functions are tested here
vi.mock('@nativescript/core', () => ({ ApplicationSettings: { getString: () => '', getBoolean: () => false, getNumber: () => 0 }, File: { fromPath: () => ({ readTextSync: () => '{}' }) }, Folder: { exists: () => false, fromPath: () => ({ getEntitiesSync: () => [] }) }, Observable: class {}, Utils: {}, knownFolders: { currentApp: () => ({ path: '' }) }, path: { join: (...parts: string[]) => parts.join('/') } }));
vi.mock('@shared/utils/svelte/ui', () => ({ createGlobalEventListener: () => () => {}, globalObservable: {} }));
vi.mock('~/helpers/constants', () => ({ ANIMATIONS_ENABLED: false, PROVIDER_PADDING: 0 }));
vi.mock('./preferences', () => ({ prefs: { on: () => {} } }));

import { buildIconMap, fillIconMap, resolveIconName } from './icon';
import { convertWeatherCodeToIcon } from './providers/omIcons';

const ICON_THEMES_FOLDER = join(__dirname, '../assets/icon_themes');

function iconMapForPack(pack: string) {
    return buildIconMap(readdirSync(join(ICON_THEMES_FOLDER, pack, 'images')), new Map<number, number>());
}

const PACKS = readdirSync(ICON_THEMES_FOLDER);

describe('resolveIconName', () => {
    it('resolves an id the pack has, with its day/night variant', () => {
        const mapIds = iconMapForPack('meteocons');
        expect(resolveIconName(800, true, mapIds)).toBe('800d');
        expect(resolveIconName(800, false, mapIds)).toBe('800n');
        expect(resolveIconName(701, true, mapIds)).toBe('701');
    });

    it('walks the mapping chain for an id the pack lacks', () => {
        expect(resolveIconName(804, true, iconMapForPack('weathericons'))).toBe('802d');
    });

    it('resolves 530, still present in cached data of older versions', () => {
        expect(resolveIconName(530, true, iconMapForPack('meteocons'))).toBe('520');
        expect(resolveIconName(530, true, iconMapForPack('weathericons'))).toBe('500d');
    });

    it('returns null for an unknown id', () => {
        expect(resolveIconName(9999, true, iconMapForPack('meteocons'))).toBeNull();
    });

    it.each(PACKS)('resolves every icon id OpenMeteo can produce (%s)', (pack) => {
        const mapIds = iconMapForPack(pack);
        // WMO codes as documented by OpenMeteo
        const iconIds = Array.from({ length: 100 }, (_, code) => convertWeatherCodeToIcon(code)).filter((iconId) => iconId !== undefined);
        const unresolved = iconIds.filter((iconId) => resolveIconName(iconId, true, mapIds) === null);
        expect(unresolved).toEqual([]);
    });
});

describe('fillIconMap', () => {
    it('fills the map from the folder file names when the folder exists', () => {
        const map = new Map<number, number>();
        fillIconMap('/pack/images', map, { exists: () => true, listNames: () => ['800d.png', '701.png'] });
        expect(map.get(800)).toBe(1);
        expect(map.get(701)).toBe(0);
    });

    it('leaves the map empty without listing a folder the pack does not ship', () => {
        const map = new Map<number, number>([[800, 1]]);
        const listNames = vi.fn(() => ['800d.png']);
        fillIconMap('/pack/lottie', map, { exists: () => false, listNames });
        expect(map.size).toBe(0);
        expect(listNames).not.toHaveBeenCalled();
    });
});
