<script context="module" lang="ts">
    import { Align, LinearGradient, Paint, Path, Style, TileMode } from '@nativescript-community/ui-canvas';
    import { Color } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import WeatherIcon from '~/components/WeatherIcon.svelte';
    import { formatDate, formatTime, getLocalTime } from '~/helpers/locale';
    import { getCanvas } from '~/helpers/sveltehelpers';
    import { isEInk } from '~/helpers/theme';
    import type { Hourly } from '~/services/providers/weather';
    import { WeatherProps, formatWeatherValue, showHourlyPopover } from '~/services/weatherData';
    import { colorForAqi } from '~/services/airQualityData';
    import { generateGradient, windSpeedColor, windSpeedGradient } from '~/utils/utils.common';
    import { colors, fontScale, rainColor } from '~/variables';

    // Row heights relative to ROW_HEIGHT unit (set via prop)
    // hour row: 1 unit, icon row: 2 units, temp row: 2 units, other rows: 1 unit each

    const textPaint = new Paint();
    textPaint.setTextAlign(Align.CENTER);
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
    export let rowHeight: number;
    export let iconRowHeight: number;
    export let animated: boolean = false;

    let canvasView;

    function redraw() {
        canvasView && canvasView.nativeView.invalidate();
    }

    $: item && redraw();
    $: dataToShow && redraw();

    // Icon row is only present if iconId is in dataToShow
    function getRowTop(prop: WeatherProps): number {
        // rows are: hour(rowHeight), then each prop in dataToShow order
        let y = rowHeight; // skip hour row
        for (const p of dataToShow) {
            if (p === prop) return y;
            y += p === WeatherProps.iconId ? iconRowHeight : rowHeight;
        }
        return y;
    }

    function drawTempCurve(canvas, pHeight: number, curveTop: number) {
        if (!item.curveTempPoints) return;
        const w = canvas.getWidth();
        const points: number[] = item.curveTempPoints.slice();
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

            const endDay = getLocalTime(undefined, item.timezoneOffset).endOf('d').valueOf();

            // --- Hour row ---
            textPaint.setFontWeight('bold');
            textPaint.setColor(colorOnSurface);
            textPaint.setTextSize(12 * $fontScale);
            canvas.drawText(formatTime(item.time, undefined, item.timezoneOffset), w2, rowHeight * 0.65, textPaint);
            if (item.time > endDay) {
                textPaint.setTextSize(10 * $fontScale);
                textPaint.setFontWeight('normal');
                canvas.drawText(formatDate(item.time, 'ddd', item.timezoneOffset), w2, rowHeight * 0.92, textPaint);
            }
            textPaint.setFontWeight('normal');

            // --- Data rows ---
            for (const prop of dataToShow) {
                const rowTop = getRowTop(prop);
                const rh = prop === WeatherProps.iconId ? iconRowHeight : rowHeight;
                const rowMid = rowTop + rh * 0.65;

                switch (prop) {
                    case WeatherProps.iconId:
                        // WeatherIcon is placed as a child component — skip canvas drawing
                        break;

                    case WeatherProps.temperature: {
                        // Find rows below temperature to compute curve area
                        const precipIdx = dataToShow.indexOf(WeatherProps.precipAccumulation);
                        // Curve fills from just below hour row to just above precip row (or bottom if no precip)
                        const curveAreaTop = rowHeight; // start right at top of first data row
                        const curveAreaBottom = precipIdx !== -1 ? getRowTop(WeatherProps.precipAccumulation) + rowHeight : rowTop + rh;
                        const curveH = curveAreaBottom - curveAreaTop;

                        if (!isEInk && item.curveTempPoints) {
                            const gradient = generateGradient(5, item.min, item.max, curveH, 0);
                            pathPaint.setShader(gradient.gradient);
                            pathPaint.setAlpha(120);
                            drawTempCurve(canvas, curveH, curveAreaTop);
                            canvas.drawPath(curvePath, pathPaint);
                            pathPaint.setShader(null);
                            pathPaint.setAlpha(255);
                        }

                        // Draw temperature text
                        textPaint.setColor(colorOnSurface);
                        textPaint.setTextSize(13 * $fontScale);
                        canvas.drawText(formatWeatherValue(item, WeatherProps.temperature), w2, rowMid, textPaint);
                        break;
                    }

                    case WeatherProps.precipAccumulation: {
                        const precip = item.precipAccumulation || 0;
                        if (precip > 0 && item.maxPrecip > 0) {
                            const barH = (precip / item.maxPrecip) * rh * 0.9;
                            fillPaint.setColor(item.precipColor || rainColor.hex);
                            const precipProbability = item.precipProbability;
                            fillPaint.setAlpha(precipProbability === -1 || precipProbability === undefined ? 180 : Math.round(precipProbability * 2.55));
                            canvas.drawRect(0, rowTop + rh - barH, w, rowTop + rh, fillPaint);
                            fillPaint.setAlpha(255);
                        }
                        if (precip >= 0.1) {
                            textPaint.setColor(colorOnSurface);
                            textPaint.setTextSize(11 * $fontScale);
                            canvas.drawText(formatWeatherValue(item, WeatherProps.precipAccumulation, { join: '' }), w2, rowMid, textPaint);
                        }
                        break;
                    }

                    case WeatherProps.windSpeed: {
                        const speed = item.windSpeed;
                        if (speed) {
                            if (!isEInk) {
                                const grad = windSpeedGradient(item.prevWindSpeed, speed, item.nextWindSpeed, w);
                                bgPaint.setShader(grad);
                                bgPaint.setAlpha(160);
                                canvas.drawRect(0, rowTop, w, rowTop + rh, bgPaint);
                                bgPaint.setShader(null);
                                bgPaint.setAlpha(255);
                            }
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
                                const grad = windSpeedGradient(item.prevWindGust, gust, item.nextWindGust, w);
                                bgPaint.setShader(grad);
                                bgPaint.setAlpha(160);
                                canvas.drawRect(0, rowTop, w, rowTop + rh, bgPaint);
                                bgPaint.setShader(null);
                                bgPaint.setAlpha(255);
                            }
                            textPaint.setColor(colorOnSurface);
                            textPaint.setTextSize(10 * $fontScale);
                            canvas.drawText(String(Math.round(gust)), w2, rowMid, textPaint);
                        }
                        break;
                    }

                    case WeatherProps.aqi: {
                        const aqi = item.aqi;
                        if (aqi != null) {
                            if (!isEInk) {
                                const colorPrev = item.prevAqi != null ? colorForAqi(item.prevAqi) : '#00000000';
                                const colorCur = colorForAqi(aqi);
                                const colorNext = item.nextAqi != null ? colorForAqi(item.nextAqi) : '#00000000';
                                const grad = new LinearGradient(0, 0, w, 0, [colorPrev, colorCur, colorNext], [0, 0.5, 1], TileMode.CLAMP);
                                bgPaint.setShader(grad);
                                bgPaint.setAlpha(160);
                                canvas.drawRect(0, rowTop, w, rowTop + rh, bgPaint);
                                bgPaint.setShader(null);
                                bgPaint.setAlpha(255);
                            }
                            textPaint.setColor(colorOnSurface);
                            textPaint.setTextSize(11 * $fontScale);
                            canvas.drawText(String(Math.round(aqi)), w2, rowMid, textPaint);
                        }
                        break;
                    }

                    case WeatherProps.windBearing: {
                        const icon = item.windIcon;
                        if (icon) {
                            textPaint.setColor(colorOnSurfaceVariant);
                            textPaint.setTextSize(14 * $fontScale);
                            canvas.drawText(icon, w2, rowMid, textPaint);
                        }
                        break;
                    }

                    case WeatherProps.apparentTemperature:
                    case WeatherProps.relativeHumidity:
                    case WeatherProps.cloudCover:
                    case WeatherProps.uvIndex: {
                        const val = item[prop];
                        if (val != null) {
                            textPaint.setColor(colorOnSurfaceVariant);
                            textPaint.setTextSize(11 * $fontScale);
                            canvas.drawText(formatWeatherValue(item, prop, { join: '' }), w2, rowMid, textPaint);
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

    // Compute icon Y position for WeatherIcon child component
    $: iconRowTop = dataToShow.includes(WeatherProps.iconId) ? rowHeight + dataToShow.slice(0, dataToShow.indexOf(WeatherProps.iconId)).reduce((acc, p) => acc + (p === WeatherProps.iconId ? iconRowHeight : rowHeight), 0) : 0;
</script>

<canvasview bind:this={canvasView} on:draw={drawOnCanvas} on:tap={onTap}>
    {#if dataToShow.includes(WeatherProps.iconId)}
        <WeatherIcon
            {animated}
            iconData={[item.iconId, item.isDay]}
            isUserInteractionEnabled={false}
            marginTop={iconRowTop}
            size={iconRowHeight * 0.8}
            verticalAlignment="top" />
    {/if}
</canvasview>
