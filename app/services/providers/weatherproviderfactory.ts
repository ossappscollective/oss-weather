import { ApplicationSettings } from '@nativescript/core';
import { createGlobalEventListener, globalObservable } from '@shared/utils/svelte/ui';
import { SETTINGS_PROVIDER, SETTINGS_PROVIDER_AQI, SETTINGS_PROVIDER_MARINE } from '~/helpers/constants';
import { getProviderClass as getRegisteredProviderClass, getProviderKeys, resolveProviderKey } from '~/modules/registry';
import { MarineWeatherProvider } from '~/services/providers/marineweatherprovider';
import { WeatherDataType, weatherDataIconColors } from '~/helpers/formatter';
import { fetchLatestMetar } from '~/services/metar';
import { WeatherProps, mergeWeatherData, weatherDataService } from '~/services/weatherData';
import { MetarReport, applyMetarToCurrently } from '~/utils/metar';
import { WeatherLocation } from '../api';
import { prefs } from '../preferences';
import { OMProvider } from './om';
import { AirQualityProvider } from './airqualityprovider';
import { AirQualityData, AqiProviderType, Currently, MarineProviderType, ProviderType, WeatherData } from './weather';
import { GetWeatherOptions, WeatherProvider } from './weatherprovider';

export function getWeatherProviderKeys() {
    return getProviderKeys('weather');
}
export function getAqiProviderKeys() {
    return getProviderKeys('aqi');
}
export function getMarineProviderKeys() {
    return getProviderKeys('marine');
}

let currentProvider: WeatherProvider;
let currentAirQualityProvider: AirQualityProvider;
prefs.on(`key:${SETTINGS_PROVIDER}`, () => {
    const provider = setWeatherProvider(getProviderType());
    globalObservable.notify({ eventName: SETTINGS_PROVIDER, data: provider });
});
prefs.on(`key:${SETTINGS_PROVIDER_AQI}`, () => {
    const provider = setAirQualityProvider(getAqiProviderType());
    globalObservable.notify({ eventName: SETTINGS_PROVIDER_AQI, data: provider });
});
export const onProviderChanged = createGlobalEventListener(SETTINGS_PROVIDER);
export const onAQIProviderChanged = createGlobalEventListener(SETTINGS_PROVIDER_AQI);

export function getWeatherProvider(provider?: ProviderType): WeatherProvider {
    if (provider) {
        return getProviderForType(provider);
    }
    if (!currentProvider) {
        setWeatherProvider(getProviderType());
    }
    return currentProvider;
}
export function getAqiProvider(provider?: AqiProviderType): AirQualityProvider {
    return getAqiProviderForType(provider || getAqiProviderType());
}
export function getMarineProvider(provider?: MarineProviderType): MarineWeatherProvider {
    return getMarineProviderForType(provider || getMarineProviderType());
}
export function getProviderType(): ProviderType {
    return resolveProviderKey('weather', ApplicationSettings.getString(SETTINGS_PROVIDER), DEFAULT_PROVIDER);
}
export function getAqiProviderType(): AqiProviderType {
    return resolveProviderKey('aqi', ApplicationSettings.getString(SETTINGS_PROVIDER_AQI), DEFAULT_PROVIDER);
}
export function getMarineProviderType(): MarineProviderType {
    const requestedProviderType = ApplicationSettings.getString(SETTINGS_PROVIDER_MARINE);
    return requestedProviderType ? getMarineProviderKeyOrUndefined(requestedProviderType) : undefined;
}

// no marine provider is the default: a removed module must not be replaced by another one
function getRegisteredMarineClass(key: MarineProviderType) {
    return getRegisteredProviderClass('marine', key);
}
function getMarineProviderKeyOrUndefined(key: MarineProviderType) {
    return getRegisteredMarineClass(key) ? key : undefined;
}

