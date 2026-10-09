<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "SimpleWeatherWithDateWidget"
    import { Template } from '@nativescript-community/svelte-native/components';
    import { formatDate, l, lc, formatDateWithoutYear } from '~/helpers/locale';
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
    {#if size.height < 70}
        {#if size.width < 220}
            <gridlayout row="auto" paddingLeft={12} paddingRight={12} columns="auto,8,*,4,auto">
                <image src={iconService.getIconPath(data.iconPath, true, false, config.iconSet)} width={Math.min((size.height * 0.5), 28)} height={Math.min((size.height * 0.5), 28)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={0} verticalAlignment="center"></image>
                <absolutelayout width={8} col={1} verticalAlignment="center"></absolutelayout>
                <stacklayout orientation="vertical" col={2} verticalAlignment="center">
                    <label fontSize={Math.max(Math.min((size.width * 0.07), Math.min((size.height * 0.25), 15)), 11)} maxLines={1} fontWeight="500" color={widgetColor} text={formatDate(new Date(), 'll')}></label>
                    <label text={data.locationName} fontSize={Math.max(Math.min((size.width * 0.05), Math.min((size.height * 0.18), 11)), 10)} maxLines={1} opacity={0.6} color={widgetColor}></label>
                </stacklayout>
                <absolutelayout width={4} col={3} verticalAlignment="center"></absolutelayout>
                <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.1), Math.min((size.height * 0.35), 18)), 13)} maxLines={1} fontWeight="500" color={widgetColor} col={4} verticalAlignment="center"></label>
            </gridlayout>
        {:else}
            <gridlayout row="auto" paddingLeft={14} paddingRight={14} paddingTop={8} paddingBottom={8} columns="*,auto">
                <stacklayout orientation="vertical" col={0} verticalAlignment="center">
                    <label fontSize={Math.max(Math.min(((size.width - 128) / 3.4), Math.min((size.height * 0.42), 56)), 9)} maxLines={1} fontWeight="300" color={widgetColor} text={formatDateWithoutYear(new Date(), 'll')}></label>
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
                        <image src={iconService.getIconPath(data.iconPath, true, false, config.iconSet)} width={(Math.min((size.width * 0.1), Math.min((size.height * 0.28), 32)) * 1.3)} height={(Math.min((size.width * 0.1), Math.min((size.height * 0.28), 32)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} verticalAlignment="center"></image>
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
    {:else}
        {#if size.width < 110}
            <stacklayout orientation="vertical">
                <image src={iconService.getIconPath(data.iconPath, true, false, config.iconSet)} width={(Math.min((size.width * 0.36), Math.min((size.height * 0.27), 36)) * 1.3)} height={(Math.min((size.width * 0.36), Math.min((size.height * 0.27), 36)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} horizontalAlignment="center" verticalAlignment="center"></image>
                <label fontSize={Math.max(Math.min((size.width * 0.14), Math.min((size.height * 0.13), 15)), 11)} maxLines={1} fontWeight="500" color={widgetColor} text={formatDateWithoutYear(new Date(), 'll')} horizontalAlignment="center" verticalAlignment="center"></label>
                <stacklayout orientation="horizontal" horizontalAlignment="center" verticalAlignment="center">
                    <label text={data.temperatureLow} fontSize={Math.max(Math.min((size.width * 0.12), Math.min((size.height * 0.12), 13)), 10)} maxLines={1} opacity={0.6} color={widgetColor} verticalAlignment="center"></label>
                    <absolutelayout width={4} verticalAlignment="center"></absolutelayout>
                    <label text={data.temperatureHigh} fontSize={Math.max(Math.min((size.width * 0.12), Math.min((size.height * 0.12), 13)), 10)} maxLines={1} fontWeight="500" color={widgetColor} verticalAlignment="center"></label>
                </stacklayout>
            </stacklayout>
        {:else}
            {#if size.width < 220}
                {#if size.height < 130}
                    <gridlayout row="auto" paddingLeft={12} paddingRight={12} columns="*,auto">
                        <stacklayout orientation="vertical" col={0} verticalAlignment="center">
                            <label fontSize={Math.max(Math.min(((size.width - 80) / 3.4), Math.min((size.height * 0.3), 34)), 9)} maxLines={1} fontWeight="300" color={widgetColor} text={formatDateWithoutYear(new Date(), 'll')}></label>
                            <label text={data.locationName} fontSize={Math.max(Math.min((size.width * 0.07), Math.min((size.height * 0.12), 12)), 10)} maxLines={1} opacity={0.6} color={widgetColor}></label>
                        </stacklayout>
                        <stacklayout orientation="vertical" col={1} verticalAlignment="center">
                            <image src={iconService.getIconPath(data.iconPath, true, false, config.iconSet)} width={(Math.min((size.height * 0.4), 44) * 1.3)} height={(Math.min((size.height * 0.4), 44) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} horizontalAlignment="center"></image>
                            <label text={data.temperature} fontSize={Math.max(Math.min((size.width * 0.12), Math.min((size.height * 0.2), 20)), 13)} maxLines={1} color={widgetColor} horizontalAlignment="center"></label>
                        </stacklayout>
                    </gridlayout>
                {:else}
                    <gridlayout row="auto" padding={12} rows="auto,auto,*,auto,auto">
                        <label fontSize={Math.max(Math.min(((size.width - 24) / 3.4), Math.min((size.height * 0.2), 34)), 9)} maxLines={1} fontWeight="300" color={widgetColor} text={formatDateWithoutYear(new Date(), 'll')} row={0}></label>
                        <label fontSize={Math.max(Math.min((size.width * 0.08), Math.min((size.height * 0.08), 12)), 10)} maxLines={1} opacity={0.6} color={widgetColor} text={formatDate(new Date(), 'YYYY')} row={1}></label>
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
                        <gridlayout row="auto" columns="*,auto">
                            <stacklayout orientation="vertical" col={0} verticalAlignment="center">
                                <label text={data.temperature} fontSize={Math.min((size.width * 0.15), Math.min((size.height * 0.15), 24))} maxLines={1} color={widgetColor}></label>
                                <label text={data.locationName} fontSize={Math.max(Math.min((size.width * 0.08), Math.min((size.height * 0.08), 12)), 10)} maxLines={1} opacity={0.6} color={widgetColor}></label>
                            </stacklayout>
                            <image src={iconService.getIconPath(data.iconPath, true, false, config.iconSet)} width={(Math.min((size.width * 0.26), Math.min((size.height * 0.26), 44)) * 1.3)} height={(Math.min((size.width * 0.26), Math.min((size.height * 0.26), 44)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={1} verticalAlignment="center"></image>
                        </gridlayout>
                    </gridlayout>
                {/if}
            {:else}
                {#if size.height >= 150}
                    <stacklayout padding={18} orientation="vertical">
                        <gridlayout row="auto" columns="*,auto">
                            <stacklayout orientation="vertical" col={0} verticalAlignment="top">
                                <label fontSize={Math.max(Math.min(((size.width - 126) / 3.4), Math.min((size.height * 0.26), 64)), 9)} maxLines={1} fontWeight="300" color={widgetColor} text={formatDateWithoutYear(new Date(), 'll')}></label>
                                <label fontSize={Math.max(Math.min((size.width * 0.05), Math.min((size.height * 0.08), 15)), 11)} maxLines={1} opacity={0.6} color={widgetColor} text={formatDate(new Date(), 'LL')}></label>
                            </stacklayout>
                            <stacklayout orientation="vertical" col={1} verticalAlignment="top">
                                <image src={iconService.getIconPath(data.iconPath, true, false, config.iconSet)} width={(Math.min((size.width * 0.16), Math.min((size.height * 0.26), 56)) * 1.3)} height={(Math.min((size.width * 0.16), Math.min((size.height * 0.26), 56)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} horizontalAlignment="right"></image>
                                <label text={data.temperature} fontSize={Math.min((size.width * 0.1), Math.min((size.height * 0.18), 36))} maxLines={1} fontWeight="300" color={widgetColor} horizontalAlignment="right"></label>
                            </stacklayout>
                        </gridlayout>
                        <absolutelayout height={6}></absolutelayout>
                        <gridlayout row="auto" columns="*,auto">
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
                                        <collectionview items={data.hourlyData?.slice(0, size.width >= 330 ? 6 : 5)}>
                                            <Template let:item>
                                            <stacklayout orientation="vertical">
                                                <label text={item.hour} fontSize={11} maxLines={1} fontWeight="500" color={widgetColor} horizontalAlignment="center"></label>
                                                <image src={iconService.getIconPath(item.iconPath, true, false, config.iconSet)} width={20} height={20} horizontalAlignment="center"></image>
                                            </stacklayout>
                                            </Template>
                                        </collectionview>
                                    <WidgetHourlyChart fontSize={12} height={80} hours={data.hourlyData} limit={size.width >= 330 ? 6 : 5} color={widgetColor}></WidgetHourlyChart>
                                </stacklayout>
                                <absolutelayout height={8}></absolutelayout>
                            </stacklayout>
                        {:else}
                            <stacklayout orientation="vertical"></stacklayout>
                        {/if}
                        <collectionview items={data.dailyData?.slice(0, config.settings.showHourly === true && size.height >= 300 ? size.height >= 530 ? 4 : size.height >= 487 ? 3 : size.height >= 444 ? 2 : size.height >= 401 ? 1 : 0 : size.height >= 485 ? 6 : size.height >= 442 ? 5 : size.height >= 399 ? 4 : size.height >= 356 ? 3 : size.height >= 313 ? 2 : size.height >= 270 ? 1 : 0)}>
                            <Template let:item>
                            {#if size.width < 250}
                                <gridlayout row="auto" paddingTop={3} paddingBottom={3} columns="auto,6,auto,4,*,auto">
                                    <image src={iconService.getIconPath(item.iconPath, true, false, config.iconSet)} width={22} height={22} col={0} verticalAlignment="center"></image>
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
                                <gridlayout row="auto" paddingTop={4} paddingBottom={4} columns="auto,8,*,auto,5,auto,5,auto">
                                    <image src={iconService.getIconPath(item.iconPath, true, false, config.iconSet)} width={24} height={24} col={0} verticalAlignment="center"></image>
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
                                    <gridlayout row="auto" width={30} height={3} col={5} verticalAlignment="center">
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
                            </Template>
                        </collectionview>
                    </stacklayout>
                {:else}
                    <gridlayout row="auto" paddingLeft={14} paddingRight={14} paddingTop={8} paddingBottom={8} columns="*,auto">
                        <stacklayout orientation="vertical" col={0} verticalAlignment="center">
                            <label fontSize={Math.max(Math.min(((size.width - 128) / 3.4), Math.min((size.height * 0.42), 56)), 9)} maxLines={1} fontWeight="300" color={widgetColor} text={formatDateWithoutYear(new Date(), 'll')}></label>
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
                                <image src={iconService.getIconPath(data.iconPath, true, false, config.iconSet)} width={(Math.min((size.width * 0.1), Math.min((size.height * 0.28), 32)) * 1.3)} height={(Math.min((size.width * 0.1), Math.min((size.height * 0.28), 32)) * 1.3)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} verticalAlignment="center"></image>
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
