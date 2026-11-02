import type { ProviderType } from '~/services/providers/weather';

export interface WidgetWeatherSource {
    provider?: ProviderType;
    model?: string;
}

// what the app shows for a location: the widget own choice first, then the provider and model saved on the location
export function widgetWeatherSource(config: WidgetWeatherSource, location: { provider?: ProviderType; omModel?: string } | null): WidgetWeatherSource {
    return { provider: config.provider ?? location?.provider, model: config.model ?? location?.omModel };
}

export function widgetSourceKey(coord: { lat: number; lon: number }, source: WidgetWeatherSource) {
    return `${coord.lat}_${coord.lon}_${source.provider}_${source.model}`;
}
