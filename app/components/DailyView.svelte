<script context="module" lang="ts">
    import { createNativeAttributedString } from '@nativescript-community/text';
    import { Align, Canvas, LayoutAlignment, Paint, StaticLayout } from '@nativescript-community/ui-canvas';
    import WeatherIcon from '~/components/WeatherIcon.svelte';
    import { formatDate } from '~/helpers/locale';
    import type { DailyData } from '~/services/providers/weather';
    import { WeatherProps, formatWeatherValue, weatherDataService } from '~/services/weatherData';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import { colors, dailyDataAlignment, dailyDateFormat, fontScale, weatherDataLayout } from '~/variables';
    import { isEInk } from '~/helpers/theme';

    let textPaint: Paint;
    let textIconPaint: Paint;
    let textIconSubPaint: Paint;
    let paint: Paint;

    const PADDING_LEFT = 7;
    const ICON_WIDTH = 55;
</script>

<script lang="ts">
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline } = $colors);

    export let item: DailyData;
    export let animated: boolean = false;
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
        if (item) {
            redraw();
        }
    }
    function drawOnCanvas({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        paint.setColor(item.color);
        if (!isEInk) {
            canvas.drawRect(w - 5, 0, w, h, paint);
        }
        paint.setColor(colorOutline);
        canvas.drawLine(0, h, w, h - 1, paint);

        textPaint.setTextAlign(Align.RIGHT);
        textPaint.setTextSize(13 * $fontScale);
        textPaint.setColor(colorOnSurfaceVariant);
        canvas.drawText(item.description, w - 10, h - 7, textPaint);
        textPaint.setTextAlign(Align.LEFT);
        textPaint.setTextSize(22 * $fontScale);
        textPaint.setColor(colorOnSurface);
        canvas.drawText(formatDate(item.time, 'ddd', item.timezoneOffset), PADDING_LEFT, 26 * $fontScale, textPaint);
        textPaint.setColor(colorOnSurfaceVariant);
        textPaint.setTextSize(15 * $fontScale);
        canvas.drawText(formatDate(item.time, dailyDateFormat, item.timezoneOffset), PADDING_LEFT, 46 * $fontScale, textPaint);
        textPaint.setColor(colorOnSurface);

        const nString = createNativeAttributedString(
            {
                spans: [
                    {
                        fontSize: 17 * $fontScale,
                        color: colorOnSurfaceVariant,
                        text: formatWeatherValue(item, WeatherProps.temperatureMin)
                    },
                    {
                        fontSize: 20 * $fontScale,
                        color: colorOnSurface,
                        text: ' ' + formatWeatherValue(item, WeatherProps.temperatureMax)
                    }
                ]
            },
            null
        );
        canvas.save();
        const staticLayout = new StaticLayout(nString, textPaint, w - 10, LayoutAlignment.ALIGN_OPPOSITE, 1, 0, true);
        canvas.translate(0, 5);
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

        const centeredItemsToDraw = weatherDataService.getIconsData({ item, filter: [WeatherProps.windBeaufort], type: 'daily' });

        const count = centeredItemsToDraw.length;
        canvas.clipRect(60 * $fontScale, 0, w - ICON_WIDTH * $fontScale - 10, h);
        switch ($weatherDataLayout) {
            case 'line': {
                const lineHeight = 20 * $fontScale;
                const lineWidth = Math.min(130 * $fontScale, w / 2 - 70 * $fontScale);
                const centerX = 70 * $fontScale + lineWidth;
                const nbLines = Math.ceil(count / 2);
                const iconsTop = h / 2 - (nbLines / 2) * lineHeight;
                canvas.drawLine(centerX, iconsTop, centerX, iconsTop + lineHeight * nbLines, paint);
                for (let index = 0; index < nbLines - 1; index++) {
                    const y = iconsTop + lineHeight * (index + 1);
                    canvas.drawLine(centerX - lineWidth, y, centerX + lineWidth, y, paint);
                }
                const iconDelta = 20 * $fontScale;
                for (let index = 0; index < centeredItemsToDraw.length; index++) {
                    const columnIndex = index % 2;
                    const lineIndex = Math.floor(index / 2);
                    const y = iconsTop + lineHeight * lineIndex;
                    const c = centeredItemsToDraw[index];
                    const paint = c.paint || textIconPaint;
                    paint.setTextAlign(Align.CENTER);

                    if (c.icon) {
                        // paint.setColor(c.color || colorOnSurface);
                        // canvas.drawText(c.icon, columnIndex === 0 ? w2 - 20 : w2 + 20, y + lineHeight + lineHeight / 2 - paint.textSize / 2, paint);
                        const dataNString = createNativeAttributedString(
                            {
                                spans: [
                                    {
                                        fontSize: c.iconFontSize,
                                        color: c.iconColor || c.color || colorOnSurface,
                                        fontFamily: paint.fontFamily,
                                        text: c.icon
                                    }
                                ]
                            },
                            null
                        );
                        canvas.save();
                        const staticLayout = new StaticLayout(dataNString, textPaint, iconDelta, LayoutAlignment.ALIGN_CENTER, 1, 0, true);
                        // canvas.translate(columnIndex === 0 ? w2 - lineWidth : w2 + lineWidth  - staticLayout.getWidth(), y + lineHeight / 2 - staticLayout.getHeight() / 2);
                        canvas.translate(columnIndex === 0 ? centerX - lineWidth : centerX + 2, y + lineHeight / 2 - staticLayout.getHeight() / 2);
                        staticLayout.draw(canvas);
                        canvas.restore();
                    }
                    const dataNString = createNativeAttributedString(
                        {
                            spans: [
                                // c.icon && columnIndex === 1
                                //     ? {
                                //           fontSize: c.iconFontSize,
                                //           verticalAlignment: 'center',
                                //           color: c.color || colorOnSurface,
                                //           fontFamily: paint.fontFamily,
                                //           text: c.icon + ' '
                                //       }
                                //     : undefined,
                                c.value
                                    ? {
                                          //   verticalAlignment: 'center',
                                          fontSize: 12 * $fontScale,
                                          color: c.color || colorOnSurface,
                                          text: c.value + ' '
                                      }
                                    : undefined,
                                c.subvalue
                                    ? {
                                          fontSize: 9 * $fontScale,
                                          //   verticalAlignment: 'center',
                                          color: c.color || colorOnSurface,
                                          text: c.subvalue + ' '
                                      }
                                    : undefined
                                // c.icon && columnIndex === 0
                                //     ? {
                                //           fontSize: c.iconFontSize,
                                //           color: c.color || colorOnSurface,
                                //           verticalAlignment: 'center',
                                //           fontFamily: paint.fontFamily,
                                //           text: ' ' + c.icon
                                //       }
                                //     : undefined
                            ].filter((s) => !!s)
                        },
                        null
                    );
                    canvas.save();
                    const staticLayout = new StaticLayout(dataNString, textPaint, lineWidth, LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
                    canvas.translate(iconDelta + (columnIndex === 0 ? centerX - lineWidth + 5 : centerX + 5), y + lineHeight / 2 - staticLayout.getHeight() / 2);
                    // const staticLayout = new StaticLayout(dataNString, textPaint, lineWidth, columnIndex === 0 ? LayoutAlignment.ALIGN_OPPOSITE : LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
                    // canvas.translate(columnIndex === 0 ? w2 - lineWidth - 5 : w2 + 5, y + lineHeight / 2 - staticLayout.getHeight() / 2);
                    staticLayout.draw(canvas);
                    canvas.restore();
                }
                break;
            }
            default:
            case 'default': {
                const iconsTop = h / 2 - 20 * $fontScale;
                for (let index = 0; index < centeredItemsToDraw.length; index++) {
                    const c = centeredItemsToDraw[index];

                    const x =
                        $dailyDataAlignment === 'left'
                            ? 80 * $fontScale + index * 45 * $fontScale
                            : $dailyDataAlignment === 'right'
                              ? w - 100 * $fontScale - (count - 1 - index) * 45 * $fontScale
                              : w / 2 - 20 / $fontScale - ((count - 1) / 2 - index) * 45 * $fontScale;
                    const paint = c.paint || textIconPaint;
                    paint.setTextAlign(Align.CENTER);
                    // if (c.customDraw) {
                    //     c.customDraw(canvas, $fontScale, paint, c, x, iconsTop + 20, 40);
                    // } else {
                    paint.setTextSize(c.iconFontSize);
                    paint.setColor(c.iconColor || c.color || colorOnSurface);
                    if (c.icon) {
                        canvas.drawText(c.icon, x, iconsTop + 20, paint);
                    }
                    if (c.value) {
                        textIconSubPaint.setTextSize(12 * $fontScale);
                        textIconSubPaint.setColor(c.color || colorOnSurface);
                        canvas.drawText(c.value + '', x, iconsTop + 20 + 19 * $fontScale, textIconSubPaint);
                    }
                    if (c.subvalue) {
                        textIconSubPaint.setTextSize(9 * $fontScale);
                        textIconSubPaint.setColor(c.color || colorOnSurface);
                        canvas.drawText(c.subvalue + '', x, iconsTop + 20 + 30 * $fontScale, textIconSubPaint);
                    }
                    // }
                }
                break;
            }
        }
    }
</script>

<canvasview bind:this={canvasView} height={($weatherDataLayout === 'line' ? 110 : 100) * $fontScale} on:draw={drawOnCanvas} on:tap={(event) => dispatch('tap', event)}>
    <WeatherIcon {animated} horizontalAlignment="right" iconData={[item.iconId, item.isDay]} marginRight={10} marginTop={7} size={ICON_WIDTH * $fontScale} />
</canvasview>
