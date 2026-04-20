import { ApplicationSettings, Observable, ObservableArray } from '@nativescript/core';
import { WeatherLocation, getTimezone } from '~/services/api';
import { prefs } from '~/services/preferences';
import { colors } from '~/variables';
import { get } from 'svelte/store';
import { globalObservable } from '@shared/utils/svelte/ui';
import PolygonLookup from 'polygon-lookup';
import { AqiProviderType, MarineProviderType, ProviderType } from '~/services/providers/weather';
import { SETTINGS_FAVORITES } from './constants';
import { OpenMeteoModels } from '~/services/providers/om';
import { confirm } from '@nativescript-community/ui-material-dialogs';
import { l, lc } from '@nativescript-community/l';

export const EVENT_FAVORITE = 'favorite';

export interface FavoriteLocation extends WeatherLocation {
    isFavorite?: boolean;
    startingSide?: string;
}

let timezoneLookUp: PolygonLookup;
export async function queryTimezone(location: FavoriteLocation, force = false) {
    let timezone = location.timezone;
    if (!timezone) {
        if (!timezoneLookUp) {
            timezoneLookUp = new PolygonLookup(require('~/timezone/timezonedb.json'));
        }
        const result = timezoneLookUp.search(location.coord.lon, location.coord.lat);
        timezone = result?.properties.tzid;
    }
    if (timezone) {
        if (__ANDROID__) {
            const nTimezone = java.util.TimeZone.getTimeZone(timezone);
            return {
                timezone,
                timezoneOffset: nTimezone.getOffset(Date.now()) / 3600000
            };
        } else {
            return {
                timezone,
                timezoneOffset: NSTimeZone.alloc().initWithName(timezone).secondsFromGMTForDate(new Date()) / 3600
            };
        }
    } else {
        return getTimezone(location);
    }
}
export const favorites: ObservableArray<WeatherLocation> = new ObservableArray(JSON.parse(ApplicationSettings.getString(SETTINGS_FAVORITES, '[]')).map((i) => ({ ...i, isFavorite: true })));
let updateOnSettingChanged = true;
favorites.on('change', (e) => {
    // DEV_LOG && console.log('on favorites changed1');
    ApplicationSettings.setString(SETTINGS_FAVORITES, JSON.stringify(favorites));
});
let favoritesKeys = favorites.map((f) => `${f.coord.lat};${f.coord.lon}`);
if (favorites.length) {
    const needsSaving = !favorites.getItem(0).timezone;
    Promise.all(
        favorites.map((f, index) =>
            queryTimezone(f).then((timezonData) => {
                Object.assign(f, timezonData);
                favorites.setItem(index, f);
            })
        )
    ).then(() => needsSaving && ApplicationSettings.setString(SETTINGS_FAVORITES, JSON.stringify(favorites)));
}

prefs.on(`key:${SETTINGS_FAVORITES}`, () => {
    if (!updateOnSettingChanged) {
        updateOnSettingChanged = true;
        return;
    }
    favorites.splice(0, favorites.length, ...JSON.parse(ApplicationSettings.getString(SETTINGS_FAVORITES, '[]')));
    favoritesKeys = favorites.map((f) => `${f.coord.lat};${f.coord.lon}`);
});

export function isFavorite(item: WeatherLocation) {
    if (item) {
        const key = getFavoriteKey(item);
        return favoritesKeys.indexOf(key) !== -1;
    }
    return false;
}
export function favoriteIconColor(item: FavoriteLocation) {
    if (item) {
        return item.isFavorite ? '#EFB644' : get(colors).colorOnSurfaceVariant;
    }
}
export function saveFavorite(item: FavoriteLocation) {}

export function favoriteIcon(item: FavoriteLocation) {
    if (item) {
        return item.isFavorite ? 'mdi-star' : 'mdi-star-outline';
    }
}

export function getFavoriteKey(item: WeatherLocation) {
    if (item) {
        // DEV_LOG && console.log('getFavoriteKey', `${item.coord.lat};${item.coord.lon}`);
        return `${item.coord.lat};${item.coord.lon}`;
    }
}

