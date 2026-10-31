<script lang="ts">
    import { ObservableArray, TextField } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { closeModal } from '@nativescript-community/svelte-native';
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { lc } from '~/helpers/locale';
    import { searchStations } from '~/services/metar';
    import type { MetarStation } from '~/utils/metarStations';
    import { actionBarButtonHeight, windowInset } from '~/variables';
    import ListItemAutoSize from './common/ListItemAutoSize.svelte';

    export let hasStation = false;

    let textField: NativeViewElementNode<TextField>;
    let loading = false;
    let searchResults: ObservableArray<MetarStation> = new ObservableArray();

    async function search() {
        try {
            const query = textField?.nativeView.text;
            if (!query?.trim().length) {
                return;
            }
            loading = true;
            searchResults = new ObservableArray(await searchStations(query));
        } catch (err) {
            showError(err);
        } finally {
            loading = false;
        }
    }

    function getItem(station: MetarStation) {
        return { title: `${station.name} (${station.icao})`, subtitle: station.country };
    }
</script>

<page actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,auto,*">
        <CActionBar modalWindow title={lc('metar_station')}>
            <activityIndicator busy={loading} height={$actionBarButtonHeight} verticalAlignment="middle" visibility={loading ? 'visible' : 'collapse'} width={$actionBarButtonHeight} />
            {#if hasStation}
                <mdbutton class="actionBarButton" text="mdi-delete" variant="text" on:tap={() => closeModal(null)} />
            {/if}
        </CActionBar>
        <textfield bind:this={textField} floating="false" hint={lc('metar_station_hint')} returnKeyType="search" row={1} on:returnPress={search} />
        <collectionview items={searchResults} paddingBottom={$windowInset.bottom} row={2}>
            <Template let:item>
                <ListItemAutoSize disableCss={false} item={getItem(item)} on:tap={() => closeModal(item)} />
            </Template>
        </collectionview>
    </gridlayout>
</page>
