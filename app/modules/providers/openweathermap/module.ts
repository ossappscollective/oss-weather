import type { ModuleDefinition } from '~/modules/registry';
import { OWMProvider } from './owm';

export default {
    id: 'openweathermap',
    category: 'providers',
    order: { weather: 20 },
    weather: OWMProvider
} satisfies ModuleDefinition;
