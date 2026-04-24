<script lang="ts">
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { Align, Canvas, Paint } from '@nativescript-community/ui-canvas';
    import { Color } from '@nativescript/core';
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import WindyItem from '~/components/WindyItem.svelte';
    import type { WindyItemData } from '~/components/WindyItem.svelte';
    import { isEInk, onThemeChanged } from '~/helpers/theme';
    import { iconService } from '~/services/icon';
    import { WeatherProps } from '~/services/weatherData';
    import type { Hourly } from '~/services/providers/weather';
    import { colors, fontScale, fonts, onUnitsChanged } from '~/variables';
    import { get } from 'svelte/store';

    const HEADER_WIDTH = 44;
    // Hour row height + icon row (2x) vs regular row (1x)
    const ICON_ROW_SCALE = 2;

    const headerTextPaint = new Paint();
    headerTextPaint.setTextAlign(Align.CENTER);
    const headerWiPaint = new Paint();
    headerWiPaint.setTextAlign(Align.CENTER);
    const headerMdiPaint = new Paint();
    headerMdiPaint.setTextAlign(Align.CENTER);
    const headerAppPaint = new Paint();
    headerAppPaint.setTextAlign(Align.CENTER);

    fonts.subscribe((f) => {
        if (f.wi) {
            headerWiPaint.setFontFamily(f.wi);
            headerMdiPaint.setFontFamily(f.mdi);
            headerAppPaint.setFontFamily(f.app);
        }
    });

    export let items: Hourly[];
    export let dataToShow: WeatherProps[];

    let collectionView: NativeViewElementNode<CollectionView>;
    let showLeftShadowOpacity = 0;
    let showRightShadowOpacity = 1;

    let { colorBackground, colorOutline, colorOnSurface, colorOnSurfaceVariant } = $colors;
    $: ({ colorBackground, colorOutline, colorOnSurface, colorOnSurfaceVariant } = $colors);

    // Derived row height from container height and number of rows
    // Each data row = 1 unit, iconId row = 2 units, plus 1 unit for hour row
    function getRowUnits(): number {
        return 1 + dataToShow.reduce((acc, p) => acc + (p === WeatherProps.iconId ? ICON_ROW_SCALE : 1), 0);
    }

    let containerHeight = 0;
    $: rowHeight = containerHeight > 0 ? containerHeight / getRowUnits() : 30;
    $: iconRowHeight = rowHeight * ICON_ROW_SCALE;

    // Prepare enriched items for WindyItem
    $: windyItems = prepareItems(items, dataToShow);

    function prepareItems(hourlyItems: Hourly[], dataProps: WeatherProps[]): WindyItemData[] {
        if (!hourlyItems?.length) return [];

        const temps = hourlyItems.map((h) => h.temperature).filter((t) => t != null);
        const min = temps.length ? Math.min(...temps) : 0;
        const max = temps.length ? Math.max(...temps) : 0;
        const delta = max - min || 1;

        const precips = hourlyItems.map((h) => h.precipAccumulation || 0);
        const maxPrecip = Math.max(...precips, 0.1);

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

            return {
                ...h,
                index: i,
                min,
                max,
                tempDelta: h.temperature != null ? (h.temperature - min) / delta : 0,
                curveTempPoints,
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
        showLeftShadowOpacity = 0;
        showRightShadowOpacity = 1;
        collectionView?.nativeView?.scrollToIndex(0, false);
    }

    function onScrollEvent(event) {
        showLeftShadowOpacity = Math.min(event.scrollOffset, 60) / 60;
        showRightShadowOpacity = Math.min(event.scrollSize - event.scrollOffset, 60) / 60;
    }

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
        // Update containerHeight from canvas (already in DIPs)
        const h = canvas.getHeight();
        if (h > 0 && h !== containerHeight) {
            containerHeight = h;
        }

        const fs = get(fontScale);
        headerTextPaint.setTextSize(11 * fs);
        headerWiPaint.setTextSize(14 * fs);
        headerMdiPaint.setTextSize(14 * fs);
        headerAppPaint.setTextSize(12 * fs);

        // Hour row — draw a small label
        headerTextPaint.setColor(colorOnSurfaceVariant);
        canvas.drawText('h', w2, rowHeight * 0.65, headerTextPaint);

        let y = rowHeight;
        for (const prop of dataToShow) {
            const rh = prop === WeatherProps.iconId ? iconRowHeight : rowHeight;
            const rowMid = y + rh * 0.65;

            switch (prop) {
                case WeatherProps.iconId:
                    // Weather icon row — no header label; icon is self-explanatory
                    break;
                case WeatherProps.temperature:
                    headerWiPaint.setColor(colorOnSurface);
                    canvas.drawText('\uf055', w2, rowMid, headerWiPaint); // wi-thermometer
                    break;
                case WeatherProps.precipAccumulation:
                    headerWiPaint.setColor(colorOnSurface);
                    canvas.drawText('\uf045', w2, rowMid, headerWiPaint); // wi-raindrop
                    break;
                case WeatherProps.windSpeed:
                    headerWiPaint.setColor(colorOnSurface);
                    canvas.drawText('\uf021', w2, rowMid, headerWiPaint); // wi-wind
                    break;
                case WeatherProps.windGust:
                    headerWiPaint.setColor(colorOnSurface);
                    canvas.drawText('\uf050', w2, rowMid, headerWiPaint); // wi-strong-wind
                    break;
                case WeatherProps.aqi:
                    headerMdiPaint.setColor(colorOnSurface);
                    canvas.drawText('\uf12f', w2, rowMid, headerMdiPaint); // mdi-leaf
                    break;
                case WeatherProps.windBearing:
                    headerAppPaint.setColor(colorOnSurfaceVariant);
                    canvas.drawText('\u2191', w2, rowMid, headerAppPaint); // ↑ up arrow
                    break;
                default: {
                    headerTextPaint.setTextSize(9 * fs);
                    headerTextPaint.setColor(colorOnSurfaceVariant);
                    canvas.drawText(String(prop).substring(0, 4), w2, rowMid, headerTextPaint);
                    headerTextPaint.setTextSize(11 * fs);
                    break;
                }
            }
            y += rh;
        }
    }
</script>

<gridlayout
    borderBottomColor={colorOutline}
    borderBottomWidth={isEInk ? 1 : 0}
    columns={`${HEADER_WIDTH},*`}
    {...$$restProps}>
    <!-- Left fixed header column -->
    <canvasview col={0} height="100%" on:draw={drawHeader} />

    <!-- Scrollable hourly collection -->
    <gridlayout col={1} height="100%">
        <collectionview
            bind:this={collectionView}
            colWidth={46 * $fontScale}
            height="100%"
            isBounceEnabled={false}
            itemIdGenerator={(_item, index) => index}
            itemTemplateSelector={selectTemplate}
            items={windyItems}
            nestedScrollingEnabled={false}
            orientation="horizontal"
            rowHeight="100%"
            on:dataPopulated={onDataPopulated}
            on:scroll={onScrollEvent}>
            <Template key="animated" let:item>
                <WindyItem animated={true} {dataToShow} {iconRowHeight} {item} {rowHeight} />
            </Template>
            <Template let:item>
                <WindyItem {dataToShow} {iconRowHeight} {item} {rowHeight} />
            </Template>
        </collectionview>
        <absolutelayout
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
            width={40} />
    </gridlayout>
</gridlayout>

