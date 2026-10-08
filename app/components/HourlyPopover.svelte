<script lang="ts">
    import { Color } from '@akylas/nativescript';
    import { createNativeAttributedString } from '@nativescript-community/text';
    import { Align, Canvas, CanvasView, Cap, DashPathEffect, LayoutAlignment, Paint, StaticLayout, Style } from '@nativescript-community/ui-canvas';
    import { closePopover } from '@nativescript-community/ui-popover/svelte';
    import { formatTime } from '~/helpers/locale';
    import { iconService } from '~/services/icon';
    import type { CommonWeatherData } from '~/services/providers/weather';
    import { CommonData, WeatherProps, weatherDataService } from '~/services/weatherData';
    import { accentFontWeight, colors, designStyle, fontScale } from '~/variables';
    import { dataTextStyle, modernDataColor, modernLineStyle, precipitationFill, textFontFamily } from '~/utils/designStyle';
    import { tempColor } from '~/utils/utils.common';
    import { splitValueUnit } from '~/utils/valueUnit';
    import WeatherIcon from './WeatherIcon.svelte';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { WeatherDataType } from '~/helpers/formatter';

    const labelPaint = new Paint();
    const legendPaint = new Paint();
    legendPaint.setStrokeCap(Cap.ROUND);
    const PRECIPITATION_KEYS: string[] = [WeatherProps.precipAccumulation, WeatherProps.rainPrecipitation, WeatherProps.snowfall];
    const modernTextPaint = new Paint();
    let canvas: NativeViewElementNode<CanvasView>;

    let { colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant, colorSurfaceContainer } = $colors;
    $: ({ colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant, colorSurfaceContainer } = $colors);
    $: modernStyle = $designStyle === 'modern';
    $: {
        const fontFamily = textFontFamily($designStyle);
        labelPaint.setFontFamily(fontFamily);
        modernTextPaint.setFontFamily(fontFamily);
    }
    $: rowHeight = (modernStyle ? 24 : 19) * $fontScale;
    export let item: CommonWeatherData;
    export let isUserInteractionEnabled: boolean = true;
    // opened from the chart: data drawn in the chart get a legend mark in their chart style
    export let legendKeys: string[] = [];

    $: updateNativeTexts(item, legendKeys);
    $: height = (data?.length ?? 0) * rowHeight;
    const animated = iconService.animated;

    let data: CommonData[];
    function updateNativeTexts(item: CommonWeatherData, legendKeys: string[]) {
        if (!item) {
            return;
        }
        data = weatherDataService.getAllIconsData({
            item,
            filter: [WeatherProps.windBeaufort, WeatherProps.precipAccumulation],
            addedBefore: [WeatherProps.temperature, WeatherProps.rainPrecipitation, WeatherProps.snowfall],
            addedAfter: [WeatherProps.rainSnowLimit, WeatherProps.iso],
            type: 'hourly'
        });
        // opened from the chart: every charted line gets a row, even when its value is usually hidden (low gust...)
        const shownKeys = data.map((d) => d.key);
        const missingChartKeys = legendKeys.filter((key) => shownKeys.indexOf(key) === -1 && PRECIPITATION_KEYS.indexOf(key) === -1 && key !== WeatherProps.iconId && key !== WeatherProps.windBearing);
        data = data.concat(missingChartKeys.map((key) => weatherDataService.getChartItemData(key as WeatherProps, item, 'hourly')).filter((d) => !!d));
        canvas?.nativeView?.invalidate();
    }

    function drawLegendMark(canvas: Canvas, key: string, top: number) {
        const markTop = top + 5 * $fontScale;
        const markBottom = top + rowHeight - 5 * $fontScale;
        const x = 3 * $fontScale;
        if (PRECIPITATION_KEYS.indexOf(key) !== -1 && PRECIPITATION_KEYS.some((precipitationKey) => legendKeys.indexOf(precipitationKey) !== -1)) {
            const fill = precipitationFill('modern', key === WeatherProps.snowfall ? 'snow' : 'rain', '#378ADD', 100);
            legendPaint.setStyle(Style.FILL);
            legendPaint.setColor(fill.color);
            legendPaint.setAlpha(fill.alpha);
            canvas.drawRoundRect(x - 2 * $fontScale, markTop, x + 2 * $fontScale, markBottom, 2 * $fontScale, 2 * $fontScale, legendPaint);
            return;
        }
        if (legendKeys.indexOf(key) === -1) {
            return;
        }
        const lineStyle = key === WeatherProps.temperature ? { width: 2.5 } : modernLineStyle(key);
        legendPaint.setStyle(Style.STROKE);
        legendPaint.setStrokeWidth(lineStyle.width);
        legendPaint.setPathEffect(lineStyle.dash ? new DashPathEffect(lineStyle.dash, 0) : null);
        legendPaint.setColor(key === WeatherProps.temperature ? tempColor(item.temperature, -20, 30) : (modernDataColor(key) ?? colorOnSurface));
        canvas.drawLine(x, markTop, x, markBottom, legendPaint);
    }

    function onDraw({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        let dy = 0;

        for (let index = 0; index < data.length; index++) {
            const c = data[index];
            const textStyle = dataTextStyle($designStyle, c, { onSurface: colorOnSurface, onSurfaceVariant: colorOnSurfaceVariant }, $fontScale);
            const paint = c.paint || labelPaint;
            paint.color = textStyle.iconColor;
            paint.setTextAlign(Align.CENTER);
            if (modernStyle) {
                // (legend mark), icon, unit right after it, value right aligned
                const centerY = dy + rowHeight / 2;
                const hasLegend = legendKeys.length > 0;
                const iconX = (hasLegend ? 20 : 12) * $fontScale;
                if (hasLegend) {
                    drawLegendMark(canvas, c.key, dy);
                }
                paint.textSize = c.iconFontSize;
                canvas.drawText(c.icon || ' ', iconX, centerY + c.iconFontSize * 0.35, paint);
                const { amount, extra, unit } = c.value !== undefined ? splitValueUnit(c.value, c.subvalue) : { amount: '', unit: '', extra: c.subvalue };
                modernTextPaint.setColor(textStyle.subvalueColor);
                modernTextPaint.setTextSize(textStyle.subvalueFontSize);
                modernTextPaint.setTextAlign(Align.LEFT);
                canvas.drawText(unit, iconX + 16 * $fontScale, centerY + textStyle.subvalueFontSize * 0.35, modernTextPaint);
                modernTextPaint.setTextAlign(Align.RIGHT);
                modernTextPaint.setColor(textStyle.valueColor);
                modernTextPaint.setTextSize(textStyle.valueFontSize);
                modernTextPaint.setFontWeight($accentFontWeight);
                canvas.drawText(amount, w, centerY + textStyle.valueFontSize * 0.35, modernTextPaint);
                const amountWidth = modernTextPaint.measureText(amount);
                modernTextPaint.setFontWeight('normal');
                if (extra) {
                    modernTextPaint.setColor(textStyle.subvalueColor);
                    modernTextPaint.setTextSize(textStyle.subvalueFontSize);
                    canvas.drawText(extra, w - amountWidth - 6 * $fontScale, centerY + textStyle.valueFontSize * 0.35, modernTextPaint);
                }
                dy += rowHeight;
                continue;
            }
            paint.textSize = c.iconFontSize * 0.8;
            canvas.drawText(c.icon || ' ', 10, dy + rowHeight - (__IOS__ ? 5 : 2) * $fontScale, paint);

            const nativeText = createNativeAttributedString({
                spans: [
                    c.value !== undefined
                        ? {
                              fontSize: 14 * $fontScale,
                              //   verticalAlignment: 'center',
                              color: textStyle.valueColor,
                              text: c.value + (c.subvalue ? ' ' : '\n')
                          }
                        : undefined,
                    c.subvalue !== undefined
                        ? {
                              fontSize: 11 * $fontScale,
                              color: textStyle.subvalueColor,
                              //   verticalAlignment: 'center',
                              text: c.subvalue + '\n'
                          }
                        : undefined
                ].filter((s) => !!s)
            });
            canvas.save();
            const staticLayout = new StaticLayout(nativeText, labelPaint, w - 60 * $fontScale, LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
            canvas.translate(30 * $fontScale, dy);
            // const staticLayout = new StaticLayout(dataNString, textPaint, lineWidth, columnIndex === 0 ? LayoutAlignment.ALIGN_OPPOSITE : LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
            // canvas.translate(columnIndex === 0 ? w2 - lineWidth - 5 : w2 + 5, y + lineHeight / 2 - staticLayout.getHeight() / 2);
            staticLayout.draw(canvas);
            canvas.restore();

            dy += rowHeight;
        }
    }
</script>

<gesturerootview columns="auto" rows="auto" {...$$restProps} on:tap>
    <gridlayout
        backgroundColor={new Color(colorBackground).setAlpha(240).hex}
        borderColor={modernStyle ? colorOutlineVariant : colorOutline}
        borderRadius={modernStyle ? 12 : __IOS__ ? 14 : 8}
        borderWidth={1}
        columns={`${100 * $fontScale},${50 * $fontScale}`}
        {isUserInteractionEnabled}
        padding={modernStyle ? 10 : 5}
        rows={`auto,auto,${height}`}
        on:tap={() => closePopover()}>
        <WeatherIcon {animated} col={1} iconData={[item.iconId, item.isDay]} {isUserInteractionEnabled} verticalAlignment="top" />
        {#if modernStyle}
            <label colSpan={2}>
                <cspan color={colorOnSurface} fontSize={15 * $fontScale} fontWeight="bold" text={formatTime(item.time, 'LT', item.timezoneOffset) + ' '} />
                <cspan color={colorOnSurfaceVariant} fontSize={12 * $fontScale} text={formatTime(item.time, 'DD/MM', item.timezoneOffset)} />
            </label>
            <label colSpan={2} color={colorOnSurfaceVariant} fontSize={13 * $fontScale} marginBottom={8} row={1} text={item.description} />
        {:else}
            <label colSpan={2} fontSize={14 * $fontScale} fontWeight="bold" text={formatTime(item.time, 'LT', item.timezoneOffset) + '\n' + formatTime(item.time, 'DD/MM', item.timezoneOffset)} />
            <label colSpan={2} fontSize={14 * $fontScale} marginBottom={10} row={1} text={item.description} />
        {/if}
        <!-- <label lineHeight={18 * $fontScale} row={1} text={iconsNativeString} textAlignment="center" verticalTextAlignment="center" /> -->
        <!-- <label col={1} lineHeight={18 * $fontScale} row={1} text={textNativeString} /> -->
        <canvasView bind:this={canvas} colSpan={2} row={2} on:draw={onDraw} />
    </gridlayout>
</gesturerootview>
