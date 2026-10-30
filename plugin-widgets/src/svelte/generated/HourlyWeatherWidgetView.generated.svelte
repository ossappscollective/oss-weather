<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "HourlyWeatherWidget"
    import { Template } from '@nativescript-community/svelte-native/components';
    import { formatDate, l, lc } from '~/helpers/locale';
    import { titlecase } from '@nativescript-community/l';
    import { path } from '@nativescript/core';
    import { iconService, iconThemesFolder } from '~/services/icon';
    import { colors } from '~/variables';
    import WidgetChips from 'plugin-widgets/svelte/WidgetChips.svelte';
    import WidgetHourlyChart from 'plugin-widgets/svelte/WidgetHourlyChart.svelte';
    import type { WeatherWidgetData, WidgetConfig } from 'plugin-widgets/WidgetTypes';
</script>
<script lang="ts">
    export let config: WidgetConfig;
    export let data: WeatherWidgetData;
    export let size: { width: number; height: number };

    $: ({ colorOnSurface, colorSurfaceVariant } = $colors);
    $: widgetColor = config.settings.color === null ? colorOnSurface : config.settings.color;
</script>

<gridlayout width={size.width} height={size.height} {...$$restProps} class="widget-container">
    {#if size.height >= 160}
        <stacklayout paddingLeft={6} paddingRight={6} paddingTop={10} paddingBottom={10} orientation="vertical">
            <gridlayout paddingLeft={8} paddingRight={8} columns="*,auto,4,auto" rows="auto">
                <label text={data.locationName} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} col={0} verticalAlignment="center"></label>
                <label text={data.temperature} fontSize={13} maxLines={1} color={widgetColor} col={1} verticalAlignment="center"></label>
                <absolutelayout width={4} col={2} verticalAlignment="center"></absolutelayout>
                <label text={data.description} fontSize={12} maxLines={1} opacity={0.6} color={widgetColor} col={3} verticalAlignment="center"></label>
            </gridlayout>
                <gridlayout columns={(data.hourlyData?.slice(0, size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4) ?? []).map(() => '*').join(',')} rows="auto">
                    {#each (data.hourlyData?.slice(0, size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4) ?? []) as item, index}
                    <stacklayout orientation="vertical" col={index}>
                        <label text={item.hour} fontSize={12} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <image src={(typeof item.iconPath === 'string' && item.iconPath.startsWith('/') ? item.iconPath : iconService.getIconPath(item.iconPath, true, false, config.iconSet))} width={22} height={22} horizontalAlignment="center"></image>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <stacklayout orientation="horizontal" horizontalAlignment="center">
                            <image src={item.wind?.iconPath} width={11} height={11} visibility={(item.wind?.iconPath != null) ? 'visible' : 'collapsed'} verticalAlignment="center"></image>
                            <absolutelayout width={2} verticalAlignment="center"></absolutelayout>
                            <label text={item.wind?.value} fontSize={11} maxLines={1} color={widgetColor} verticalAlignment="center"></label>
                        </stacklayout>
                    </stacklayout>
                    {/each}
                </gridlayout>
            {#if size.height >= 300}
                <WidgetHourlyChart fontSize={13} height={100} hours={data.hourlyData} limit={size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4} color={widgetColor}></WidgetHourlyChart>
            {:else}
                <WidgetHourlyChart fontSize={13} height={Math.max((size.height - 110), 60)} hours={data.hourlyData} limit={size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4} color={widgetColor}></WidgetHourlyChart>
            {/if}
            <absolutelayout height={8}></absolutelayout>
            <stacklayout orientation="vertical">
                {#each (data.dailyData?.slice(0, size.height >= 475 ? 6 : size.height >= 432 ? 5 : size.height >= 389 ? 4 : size.height >= 346 ? 3 : size.height >= 303 ? 2 : size.height >= 300 ? 1 : 0) ?? []) as item, index}
                {#if size.width < 250}
                    <gridlayout paddingTop={3} paddingBottom={3} columns="auto,6,auto,4,*,auto" rows="auto">
                        <image src={(typeof item.iconPath === 'string' && item.iconPath.startsWith('/') ? item.iconPath : iconService.getIconPath(item.iconPath, true, false, config.iconSet))} width={22} height={22} col={0} verticalAlignment="center"></image>
                        <absolutelayout width={6} col={1} verticalAlignment="center"></absolutelayout>
                        <label text={item.day} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} col={2} verticalAlignment="center"></label>
                        <absolutelayout width={4} col={3} verticalAlignment="center"></absolutelayout>
                        <label text={item.date} fontSize={11} maxLines={1} opacity={0.6} color={widgetColor} col={4} verticalAlignment="center"></label>
                        <stacklayout orientation="horizontal" col={5} verticalAlignment="center">
                            <label text={item.temperatureLow} fontSize={13} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                            <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                            <label text={item.temperatureHigh} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                        </stacklayout>
                    </gridlayout>
                {:else}
                    <gridlayout paddingTop={4} paddingBottom={4} columns="auto,8,*,auto,5,auto,5,auto" rows="auto">
                        <image src={(typeof item.iconPath === 'string' && item.iconPath.startsWith('/') ? item.iconPath : iconService.getIconPath(item.iconPath, true, false, config.iconSet))} width={24} height={24} col={0} verticalAlignment="center"></image>
                        <absolutelayout width={8} col={1} verticalAlignment="center"></absolutelayout>
                        <stacklayout orientation="vertical" col={2} verticalAlignment="center">
                            <stacklayout orientation="horizontal">
                                <label text={item.day} fontSize={14} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                                <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                                <label text={item.date} fontSize={12} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                                <absolutelayout width={6} verticalAlignment="center"></absolutelayout>
                                {#if config.settings.showChips !== false}
                                    <WidgetChips fontSize={11} chips={item.chips} iconSize={12} chipSpacing={3} maxWidth={(size.width - 222)} limit={3} color={widgetColor} verticalAlignment="center"></WidgetChips>
                                {:else}
                                    <stacklayout orientation="vertical" verticalAlignment="center"></stacklayout>
                                {/if}
                            </stacklayout>
                            <label text={item.description} fontSize={12} maxLines={1} opacity={0.6} color={widgetColor}></label>
                        </stacklayout>
                        <label text={item.temperatureLow} fontSize={13} maxLines={1} opacity={0.6} color={widgetColor} col={3} verticalAlignment="center"></label>
                        <absolutelayout width={5} col={4} verticalAlignment="center"></absolutelayout>
                        <gridlayout width={30} height={3} rows="auto" col={5} verticalAlignment="center">
                            <stacklayout width={30} height={3} backgroundColor={colorSurfaceVariant} borderRadius={2} orientation="horizontal"></stacklayout>
                            <stacklayout height={3} orientation="horizontal">
                                <absolutelayout width={(item.rangeStart * 30)}></absolutelayout>
                                <stacklayout width={((item.rangeEnd - item.rangeStart) * 30)} height={3} backgroundColor="#EF9F27" borderRadius={2} orientation="horizontal"></stacklayout>
                            </stacklayout>
                        </gridlayout>
                        <absolutelayout width={5} col={6} verticalAlignment="center"></absolutelayout>
                        <label text={item.temperatureHigh} fontSize={14} maxLines={1} fontWeight="500" width={30} textAlignment="right" color={widgetColor} col={7} verticalAlignment="center"></label>
                    </gridlayout>
                {/if}
                {/each}
            </stacklayout>
        </stacklayout>
    {:else}
        <stacklayout paddingLeft={6} paddingRight={6} paddingTop={8} paddingBottom={8} orientation="vertical">
            <gridlayout paddingLeft={8} paddingRight={8} columns="*,auto,4,auto" rows="auto">
                <label text={data.locationName} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} col={0} verticalAlignment="center"></label>
                <label text={data.temperature} fontSize={13} maxLines={1} color={widgetColor} col={1} verticalAlignment="center"></label>
                <absolutelayout width={4} col={2} verticalAlignment="center"></absolutelayout>
                <label text={data.description} fontSize={12} maxLines={1} opacity={0.6} color={widgetColor} col={3} verticalAlignment="center"></label>
            </gridlayout>
                <gridlayout columns={(data.hourlyData?.slice(0, size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4) ?? []).map(() => '*').join(',')} rows="auto">
                    {#each (data.hourlyData?.slice(0, size.width >= 400 ? 7 : size.width >= 330 ? 6 : size.width >= 260 ? 5 : 4) ?? []) as item, index}
                    <stacklayout orientation="vertical" col={index}>
                        <label text={item.hour} fontSize={12} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <image src={(typeof item.iconPath === 'string' && item.iconPath.startsWith('/') ? item.iconPath : iconService.getIconPath(item.iconPath, true, false, config.iconSet))} width={22} height={22} horizontalAlignment="center"></image>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <label text={item.temperature} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                    </stacklayout>
                    {/each}
                </gridlayout>
        </stacklayout>
    {/if}
</gridlayout>
