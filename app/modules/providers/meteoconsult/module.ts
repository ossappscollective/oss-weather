import type { ModuleDefinition } from '~/modules/registry';
import { MeteoConsultProvider } from './meteoconsult';

export default {
    id: 'meteoconsult',
    category: 'providers',
    marine: MeteoConsultProvider
} satisfies ModuleDefinition;
