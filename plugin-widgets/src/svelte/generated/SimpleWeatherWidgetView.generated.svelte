<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "SimpleWeatherWidget"
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
    {#if size.width < 110}
        <stacklayout orientation="vertical">
            <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={(Math.min((size.width * 0.5), Math.min((size.height * 0.4), 56)) * 1.3)} height={(Math.min((size.width * 0.5), Math.min((size.height * 0.4), 56)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} horizontalAlignment="center" verticalAlignment="center"></image>
            <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.24), Math.min((size.height * 0.2), 26)), 14)} maxLines={1} fontWeight="300" color={widgetColor} horizontalAlignment="center" verticalAlignment="center"></label>
            {#if size.height >= 110}
                <label text={data.locationName} fontSize={10} maxLines={1} opacity={0.6} color={widgetColor} horizontalAlignment="center" verticalAlignment="center"></label>
            {:else}
                <stacklayout orientation="vertical" horizontalAlignment="center" verticalAlignment="center"></stacklayout>
            {/if}
        </stacklayout>
    {:else}
        {#if size.height >= 250}
            <stacklayout padding={14} orientation="vertical">
                <gridlayout columns="*,auto" rows="auto">
                    <stacklayout orientation="vertical" col={0} verticalAlignment="top">
                        <label text={data.locationName} fontSize={Math.min((size.width * 0.08), Math.min((size.height * 0.05), 15))} maxLines={1} opacity={0.6} color={widgetColor}></label>
                        <label text={data.temperature} fontSize={Math.min((size.width * 0.25), Math.min((size.height * 0.16), 58))} maxLines={1} fontWeight="300" color={widgetColor}></label>
                        <label text={data.description} fontSize={Math.min((size.width * 0.08), Math.min((size.height * 0.05), 15))} maxLines={1} color={widgetColor}></label>
                        <stacklayout orientation="horizontal">
                            <label text={data.temperatureLow} fontSize={Math.min((size.width * 0.08), Math.min((size.height * 0.05), 15))} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                            <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                            <label text={data.temperatureHigh} fontSize={Math.min((size.width * 0.08), Math.min((size.height * 0.05), 15))} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                        </stacklayout>
                    </stacklayout>
                    <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={(Math.min((size.width * 0.3), Math.min((size.height * 0.22), 80)) * 1.3)} height={(Math.min((size.width * 0.3), Math.min((size.height * 0.22), 80)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={1} verticalAlignment="top"></image>
                </gridlayout>
                <absolutelayout height={8}></absolutelayout>
                {#if config.settings.showChips !== false}
                    <WidgetChips fontSize={Math.max(Math.min((size.width * 0.065), Math.min((size.height * 0.04), 13)), 11)} chips={data.chips} iconSize={Math.max(Math.min((size.width * 0.075), Math.min((size.height * 0.045), 15)), 12)} maxWidth={(size.width - 28)} maxRows={2} limit={6} color={widgetColor}></WidgetChips>
                {:else}
                    <stacklayout orientation="vertical"></stacklayout>
                {/if}
                <absolutelayout height={10}></absolutelayout>
                <stacklayout orientation="vertical">
                    {#each (data.dailyData?.slice(0, size.height >= 438 ? 6 : size.height >= 395 ? 5 : size.height >= 352 ? 4 : size.height >= 309 ? 3 : size.height >= 266 ? 2 : 1) ?? []) as item, index}
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
        {:else}
            {#if size.width >= 220}
                {#if size.height < 140}
                    <gridlayout paddingLeft={14} paddingRight={14} paddingTop={8} paddingBottom={8} columns="*,6,auto,8,auto" rows="auto">
                        <stacklayout orientation="vertical" col={0} verticalAlignment="center">
                            <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.13), Math.min((size.height * 0.36), 40)), 20)} maxLines={1} fontWeight="300" color={widgetColor}></label>
                            <gridlayout columns="*,6,auto" rows="auto">
                                <label text={data.description} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.13), 13)), 11)} maxLines={1} color={widgetColor} col={0} verticalAlignment="center"></label>
                                <absolutelayout width={6} col={1} verticalAlignment="center"></absolutelayout>
                                <stacklayout orientation="horizontal" col={2} verticalAlignment="center">
                                    <label text={data.temperatureLow} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.13), 13)), 11)} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                                    <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                                    <label text={data.temperatureHigh} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.13), 13)), 11)} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                                </stacklayout>
                            </gridlayout>
                        </stacklayout>
                        <absolutelayout width={6} col={1} verticalAlignment="center"></absolutelayout>
                        {#if config.settings.showChips !== false}
                            <WidgetChips fontSize={Math.max(Math.min((size.width * 0.035), Math.min((size.height * 0.11), 12)), 10)} chips={data.chips} iconSize={Math.max(Math.min((size.width * 0.04), Math.min((size.height * 0.13), 14)), 12)} maxWidth={(size.width * 0.4)} maxRows={2} limit={6} color={widgetColor} col={2} verticalAlignment="center"></WidgetChips>
                        {:else}
                            <stacklayout orientation="vertical" verticalAlignment="center"></stacklayout>
                        {/if}
                        <absolutelayout width={8} col={3} verticalAlignment="center"></absolutelayout>
                        <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={(Math.min((size.width * 0.15), Math.min((size.height * 0.5), 60)) * 1.3)} height={(Math.min((size.width * 0.15), Math.min((size.height * 0.5), 60)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={4} verticalAlignment="center"></image>
                    </gridlayout>
                {:else}
                    <gridlayout padding={12} rows="auto,6,auto,*,auto">
                        <gridlayout columns="*,auto" rows="auto" row={0}>
                            <stacklayout orientation="vertical" col={0} verticalAlignment="top">
                                <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.13), Math.min((size.height * 0.3), 44)), 22)} maxLines={1} fontWeight="300" color={widgetColor}></label>
                                <label text={data.description} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.1), 14)), 11)} maxLines={1} color={widgetColor}></label>
                                <stacklayout orientation="horizontal">
                                    <label text={data.temperatureLow} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.1), 14)), 11)} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                                    <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                                    <label text={data.temperatureHigh} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.1), 14)), 11)} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                                </stacklayout>
                            </stacklayout>
                            <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={(Math.min((size.width * 0.16), Math.min((size.height * 0.42), 72)) * 1.3)} height={(Math.min((size.width * 0.16), Math.min((size.height * 0.42), 72)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={1} verticalAlignment="top"></image>
                        </gridlayout>
                        <absolutelayout height={6} row={1}></absolutelayout>
                        {#if config.settings.showChips !== false}
                            <WidgetChips fontSize={Math.max(Math.min((size.width * 0.04), Math.min((size.height * 0.09), 12)), 10)} chips={data.chips} iconSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.1), 14)), 12)} maxWidth={(size.width - 24)} maxRows={size.height >= 170 ? 2 : 1} limit={6} color={widgetColor} row={2}></WidgetChips>
                        {:else}
                            <stacklayout orientation="vertical"></stacklayout>
                        {/if}
                        {#if size.height >= 150}
                            <label text={data.locationName} fontSize={Math.max(Math.min((size.width * 0.04), Math.min((size.height * 0.09), 11)), 10)} maxLines={1} opacity={0.6} color={widgetColor} row={4}></label>
                        {:else}
                            <stacklayout orientation="vertical"></stacklayout>
                        {/if}
                    </gridlayout>
                {/if}
            {:else}
                <gridlayout padding={12} rows="auto,6,auto,*,auto">
                    <gridlayout columns="*,auto" rows="auto" row={0}>
                        <stacklayout orientation="vertical" col={0} verticalAlignment="top">
                            <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.24), Math.min((size.height * 0.26), 44)), 22)} maxLines={1} fontWeight="300" color={widgetColor}></label>
                            <label text={data.description} fontSize={Math.max(Math.min((size.width * 0.075), Math.min((size.height * 0.075), 13)), 11)} maxLines={1} color={widgetColor}></label>
                            <stacklayout orientation="horizontal">
                                <label text={data.temperatureLow} fontSize={Math.max(Math.min((size.width * 0.075), Math.min((size.height * 0.075), 13)), 11)} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                                <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                                <label text={data.temperatureHigh} fontSize={Math.max(Math.min((size.width * 0.075), Math.min((size.height * 0.075), 13)), 11)} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                            </stacklayout>
                        </stacklayout>
                        <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={(Math.min((size.width * 0.28), Math.min((size.height * 0.4), 56)) * 1.3)} height={(Math.min((size.width * 0.28), Math.min((size.height * 0.4), 56)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={1} verticalAlignment="top"></image>
                    </gridlayout>
                    <absolutelayout height={6} row={1}></absolutelayout>
                    {#if size.height >= 140}
                        {#if config.settings.showChips !== false}
                            <WidgetChips fontSize={Math.max(Math.min((size.width * 0.065), Math.min((size.height * 0.065), 12)), 10)} chips={data.chips} iconSize={Math.max(Math.min((size.width * 0.075), Math.min((size.height * 0.075), 14)), 12)} maxWidth={(size.width - 24)} maxRows={size.height >= 170 ? 2 : 1} limit={6} color={widgetColor} row={2}></WidgetChips>
                        {:else}
                            <stacklayout orientation="vertical"></stacklayout>
                        {/if}
                    {:else}
                        <stacklayout orientation="vertical"></stacklayout>
                    {/if}
                    {#if size.height >= 170}
                        <label text={data.locationName} fontSize={Math.max(Math.min((size.width * 0.065), Math.min((size.height * 0.065), 11)), 10)} maxLines={1} opacity={0.6} color={widgetColor} row={4}></label>
                    {:else}
                        <stacklayout orientation="vertical"></stacklayout>
                    {/if}
                </gridlayout>
            {/if}
        {/if}
    {/if}
</gridlayout>
