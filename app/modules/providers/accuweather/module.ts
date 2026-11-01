import type { ModuleDefinition } from '~/modules/registry';
import { AccuWeatherAQIProvider, AccuWeatherProvider } from './accuweather';

export default {
    id: 'accuweather',
    category: 'providers',
    order: { weather: 40, aqi: 30 },
    weather: AccuWeatherProvider,
    aqi: AccuWeatherAQIProvider
} satisfies ModuleDefinition;
