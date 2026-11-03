import type { WeatherLocation } from '~/services/api';
import type { AirQualityProvider } from '~/services/providers/airqualityprovider';
import type { MarineWeatherProvider } from '~/services/providers/marineweatherprovider';
import type { WeatherProvider } from '~/services/providers/weatherprovider';

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
    isAvailable(location: WeatherLocation): boolean;
    run(location: WeatherLocation): Promise<void>;
    runLongPress?(): Promise<void>;
}

export interface ModuleDefinition {
    /** also the provider key of every kind the module offers */
    id: string;
    category: 'providers';
    /** position in the provider list of each kind, then by id */
    order?: Partial<Record<ProviderKind, number>>;
    weather?: ProviderClass<WeatherProvider>;
    aqi?: ProviderClass<AirQualityProvider>;
    marine?: ProviderClass<MarineWeatherProvider>;
    locationActions?: LocationAction[];
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
