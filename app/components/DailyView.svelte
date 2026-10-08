<script context="module" lang="ts">
    import { textAttributedString } from '~/utils/ui/attributedString';
    import { Align, Canvas, LayoutAlignment, Paint, StaticLayout } from '@nativescript-community/ui-canvas';
    import { tempColor } from '~/utils/utils.common';
    import WeatherIcon from '~/components/WeatherIcon.svelte';
    import { formatDate } from '~/helpers/locale';
    import type { DailyData } from '~/services/providers/weather';
    import { WeatherProps, formatWeatherValue, weatherDataService } from '~/services/weatherData';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import { accentFontWeight, colors, dailyDataAlignment, dailyDateFormat, dataIntensity, designStyle, fontScale, showEmptyData, weatherDataLayout, windowSize } from '~/variables';
    import { isDarkTheme, isEInk } from '~/helpers/theme';
    import { cardBackgroundAlpha, dataTextStyle, headerTextStyle, textFontFamily } from '~/utils/designStyle';
    import { drawChips, prepareChips } from '~/helpers/chips';
    import { chipsAlignment } from '~/utils/chipsLayout';
    import { rangeBarSpan } from '~/utils/dataGrid';
    import { DAILY_GRID_OPTIONS, drawCenteredValue, drawGrid, prepareGrid } from '~/helpers/dataGrid';

    let textPaint: Paint;
    let textIconPaint: Paint;
    let textIconSubPaint: Paint;
    let paint: Paint;

    const PADDING_LEFT = 7;
    const ICON_WIDTH = 55;
    const DATA_LEFT = 60;
    const CHIPS_UNDER_HEADER_TOP = 32;
    // keeps the bottom left free for the beaufort and small icons
    const CHIPS_UNDER_HEADER_BOTTOM = 26;

    // modern layout: header (icon | day + condition | low, range bar, high), data below it
    const MODERN_PADDING = 16;
    const MODERN_HEADER_HEIGHT = 56;
    const MODERN_ICON_SIZE = 44;
    const MODERN_ICON_GAP = 10;
    const MODERN_HIGH_TRACK = 34;
    const MODERN_LOW_TRACK = 30;
    const MODERN_TRACK_GAP = 6;
    const MODERN_BAR_WIDTH = 44;
    const MODERN_BAR_HEIGHT = 5;
    const MODERN_CARD_PADDING = 10;
    const MODERN_CARD_RADIUS = 12;
    // blocks layout: drawn up into the header bottom space, with a bottom padding like chips and grid
    const MODERN_BLOCK_LIFT = 6;
    const MODERN_BLOCK_HEIGHT = 58;
</script>

