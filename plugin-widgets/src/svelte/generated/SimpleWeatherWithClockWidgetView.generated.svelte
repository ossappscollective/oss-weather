<script context="module" lang="ts">
    // Auto-generated Svelte Native component for widget "SimpleWeatherWithClockWidget"
    import { Template } from '@nativescript-community/svelte-native/components';
    import { formatDate, l, lc } from '~/helpers/locale';
    import { titlecase } from '@nativescript-community/l';
    import { path } from '@nativescript/core';
    import { iconService, iconThemesFolder } from '~/services/icon';
    import { colors } from '~/variables';
    import type { WeatherWidgetData, WidgetConfig } from '~/services/widgets/WidgetTypes';
</script>
<script lang="ts">
    export let config: WidgetConfig;
    export let data: WeatherWidgetData;
    export let size: { width: number; height: number };

    $: iconSetFolderPath = path.join(iconThemesFolder, config.iconSet ?? iconService.iconSet);

    $: ({ colorOnSurface } = $colors);
    $: widgetColor = config.settings.color != null ? config.settings.color : colorOnSurface;

    function nowTime() {
        return formatDate(new Date(), 'LT');
    }
</script>

<gridlayout width={size.width} height={size.height} {...$$restProps} class="widget-container">
    <stacklayout paddingLeft={10} paddingRight={10} paddingTop={6} paddingBottom={6} orientation="vertical">
        <gridlayout row="auto" columns="auto,*" verticalAlignment="center">
            <label verticalAlignment="bottom" text={data.locationName} fontSize={12} opacity={0.5} maxLines={1} color={widgetColor} col={0}></label>
            <label verticalAlignment="bottom" text={data.temperature} fontSize={Math.min(size.width * 0.2, 20)} fontWeight="700" textAlignment="right" color={widgetColor} col={1}></label>
        </gridlayout>
        <gridlayout row="auto" columns="auto,*,auto" verticalAlignment="center">
            <label fontSize={Math.min(size.width * 0.17, 62)} fontWeight={config.settings?.clockBold === true ? "700" : "400"} color={widgetColor} text={nowTime()} col={0} verticalAlignment="center"></label>
            <image src={`${iconSetFolderPath}/images/${data.iconPath}.png`} horizontalAlignment="right" width={Math.min(size.height >= 200 ? size.height * 0.52 : size.width * 0.27, 100)} height={Math.min(size.height >= 200 ? size.height * 0.52 : size.width * 0.27, 100)} visibility={(data.iconPath != null) ? 'visible' : 'collapsed'} col={2} verticalAlignment="center"></image>
        </gridlayout>
        <gridlayout row="auto" columns="auto,*" verticalAlignment="center">
            <label fontSize={14} opacity={0.5} color={widgetColor} text={formatDate(new Date(), 'll')} col={0}></label>
            <label text={data.description} fontSize={12} opacity={0.5} visibility={(data.description != null) ? 'visible' : 'collapsed'} textAlignment="right" color={widgetColor} col={1}></label>
        </gridlayout>
    </stacklayout>
</gridlayout>
