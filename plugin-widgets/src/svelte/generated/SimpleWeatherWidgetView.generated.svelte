<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "SimpleWeatherWidget"
    import { Template } from '@nativescript-community/svelte-native/components';
    import { formatDate, l, lc } from '~/helpers/locale';
    import { titlecase } from '@nativescript-community/l';
    import { path } from '@nativescript/core';
    import { iconService, iconThemesFolder } from '~/services/icon';
    import { colors } from '~/variables';
    import type { WeatherWidgetData, WidgetConfig } from 'plugin-widgets/WidgetTypes';
</script>
<script lang="ts">
    export let config: WidgetConfig;
    export let data: WeatherWidgetData;
    export let size: { width: number; height: number };

    $: iconSetFolderPath = path.join(iconThemesFolder, config.iconSet ?? iconService.iconSet);

    $: ({ colorOnSurface } = $colors);
    $: widgetColor = config.settings.color === null ? colorOnSurface : config.settings.color;
</script>

<gridlayout width={size.width} height={size.height} {...$$restProps} class="widget-container">
    {#if size.width < 120}
        <stacklayout padding={3} orientation="vertical">
            <stacklayout orientation="vertical" horizontalAlignment="center">
                <image src={`${iconSetFolderPath}/images/${data.iconPath}.png`} width={size.width * 0.44} height={size.width * 0.44} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} horizontalAlignment="center" verticalAlignment="center"></image>
                <label text={data.temperature} fontSize={size.width * 0.2} fontWeight="700" color={widgetColor} horizontalAlignment="center" verticalAlignment="center"></label>
            </stacklayout>
            <label text={data.locationName} fontSize={8} opacity={0.5} maxLines={1} color={widgetColor} horizontalAlignment="center"></label>
        </stacklayout>
    {:else}
        <gridlayout row="auto" paddingLeft={10} paddingRight={10} paddingTop={6} paddingBottom={6}>
            <label text={data.locationName} fontSize={12} opacity={0.5} horizontalAlignment="left" maxLines={1} color={widgetColor}></label>
            <gridlayout row="auto" columns="auto,*">
                    <label text={data.temperature} fontSize={Math.min(size.width * 0.26, 30)} fontWeight="700" color={widgetColor} horizontalAlignment="left" verticalAlignment="center" col={0}></label>
                    <image src={`${iconSetFolderPath}/images/${data.iconPath}.png`} width={64} height={64} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} horizontalAlignment="right" verticalAlignment="center" col={1}></image>
            </gridlayout>
                <label text={data.description} fontSize={12} opacity={0.5} textAlignment="right" color={widgetColor} row="auto" verticalAlignment="bottom" horizontalAlignment="right" visibility={(data.description != null) ? 'visible' : 'collapsed'}></label>
        </gridlayout>
    {/if}
</gridlayout>
