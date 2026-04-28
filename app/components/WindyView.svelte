<script context="module" lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Align, Canvas, Paint } from '@nativescript-community/ui-canvas';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { get } from 'svelte/store';
    import type { WindyItemData } from '~/components/WindyItem.svelte';
    import WindyItem from '~/components/WindyItem.svelte';
    import { isEInk, onThemeChanged } from '~/helpers/theme';
    import { iconService } from '~/services/icon';
    import type { Hourly } from '~/services/providers/weather';
    import { WeatherProps, appPaint, getWeatherDataIcon, mdiPaint, wiPaint } from '~/services/weatherData';
    import { colors, fontScale, onUnitsChanged } from '~/variables';
    const HEADER_WIDTH = 40;
    export const ICON_ROW_SCALE = 2;

    // Derived row height from container height and number of rows
    // Each data row = 1 unit, iconId row = 2 units, plus 1 unit for hour row
    export function getRowUnits(dataToShow: WeatherProps[]): number {
        return 1 + dataToShow.reduce((acc, p) => acc + (p === WeatherProps.iconId ? ICON_ROW_SCALE : 1), 0);
    }

    export function computeWindyViewMinHeight(dataToShow: WeatherProps[], fontScale: number) {
        const rowCount = getRowUnits(dataToShow);
        return rowCount * 22 * fontScale;
    }
</script>

<script lang="ts">
    const headerTextPaint = new Paint();
    headerTextPaint.setTextAlign(Align.LEFT);

    export let items: Hourly[];
    export let dataToShow: WeatherProps[];
    const sortOrder = [WeatherProps.iconId, WeatherProps.temperature, WeatherProps.precipAccumulation];

    $: actionDataToShow = dataToShow.sort((a, b) => {
        // Get indices of a and b in sortOrder
        let indexA = sortOrder.indexOf(a);
        let indexB = sortOrder.indexOf(b);
        if (indexA === -1) indexA = 1000;
        if (indexB === -1) indexB = 1000;
        // Compare indices to determine order
        return indexA - indexB;
    });

    let collectionView: NativeViewElementNode<CollectionView>;

    let { colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline } = $colors;
    $: ({ colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline } = $colors);

    // Prepare enriched items for WindyItem
    $: windyItems = prepareItems(items, actionDataToShow);

    function prepareItems(hourlyItems: Hourly[], dataProps: WeatherProps[]): WindyItemData[] {
        if (!hourlyItems?.length) return [];

        const temps = hourlyItems.map((h) => h.temperature).filter((t) => t != null);
        const min = temps.length ? Math.min(...temps) : 0;
        const max = temps.length ? Math.max(...temps) : 0;
        const delta = max - min || 1;

        const precips = hourlyItems.map((h) => h.precipAccumulation).filter((t) => t != null);
        const minPrecips = precips.length ? Math.min(...precips) : 0;
        const maxPrecip = precips.length ? Math.max(...precips) : 0;
        const precipsDelta = maxPrecip - minPrecips || 1;

        return hourlyItems.map((h, i) => {
            const curveTempPoints = [
                hourlyItems[i - 3]?.temperature,
                hourlyItems[i - 2]?.temperature,
                hourlyItems[i - 1]?.temperature,
                h.temperature,
                hourlyItems[i + 1]?.temperature,
                hourlyItems[i + 2]?.temperature,
                hourlyItems[i + 3]?.temperature
            ]
                .filter((s) => s !== undefined)
                .map((s) => (s - min) / delta);
            const curvePrecipPoints = [
                hourlyItems[i - 3]?.precipAccumulation,
                hourlyItems[i - 2]?.precipAccumulation,
                hourlyItems[i - 1]?.precipAccumulation,
                h.precipAccumulation,
                hourlyItems[i + 1]?.precipAccumulation,
                hourlyItems[i + 2]?.precipAccumulation,
                hourlyItems[i + 3]?.precipAccumulation
            ]
                .filter((s) => s !== undefined)
                .map((s) => (s - minPrecips) / precipsDelta);

            return {
                ...h,
                index: i,
                min,
                max,
                tempDelta: h.temperature != null ? (h.temperature - min) / delta : 0,
                curveTempPoints,
                curvePrecipPoints,
                maxPrecip,
                prevWindSpeed: hourlyItems[i - 1]?.windSpeed,
                nextWindSpeed: hourlyItems[i + 1]?.windSpeed,
                prevWindGust: hourlyItems[i - 1]?.windGust,
                nextWindGust: hourlyItems[i + 1]?.windGust,
                prevAqi: hourlyItems[i - 1]?.aqi,
                nextAqi: hourlyItems[i + 1]?.aqi
            } as WindyItemData;
        });
    }

    function onDataPopulated() {
        collectionView?.nativeView?.scrollToIndex(0, false);
    }

    // function onScrollEvent(event) {
    //     showLeftShadowOpacity = Math.min(event.scrollOffset, 60) / 60;
    //     showRightShadowOpacity = Math.min(event.scrollSize - event.scrollOffset, 60) / 60;
    // }

    function refreshVisibleItems() {
        collectionView?.nativeView?.refreshVisibleItems();
    }

    onUnitsChanged(refreshVisibleItems);
    onThemeChanged(refreshVisibleItems);

    function selectTemplate(item, index, items) {
        if (iconService.animated) {
            return 'animated';
        }
        return 'default';
    }

    // Header canvas: draw row labels/icons for each row
    function drawHeader(event) {
        const canvas: Canvas = event.canvas;
        const w = canvas.getWidth();
        const w2 = w / 2;
        const dx = 3;
        // Update containerHeight from canvas (already in DIPs)
        const h = canvas.getHeight();
        const rowHeight = h / getRowUnits(actionDataToShow);

        const fs = $fontScale;
        headerTextPaint.setTextSize(11 * fs);

        // Hour row — draw a small label
        headerTextPaint.setColor(colorOnSurfaceVariant);

        let y = rowHeight;
        for (const prop of actionDataToShow) {
            const rh = prop === WeatherProps.iconId ? rowHeight * ICON_ROW_SCALE : rowHeight;
            const rowMid = y + rh * 0.5 + 5 * fs;
            const { fontFamily, icon } = getWeatherDataIcon(prop);
            if (icon && prop !== WeatherProps.iconId) {
                let paint: Paint;
                switch (fontFamily) {
                    case 'app':
                        paint = appPaint;
                        break;
                    case 'wi':
                        paint = wiPaint;
                        break;

                    default:
                        paint = mdiPaint;
                        break;
                }
                paint.setTextSize(12 * fs);
                paint.setColor(colorOnSurface);
                canvas.drawText(icon, w / 2, rowMid, paint); // wi-thermometer
            } else {
                // headerTextPaint.setTextSize(9 * fs);
                // canvas.drawText(String(prop).substring(0, 4), dx, rowMid, headerTextPaint);
                // headerTextPaint.setTextSize(11 * fs);
            }

            y += rh;
        }
    }
