<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "HourlyWeatherWidget"
    import { Template } from '@nativescript-community/svelte-native/components';
    import { formatDate, l, lc } from '~/helpers/locale';
    import { titlecase } from '@nativescript-community/l';
    import { path } from '@nativescript/core';
    import { iconService, iconThemesFolder } from '~/services/icon';
    import { colors } from '~/variables';
    import WidgetHourlyChart from 'plugin-widgets/svelte/WidgetHourlyChart.svelte';
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
    {#if size.height >= 160}
        <stacklayout paddingLeft={6} paddingRight={6} paddingTop={10} paddingBottom={10} orientation="vertical">
            <gridlayout row="auto" paddingLeft={8} paddingRight={8} columns="*,auto,4,auto">
                <label text={data.locationName} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} col={0} verticalAlignment="center"></label>
                <label text={data.temperature} fontSize={13} maxLines={1} color={widgetColor} col={1} verticalAlignment="center"></label>
                <absolutelayout width={4} col={2} verticalAlignment="center"></absolutelayout>
                <label text={data.description} fontSize={12} maxLines={1} opacity={0.6} color={widgetColor} col={3} verticalAlignment="center"></label>
            </gridlayout>
                <collectionview items={data.hourlyData?.slice(0, size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4)}>
                    <Template let:item>
                    <stacklayout orientation="vertical">
                        <label text={item.hour} fontSize={12} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <image src={iconService.getIconPath(item.iconPath, true, false, config.iconSet)} width={22} height={22} horizontalAlignment="center"></image>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <stacklayout orientation="horizontal" horizontalAlignment="center">
                            <image src={item.wind.iconPath} width={11} height={11} visibility={(item.wind.iconPath != null) ? 'visible' : 'collapsed'} verticalAlignment="center"></image>
                            <absolutelayout width={2} verticalAlignment="center"></absolutelayout>
                            <label text={item.wind.value} fontSize={11} maxLines={1} color={widgetColor} verticalAlignment="center"></label>
                        </stacklayout>
                    </stacklayout>
                    </Template>
                </collectionview>
            <WidgetHourlyChart fontSize={13} height={Math.max(size.height - 96, 60)} hours={data.hourlyData} limit={size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4} color={widgetColor}></WidgetHourlyChart>
        </stacklayout>
    {:else}
        <stacklayout paddingLeft={6} paddingRight={6} paddingTop={8} paddingBottom={8} orientation="vertical">
            <gridlayout row="auto" paddingLeft={8} paddingRight={8} columns="*,auto,4,auto">
                <label text={data.locationName} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} col={0} verticalAlignment="center"></label>
                <label text={data.temperature} fontSize={13} maxLines={1} color={widgetColor} col={1} verticalAlignment="center"></label>
                <absolutelayout width={4} col={2} verticalAlignment="center"></absolutelayout>
                <label text={data.description} fontSize={12} maxLines={1} opacity={0.6} color={widgetColor} col={3} verticalAlignment="center"></label>
            </gridlayout>
                <collectionview items={data.hourlyData?.slice(0, size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4)}>
                    <Template let:item>
                    <stacklayout orientation="vertical">
                        <label text={item.hour} fontSize={12} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <image src={iconService.getIconPath(item.iconPath, true, false, config.iconSet)} width={22} height={22} horizontalAlignment="center"></image>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <label text={item.temperature} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                    </stacklayout>
                    </Template>
                </collectionview>
        </stacklayout>
    {/if}
</gridlayout>
