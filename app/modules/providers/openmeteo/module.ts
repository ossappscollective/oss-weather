import type { ModuleDefinition } from '~/modules/registry';
import { OMProvider } from './om';

export default {
    id: 'openmeteo',
    category: 'providers',
    order: { weather: 30, aqi: 10, marine: 10 },
    weather: OMProvider,
    aqi: OMProvider,
    marine: OMProvider
} satisfies ModuleDefinition;
