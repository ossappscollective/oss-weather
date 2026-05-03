<script context="module" lang="ts">
    import { Align, LayoutAlignment, LinearGradient, Paint, Path, StaticLayout, Style, TileMode } from '@nativescript-community/ui-canvas';
    import { showError } from '@shared/utils/showError';
    import WeatherIcon from '~/components/WeatherIcon.svelte';
    import { formatDate, formatTime, getLocalTime } from '~/helpers/locale';
    import { getCanvas } from '~/helpers/sveltehelpers';
    import { isDarkTheme, isEInk } from '~/helpers/theme';
    import type { Hourly } from '~/services/providers/weather';
    import { WeatherProps, appPaint, convertWeatherValueToUnit, formatWeatherValue, showHourlyPopover } from '~/services/weatherData';
    import { colorForAqi } from '~/services/airQualityData';
    import { generateGradient, windSpeedColor } from '~/utils/utils.common';
    import { colors, fontScale, nightColor, rainColor } from '~/variables';
    import { createNativeAttributedString } from '@nativescript-community/text';
    import { ICON_ROW_SCALE, getRowUnits } from '~/components/WindyView.svelte';
    import { Color } from '@nativescript/core';

    const nightBackColor = nightColor.setAlpha(15).hex;

    const textPaint = new Paint();
    const bgPaint = new Paint();
    const fillPaint = new Paint();
    fillPaint.setStyle(Style.FILL);
    const pathPaint = new Paint();
    pathPaint.setStyle(Style.FILL);
    const curvePath = new Path();

    export interface WindyItemData extends Hourly {
        index: number;
        min: number;
        max: number;
        tempDelta: number;
        curveTempPoints: number[];
        curvePrecipPoints: number[];
        prevWindSpeed?: number;
        nextWindSpeed?: number;
        prevWindGust?: number;
        nextWindGust?: number;
        prevAqi?: number;
        nextAqi?: number;
        maxPrecip: number;
    }
</script>