export function getProviderClass(provider: ProviderType) {
    return getRegisteredProviderClass('weather', resolveProviderKey('weather', provider, DEFAULT_PROVIDER));
}
export function getProviderForType(newType: ProviderType): WeatherProvider {
    return getProviderClass(newType).getInstance();
}
export function getProviderSettins(provider: ProviderType): any[] {
    return getProviderClass(provider).getSettings();
}
export function providerRequiresApiKey(provider: ProviderType) {
    return getProviderClass(provider).requiresApiKey();
}
export function getAqiProviderForType(newType: AqiProviderType): AirQualityProvider {
    return getRegisteredProviderClass('aqi', resolveProviderKey('aqi', newType, DEFAULT_PROVIDER)).getInstance();
}
export function getMarineProviderForType(newType: MarineProviderType): MarineWeatherProvider {
    return newType ? getRegisteredMarineClass(newType)?.getInstance() : undefined;
}

function setWeatherProvider(newType: ProviderType): WeatherProvider {
    currentProvider = getProviderForType(newType);
    return currentProvider;
}

function setAirQualityProvider(newType: AqiProviderType): AirQualityProvider {
    currentAirQualityProvider = getAqiProviderForType(newType);
    return currentAirQualityProvider;
}

const WEATHER_CACHE_PREFIX = 'weather_cache_';
const CACHE_EXPIRY_MS = 60000; // 1 minute

type WeatherType = 'main' | 'aqi' | 'marine';
/**
 * Generate cache key from provider, location, and options
 */
function getCacheKey(weatherType: WeatherType, providerId: string, weatherLocation: WeatherLocation, options: GetWeatherOptions & { ignoreCache?: boolean } = {}): string {
    const { coord } = weatherLocation;
    const { ignoreCache, ...optionsForKey } = options;

    const optionsStr = options ? JSON.stringify(optionsForKey) : '';
    const metarStr = weatherType === 'main' && weatherLocation.metarStation ? `_${weatherLocation.metarStation.icao}` : '';
    return `${WEATHER_CACHE_PREFIX}${weatherType === 'main' ? '' : `${weatherType}_`}${providerId}_${coord.lat}_${coord.lon}_${optionsStr}${metarStr}`;
}

/**
 * Get cached weather data if valid
 */
export function getCachedWeather(
    weatherType: WeatherType,
    providerId: string,
    weatherLocation: WeatherLocation,
    options?: GetWeatherOptions & { ignoreCache?: boolean },
    maxAge = CACHE_EXPIRY_MS
): WeatherData | null {
    try {
        if (options?.ignoreCache || !weatherLocation) {
            return null;
        }
        const cacheKey = getCacheKey(weatherType, providerId, weatherLocation, options);
        const cachedJson = ApplicationSettings.getString(cacheKey);

        if (!cachedJson) {
            return null;
        }

        const cachedData: WeatherData = JSON.parse(cachedJson);

        // Check if cache is still valid (less than 1 minute old)
        const cacheAge = Date.now() - cachedData.time;
        if (maxAge > 0 && cacheAge > maxAge) {
            // kept: the next fetch replaces it and it is still the fallback when that fetch fails
            return null;
        }

        return cachedData;
    } catch (error) {
        console.error('Error reading weather cache:', error);
        return null;
    }
}

/**
 * Save weather data to cache
 */