export async function setFavoriteProvider(item: FavoriteLocation, provider: ProviderType) {
    const key = getFavoriteKey(item);
    const index = favoritesKeys.indexOf(key);
    if (index !== -1) {
        item.provider = provider;
        updateOnSettingChanged = false;
        favorites.setItem(index, item);
        globalObservable.notify({ eventName: EVENT_FAVORITE, data: item });
    }
}

export async function setFavoriteOMProviderModel(item: FavoriteLocation, model: OpenMeteoModels) {
    const key = getFavoriteKey(item);
    const index = favoritesKeys.indexOf(key);
    if (index !== -1) {
        item.omModel = model;
        updateOnSettingChanged = false;
        favorites.setItem(index, item);
        globalObservable.notify({ eventName: EVENT_FAVORITE, data: item });
    }
}
export async function renameFavorite(item: FavoriteLocation, name: string) {
    const key = getFavoriteKey(item);
    const index = favoritesKeys.indexOf(key);
    if (index !== -1) {
        item.name = name;
        updateOnSettingChanged = false;
        favorites.setItem(index, item);
        globalObservable.notify({ eventName: EVENT_FAVORITE, data: item, needsWeatherRefresh: false });
    }
}
export async function setFavoriteAqiProvider(item: FavoriteLocation, provider: AqiProviderType) {
    const key = getFavoriteKey(item);
    const index = favoritesKeys.indexOf(key);
    if (index !== -1) {
        item.providerAqi = provider;
        updateOnSettingChanged = false;
        favorites.setItem(index, item);
        globalObservable.notify({ eventName: EVENT_FAVORITE, data: item });
    }
}
export async function setFavoriteMarineProvider(item: FavoriteLocation, provider: MarineProviderType) {
    const key = getFavoriteKey(item);
    const index = favoritesKeys.indexOf(key);
    if (index !== -1) {
        item.providerMarine = provider;
        updateOnSettingChanged = false;
        favorites.setItem(index, item);
        globalObservable.notify({ eventName: EVENT_FAVORITE, data: item });
    }
}
export async function toggleFavorite(item: FavoriteLocation, needsConfirmation = false) {
    if (isFavorite(item)) {
        if (needsConfirmation) {
            const result = await confirm({
                title: lc('remove_favorite'),
                okButtonText: lc('remove'),
                cancelButtonText: lc('cancel')
            });
            if (!result) {
                return;
            }
        }
        const key = getFavoriteKey(item);
        item.isFavorite = false;
        const index = favoritesKeys.indexOf(key);
        if (index !== -1) {
            updateOnSettingChanged = false;
            favoritesKeys.splice(index, 1);
            favorites.splice(index, 1);
        }
    } else {
        try {
            const timezonData = await queryTimezone(item);
            if (timezonData) {
                Object.assign(item, timezonData);
            }
        } catch (error) {}
        // }
        item.isFavorite = true;
        delete item.startingSide;
        updateOnSettingChanged = true;
        favoritesKeys.push(getFavoriteKey(item));
        favorites.push(item);
    }
    delete item.startingSide; //for swipemenu
    globalObservable.notify({ eventName: EVENT_FAVORITE, data: item });
    return item;
}

export async function duplicateFavorite(item: FavoriteLocation) {
    const { isFavorite, startingSide, ...toSave } = item;
    const newItem = JSON.parse(JSON.stringify(toSave));
    // this is a trick to duplicate while keeping a unique key
    newItem.coord.lat += 0.00000001;
    try {
        const timezonData = await queryTimezone(newItem);
        if (timezonData) {
            Object.assign(newItem, timezonData);
        }
    } catch (error) {}
    newItem.isFavorite = true;
    updateOnSettingChanged = true;
    favoritesKeys.push(getFavoriteKey(newItem));
    favorites.push(newItem);
    globalObservable.notify({ eventName: EVENT_FAVORITE, data: newItem });
}