<script lang="ts">
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant } = $colors);
    $: chipsTheme = { onSurface: colorOnSurface, onSurfaceVariant: colorOnSurfaceVariant };

    export let item: DailyData;
    export let animated: boolean = false;
    // daily page header: full day name and date
    export let fullDate = false;
    let canvasView;
    const dispatch = createEventDispatcher();

    if (!textPaint) {
        textPaint = new Paint();
        textIconPaint = new Paint();
        textIconPaint.setTextAlign(Align.CENTER);
        textIconSubPaint = new Paint();
        textIconSubPaint.setTextAlign(Align.CENTER);
        paint = new Paint();
    }

    function redraw() {
        canvasView && canvasView.nativeView.invalidate();
    }

    $: {
        if (item && $designStyle && $accentFontWeight) {
            redraw();
        }
    }
    $: $dataIntensity !== undefined && redraw();

    $: header = headerTextStyle($designStyle, $fontScale, $accentFontWeight);
    $: {
        const fontFamily = textFontFamily($designStyle);
        textPaint.setFontFamily(fontFamily);
        textIconSubPaint.setFontFamily(fontFamily);
    }
    $: modern = $designStyle === 'modern';
    // with the date inline next to the day, the left column is free and chips go under the header
    // modern: only the grid sits in a card, chips already have their own background
    $: cardPadding = modern && $weatherDataLayout === 'grid' ? MODERN_CARD_PADDING * $fontScale : 0;
    $: chipsLeft = modern ? MODERN_PADDING + cardPadding : header.dateInline ? PADDING_LEFT : DATA_LEFT * $fontScale;
    $: blockWidth = modern ? $windowSize.width - 2 * (MODERN_PADDING + cardPadding) : $windowSize.width - chipsLeft - ICON_WIDTH * $fontScale - 16;
    $: chipsAlign = chipsAlignment($dailyDataAlignment);

    $: iconsData = weatherDataService.getIconsData({ item, filter: [WeatherProps.windBeaufort], type: 'daily' });
    // chips and grid wrap, so the row height depends on them and must be known before drawing
    // with "show missing values", grid and chips keep a placeholder for data with no value
    $: blockItems = $showEmptyData ? weatherDataService.getIconsSlots({ item, filter: [WeatherProps.windBeaufort], type: 'daily' }) : iconsData;
    $: chips = $weatherDataLayout === 'chips' ? prepareChips(blockItems, blockWidth, $designStyle, chipsTheme, $fontScale, chipsAlign) : null;
    $: grid = $weatherDataLayout === 'grid' ? prepareGrid(blockItems, blockWidth, DAILY_GRID_OPTIONS, $fontScale) : null;
    $: blockHeight = chips?.height ?? grid?.height;
    $: modernDataHeight = blockHeight !== undefined ? blockHeight + 2 * cardPadding + 12 * $fontScale : iconsData.length ? MODERN_BLOCK_HEIGHT * $fontScale : 4 * $fontScale;
    $: rowHeight = modern
        ? MODERN_HEADER_HEIGHT * $fontScale + modernDataHeight
        : blockHeight !== undefined
          ? Math.max(100 * $fontScale, blockHeight + (header.dateInline ? (CHIPS_UNDER_HEADER_TOP + CHIPS_UNDER_HEADER_BOTTOM) * $fontScale : 16 * $fontScale))
          : 100 * $fontScale;

    function ellipsize(text: string, maxWidth: number) {
        if (textPaint.measureText(text) <= maxWidth) {
            return text;
        }
        let shortened = text;
        while (shortened.length > 1 && textPaint.measureText(shortened + '…') > maxWidth) {
            shortened = shortened.slice(0, -1);
        }
        return shortened + '…';
    }

    function drawModernHeader(canvas: Canvas, w: number) {
        // the weather icon (native view) is at the left: same place on every row for a quick glance
        const left = MODERN_PADDING + (MODERN_ICON_SIZE + MODERN_ICON_GAP) * $fontScale;
        const right = w - MODERN_PADDING;
        const centerY = (MODERN_HEADER_HEIGHT * $fontScale) / 2;

        textPaint.setTextAlign(Align.LEFT);
        textPaint.setTextSize(header.daySize);
        textPaint.setFontWeight(header.dayWeight);
        textPaint.setColor(colorOnSurface);
        const dayText = formatDate(item.time, fullDate ? 'dddd' : 'ddd', item.timezoneOffset);
        const baseline = centerY - 2 * $fontScale;
        canvas.drawText(dayText, left, baseline, textPaint);
        const dateLeft = left + textPaint.measureText(dayText) + 5 * $fontScale;
        textPaint.setFontWeight('normal');
        textPaint.setTextSize(header.dateSize);
        textPaint.setColor(colorOnSurfaceVariant);
        const dateText = formatDate(item.time, fullDate ? 'D MMMM' : dailyDateFormat, item.timezoneOffset);
        canvas.drawText(dateText, dateLeft, baseline, textPaint);

        // small icons (and beaufort) after the date
        let iconsLeft = dateLeft + textPaint.measureText(dateText) + 10 * $fontScale;
        const windBeaufortData = weatherDataService.getItemData(WeatherProps.windBeaufort, item);
        const smallItems = weatherDataService.getSmallIconsData({ item, type: 'daily' }).concat(windBeaufortData ? [windBeaufortData] : []);
        for (const c of smallItems) {
            const iconPaint = c.paint || textIconPaint;
            iconPaint.setTextAlign(Align.LEFT);
            iconPaint.setTextSize(c.iconFontSize * 0.8);
            iconPaint.setColor(c.color || colorOnSurfaceVariant);
            if (c.customDraw) {
                iconsLeft += c.customDraw(canvas, $fontScale, iconPaint, c, iconsLeft, baseline - 13 * $fontScale, false);
            } else if (c.icon) {
                canvas.drawText(c.icon, iconsLeft, baseline, iconPaint);
                iconsLeft += iconPaint.measureText(c.icon) + 6 * $fontScale;
            }
        }

        // right group: high, range bar, low
        textPaint.setTextAlign(Align.RIGHT);
        textPaint.setTextSize(header.maxTempSize);
        textPaint.setFontWeight(header.maxTempWeight);
        textPaint.setColor(colorOnSurface);
        canvas.drawText(formatWeatherValue(item, WeatherProps.temperatureMax), right, centerY + header.maxTempSize * 0.35, textPaint);
        textPaint.setFontWeight('normal');
        // the bar shows where the day's low-high sits within the lowest/highest of the shown days
        const barRight = right - (MODERN_HIGH_TRACK + MODERN_TRACK_GAP) * $fontScale;
        const barLeft = barRight - MODERN_BAR_WIDTH * $fontScale;
        const barHalfHeight = (MODERN_BAR_HEIGHT * $fontScale) / 2;
        paint.setColor(colorOnSurface);
        paint.setAlpha(25);
        canvas.drawRoundRect(barLeft, centerY - barHalfHeight, barRight, centerY + barHalfHeight, barHalfHeight, barHalfHeight, paint);
        if (Number.isFinite(item.weekTemperatureMin) && Number.isFinite(item.weekTemperatureMax)) {
            const { end, start } = rangeBarSpan(item.temperatureMin, item.temperatureMax, item.weekTemperatureMin, item.weekTemperatureMax);
            const spanLeft = barLeft + start * (barRight - barLeft);
            const spanRight = Math.max(spanLeft + 2 * barHalfHeight, barLeft + end * (barRight - barLeft));
            // the high temperature color (same scale as the hourly chart line): how warm the day gets
            paint.setColor(tempColor(item.temperatureMax, -20, 30));
            canvas.drawRoundRect(spanLeft, centerY - barHalfHeight, spanRight, centerY + barHalfHeight, barHalfHeight, barHalfHeight, paint);
        }
        textPaint.setTextSize(header.minTempSize);
        textPaint.setColor(colorOnSurfaceVariant);
        canvas.drawText(formatWeatherValue(item, WeatherProps.temperatureMin), barLeft - MODERN_TRACK_GAP * $fontScale, centerY + header.minTempSize * 0.35, textPaint);

        // condition under the day, up to the temperatures
        const temperaturesLeft = barLeft - (MODERN_TRACK_GAP + MODERN_LOW_TRACK + 8) * $fontScale;
        textPaint.setTextAlign(Align.LEFT);
        textPaint.setTextSize(13 * $fontScale);
        canvas.drawText(ellipsize(item.description ?? '', temperaturesLeft - left), left, centerY + 16 * $fontScale, textPaint);
    }
    function drawOnCanvas({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        if (modern) {
            paint.setColor(colorOutlineVariant);
            canvas.drawLine(0, h - 1, w, h - 1, paint);
            drawModernHeader(canvas, w);
            const headerHeight = MODERN_HEADER_HEIGHT * $fontScale;
            canvas.save();
            canvas.translate(0, headerHeight);
            if (cardPadding > 0) {
                // the grid sits in a light card, like in the top view
                const radius = MODERN_CARD_RADIUS * $fontScale;
                paint.setColor(colorOnSurface);
                paint.setAlpha(cardBackgroundAlpha(isDarkTheme()));
                canvas.drawRoundRect(MODERN_PADDING, 0, w - MODERN_PADDING, blockHeight + 2 * cardPadding, radius, radius, paint);
                drawData(canvas, w, h - headerHeight, MODERN_PADDING, w - MODERN_PADDING, cardPadding);
            } else {
                drawData(canvas, w, h - headerHeight, MODERN_PADDING, w - MODERN_PADDING, 0);
            }
            canvas.restore();
            return;
        }
        paint.setColor(item.color);
        if (!isEInk) {
            canvas.drawRect(w - 5, 0, w, h, paint);
        }
        paint.setColor(colorOutline);
        canvas.drawLine(0, h, w, h - 1, paint);

        textPaint.setTextAlign(Align.RIGHT);
        textPaint.setTextSize(13 * $fontScale);
        textPaint.setColor(colorOnSurfaceVariant);
        canvas.drawText(item.description, w - 10, h - 15, textPaint);
        textPaint.setTextAlign(Align.LEFT);
        // textPaint.setTextSize(header.daySize);
        // textPaint.setFontWeight(header.dayWeight);
        // textPaint.setColor(colorOnSurface);
        // const dayText = formatDate(item.time, 'ddd', item.timezoneOffset);
        // canvas.drawText(dayText, PADDING_LEFT, dayBaseline, textPaint);
        // const dateLeft = header.dateInline ? PADDING_LEFT + textPaint.measureText(dayText) + 6 * $fontScale : PADDING_LEFT;
        // textPaint.setFontWeight(200);
        // textPaint.setColor(colorOnSurfaceVariant);
        // textPaint.setTextSize(header.dateSize);
        // canvas.drawText(formatDate(item.time, dailyDateFormat, item.timezoneOffset), dateLeft, header.dateInline ? dayBaseline : 46 * $fontScale, textPaint);

        let nString = textAttributedString(
            {
                spans: [
                    {
                        fontSize: header.daySize,
                        fontWeight: header.dayWeight,
                        color: colorOnSurface,
                        text: formatDate(item.time, 'ddd', item.timezoneOffset)
                    },
                    {
                        fontSize: header.dateSize,
                        fontWeight: 400,
                        color: colorOnSurfaceVariant,
                        text: ' ' + formatDate(item.time, dailyDateFormat, item.timezoneOffset)
                    }
                ]
            }
        );
        canvas.save();
        const dayBaseline = (header.dateInline ? 26 : 26) * $fontScale;
        let staticLayout = new StaticLayout(nString, textPaint, w - 10, LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
        canvas.translate(PADDING_LEFT, 8);
        staticLayout.draw(canvas);
        canvas.restore();

        textPaint.setColor(colorOnSurface);

        nString = textAttributedString(
            {
                spans: [
                    {
                        fontSize: header.minTempSize,
                        fontWeight: 400,
                        color: colorOnSurfaceVariant,
                        text: formatWeatherValue(item, WeatherProps.temperatureMin)
                    },
                    {
                        fontSize: header.maxTempSize,
                        fontWeight: header.maxTempWeight,
                        color: colorOnSurface,
                        text: '' + formatWeatherValue(item, WeatherProps.temperatureMax)
                    }
                ]
            }
        );
        canvas.save();
        staticLayout = new StaticLayout(nString, textPaint, w - 10, LayoutAlignment.ALIGN_OPPOSITE, 1, 0, true);
        canvas.translate(0, 10);
        staticLayout.draw(canvas);
        canvas.restore();

        const windBeaufortData = weatherDataService.getItemData(WeatherProps.windBeaufort, item);
        if (windBeaufortData) {
            windBeaufortData.paint.setColor(windBeaufortData.color || colorOnSurface);
            windBeaufortData.paint.setTextSize(windBeaufortData.iconFontSize);
            canvas.drawText(item.windBeaufortIcon, 50, h - 1.4 * windBeaufortData.iconFontSize, windBeaufortData.paint);
        }

        // const moonData = weatherDataService.getItemData(WeatherProps.moon, item);
        // if (moonData) {
        //     moonData.paint.setColor(moonData.color);
        //     moonData.paint.setTextSize(moonData.iconFontSize);
        //     canvas.drawText(moonData.icon, 18, h - 1.4 * moonData.iconFontSize, moonData.paint);
        // }

        const smallItemsToDraw = weatherDataService.getSmallIconsData({ item, type: 'daily' });
        let iconRight = PADDING_LEFT;
        for (let index = 0; index < smallItemsToDraw.length; index++) {
            const c = smallItemsToDraw[index];

            const paint = c.paint || textIconPaint;
            paint.setTextAlign(Align.LEFT);
            paint.setTextSize(c.iconFontSize);
            paint.setColor(c.color || colorOnSurface);
            if (c.customDraw) {
                const result = c.customDraw(canvas, $fontScale, paint, c, iconRight, h - 7 - 15 * $fontScale, false);
                iconRight += result;
            } else if (c.icon) {
                canvas.drawText(c.icon, iconRight, h - 7, paint);
                iconRight += 24 * $fontScale;
            }
        }

        drawData(
            canvas,
            w,
            h,
            blockHeight !== undefined ? chipsLeft : DATA_LEFT * $fontScale,
            w - ICON_WIDTH * $fontScale - 10,
            header.dateInline ? CHIPS_UNDER_HEADER_TOP * $fontScale : (h - (blockHeight ?? 0)) / 2
        );
    }

    function drawData(canvas: Canvas, w: number, h: number, clipLeft: number, clipRight: number, blockTop: number) {
        const centeredItemsToDraw = iconsData;
        const count = centeredItemsToDraw.length;
        paint.setColor(colorOutline);
        // modern blocks are lifted a bit above the data area
        canvas.clipRect(clipLeft, modern ? -MODERN_BLOCK_LIFT * $fontScale : 0, clipRight, h);
        switch ($weatherDataLayout) {
            case 'chips':
                if (chips) {
                    drawChips(canvas, chips, chipsLeft, blockTop, $designStyle, chipsTheme, $fontScale);
                }
                break;
            case 'grid':
                if (grid) {
                    drawGrid(canvas, grid, chipsLeft, blockTop, $designStyle, chipsTheme, $fontScale);
                }
                break;
            default:
            case 'default': {
                // modern: right under the header instead of centered
                const iconsTop = modern ? -MODERN_BLOCK_LIFT * $fontScale : h / 2 - 24 * $fontScale;
                for (let index = 0; index < centeredItemsToDraw.length; index++) {
                    const c = centeredItemsToDraw[index];

                    const x =
                        $dailyDataAlignment === 'left'
                            ? 80 * $fontScale + index * 45 * $fontScale
                            : $dailyDataAlignment === 'right'
                              ? w - 100 * $fontScale - (count - 1 - index) * 45 * $fontScale
                              : w / 2 - 20 / $fontScale - ((count - 1) / 2 - index) * 45 * $fontScale;
                    const textStyle = dataTextStyle($designStyle, c, { onSurface: colorOnSurface, onSurfaceVariant: colorOnSurfaceVariant }, $fontScale);
                    const paint = c.paint || textIconPaint;
                    paint.setTextAlign(Align.CENTER);
                    // if (c.customDraw) {
                    //     c.customDraw(canvas, $fontScale, paint, c, x, iconsTop + 20, 40);
                    // } else {
                    paint.setTextSize(c.iconFontSize);
                    paint.setColor(textStyle.iconColor);
                    if (c.icon) {
                        canvas.drawText(c.icon, x, iconsTop + 20, paint);
                    }
                    if (c.value) {
                        textIconSubPaint.setTextSize(textStyle.valueFontSize);
                        textIconSubPaint.setColor(textStyle.valueColor);
                        const valueY = iconsTop + 20 + 19 * $fontScale;
                        if (modern) {
                            drawCenteredValue(canvas, textIconSubPaint, c.value, x, valueY, $fontScale);
                        } else {
                            canvas.drawText(c.value + '', x, valueY, textIconSubPaint);
                        }
                    }
                    if (c.subvalue) {
                        textIconSubPaint.setTextSize(textStyle.subvalueFontSize);
                        textIconSubPaint.setColor(textStyle.subvalueColor);
                        canvas.drawText(c.subvalue + '', x, iconsTop + 20 + 30 * $fontScale, textIconSubPaint);
                    }
                    // }
                }
                break;
            }
        }
    }
</script>

<canvasview bind:this={canvasView} height={rowHeight} on:draw={drawOnCanvas} on:tap={(event) => dispatch('tap', event)}>
    {#if modern}
        <WeatherIcon
            {animated}
            horizontalAlignment="left"
            iconData={[item.iconId, item.isDay]}
            marginLeft={MODERN_PADDING}
            marginTop={((MODERN_HEADER_HEIGHT - MODERN_ICON_SIZE) * $fontScale) / 2}
            size={MODERN_ICON_SIZE * $fontScale}
            verticalAlignment="top" />
    {:else}
        <WeatherIcon {animated} horizontalAlignment="right" iconData={[item.iconId, item.isDay]} marginRight={10} marginTop={7} size={ICON_WIDTH * $fontScale} />
    {/if}
</canvasview>