function setCachedWeather(weatherType: WeatherType, providerId: string, weatherLocation: WeatherLocation, data: Partial<WeatherData | AirQualityData>, options?: GetWeatherOptions): void {
    try {
        const cacheKey = getCacheKey(weatherType, providerId, weatherLocation, options);
        DEV_LOG && console.log('setCachedWeather', providerId, cacheKey);
        ApplicationSettings.setString(cacheKey, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving weather cache:', error);
    }
}

/**
 * Clear cache for specific location and options
 */
export function clearWeatherCache(weatherType: WeatherType, providerId: string, weatherLocation: WeatherLocation, options?: GetWeatherOptions): void {
    try {
        const cacheKey = getCacheKey(weatherType, providerId, weatherLocation, options);
        ApplicationSettings.remove(cacheKey);
    } catch (error) {
        console.error('Error clearing weather cache:', error);
    }
}

/**
 * Clear all weather caches
 */
export function clearAllWeatherCaches(): void {
    try {
        const allKeys = ApplicationSettings.getAllKeys();

        allKeys.forEach((key) => {
            if (key.startsWith(WEATHER_CACHE_PREFIX)) {
                ApplicationSettings.remove(key);
            }
        });
    } catch (error) {
        console.error('Error clearing all weather caches:', error);
    }
}

// a METAR problem must never fail the forecast: it is flagged on `currently` instead
function overlayMetar(currently: Currently, report: MetarReport | null, icao: string, weatherLocation: WeatherLocation) {
    try {
        const result = applyMetarToCurrently(currently, report, icao, Date.now(), OMProvider.getWeatherCodeDescription);
        return result.metar.failed ? result : weatherDataIconColors(result, WeatherDataType.CURRENT, weatherLocation.coord);
    } catch (error) {
        console.error('overlayMetar', error);
        return { ...currently, metar: { icao, failed: true } };
    }
}

export async function getWeather(weatherLocation: WeatherLocation, options?: GetWeatherOptions & { ignoreCache?: boolean }, providerType?: ProviderType) {
    const provider = providerType ? getProviderForType(providerType) : getWeatherProvider();
    const providerId = provider.id;

    // Try to get from cache first
    const cachedData = getCachedWeather('main', providerId, weatherLocation, options);
    // DEV_LOG && console.log('getWeather', providerId, weatherLocation.coord, weatherLocation.timezone, weatherLocation.timezoneOffset, !!cachedData);
    if (cachedData) {
        return cachedData;
    }

    // Fetch fresh data
    const station = weatherLocation.metarStation;
    const [data, report] = await Promise.all([provider.getWeather(weatherLocation, options), station ? fetchLatestMetar(station.icao).catch(() => null) : null]);
    if (station && data.currently) {
        data.currently = overlayMetar(data.currently, report, station.icao, weatherLocation);
    }
    // Save to cache
    setCachedWeather('main', providerId, weatherLocation, data, options);

    return data;
}
export async function getMarineWeather(providerType: MarineProviderType, weatherLocation: WeatherLocation, options?: GetWeatherOptions & { ignoreCache?: boolean }) {
    const provider = getMarineProviderForType(providerType);
    const providerId = provider.id;

    // Try to get from cache first
    const cachedData = getCachedWeather('marine', providerId, weatherLocation, options);
    // DEV_LOG && console.log('getMarineWeather', providerType, providerId, weatherLocation.coord, weatherLocation.timezone, weatherLocation.timezoneOffset, !!cachedData);
    if (cachedData) {
        return cachedData;
    }

    // Fetch fresh data
    const data = await provider.getMarineWeather(weatherLocation, options);
    // Save to cache
    setCachedWeather('marine', providerId, weatherLocation, data, options);

    return data;
}

export async function getAirQuality(providerType: AqiProviderType, weatherLocation: WeatherLocation, options?: GetWeatherOptions & { ignoreCache?: boolean }) {
    const provider = getAqiProviderForType(providerType);
    const providerId = provider.id;

    // Try to get from cache first
    const cachedData = getCachedWeather('aqi', providerId, weatherLocation, options);
    // DEV_LOG && console.log('getAirQuality', providerId, weatherLocation.coord, weatherLocation.timezone, weatherLocation.timezoneOffset, !!cachedData);
    if (cachedData) {
        return cachedData;
    }

    // Fetch fresh data
    const data = await provider.getAirQuality(weatherLocation, options);
    // Save to cache
    setCachedWeather('aqi', providerId, weatherLocation, data, options);

    return data;
}

export function getFullCachedWeather(provider: ProviderType, weatherLocation: WeatherLocation) {
    const weatherData: WeatherData = getCachedWeather('main', provider, weatherLocation, { model: weatherLocation?.omModel, ignoreCache: false }, 0);

    if (weatherData) {
        const usedWeatherData = weatherDataService.allWeatherData;
        const result = (
            usedWeatherData.indexOf(WeatherProps.aqi) !== -1 ? [getCachedWeather('aqi', getAqiProviderForType(weatherLocation.providerAqi).id, weatherLocation, { ignoreCache: false }, 0)] : []
        ).concat(weatherLocation.providerMarine ? [getCachedWeather('marine', getMarineProvider(weatherLocation.providerMarine).id, weatherLocation, { ignoreCache: false }, 0)] : []);
        const dataToMerge = result.filter((r) => !!r);
        // mergeWeatherData(weatherData, ...result.filter((r) => !!r));
        if (dataToMerge.length) {
            dataToMerge.forEach((r) => mergeWeatherData(weatherData, r));
        }
    }
    return weatherData;
}
