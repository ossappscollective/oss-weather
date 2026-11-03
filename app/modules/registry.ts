import type { WeatherLocation } from '~/services/api';
import type { AirQualityProvider } from '~/services/providers/airqualityprovider';
import type { MarineWeatherProvider } from '~/services/providers/marineweatherprovider';
import type { Currently, WeatherData } from '~/services/providers/weather';
import type { WeatherProvider } from '~/services/providers/weatherprovider';
import type { SvelteComponent } from 'svelte';

export type ProviderKind = 'weather' | 'aqi' | 'marine';

/** static side of a provider class */
export interface ProviderClass<T> {
    id: string;
    getInstance(): T;
    getSettings(): any[];
    getUrl(): string;
    requiresApiKey(): boolean;
    hasApiKey(): boolean;
    getApiKey(): string;
    getApiKeyDescription(): string;
    setApiKey(key: string): void;
}

/** an entry a module adds to the location menus */
export interface LocationAction {
    id: string;
    icon: string;
    nameKey: string;
    iconColor?: string;
    /** shown under the name, e.g. the current choice */
    subtitle?(location: WeatherLocation): string;
    isAvailable(location: WeatherLocation): boolean;
    /** resolves true when it changed the location: the caller saves it and refreshes the weather */
    run(location: WeatherLocation): Promise<boolean | void>;
    runLongPress?(): Promise<void>;
}

/** extra data fetched next to the forecast and merged into it */
export interface WeatherOverlay {
    /** undefined when the overlay does not apply to the location; a rejected fetch counts as no data */
    fetch(location: WeatherLocation): Promise<any> | undefined;
    apply(data: WeatherData, result: any, location: WeatherLocation): void;
    /** added to the cache key of the forecast, so a change of the overlay input does not hit the old cache */
    cacheKey?(location: WeatherLocation): string;
}

/** a section of the daily page, below the hourly charts; it draws its own card */
export interface DailySection {
    id: string;
    /** lazy: the component only loads when the page shows */
    component: () => Promise<{ default: new (options: any) => SvelteComponent<any> }>;
}

/** an icon the current conditions show when `isShown` */
export interface CurrentIndicator {
    icon: string;
    isShown(currently: Currently): boolean;
}

export interface ModuleDefinition {
    /** also the provider key of every kind the module offers */
    id: string;
    category: 'providers' | 'features';
    /** position in the provider list of each kind, then by id */
    order?: Partial<Record<ProviderKind, number>>;
    weather?: ProviderClass<WeatherProvider>;
    aqi?: ProviderClass<AirQualityProvider>;
    marine?: ProviderClass<MarineWeatherProvider>;
    locationActions?: LocationAction[];
    /** entries added to the settings list */
    settings?: () => any[];
    weatherOverlay?: WeatherOverlay;
    dailySections?: DailySection[];
    currentIndicators?: CurrentIndicator[];
}

const UNORDERED = 1000;
const modules = new Map<string, ModuleDefinition>();

export function registerModule(definition: ModuleDefinition) {
    if (modules.has(definition.id)) {
        throw new Error(`module "${definition.id}" is registered twice`);
    }
    modules.set(definition.id, definition);
}

export function resetModules() {
    modules.clear();
}

export function getModules(): ModuleDefinition[] {
    return [...modules.values()].sort((first, second) => first.id.localeCompare(second.id));
}

export function getProviderKeys(kind: ProviderKind): string[] {
    const order = (definition: ModuleDefinition) => definition.order?.[kind] ?? UNORDERED;
    return getModules()
        .filter((definition) => !!definition[kind])
        .sort((first, second) => order(first) - order(second) || first.id.localeCompare(second.id))
        .map((definition) => definition.id);
}

export function getProviderClass<K extends ProviderKind>(kind: K, key: string): ModuleDefinition[K] | undefined {
    return modules.get(key)?.[kind];
}

/** a key whose module was removed falls back to `fallback`, then to the first provider left */
export function resolveProviderKey(kind: ProviderKind, key: string | undefined, fallback: string): string | undefined {
    const keys = getProviderKeys(kind);
    return [key, fallback].find((candidate) => candidate && keys.includes(candidate)) ?? keys[0];
}

export function assertModulesPresent(ids: string[]) {
    const missing = ids.filter((id) => !modules.has(id));
    if (missing.length) {
        throw new Error(`required modules missing: ${missing.join(', ')}`);
    }
}

export function getLocationActions(location: WeatherLocation) {
    return getModules()
        .flatMap((definition) => definition.locationActions ?? [])
        .filter((action) => action.isAvailable(location));
}

export function findLocationAction(id: string) {
    return getModules()
        .flatMap((definition) => definition.locationActions ?? [])
        .find((action) => action.id === id);
}

export function getModuleSettings() {
    return getModules().flatMap((definition) => definition.settings?.() ?? []);
}

export function getWeatherOverlays() {
    return getModules().flatMap((definition) => definition.weatherOverlay ?? []);
}

export function getDailySections() {
    return getModules().flatMap((definition) => definition.dailySections ?? []);
}

export function getCurrentIndicators() {
    return getModules().flatMap((definition) => definition.currentIndicators ?? []);
}
