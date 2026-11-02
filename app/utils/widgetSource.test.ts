import { describe, expect, it } from 'vitest';
import { widgetSourceKey, widgetWeatherSource } from './widgetSource';

describe('widgetWeatherSource', () => {
    it('uses the provider and model saved on the location when the widget sets none', () => {
        expect(widgetWeatherSource({}, { provider: 'meteofrance', omModel: 'arome_france' })).toEqual({ provider: 'meteofrance', model: 'arome_france' });
    });

    it('lets the widget config win over the location', () => {
        expect(widgetWeatherSource({ provider: 'openmeteo', model: 'icon_eu' }, { provider: 'meteofrance', omModel: 'arome_france' })).toEqual({
            provider: 'openmeteo',
            model: 'icon_eu'
        });
    });

    it('treats the null sent by the native config as unset', () => {
        expect(widgetWeatherSource({ provider: null, model: null }, { provider: 'meteofrance' })).toEqual({ provider: 'meteofrance', model: undefined });
    });

    it('leaves both unset without a location', () => {
        expect(widgetWeatherSource({}, null)).toEqual({ provider: undefined, model: undefined });
    });
});

describe('widgetSourceKey', () => {
    it('is shared by widgets that resolve to the same fetch', () => {
        const source = { provider: 'meteofrance' as const, model: undefined };
        expect(widgetSourceKey({ lat: 45.18, lon: 5.72 }, source)).toBe(widgetSourceKey({ lat: 45.18, lon: 5.72 }, { ...source }));
    });

    it('differs per provider, model and position', () => {
        const base = widgetSourceKey({ lat: 45.18, lon: 5.72 }, { provider: 'meteofrance', model: undefined });
        expect(widgetSourceKey({ lat: 45.18, lon: 5.72 }, { provider: 'openmeteo', model: undefined })).not.toBe(base);
        expect(widgetSourceKey({ lat: 45.18, lon: 5.72 }, { provider: 'meteofrance', model: 'arome_france' })).not.toBe(base);
        expect(widgetSourceKey({ lat: 48.85, lon: 2.35 }, { provider: 'meteofrance', model: undefined })).not.toBe(base);
    });
});
