import { ApplicationSettings } from '@nativescript/core';
import { navigate } from '@shared/utils/svelte/ui';
import { lc } from '~/helpers/locale';
import type { ModuleDefinition } from '~/modules/registry';

const SETTINGS_METEOBLUE_ENABLED = 'meteoblue_enabled';
const METEOBLUE_ENABLED = false;

export default {
    id: 'meteoblue',
    category: 'features',
    settings: () => [
        {
            type: 'switch',
            id: SETTINGS_METEOBLUE_ENABLED,
            title: lc('meteoblue'),
            description: lc('meteoblue_enabled_desc'),
            value: ApplicationSettings.getBoolean(SETTINGS_METEOBLUE_ENABLED, METEOBLUE_ENABLED)
        }
    ],
    locationActions: [
        {
            id: 'meteo_blue',
            icon: 'mdi-chart-line',
            nameKey: 'meteoblue',
            isAvailable: () => ApplicationSettings.getBoolean(SETTINGS_METEOBLUE_ENABLED, METEOBLUE_ENABLED),
            async run(weatherLocation) {
                const MeteoBlue = (await import('./MeteoBlue.svelte')).default;
                navigate({ page: MeteoBlue, props: { weatherLocation } });
            }
        }
    ]
} satisfies ModuleDefinition;
