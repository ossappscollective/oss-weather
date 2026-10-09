<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "DailyWeatherWidget"
    import { Template } from '@nativescript-community/svelte-native/components';
    import { formatDate, l, lc } from '~/helpers/locale';
    import { titlecase } from '@nativescript-community/l';
    import { path } from '@nativescript/core';
    import { iconService, iconThemesFolder } from '~/services/icon';
    import { colors } from '~/variables';
    import WidgetChips from 'plugin-widgets/svelte/WidgetChips.svelte';
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
    {#if size.width >= 250 && size.height < 170}
        <stacklayout paddingLeft={12} paddingRight={12} paddingTop={10} paddingBottom={10} orientation="vertical">
            <gridlayout columns="*,auto,4,auto" rows="auto">
                <label text={data.locationName} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} col={0} verticalAlignment="center"></label>
                <label text={data.temperature} fontSize={13} maxLines={1} color={widgetColor} col={1} verticalAlignment="center"></label>
                <absolutelayout width={4} col={2} verticalAlignment="center"></absolutelayout>
                <label text={data.description} fontSize={12} maxLines={1} opacity={0.6} color={widgetColor} col={3} verticalAlignment="center"></label>
            </gridlayout>
                <gridlayout columns={(data.dailyData?.slice(0, size.width >= 340 ? 5 : 4) ?? []).map(() => '*').join(',')} rows="auto">
                    {#each (data.dailyData?.slice(0, size.width >= 340 ? 5 : 4) ?? []) as item, index}
                    <stacklayout orientation="vertical" col={index}>
                        <label text={item.day} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <image src={(item.iconPath?.startsWith('/') ? item.iconPath : iconService.getIconPath(item.iconPath, true, false, config.iconSet))} width={26} height={26} horizontalAlignment="center"></image>
                        <absolutelayout height={2} horizontalAlignment="center"></absolutelayout>
                        <stacklayout orientation="horizontal" horizontalAlignment="center">
                            <label text={item.temperatureLow} fontSize={13} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                            <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                            <label text={item.temperatureHigh} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                        </stacklayout>
                        <absolutelayout height={3} horizontalAlignment="center"></absolutelayout>
                        {#if config.settings.showChips !== false}
                            <WidgetChips fontSize={11} chips={item.precipChips} iconSize={11} maxWidth={((size.width - 24) / size.width >= 340 ? 5 : 4)} limit={1} color={widgetColor} horizontalAlignment="center"></WidgetChips>
                        {:else}
                            <stacklayout orientation="vertical" horizontalAlignment="center"></stacklayout>
                        {/if}
                    </stacklayout>
                    {/each}
                </gridlayout>
        </stacklayout>
    {:else}
        <stacklayout paddingLeft={14} paddingRight={14} paddingTop={10} paddingBottom={10} orientation="vertical">
            <gridlayout columns="*,auto,4,auto" rows="auto">
                <label text={data.locationName} fontSize={13} maxLines={1} fontWeight="500" color={widgetColor} col={0} verticalAlignment="center"></label>
                <label text={data.temperature} fontSize={13} maxLines={1} color={widgetColor} col={1} verticalAlignment="center"></label>
                <absolutelayout width={4} col={2} verticalAlignment="center"></absolutelayout>
                <label text={data.description} fontSize={12} maxLines={1} opacity={0.6} color={widgetColor} col={3} verticalAlignment="center"></label>
            </gridlayout>
            <stacklayout orientation="vertical">
                {#each (data.dailyData?.slice(0, size.height >= 394 ? 8 : size.height >= 351 ? 7 : size.height >= 308 ? 6 : size.height >= 265 ? 5 : size.height >= 222 ? 4 : size.height >= 179 ? 3 : 2) ?? []) as item, index}
                {#if size.width < 250}
                    <gridlayout paddingTop={3} paddingBottom={3} columns="auto,6,auto,4,*,auto" rows="auto">
                        <image src={(item.iconPath?.startsWith('/') ? item.iconPath : iconService.getIconPath(item.iconPath, true, false, config.iconSet))} width={22} height={22} col={0} verticalAlignment="center"></image>
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
                        <image src={(item.iconPath?.startsWith('/') ? item.iconPath : iconService.getIconPath(item.iconPath, true, false, config.iconSet))} width={24} height={24} col={0} verticalAlignment="center"></image>
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
    {/if}
</gridlayout>
