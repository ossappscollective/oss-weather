import { beforeEach, describe, expect, it } from 'vitest';
import {
    LocationAction,
    ModuleDefinition,
    assertModulesPresent,
    findLocationAction,
    getCurrentIndicators,
    getDailySections,
    getLocationActions,
    getModuleSettings,
    getModules,
    getProviderClass,
    getProviderKeys,
    getWeatherOverlays,
    registerModule,
    resetModules,
    resolveProviderKey
} from './registry';

const stubClass = (): any => ({ getInstance: () => ({}) });

function provider(id: string, options: Partial<ModuleDefinition> = {}): ModuleDefinition {
    return { id, category: 'providers', ...options };
}

describe('module registry', () => {
    beforeEach(() => resetModules());

    it('lists the keys of the modules offering a kind, ordered by order then id', () => {
        registerModule(provider('zeta', { weather: stubClass() }));
        registerModule(provider('alpha', { weather: stubClass(), order: { weather: 20 } }));
        registerModule(provider('mid', { weather: stubClass(), order: { weather: 10 } }));
        registerModule(provider('aqi_only', { aqi: stubClass() }));
        expect(getProviderKeys('weather')).toEqual(['mid', 'alpha', 'zeta']);
        expect(getProviderKeys('aqi')).toEqual(['aqi_only']);
        expect(getProviderKeys('marine')).toEqual([]);
    });

    it('orders each kind on its own', () => {
        registerModule(provider('first_weather', { weather: stubClass(), aqi: stubClass(), order: { weather: 1, aqi: 2 } }));
        registerModule(provider('first_aqi', { weather: stubClass(), aqi: stubClass(), order: { weather: 2, aqi: 1 } }));
        expect(getProviderKeys('weather')).toEqual(['first_weather', 'first_aqi']);
        expect(getProviderKeys('aqi')).toEqual(['first_aqi', 'first_weather']);
    });

    it('returns the provider class of a key and kind', () => {
        const weather = stubClass();
        registerModule(provider('om', { weather }));
        expect(getProviderClass('weather', 'om')).toBe(weather);
        expect(getProviderClass('aqi', 'om')).toBeUndefined();
        expect(getProviderClass('weather', 'missing')).toBeUndefined();
    });

    it('rejects a duplicate module id', () => {
        registerModule(provider('om'));
        expect(() => registerModule(provider('om'))).toThrow(/om/);
    });

    it('keeps a registered key and falls back when the module was removed', () => {
        registerModule(provider('om', { weather: stubClass(), order: { weather: 1 } }));
        registerModule(provider('mf', { weather: stubClass(), order: { weather: 2 } }));
        expect(resolveProviderKey('weather', 'mf', 'om')).toBe('mf');
        expect(resolveProviderKey('weather', 'gone', 'om')).toBe('om');
        expect(resolveProviderKey('weather', undefined, 'om')).toBe('om');
    });

    it('falls back to the first provider when the fallback is removed too', () => {
        registerModule(provider('mf', { weather: stubClass() }));
        expect(resolveProviderKey('weather', 'gone', 'om')).toBe('mf');
        expect(resolveProviderKey('marine', 'gone', 'om')).toBeUndefined();
    });

    it('reports every required module that is missing', () => {
        registerModule(provider('om'));
        expect(() => assertModulesPresent(['om'])).not.toThrow();
        expect(() => assertModulesPresent(['om', 'core_a', 'core_b'])).toThrow(/core_a, core_b/);
    });

    describe('location actions', () => {
        const action = (id: string, available: boolean): LocationAction => ({ id, icon: 'mdi-x', nameKey: id, isAvailable: () => available, run: async () => {} });
        const location: any = { coord: { lat: 0, lon: 0 } };

        it('lists the available actions of every module', () => {
            registerModule(provider('a', { locationActions: [action('one', true), action('two', false)] }));
            registerModule(provider('b', { locationActions: [action('three', true)] }));
            registerModule(provider('c'));
            expect(getLocationActions(location).map((found) => found.id)).toEqual(['one', 'three']);
        });

        it('finds an action by id, available or not', () => {
            registerModule(provider('a', { locationActions: [action('one', false)] }));
            expect(findLocationAction('one')?.id).toBe('one');
            expect(findLocationAction('missing')).toBeUndefined();
        });
    });

    describe('feature contributions', () => {
        const feature = (id: string, options: Partial<ModuleDefinition> = {}): ModuleDefinition => ({ id, category: 'features', ...options });

        it('gathers the settings, overlays, daily sections and indicators of every module by id', () => {
            const overlay: any = { fetch: () => undefined, apply: () => {} };
            const component: any = () => Promise.resolve({ default: class {} });
            const indicator = { icon: 'mdi-x', isShown: () => true };
            registerModule(feature('b', { settings: () => [{ id: 'b_setting' }], weatherOverlay: overlay, dailySections: [{ id: 'b_section', component }], currentIndicators: [indicator] }));
            registerModule(feature('a', { settings: () => [{ id: 'a_setting' }] }));
            registerModule(provider('c'));
            expect(getModuleSettings().map((setting) => setting.id)).toEqual(['a_setting', 'b_setting']);
            expect(getWeatherOverlays()).toEqual([overlay]);
            expect(getDailySections().map((section) => section.id)).toEqual(['b_section']);
            expect(getCurrentIndicators()).toEqual([indicator]);
        });
    });

    it('lists the registered modules', () => {
        registerModule(provider('b'));
        registerModule(provider('a'));
        expect(getModules().map((definition) => definition.id)).toEqual(['a', 'b']);
    });
});
