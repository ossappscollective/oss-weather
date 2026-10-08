<script context="module" lang="ts">
    import { Align, BitmapShader, LayoutAlignment, LinearGradient, Paint, Path, StaticLayout, Style, TileMode } from '@nativescript-community/ui-canvas';
    import { ApplicationSettings, Color, ImageSource } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import WeatherIcon from '~/components/WeatherIcon.svelte';
    import { DEFAULT_HOURLY_ODD_COLORS, SETTINGS_HOURLY_ODD_COLORS } from '~/helpers/constants';
    import { formatDate, formatTime, getLocalTime, lc } from '~/helpers/locale';
    import { getCanvas } from '~/helpers/sveltehelpers';
    import { isEInk, theme } from '~/helpers/theme';
    import { prefs } from '~/services/preferences';
    import type { Hourly } from '~/services/providers/weather';
    import { WeatherProps, formatWeatherValue, showHourlyPopover, weatherDataService } from '~/services/weatherData';
    import { generateGradient } from '~/utils/utils.common';
    import { accentFontWeight, alwaysShowPrecipProb, colors, designStyle, fontScale, rainColor, snowColor } from '~/variables';
    import { modernDataColor, precipKind, precipitationFill, splitTimePeriod, windSpeedColor } from '~/utils/designStyle';
    import { splitValueUnit } from '~/utils/valueUnit';

    const einkBmpShader = isEInk ? new BitmapShader(ImageSource.fromFileSync('~/assets/images/pattern.png'), TileMode.REPEAT, TileMode.REPEAT) : null;

    const BOTTOM_INSET = isEInk ? 0 : 10;
    const MODERN_BAR_INSET = 3;
    const MODERN_BAR_RADIUS = 4;
    const MODERN_GUST_COLOR = '#E24B4A';

    const textPaint = new Paint();
    textPaint.setTextAlign(Align.CENTER);
    const paint = new Paint();
    paint.setTextAlign(Align.CENTER);
    const whitePaint = new Paint();
    const pathPaint = new Paint();

    pathPaint.setStrokeWidth(5);
    pathPaint.setStyle(Style.STROKE);
    const curvePath = new Path();

    let lastGradient: { min; max; gradient: LinearGradient };
    let useOddColors = ApplicationSettings.getBoolean(SETTINGS_HOURLY_ODD_COLORS, DEFAULT_HOURLY_ODD_COLORS);
    let oddColor = useOddColors ? new Color((theme === 'black' ? 0.2 : 0.05) * 255, 120, 120, 120) : null;
    prefs.on(`key:${SETTINGS_HOURLY_ODD_COLORS}`, () => {
        useOddColors = ApplicationSettings.getBoolean(SETTINGS_HOURLY_ODD_COLORS, DEFAULT_HOURLY_ODD_COLORS);
        oddColor = useOddColors ? new Color((theme === 'black' ? 0.2 : 0.05) * 255, 120, 120, 120) : null;
    });
</script>

