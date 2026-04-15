import { ApplicationSettings } from '@nativescript/core';
import { createGlobalEventListener, globalObservable } from '@shared/utils/svelte/ui';
import { prefs } from '../preferences';
import { AirQualityProvider } from './airqualityprovider';
import { MFProvider } from './mf';
import { OMProvider, OpenMeteoModels } from './om';
import { OWMProvider } from './owm';
import { AccuWeatherAQIProvider, AccuWeatherProvider } from './accuweather';
import { AqiProviderType, ProviderType, WeatherData } from './weather';
import { GetWeatherOptions, WeatherProvider } from './weatherprovider';
import { AtmoProvider } from './atmo';
import { SETTINGS_PROVIDER, SETTINGS_PROVIDER_AQI } from '~/helpers/constants';
import { WeatherLocation } from '../api';

export enum Providers {
    MeteoFrance = 'meteofrance',
    OpenWeather = 'openweathermap',
    OpenMeteo = 'openmeteo',
    AccuWeather = 'accuweather'
}

export enum AirQualityProviders {
    OpenMeteo = 'openmeteo',
    Atmo = 'atmo',
    AccuWeather = 'accuweather'
}

export const providers = Object.values(Providers);
export const aqi_providers = Object.values(AirQualityProviders);

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
export function getProviderType(): ProviderType {
    const requestedProviderType: ProviderType = (ApplicationSettings.getString(SETTINGS_PROVIDER, DEFAULT_PROVIDER) || DEFAULT_PROVIDER) as ProviderType;
    return requestedProviderType;
}
export function getAqiProviderType(): AqiProviderType {
    const requestedProviderType: AqiProviderType = (ApplicationSettings.getString(SETTINGS_PROVIDER_AQI, DEFAULT_PROVIDER) || DEFAULT_PROVIDER) as AqiProviderType;
    return requestedProviderType;
}

interface ProvidersMap {
    [Providers.OpenWeather]: typeof OWMProvider;
    [Providers.MeteoFrance]: typeof MFProvider;
    [Providers.AccuWeather]: typeof AccuWeatherProvider;
    [Providers.OpenMeteo]: typeof OMProvider;
}
const ProvidersClassMap: ProvidersMap = {
    [Providers.OpenWeather]: OWMProvider,
    [Providers.MeteoFrance]: MFProvider,
    [Providers.AccuWeather]: AccuWeatherProvider,
    [Providers.OpenMeteo]: OMProvider
};

export type ProvidersClasses = ProvidersMap[keyof ProvidersMap]

export function getProviderForType(newType: ProviderType): WeatherProvider {
    return ProvidersClassMap[newType].getInstance();
}
export function getProviderClass(provider: ProviderType) {
    return ProvidersClassMap[provider];
}
export function getProviderSettins(provider: ProviderType): any[] {
    return getProviderClass(provider).getSettings();
}
export function providerRequiresApiKey(provider: ProviderType) {
    return getProviderClass(provider).requiresApiKey();
}
export function getAqiProviderForType(newType: AqiProviderType): AirQualityProvider {
    switch (newType) {
        case AirQualityProviders.Atmo:
            return AtmoProvider.getInstance();

        case AirQualityProviders.AccuWeather:
            return AccuWeatherAQIProvider.getInstance();

        case AirQualityProviders.OpenMeteo:
        default:
            return OMProvider.getInstance();
    }
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
/**
 * Generate cache key from provider, location, and options
 */
function getCacheKey(providerId: string, weatherLocation: WeatherLocation, options?: GetWeatherOptions & { ignoreCache?: boolean }): string {
    const { coord } = weatherLocation;
    const { ignoreCache, ...optionsForKey } = options;

    const optionsStr = options ? JSON.stringify(optionsForKey) : '';
    return `${WEATHER_CACHE_PREFIX}${providerId}_${coord.lat}_${coord.lon}_${optionsStr}`;
}

/**
 * Get cached weather data if valid
 */
export function getCachedWeather(providerId: string, weatherLocation: WeatherLocation, options?: GetWeatherOptions & { ignoreCache?: boolean }, maxAge = CACHE_EXPIRY_MS): WeatherData | null {
    try {
        if (options?.ignoreCache || !weatherLocation) {
            return null;
        }
        const cacheKey = getCacheKey(providerId, weatherLocation, options);
        const cachedJson = ApplicationSettings.getString(cacheKey);

        if (!cachedJson) {
            return null;
        }

        const cachedData: WeatherData = JSON.parse(cachedJson);

        // Check if cache is still valid (less than 1 minute old)
        const cacheAge = Date.now() - cachedData.time;
        // DEV_LOG && console.log('getCachedWeather', cacheKey, cacheAge, maxAge);
        if (maxAge > 0 && cacheAge > maxAge) {
            // Cache expired, remove it
            ApplicationSettings.remove(cacheKey);
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
function setCachedWeather(providerId: string, weatherLocation: WeatherLocation, data: WeatherData, options?: GetWeatherOptions): void {
    try {
        const cacheKey = getCacheKey(providerId, weatherLocation, options);
        ApplicationSettings.setString(cacheKey, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving weather cache:', error);
    }
}

/**
 * Clear cache for specific location and options
 */
export function clearWeatherCache(providerId: string, weatherLocation: WeatherLocation, options?: GetWeatherOptions): void {
    try {
        const cacheKey = getCacheKey(providerId, weatherLocation, options);
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

export async function getWeather(weatherLocation: WeatherLocation, options?: GetWeatherOptions & { ignoreCache?: boolean }, providerType?: ProviderType) {
    const provider = providerType ? getProviderForType(providerType) : getWeatherProvider();
    const providerId = provider.id;

    // Try to get from cache first
    const cachedData = getCachedWeather(providerId, weatherLocation, options);
    DEV_LOG && console.log('getWeather', providerId, weatherLocation.coord, weatherLocation.timezone, weatherLocation.timezoneOffset, !!cachedData);
    if (cachedData) {
        return cachedData;
    }

    // Fetch fresh data
    const data = await provider.getWeather(weatherLocation, options);

    // Save to cache
    setCachedWeather(providerId, weatherLocation, data, options);

    return data;
}
