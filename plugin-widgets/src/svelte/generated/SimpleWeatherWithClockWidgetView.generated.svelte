<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "SimpleWeatherWithClockWidget"
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
    $: widgetColor = config.settings.color != null ? config.settings.color : colorOnSurface;

    function nowTime() {
        return formatDate(new Date(), 'LT');
    }
</script>

<gridlayout width={size.width} height={size.height} {...$$restProps} class="widget-container">
    {#if size.height < 70}
        <gridlayout paddingLeft={12} paddingRight={12} columns="auto,*,auto,4,auto" rows="auto">
            <label fontSize={Math.max(Math.min(((size.width - 110) / 4.1), Math.min((size.height * 0.55), 34)), 9)} fontWeight={config.settings?.clockBold === true ? "700" : "300"} maxLines={1} color={widgetColor} text={nowTime()} col={0} verticalAlignment="center"></label>
            <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={Math.min((size.height * 0.5), 28)} height={Math.min((size.height * 0.5), 28)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={2} verticalAlignment="center"></image>
            <absolutelayout width={4} col={3} verticalAlignment="center"></absolutelayout>
            <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.12), Math.min((size.height * 0.35), 20)), 13)} maxLines={1} fontWeight="500" color={widgetColor} col={4} verticalAlignment="center"></label>
        </gridlayout>
    {:else}
        {#if size.width < 110}
            <stacklayout orientation="vertical">
                <label fontSize={Math.max(Math.min(((size.width - 8) / 4.1), Math.min((size.height * 0.3), 30)), 9)} fontWeight={config.settings?.clockBold === true ? "700" : "300"} maxLines={1} color={widgetColor} text={nowTime()} horizontalAlignment="center" verticalAlignment="center"></label>
                <stacklayout orientation="horizontal" horizontalAlignment="center" verticalAlignment="center">
                    <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={Math.min((size.width * 0.22), (size.height * 0.3))} height={Math.min((size.width * 0.22), (size.height * 0.3))} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} verticalAlignment="center"></image>
                    <absolutelayout width={3} verticalAlignment="center"></absolutelayout>
                    <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.13), Math.min((size.height * 0.15), 15)), 11)} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                </stacklayout>
            </stacklayout>
        {:else}
            {#if size.width < 220}
                {#if size.height < 130}
                    <stacklayout paddingLeft={12} paddingRight={12} orientation="vertical">
                        <label fontSize={Math.max(Math.min(((size.width - 24) / 4.1), Math.min((size.height * 0.38), 48)), 9)} fontWeight={config.settings?.clockBold === true ? "700" : "300"} maxLines={1} color={widgetColor} text={nowTime()} verticalAlignment="center"></label>
                        <gridlayout columns="*,auto,3,auto" rows="auto" verticalAlignment="center">
                            <label fontSize={Math.max(Math.min((size.width * 0.08), Math.min((size.height * 0.12), 13)), 10)} maxLines={1} opacity={0.6} color={widgetColor} text={formatDate(new Date(), 'll')} col={0} verticalAlignment="center"></label>
                            <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={Math.min((size.height * 0.36), 40)} height={Math.min((size.height * 0.36), 40)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={1} verticalAlignment="center"></image>
                            <absolutelayout width={3} col={2} verticalAlignment="center"></absolutelayout>
                            <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.12), Math.min((size.height * 0.2), 20)), 13)} maxLines={1} color={widgetColor} col={3} verticalAlignment="center"></label>
                        </gridlayout>
                    </stacklayout>
                {:else}
                    <gridlayout padding={12} rows="auto,auto,*,auto,auto">
                        <label fontSize={Math.max(Math.min(((size.width - 24) / 4.1), Math.min((size.height * 0.3), 48)), 9)} fontWeight={config.settings?.clockBold === true ? "700" : "300"} maxLines={1} color={widgetColor} text={nowTime()} row={0}></label>
                        <label fontSize={Math.max(Math.min((size.width * 0.09), Math.min((size.height * 0.09), 13)), 10)} maxLines={1} opacity={0.6} color={widgetColor} text={formatDate(new Date(), 'll')} row={1}></label>
                        {#if size.height >= 170}
                            <stacklayout orientation="vertical" row={3}>
                                {#if config.settings.showChips !== false}
                                    <WidgetChips fontSize={11} chips={data.chips} iconSize={12} maxWidth={(size.width - 24)} limit={4} color={widgetColor}></WidgetChips>
                                {:else}
                                    <stacklayout orientation="vertical"></stacklayout>
                                {/if}
                                <absolutelayout height={6}></absolutelayout>
                            </stacklayout>
                        {:else}
                            <stacklayout orientation="vertical"></stacklayout>
                        {/if}
                        <gridlayout columns="*,auto" rows="auto" row={4}>
                            <stacklayout orientation="vertical" col={0} verticalAlignment="center">
                                <label text={data.temperature} fontSize={Math.min((size.width * 0.15), Math.min((size.height * 0.15), 24))} maxLines={1} color={widgetColor}></label>
                                <label text={data.locationName} fontSize={Math.max(Math.min((size.width * 0.08), Math.min((size.height * 0.08), 12)), 10)} maxLines={1} opacity={0.6} color={widgetColor}></label>
                            </stacklayout>
                            <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={(Math.min((size.width * 0.26), Math.min((size.height * 0.26), 44)) * 1.3)} height={(Math.min((size.width * 0.26), Math.min((size.height * 0.26), 44)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={1} verticalAlignment="center"></image>
                        </gridlayout>
                    </gridlayout>
                {/if}
            {:else}
                {#if size.height >= 150}
                    <stacklayout padding={18} orientation="vertical">
                        <gridlayout columns="*,auto" rows="auto">
                            <stacklayout orientation="vertical" col={0} verticalAlignment="top">
                                <label fontSize={Math.max(Math.min(((size.width - 126) / 4.1), Math.min((size.height * 0.3), 84)), 9)} fontWeight={config.settings?.clockBold === true ? "700" : "300"} maxLines={1} color={widgetColor} text={nowTime()}></label>
                                <label fontSize={Math.max(Math.min((size.width * 0.05), Math.min((size.height * 0.08), 17)), 11)} maxLines={1} opacity={0.6} color={widgetColor} text={formatDate(new Date(), 'LL')}></label>
                            </stacklayout>
                            <stacklayout orientation="vertical" col={1} verticalAlignment="top">
                                <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={(Math.min((size.width * 0.16), Math.min((size.height * 0.26), 56)) * 1.3)} height={(Math.min((size.width * 0.16), Math.min((size.height * 0.26), 56)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} horizontalAlignment="right"></image>
                                <label text={data.temperature} fontSize={Math.min((size.width * 0.1), Math.min((size.height * 0.18), 36))} maxLines={1} fontWeight="300" color={widgetColor} horizontalAlignment="right"></label>
                            </stacklayout>
                        </gridlayout>
                        <absolutelayout height={6}></absolutelayout>
                        <gridlayout columns="*,auto" rows="auto">
                            <label text={data.locationName + " · " + data.description} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.08), 15)), 11)} maxLines={1} opacity={0.6} color={widgetColor} col={0} verticalAlignment="center"></label>
                            <stacklayout orientation="horizontal" col={1} verticalAlignment="center">
                                <label text={data.temperatureLow} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.08), 15)), 11)} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                                <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                                <label text={data.temperatureHigh} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.08), 15)), 11)} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                            </stacklayout>
                        </gridlayout>
                        <absolutelayout height={8}></absolutelayout>
                        {#if config.settings.showChips !== false}
                            <WidgetChips fontSize={12} chips={data.chips} iconSize={14} maxWidth={(size.width - 36)} limit={6} color={widgetColor}></WidgetChips>
                        {:else}
                            <stacklayout orientation="vertical"></stacklayout>
                        {/if}
                        <absolutelayout height={10}></absolutelayout>
                        {#if config.settings.showHourly === true && size.height >= 300}
                            <stacklayout orientation="vertical">
                                <stacklayout orientation="vertical">
                                        <gridlayout columns={(data.hourlyData?.slice(0, size.width >= 330 ? 6 : 5) ?? []).map(() => '*').join(',')} rows="auto">
                                            {#each (data.hourlyData?.slice(0, size.width >= 330 ? 6 : 5) ?? []) as item, index}
                                            <stacklayout orientation="vertical" col={index}>
                                                <label text={item.hour} fontSize={11} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                                                <image src={(item.iconPath?.startsWith('/') ? item.iconPath : iconService.getIconPath(item.iconPath, true, false, config.iconSet))} width={20} height={20} horizontalAlignment="center"></image>
                                            </stacklayout>
                                            {/each}
                                        </gridlayout>
                                    <WidgetHourlyChart fontSize={12} height={80} hours={data.hourlyData} limit={size.width >= 330 ? 6 : 5} color={widgetColor}></WidgetHourlyChart>
                                </stacklayout>
                                <absolutelayout height={8}></absolutelayout>
                            </stacklayout>
                        {:else}
                            <stacklayout orientation="vertical"></stacklayout>
                        {/if}
                        <stacklayout orientation="vertical">
                            {#each (data.dailyData?.slice(0, config.settings.showHourly === true && size.height >= 300 ? size.height >= 530 ? 4 : size.height >= 487 ? 3 : size.height >= 444 ? 2 : size.height >= 401 ? 1 : 0 : size.height >= 485 ? 6 : size.height >= 442 ? 5 : size.height >= 399 ? 4 : size.height >= 356 ? 3 : size.height >= 313 ? 2 : size.height >= 270 ? 1 : 0) ?? []) as item, index}
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
                    <gridlayout paddingLeft={14} paddingRight={14} paddingTop={8} paddingBottom={8} columns="*,auto" rows="auto">
                        <stacklayout orientation="vertical" col={0} verticalAlignment="center">
                            <label fontSize={Math.max(Math.min(((size.width - 128) / 4.1), Math.min((size.height * 0.42), 60)), 9)} fontWeight={config.settings?.clockBold === true ? "700" : "300"} maxLines={1} color={widgetColor} text={nowTime()}></label>
                            <label fontSize={Math.max(Math.min((size.width * 0.05), Math.min((size.height * 0.13), 13)), 10)} maxLines={1} opacity={0.6} color={widgetColor} text={formatDate(new Date(), 'LL')}></label>
                            {#if size.height >= 130}
                                <stacklayout orientation="vertical">
                                    <absolutelayout height={4}></absolutelayout>
                                    {#if config.settings.showChips !== false}
                                        <WidgetChips fontSize={11} chips={data.chips} iconSize={12} maxWidth={(size.width - 170)} limit={4} color={widgetColor}></WidgetChips>
                                    {:else}
                                        <stacklayout orientation="vertical"></stacklayout>
                                    {/if}
                                </stacklayout>
                            {:else}
                                <stacklayout orientation="vertical"></stacklayout>
                            {/if}
                        </stacklayout>
                        <stacklayout orientation="vertical" col={1} verticalAlignment="center">
                            <stacklayout orientation="horizontal" horizontalAlignment="right">
                                <image src={(data.iconPath?.startsWith('/') ? data.iconPath : iconService.getIconPath(data.iconPath, true, false, config.iconSet))} width={(Math.min((size.width * 0.1), Math.min((size.height * 0.28), 32)) * 1.3)} height={(Math.min((size.width * 0.1), Math.min((size.height * 0.28), 32)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} verticalAlignment="center"></image>
                                <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                                <label text={data.temperature} fontSize={Math.min((size.width * 0.1), Math.min((size.height * 0.25), 28))} maxLines={1} fontWeight="300" color={widgetColor} verticalAlignment="center"></label>
                            </stacklayout>
                            <stacklayout orientation="horizontal" horizontalAlignment="right">
                                <label text={data.temperatureLow} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.12), 13)), 10)} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                                <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                                <label text={data.temperatureHigh} fontSize={Math.max(Math.min((size.width * 0.045), Math.min((size.height * 0.12), 13)), 10)} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                            </stacklayout>
                        </stacklayout>
                    </gridlayout>
                {/if}
            {/if}
        {/if}
    {/if}
</gridlayout>
