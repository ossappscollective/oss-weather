import { showModal } from '@shared/utils/svelte/ui';
import { WeatherDataType, weatherDataIconColors } from '~/helpers/formatter';
import { lc } from '~/helpers/locale';
import type { ModuleDefinition } from '~/modules/registry';
import { OMProvider } from '~/modules/providers/openmeteo/om';
import type { WeatherLocation } from '~/services/api';
import type { Currently } from '~/services/providers/weather';
import { MetarReport, applyMetarToCurrently, isMetarIndicatorShown } from './report';
import { MetarStation, fetchLatestMetar, searchStations } from './metar';

// a METAR problem must never fail the forecast: it is flagged on `currently` instead
function overlayMetar(currently: Currently, report: MetarReport | null, icao: string, weatherLocation: WeatherLocation) {
    try {
        const result = applyMetarToCurrently(currently, report, icao, Date.now(), OMProvider.getWeatherCodeDescription);
        return result.metar.failed ? result : weatherDataIconColors(result, WeatherDataType.CURRENT, weatherLocation.coord);
    } catch (error) {
        console.error('overlayMetar', error);
        return { ...currently, metar: { icao, failed: true } };
    }
}

export default {
    id: 'metar',
    category: 'features',
    weatherOverlay: {
        fetch: (location) => (location.metarStation ? fetchLatestMetar(location.metarStation.icao) : undefined),
        apply(data, report, location) {
            if (data.currently) {
                data.currently = overlayMetar(data.currently, report, location.metarStation.icao, location);
            }
        },
        cacheKey: (location) => (location.metarStation ? `_${location.metarStation.icao}` : '')
    },
    dailySections: [{ id: 'metar', component: () => import('~/modules/features/metar/MetarSection.svelte') }],
    currentIndicators: [{ icon: 'mdi-radio-tower', isShown: (currently) => isMetarIndicatorShown(currently.metar) }],
    locationActions: [
        {
            id: 'metar_station',
            icon: 'mdi-airplane',
            iconColor: '#378ADD',
            nameKey: 'metar_station',
            subtitle: (location) => (location.metarStation ? `${location.metarStation.name} (${location.metarStation.icao})` : lc('metar_station_none')),
            isAvailable: () => true,
            async run(location) {
                const SelectCity = (await import('~/components/SelectCity.svelte')).default;
                const station = await showModal<MetarStation | null, any>({
                    page: SelectCity,
                    animated: true,
                    fullscreen: true,
                    props: {
                        title: lc('metar_station'),
                        hint: lc('metar_station_hint'),
                        search: searchStations,
                        getInfo: (item: MetarStation) => ({ title: `${item.name} (${item.icao})`, lines: [item.country].filter((text) => !!text) }),
                        icon: 'mdi-airplane',
                        showFavorite: false,
                        clearable: !!location.metarStation
                    }
                });
                // undefined is a cancel, null removes the station
                if (station === undefined) {
                    return false;
                }
                location.metarStation = station ?? undefined;
                return true;
            }
        }
    ]
} satisfies ModuleDefinition;