<script lang="ts">
    $: ({ colorOnSurface, colorOnSurfaceVariant } = $colors);

    export let item: WindyItemData;
    export let dataToShow: WeatherProps[];
    export let animated: boolean = false;

    let canvasView;

    function redraw() {
        canvasView && canvasView.nativeView.invalidate();
    }

    $: item && redraw();
    $: dataToShow && redraw();

    function getRowTop(rowHeight, prop: WeatherProps): number {
        // rows are: hour(rowHeight), then each prop in dataToShow order
        let y = rowHeight; // skip hour row
        for (const p of dataToShow) {
            if (p === prop) return y;
            y += p === WeatherProps.iconId ? rowHeight * ICON_ROW_SCALE : rowHeight;
        }
        return y;
    }

    function drawCurve(canvas, curvePoints, pHeight: number, curveTop: number) {
        if (!curvePoints) return;
        const w = canvas.getWidth();
        const points: number[] = curvePoints.slice();
        // Pad points for edge cases (same as HourlyItem)
        if (item.index === 0) {
            points.unshift(points[0], points[0], points[0]);
        } else if (item.index === 1) {
            points.unshift(points[0], points[0]);
        } else if (item.index === 2) {
            points.unshift(points[0]);
        } else if (points.length === 5) {
            points.push(points[points.length - 1]);
        } else if (points.length === 4) {
            points.push(points[points.length - 1], points[points.length - 1]);
        } else if (points.length === 3) {
            points.push(points[points.length - 1], points[points.length - 1], points[points.length - 1]);
        }
        curvePath.reset();
        const pWidth = w;
        const startX = (-5 * w) / 2;
        let lastPoint: number;
        const intensity = 0.2;
        points.forEach((p, i) => {
            const curXVal = startX + pWidth * i;
            const prevXVal = startX + pWidth * Math.max(i - 1, 0);
            const nextXVal = startX + pWidth * Math.min(i + 1, points.length - 1);
            const prevPrevXVal = startX + pWidth * Math.max(i - 2, 0);
            const yVal = curveTop + pHeight * (1 - p);
            if (i === 0) {
                curvePath.moveTo(startX, yVal);
            } else {
                const prevDx = (curXVal - prevPrevXVal) * intensity;
                const prevDy = (pHeight * (1 - p) - pHeight * (1 - points[Math.max(i - 2, 0)])) * intensity;
                const curDx = (nextXVal - prevXVal) * intensity;
                const curDy = (pHeight * (1 - points[Math.min(i + 1, points.length - 1)]) - pHeight * (1 - lastPoint)) * intensity;
                curvePath.cubicTo(prevXVal + prevDx, curveTop + pHeight * (1 - lastPoint) + prevDy, curXVal - curDx, yVal - curDy, curXVal, yVal);
            }
            lastPoint = p;
        });
        // Close the fill path along the bottom
        curvePath.lineTo(startX + pWidth * (points.length - 1), curveTop + pHeight);
        curvePath.lineTo(startX, curveTop + pHeight);
        curvePath.close();
    }

    function drawOnCanvas(event) {
        try {
            const canvas = getCanvas(event.canvas);
            const w = canvas.getWidth();
            const w2 = w / 2;
            const h = canvas.getHeight();

            const rowHeight = h / getRowUnits(dataToShow);
            const iconRowHeight = rowHeight * ICON_ROW_SCALE;

            if (!isEInk && !item.isDay) {
                canvas.drawColor(nightBackColor);
            }

            const endDay = getLocalTime(undefined, item.timezoneOffset).endOf('d').valueOf();

            // --- Hour row ---
            textPaint.setFontWeight('bold');
            textPaint.setColor(colorOnSurface);
            textPaint.setTextSize(12 * $fontScale);
            textPaint.setTextAlign(Align.LEFT);
            const time = formatTime(item.time, undefined, item.timezoneOffset);
            //split AM to render smaller if present
            const array = time.split(' ');
            const hour = array[0].split(':')[0];
            if (array.length > 0) {
                canvas.save();
                canvas.translate(0, 0);
                new StaticLayout(
                    createNativeAttributedString({
                        spans: [
                            {
                                text: hour,
                                fontSize: 13 * $fontScale
                            },
                            {
                                text: array[1],
                                fontSize: 8 * $fontScale
                            }
                        ]
                    }),
                    textPaint,
                    w,
                    LayoutAlignment.ALIGN_CENTER,
                    1,
                    0,
                    true
                ).draw(canvas);
                canvas.restore();
            } else {
                textPaint.setTextAlign(Align.CENTER);
                canvas.drawText(hour, w2, 12 * $fontScale, textPaint);
            }
            if (item.time > endDay) {
                textPaint.setTextAlign(Align.CENTER);
                textPaint.setTextSize(9 * $fontScale);
                textPaint.setFontWeight('normal');
                canvas.drawText(formatDate(item.time, 'ddd', item.timezoneOffset), w2, 24 * $fontScale, textPaint);
            }
            textPaint.setFontWeight('normal');
            // --- Data rows ---
            // DEV_LOG && console.log('dataToShow', dataToShow);
            for (const prop of dataToShow) {
                const rowTop = getRowTop(rowHeight, prop);
                const rh = prop === WeatherProps.iconId ? rowHeight * ICON_ROW_SCALE : rowHeight;
                const rowMid = rowTop + rh * 0.65;
                function drawGradient(colors) {
                    if (!isEInk) {
                        const gradient = new LinearGradient(-w / 2, 0, w + w / 2, 0, [colors[0], colors[1], colors[1], colors[2]], [0, 0.46, 0.54, 1], TileMode.CLAMP);
                        bgPaint.setShader(gradient);
                        // bgPaint.setAlpha(160);
                        canvas.drawRect(-w / 2, rowTop, w + w / 2, rowTop + rh, bgPaint);
                        bgPaint.setShader(null);
                        // bgPaint.setAlpha(255);
                    }
                }
                switch (prop) {
                    case WeatherProps.iconId:
                        // WeatherIcon is placed as a child component — skip canvas drawing
                        break;

                    case WeatherProps.temperature: {
                        // Find rows below temperature to compute curve area
                        const precipIdx = dataToShow.indexOf(WeatherProps.precipAccumulation);
                        // Curve fills from just below hour row to just above precip row (or bottom if no precip)
                        const curveAreaTop = rowHeight; // start right at top of first data row
                        const curveAreaBottom = precipIdx !== -1 ? getRowTop(rowHeight, WeatherProps.precipAccumulation) + rowHeight : rowTop + rh;
                        const curveH = curveAreaBottom - curveAreaTop;

                        if (item.curveTempPoints) {
                            const gradient = generateGradient(5, item.min, item.max, curveH, 0);
                            if (!isEInk) {
                                pathPaint.setShader(gradient.gradient);
                            }
                            pathPaint.setAlpha(80);
                            drawCurve(canvas, item.curveTempPoints, curveH, curveAreaTop);
                            canvas.drawPath(curvePath, pathPaint);
                            pathPaint.setShader(null);
                            pathPaint.setAlpha(255);
                        }

                        // Draw temperature text
                        textPaint.setTextAlign(Align.CENTER);
                        textPaint.setColor(colorOnSurface);
                        textPaint.setTextSize(13 * $fontScale);
                        const data = convertWeatherValueToUnit(item, prop, { forceUnit: true });
                        canvas.drawText(data[0] + '', w2, rowMid, textPaint);
                        break;
                    }

                    case WeatherProps.precipAccumulation: {
                        const precip = item.precipAccumulation || 0;
                        // if (precip > 0 && item.maxPrecip > 0) {
                        //     const barH = (precip / item.maxPrecip) * rh * 0.9;
                        //     fillPaint.setColor(item.precipColor || rainColor.hex);
                        //     const precipProbability = item.precipProbability;
                        //     fillPaint.setAlpha(precipProbability === -1 || precipProbability === undefined ? 180 : Math.round(precipProbability * 2.55)); // 2.55 = 255/100, converts 0-100% to 0-255 alpha
                        //     canvas.drawRect(0, rowTop + rh - barH, w, rowTop + rh, fillPaint);
                        //     fillPaint.setAlpha(255);
                        // }
                        if (item.curvePrecipPoints) {
                            canvas.save();
                            canvas.clipRect(-1, rowTop, w + 2, rowTop + rh);
                            fillPaint.setColor(new Color(item.precipColor ?? rainColor.hex)[isDarkTheme() ? 'darken' : 'lighten'](10));
                            // fillPaint.setAlpha(100)
                            drawCurve(canvas, item.curvePrecipPoints, rh, rowTop);
                            canvas.drawPath(curvePath, fillPaint);
                            canvas.restore();
                        }
                        if (precip >= 0.1) {
                            textPaint.setTextAlign(Align.CENTER);
                            textPaint.setColor(colorOnSurface);
                            textPaint.setTextSize(11 * $fontScale);
                            const data = convertWeatherValueToUnit(item, prop, { forceUnit: true });
                            canvas.drawText(data[0] + '', w2, rowMid, textPaint);
                        }
                        break;
                    }

                    case WeatherProps.windSpeed: {
                        const speed = item.windSpeed;
                        if (speed) {
                            if (!isEInk) {
                                const colorCur = windSpeedColor(speed) ?? '#ffffff00';
                                const colorPrev = item.prevWindSpeed !== undefined ? (windSpeedColor(item.prevWindSpeed) ?? '#ffffff00') : colorCur;
                                const colorNext = item.nextWindSpeed !== undefined ? (windSpeedColor(item.nextWindSpeed) ?? '#ffffff00') : colorCur;
                                drawGradient([colorPrev, colorCur, colorNext]);
                            }
                            textPaint.setTextAlign(Align.CENTER);
                            textPaint.setColor(colorOnSurface);
                            textPaint.setTextSize(12 * $fontScale);
                            canvas.drawText(String(Math.round(speed)), w2, rowMid, textPaint);
                        }
                        break;
                    }

                    case WeatherProps.windGust: {
                        const gust = item.windGust;
                        if (gust) {
                            if (!isEInk) {
                                const colorCur = windSpeedColor(gust) ?? '#ffffff00';
                                const colorPrev = item.prevWindGust !== undefined ? (windSpeedColor(item.prevWindGust) ?? '#ffffff00') : colorCur;
                                const colorNext = item.nextWindGust !== undefined ? (windSpeedColor(item.nextWindGust) ?? '#ffffff00') : colorCur;
                                drawGradient([colorPrev, colorCur, colorNext]);
                            }
                            textPaint.setTextAlign(Align.CENTER);
                            textPaint.setColor(colorOnSurface);
                            textPaint.setTextSize(10 * $fontScale);
                            canvas.drawText(String(Math.round(gust)), w2, rowMid, textPaint);
                        }
                        break;
                    }

                    case WeatherProps.aqi: {
                        const aqi = item.aqi;
                        if (aqi != null) {
                            const colorCur = colorForAqi(aqi) ?? '#ffffff00';
                            const colorPrev = item.prevAqi !== undefined ? (colorForAqi(item.prevAqi) ?? '#ffffff00') : colorCur;
                            const colorNext = item.nextAqi !== undefined ? (colorForAqi(item.nextAqi) ?? '#ffffff00') : colorCur;
                            drawGradient([colorPrev, colorCur, colorNext]);
                            textPaint.setTextAlign(Align.CENTER);
                            textPaint.setColor(colorOnSurface);
                            textPaint.setTextSize(11 * $fontScale);
                            canvas.drawText(String(Math.round(aqi)), w2, rowMid, textPaint);
                        }
                        break;
                    }

                    case WeatherProps.windBearing: {
                        const icon = item.windIcon;
                        if (icon) {
                            appPaint.setColor(colorOnSurfaceVariant);
                            appPaint.setTextSize(14 * $fontScale);
                            // icons do not seem to be really centered
                            canvas.drawText(icon, w2, rowMid + 3 * $fontScale, appPaint);
                        }
                        break;
                    }

                    default: {
                        const val = item[prop];
                        if (val != null) {
                            textPaint.setTextAlign(Align.CENTER);
                            textPaint.setColor(colorOnSurfaceVariant);
                            textPaint.setTextSize(11 * $fontScale);
                            const data = convertWeatherValueToUnit(item, prop, { forceUnit: true });
                            canvas.drawText(data[0] + '', w2, rowMid, textPaint);
                        }
                        break;
                    }
                }
            }
        } catch (error) {
            showError(error);
        }
    }

    async function onTap() {
        try {
            await showHourlyPopover(item, {}, { anchor: canvasView?.nativeView });
        } catch (error) {
            showError(error);
        }
    }
</script>

<gridlayout>
    <canvasview bind:this={canvasView} on:draw={drawOnCanvas} on:tap={onTap} />
    {#if dataToShow.includes(WeatherProps.iconId)}
        <WeatherIcon {animated} iconData={[item.iconId, item.isDay]} isUserInteractionEnabled={false} marginTop={24 * $fontScale} size={40 * $fontScale} verticalAlignment="top" />
    {/if}
</gridlayout>
