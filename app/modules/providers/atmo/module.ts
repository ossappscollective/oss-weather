import type { ModuleDefinition } from '~/modules/registry';
import { AtmoProvider } from './atmo';

export default {
    id: 'atmo',
    category: 'providers',
    order: { aqi: 20 },
    aqi: AtmoProvider
} satisfies ModuleDefinition;
