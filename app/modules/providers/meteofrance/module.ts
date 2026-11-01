import type { ModuleDefinition } from '~/modules/registry';
import { braAction } from './bra';
import { MFProvider } from './mf';

export default {
    id: 'meteofrance',
    category: 'providers',
    order: { weather: 10 },
    weather: MFProvider,
    locationActions: [braAction]
} satisfies ModuleDefinition;