<script lang="ts">
    $: ({ colorOnSurface, colorOnSurfaceVariant } = $colors);

    export let item: Hourly & {
        index: number;
        min: number;
        max: number;
        tempDelta: number;
        curveTempPoints: number[];
        odd: boolean;
    };
    export let animated: boolean = false;
    let canvasView;
    let precipitationHeight = 0;

    function redraw() {
        canvasView && canvasView.nativeView.invalidate();
    }
    if (isEInk) {
        whitePaint.setColor('#ffffff');
        pathPaint.setColor('#7f7f7f');
    }
    $: {
        if (item.precipShowSnow) {
            precipitationHeight = item.snowfall > 1 ? Math.sqrt(item.snowfall) : item.snowfall;
        } else {
            precipitationHeight = item.precipAccumulation > 1 ? Math.sqrt(item.precipAccumulation) : item.precipAccumulation;
        }
        if ($designStyle && $accentFontWeight) {
            redraw();
        }
    }
    const weatherIconSize = 40;

    function drawEInkText(canvas, text, x, y) {
        canvas.save();
        const staticLayout = new StaticLayout(text, textPaint, canvas.getWidth(), LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
        const width = staticLayout.getLineWidth(0);
        const height = staticLayout.getHeight();
        canvas.translate(x, y - height);
        canvas.drawRoundRect(-width / 2 - 2, -1, width / 2 + 4, height - 0, 4, 4, whitePaint);
        staticLayout.draw(canvas);
        canvas.restore();
    }
    function drawOnCanvas(event) {
        try {
            const endDay = getLocalTime(undefined, item.timezoneOffset).endOf('d').valueOf();
            const canvas = getCanvas(event.canvas); // simple trick to get typings
            const w = canvas.getWidth();
            const w2 = w / 2;
            const h = canvas.getHeight();
            textPaint.setFontWeight('normal');
            const modern = $designStyle === 'modern' && !isEInk;
            // modern bars: inset and rounded, down near the bottom edge (no color band below)
            const drawBar = (left: number, top: number, right: number) => {
                if (modern) {
                    const radius = Math.min(MODERN_BAR_RADIUS * $fontScale, (h - MODERN_BAR_INSET - top) / 2);
                    canvas.drawRoundRect(left + MODERN_BAR_INSET, top, right - MODERN_BAR_INSET, h - MODERN_BAR_INSET, radius, radius, paint);
                } else {
                    canvas.drawRect(left, top, right, h - BOTTOM_INSET, paint);
                }
            };

            if (!isEInk && !modern && item.odd && oddColor) {
                canvas.drawColor(oddColor);
            }
            let color;
            const precipProbability = item.precipProbability;
            if ((precipProbability === -1 || precipProbability > 0) && precipitationHeight > 0) {
                const rain = item.rain;
                const snowfall = item.snowfall;
                if (item.mixedRainSnow && rain >= 0.1 && snowfall >= 0.1) {
                    let height = item.rain > 1 ? Math.sqrt(item.rain) : item.rain;
                    let precipTop = (0.5 + (1 - height / 5) / 2) * (h - BOTTOM_INSET);
                    const rainFill = precipitationFill($designStyle, 'rain', rainColor.hex, precipProbability);
                    paint.setColor(rainFill.color);
                    paint.setAlpha(rainFill.alpha);
                    if (isEInk) {
                        paint.setShader(einkBmpShader);
                        canvas.drawRect(0, precipTop, w / 2, h - BOTTOM_INSET, paint);
                        paint.setShader(null);
                        paint.setStyle(Style.STROKE);
                    }
                    drawBar(0, precipTop, w / 2);

                    height = item.snowfall > 1 ? Math.sqrt(item.snowfall) : item.snowfall;
                    precipTop = (0.5 + (1 - height / 5) / 2) * (h - BOTTOM_INSET);
                    const snowFill = precipitationFill($designStyle, 'snow', snowColor.hex, precipProbability);
                    paint.setColor(snowFill.color);
                    paint.setAlpha(snowFill.alpha);
                    if (isEInk) {
                        paint.setShader(einkBmpShader);
                        canvas.drawRect(w / 2, precipTop, w, h - BOTTOM_INSET, paint);
                        paint.setShader(null);
                        paint.setStyle(Style.STROKE);
                    }
                    drawBar(w / 2, precipTop, w);
                } else {
                    const precipTop = (0.5 + (1 - precipitationHeight / 5) / 2) * (h - BOTTOM_INSET);
                    const precipFill = precipitationFill($designStyle, precipKind(item), item.precipColor, precipProbability);
                    paint.setColor(precipFill.color);
                    paint.setAlpha(precipFill.alpha);
                    if (isEInk) {
                        paint.setShader(einkBmpShader);
                        canvas.drawRect(0, precipTop, w, h - BOTTOM_INSET, paint);
                        paint.setShader(null);
                        paint.setStyle(Style.STROKE);
                    }
                    drawBar(0, precipTop, w);
                }

                if (isEInk) {
                    paint.setStyle(Style.FILL);
                }
            }
            if (($alwaysShowPrecipProb && (precipProbability > 0 || item.precipAccumulation >= 0.1)) || ((precipProbability === -1 || precipProbability > 10) && item.precipAccumulation >= 0.1)) {
                let deltaY = BOTTOM_INSET + 2;
                textPaint.setTextSize(10 * $fontScale);
                textPaint.setColor(colorOnSurface);
                textPaint.setAlpha(150);
                if (modern) {
                    // amount without unit (the bar says it is precipitation), probability above it
                    deltaY = 4;
                    textPaint.setTextSize(11 * $fontScale);
                    textPaint.setAlpha(255);
                }

                if (item.precipAccumulation >= 0.1) {
                    if (isEInk) {
                        drawEInkText(canvas, formatWeatherValue(item, WeatherProps.precipAccumulation), w2, h);
                    } else if (modern) {
                        textPaint.setFontWeight($accentFontWeight);
                        canvas.drawText(splitValueUnit(formatWeatherValue(item, WeatherProps.precipAccumulation)).amount, w2, h - deltaY * $fontScale, textPaint);
                        textPaint.setFontWeight('normal');
                    } else {
                        canvas.drawText(formatWeatherValue(item, WeatherProps.precipAccumulation), w2, h - deltaY * $fontScale, textPaint);
                    }
                    deltaY += modern ? 13 : 10;
                }
                if (precipProbability > 0) {
                    if (modern) {
                        textPaint.setColor(colorOnSurfaceVariant);
                    }
                    if (isEInk) {
                        drawEInkText(canvas, formatWeatherValue(item, WeatherProps.precipProbability), w2, h - deltaY * $fontScale);
                    } else {
                        canvas.drawText(formatWeatherValue(item, WeatherProps.precipProbability), w2, h - deltaY * $fontScale, textPaint);
                    }
                }
            }
            canvas.save();
            const iconDecale = 27 * $fontScale + weatherIconSize * $fontScale + 11 * $fontScale;
            const lineOffset = iconDecale + 11 * $fontScale + 13 * $fontScale + (11 * $fontScale + 4);
            const pHeight = h - lineOffset - (22 * $fontScale + 10 * $fontScale);

            canvas.translate(0, lineOffset);
            if (item.curveTempPoints) {
                if (!isEInk) {
                    if (!lastGradient || lastGradient.min !== item.min || lastGradient.max !== item.max) {
                        lastGradient = generateGradient(5, item.min, item.max, pHeight + 33, 0);
                    }
                    pathPaint.setShader(lastGradient.gradient);
                }
                const points: number[] = item.curveTempPoints.slice();
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
                let lastPoint;
                const intensity = 0.2;
                points.forEach((p, i) => {
                    const curXVal = startX + pWidth * i;
                    const prevXVal = startX + pWidth * Math.max(i - 1, 0);
                    const nextXVal = startX + pWidth * Math.min(i + 1, points.length - 1);
                    const prevPrevXVal = startX + pWidth * Math.max(i - 2, 0);
                    if (i === 0) {
                        curvePath.moveTo(startX, pHeight * (1 - p));
                    } else {
                        const prevDx = (curXVal - prevPrevXVal) * intensity;
                        const prevDy = (pHeight * (1 - p) - pHeight * (1 - points[Math.max(i - 2, 0)])) * intensity;
                        const curDx = (nextXVal - prevXVal) * intensity;
                        const curDy = (pHeight * (1 - points[Math.min(i + 1, points.length - 1)]) - pHeight * (1 - lastPoint)) * intensity;

                        curvePath.cubicTo(prevXVal + prevDx, pHeight * (1 - lastPoint) + prevDy, curXVal - curDx, pHeight * (1 - p) - curDy, curXVal, pHeight * (1 - p));
                    }
                    lastPoint = p;
                });
                canvas.drawPath(curvePath, pathPaint);
            }
            textPaint.setColor(modern ? colorOnSurface : colorOnSurfaceVariant);
            textPaint.setTextSize((modern ? 15 : 13) * $fontScale);
            // modern: the temperature is the main value of the hour
            textPaint.setFontWeight(modern ? $accentFontWeight : 'normal');
            canvas.drawText(`${formatWeatherValue(item, WeatherProps.temperature)}`, w2, pHeight * (1 - item.tempDelta) - 6 * $fontScale, textPaint);
            textPaint.setFontWeight('normal');
            canvas.restore();

            if (item.cloudCeiling > 0) {
                const heightProb = 1 - item.cloudCeiling / 6000;
                const top = 0.3 * (h - 30) * heightProb + 13;
                paint.setColor(item.cloudColor);
                paint.setAlpha((item.cloudCover / 100) * heightProb * 150);
                canvas.drawRect(0, 0, w, top, paint);
                textPaint.setColor(color);
                textPaint.setTextSize(10 * $fontScale);
                textPaint.setAlpha((item.cloudCover / 100) * heightProb * 255);
                canvas.drawText(formatWeatherValue(item, WeatherProps.cloudCeiling), w2, top + 20 * $fontScale, textPaint);
                textPaint.setAlpha(255);
                paint.setAlpha(255);
            }
            // if (item.iso > 0) {
            //     const heightProb = 1 - item.iso / 8000;
            //     const top = 0.8 * (h - 30) * heightProb + 13;
            //     paint.setAlpha(128);
            //     paint.setColor(snowColor);
            //     paint.setStrokeWidth(2);
            //     canvas.drawLine(0, top, 5, top, paint);
            //     textPaint.setColor(snowColor);
            //     textPaint.setAlpha(128);
            //     textPaint.setTextSize(10 * $fontScale);
            //     textPaint.setTextAlign(Align.LEFT);
            //     canvas.drawText(formatValueToUnit(item.iso, UNITS.Distance), 10, top + 2 * $fontScale, textPaint);
            //     textPaint.setTextAlign(Align.CENTER);
            //     textPaint.setAlpha(255);
            //     paint.setAlpha(255);
            // }
            if (!isEInk && item.aqi && item.aqiColor) {
                paint.setColor(item.aqiColor);
                canvas.drawRect(0, 0, w, 3, paint);
                // paint.setColor(item.color);
                // canvas.drawRect(0, h - 5, w, h, paint);
                // } else {
            }
            paint.setColor(item.color);
            if (!isEInk && !modern) {
                canvas.drawRect(0, h - BOTTOM_INSET, w, h, paint);
            }

            // modern: "now" stands out, the other hours are muted
            const isNow = modern && item.index === 0;
            textPaint.setFontWeight(!modern || isNow ? 'bold' : 'normal');
            textPaint.setColor(!modern || isNow ? colorOnSurface : colorOnSurfaceVariant);
            textPaint.setTextSize(13 * $fontScale);
            if (modern) {
                // the AM/PM marker is drawn smaller; the day is shown by the strip's day chip and a midnight line
                const { period, time } = isNow ? { time: lc('now'), period: '' } : splitTimePeriod(formatTime(item.time, undefined, item.timezoneOffset));
                textPaint.setTextAlign(Align.LEFT);
                const timeWidth = textPaint.measureText(time);
                const periodText = period ? ' ' + period : '';
                textPaint.setTextSize(9 * $fontScale);
                const periodWidth = textPaint.measureText(periodText);
                const timeLeft = w2 - (timeWidth + periodWidth) / 2;
                textPaint.setTextSize(13 * $fontScale);
                canvas.drawText(time, timeLeft, 16 * $fontScale, textPaint);
                textPaint.setTextSize(9 * $fontScale);
                canvas.drawText(periodText, timeLeft + timeWidth, 16 * $fontScale, textPaint);
                textPaint.setTextAlign(Align.CENTER);
                if (getLocalTime(item.time, item.timezoneOffset).hour() === 0) {
                    paint.setColor(colorOnSurfaceVariant);
                    paint.setAlpha(80);
                    canvas.drawLine(0, 0, 0, h, paint);
                }
            } else {
                canvas.drawText(formatTime(item.time, undefined, item.timezoneOffset), w2, 16 * $fontScale, textPaint);
                if (item.time > endDay) {
                    textPaint.setTextSize(12 * $fontScale);
                    canvas.drawText(formatDate(item.time, 'ddd', item.timezoneOffset), w2, 28 * $fontScale, textPaint);
                }
            }
            textPaint.setFontWeight('normal');

            const windSpeedData = weatherDataService.getItemData(WeatherProps.windSpeed, item);

            let iconDeltaY = 0;
            if (windSpeedData) {
                // the icon font may not have text glyphs: icon and text get their own paint, centered together
                const iconPaint = windSpeedData.paint;
                // modern: the value alone, the unit is implied by the wind icon
                const text = modern ? ` ${windSpeedData.value}` : ` ${windSpeedData.value} ${windSpeedData.subvalue}`;
                iconPaint.setTextSize(11 * $fontScale);
                iconPaint.setColor(modern ? windSpeedColor(item.windSpeed, modernDataColor(WeatherProps.windSpeed) ?? colorOnSurface) : windSpeedData.color || colorOnSurface);
                iconPaint.setTextAlign(Align.LEFT);
                textPaint.setTextSize(11 * $fontScale);
                textPaint.setColor(modern ? colorOnSurfaceVariant : windSpeedData.color || colorOnSurface);
                textPaint.setTextAlign(Align.LEFT);
                const iconWidth = iconPaint.measureText(windSpeedData.icon);
                const left = w2 - (iconWidth + textPaint.measureText(text)) / 2;
                canvas.drawText(windSpeedData.icon, left, iconDecale, iconPaint);
                canvas.drawText(text, left + iconWidth, iconDecale, textPaint);
                textPaint.setTextAlign(Align.CENTER);
            }
            iconDeltaY += 18;
            const windGustData = weatherDataService.getItemData(WeatherProps.windGust, item);
            if (windGustData) {
                // modern: a plain red value unless the gust is a warning (which keeps its filled badge)
                const gustData = modern ? { ...windGustData, subvalue: '', customDrawColor: windGustData.backgroundColor ? windGustData.customDrawColor : MODERN_GUST_COLOR } : windGustData;
                windGustData.customDraw(canvas, $fontScale, paint, gustData, w2, iconDecale + 4 - 18 + iconDeltaY);
            }
        } catch (error) {
            showError(error);
        }
    }
    async function onTap() {
        try {
            await showHourlyPopover(
                item,
                {},
                {
                    anchor: canvasView?.nativeView
                }
            );
        } catch (error) {
            showError(error);
        }
    }
</script>

<canvasview bind:this={canvasView} on:draw={drawOnCanvas} on:tap={onTap}>
    <WeatherIcon {animated} iconData={[item.iconId, item.isDay]} isUserInteractionEnabled={false} marginTop={27 * $fontScale} size={weatherIconSize * $fontScale} verticalAlignment="top" />
</canvasview>
