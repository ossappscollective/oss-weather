<script context="module" lang="ts">
    import { AWebView } from '@nativescript-community/ui-webview';
    import { ApplicationSettings } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { closeModal } from '@shared/utils/svelte/ui';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { lang, lc } from '~/helpers/locale';
    import { currentTheme, onThemeChanged } from '~/helpers/theme';
    import { networkService } from '~/services/api';
    import { openLink } from '~/utils/ui';
    import { windowInset } from '~/variables';
    import { SETTINGS_WEATHER_MAP_CUSTOM_TILE_SOURCE } from '~/services/providers/maptiler';
</script>

<script lang="ts">
    export let focusPos: { lat: number; lon: number } = { lat: 45, lon: 5 };
    let webView: NativeViewElementNode<AWebView>;
    let url = '~/assets/map/index.html';
    let zoom = 8;
    const customSource = ApplicationSettings.getString(SETTINGS_WEATHER_MAP_CUSTOM_TILE_SOURCE, undefined);
    let mapCenter = focusPos;
    let animated = false;

    function updateUrl() {
        url = `~/assets/map/index.html?zoom=${zoom}&mapCenter=${mapCenter.lat},${mapCenter.lon}&lang=${lang}&hideAttribution=${networkService.devMode}&useToPickLocation=1&dark=${$currentTheme}${customSource ? `&source=${encodeURIComponent(customSource)}` : ''}`;
    }

    onThemeChanged(updateUrl);

    updateUrl();
    const consoleEnabled = !PRODUCTION;

    function callJSFunction<T>(method: string, ...args) {
        // DEV_LOG && console.log('callJSFunction', method, `${method}(${args ? args.map((s) => (typeof s === 'string' ? `"${s}"` : s)).join(',') : ''})`);
        const nView = webView?.nativeView;
        if (!nView) {
            return;
        }
        try {
            return nView.executeJavaScript<T>(`${method}(${args ? args.map((s) => (typeof s === 'string' ? `"${s}"` : s)).join(',') : ''})`);
        } catch (err) {
            showError(err);
        }
    }

    async function saveCurrentMapParameters() {
        if (webView?.nativeView) {
            const parameters = await callJSFunction<any>('getParameters');
            zoom = parameters.zoom;
            mapCenter = { lat: parameters.mapCenter.lat, lon: parameters.mapCenter.lng };
            animated = parameters.animated;
            // { zoom } = JSON.parse(parameters);
        }
    }

    function shouldOverrideUrlLoading(e: { cancel; url }) {
        if (/http(s):\/\//.test(e.url)) {
            e.cancel = true;
            openLink(e.url);
        }
    }

    let selectedLocation;
    function onPositionChanged(event) {
        selectedLocation = event.data;
    }

    function confirmLocation() {
        if (selectedLocation) {
            closeModal({
                lat: selectedLocation.lat,
                lon: selectedLocation.lng
            });
        }
    }
</script>

<page actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,*" android:paddingBottom={$windowInset.bottom}>
        <CActionBar modalWindow title={lc('select_location')}></CActionBar>
        <awebview
            bind:this={webView}
            debugMode={consoleEnabled}
            displayZoomControls={false}
            normalizeUrls={false}
            row={1}
            src={url}
            webConsoleEnabled={consoleEnabled}
            on:shouldOverrideUrlLoading={shouldOverrideUrlLoading}
            on:position={onPositionChanged} />

        <mdbutton marginBottom={30} row={1} text={lc('select_location')} verticalAlignment="bottom" visibility={selectedLocation ? 'visible' : 'hidden'} on:tap={confirmLocation} />
    </gridlayout>
</page>
