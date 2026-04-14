<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "HourlyWeatherWidget"
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

    $: ({ colorOnSurface } = $colors);
    $: widgetColor = config.settings.color === null ? colorOnSurface : config.settings.color;
</script>

<gridlayout width={size.width} height={size.height} {...$$restProps} class="widget-container">
    <stacklayout paddingLeft={Math.min(size.width * 0.05, 10)} paddingRight={Math.min(size.width * 0.05, 10)} paddingTop={Math.min(size.height * 0.07, 6)} paddingBottom={Math.min(size.height * 0.07, 6)} orientation="vertical">
        {#if size.height >= 80}
            <stacklayout orientation="vertical" horizontalAlignment="stretch" verticalAlignment="top">
                <label text={data.locationName} fontSize={12} opacity={0.5} textAlignment="left" maxLines={1} color={widgetColor} horizontalAlignment="left"></label>
                <absolutelayout height={2} horizontalAlignment="left"></absolutelayout>
            </stacklayout>
        {:else}

        {/if}
        <collectionview items={data.hourlyData?.slice(0, 8)} orientation="horizontal" colWidth="auto" horizontalAlignment="stretch" verticalAlignment="top">
            <Template let:item>
            <stacklayout width={56} paddingLeft={2} paddingRight={2} padding={size.height < 60 ? 0 : 2} orientation="vertical">
                <label text={item.time} fontSize={size.height < 60 ? 9 : 11} opacity={0.5} maxLines={1} color={widgetColor} horizontalAlignment="center" verticalAlignment="center"></label>
                <image src={iconService.getIconPath(item.iconPath, true, false, config.iconSet)} width={size.height < 60 ? 24 : size.height < 80 ? 28 : 32} height={size.height < 60 ? 24 : size.height < 80 ? 28 : 32} horizontalAlignment="center" verticalAlignment="center"></image>
                <label text={item.temperature} fontSize={size.height < 60 ? 12 : 14} fontWeight="700" maxLines={1} color={widgetColor} horizontalAlignment="center" verticalAlignment="center"></label>
                {#if size.height >= 60 && item.precipAccumulation != null}
                    <stacklayout orientation="vertical" horizontalAlignment="center" verticalAlignment="center">
                        <absolutelayout height={2}></absolutelayout>
                        <label text={item.precipAccumulation} fontSize={size.height < 80 ? 9 : 10} opacity={0.5} color={widgetColor}></label>
                    </stacklayout>
                {:else}

                {/if}
            </stacklayout>
            </Template>
        </collectionview>
    </stacklayout>
</gridlayout>
