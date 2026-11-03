import { showBottomSheet } from '@nativescript-community/ui-bottomsheet/svelte';
import { closePopover } from '@nativescript-community/ui-popover/svelte';
import { File, knownFolders, path } from '@nativescript/core';
import { openFile } from '@nativescript/core/utils';
import { showError } from '@shared/utils/showError';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import PolygonLookup from 'polygon-lookup';
import { lc } from '~/helpers/locale';
import type { LocationAction } from '~/modules/registry';
import type { WeatherLocation } from '~/services/api';
import { hideLoading, showLoading, showToast } from '~/utils/ui';
import { MFProvider } from './mf';

const BRA_BOUNDS = [-4.855957, 41.310824, 9.645996, 51.124213];

/** mountain avalanche bulletins (BRA) exist for the French territory only */
function isBRALocation(location: Pick<WeatherLocation, 'coord' | 'timezone'>) {
    const { lat, lon } = location.coord;
    return location.timezone === 'Europe/Paris' && lon >= BRA_BOUNDS[0] && lon <= BRA_BOUNDS[2] && lat >= BRA_BOUNDS[1] && lat <= BRA_BOUNDS[3];
}

let franceGeoJSON: FeatureCollection<MultiPolygon>;
let franceGeoJSONLookup: PolygonLookup;

async function getFranceGeoJSON() {
    if (!franceGeoJSON) {
        franceGeoJSON = JSON.parse(await File.fromPath(path.join(knownFolders.currentApp().path, 'assets/meteofrance/massifs.geojson')).readText());
    }
    return franceGeoJSON;
}
async function getFranceGeoJSONLookup() {
    if (!franceGeoJSONLookup) {
        franceGeoJSONLookup = new PolygonLookup(await getFranceGeoJSON());
    }
    return franceGeoJSONLookup;
}

async function openBRA(massifId: string | number) {
    try {
        showLoading();
        const pdfFile = await MFProvider.getBRA(massifId);
        DEV_LOG && console.log('massifId', massifId, pdfFile.path);
        openFile(pdfFile.path);
    } finally {
        hideLoading();
    }
}

async function selectAndOpenBRA() {
    const geoJSON = await getFranceGeoJSON();
    const options = geoJSON.features
        .map((feature) => ({
            name: feature.properties.title as string,
            subtitle: `${feature.properties.Departemen} (${feature.properties.mountain})`,
            id: feature.properties.code
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    const OptionSelect = (await import('~/components/common/OptionSelect.svelte')).default;
    closePopover();
    const result = await showBottomSheet({
        parent: null,
        view: OptionSelect,
        peekHeight: 400,
        ignoreTopSafeArea: true,
        props: {
            options,
            rowHeight: 58,
            height: 400
        }
    });
    if (result) {
        await openBRA(result.id);
    }
}

export const braAction: LocationAction = {
    id: 'bra',
    icon: 'mdi-snowflake-alert',
    nameKey: 'bra',
    isAvailable: isBRALocation,
    async run(location) {
        try {
            const lookup = await getFranceGeoJSONLookup();
            const massifId = lookup.search(location.coord.lon, location.coord.lat)?.properties.code ?? -1;
            if (massifId !== -1) {
                await openBRA(massifId);
            } else {
                showToast(lc('failed_to_find_bra'));
            }
        } catch (error) {
            showError(error);
        }
    },
    runLongPress: selectAndOpenBRA
};