</script>

<gridlayout borderBottomColor={colorOutline} borderBottomWidth={isEInk ? 1 : 0} columns={`${HEADER_WIDTH},*`} {...$$restProps}>
    <canvasview col={0} on:draw={drawHeader} />

    <collectionview
        bind:this={collectionView}
        col={1}
        colWidth={46 * $fontScale}
        isBounceEnabled={false}
        itemIdGenerator={(_item, index) => index}
        itemTemplateSelector={selectTemplate}
        items={windyItems}
        nestedScrollingEnabled={false}
        orientation="horizontal"
        rowHeight="100%"
        on:dataPopulated={onDataPopulated}>
        <Template key="animated" let:item>
            <WindyItem animated={true} dataToShow={actionDataToShow} {item} />
        </Template>
        <Template let:item>
            <WindyItem dataToShow={actionDataToShow} {item} />
        </Template>
    </collectionview>
    <!-- <absolutelayout
            background={`linear-gradient(to right, ${colorBackground}, ${new Color(colorBackground).setAlpha(0)})`}
            height="100%"
            horizontalAlignment="left"
            isUserInteractionEnabled={false}
            opacity={showLeftShadowOpacity}
            width={40} />
        <absolutelayout
            background={`linear-gradient(to right, ${new Color(colorBackground).setAlpha(0)}, ${colorBackground})`}
            height="100%"
            horizontalAlignment="right"
            isUserInteractionEnabled={false}
            opacity={showRightShadowOpacity}
            width={40} /> -->
    <!-- </gridlayout> -->
</gridlayout>
