<script context="module" lang="ts">
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { createNativeAttributedString } from '@nativescript-community/text';
    import { Align, BitmapShader, Canvas, LayoutAlignment, Paint, StaticLayout, TileMode } from '@nativescript-community/ui-canvas';
    import { CombinedChart, LineChart } from '@nativescript-community/ui-chart';
    import { LimitLabelPosition, LimitLine } from '@nativescript-community/ui-chart/components/LimitLine';
    import { XAxisPosition } from '@nativescript-community/ui-chart/components/XAxis';
    import { AxisDependency } from '@nativescript-community/ui-chart/components/YAxis';
    import { LineData } from '@nativescript-community/ui-chart/data/LineData';
    import { LineDataSet, Mode } from '@nativescript-community/ui-chart/data/LineDataSet';
    import { ApplicationSettings, Color, ImageSource, Utils } from '@nativescript/core';
    import dayjs from 'dayjs';
    import HourlyView from '~/components/HourlyView.svelte';
    import WeatherIcon from '~/components/WeatherIcon.svelte';
    import { HOURLY_VIEW_MODE, MAIN_CHART_NB_HOURS, SETTINGS_HOURLY_VIEW_MODE, SETTINGS_MAIN_CHART_NB_HOURS } from '~/helpers/constants';
    import type { FavoriteLocation } from '~/helpers/favorites';
    import { isFavorite } from '~/helpers/favorites';
    import { formatDate, formatTime, l, lc } from '~/helpers/locale';
    import { isEInk, onThemeChanged } from '~/helpers/theme';
    import { prefs } from '~/services/preferences';
    import type { Currently, Hourly, MinutelyData } from '~/services/providers/weather';
    import { WeatherProps, formatWeatherValue, weatherDataService } from '~/services/weatherData';
    import { colors, fontScale, fonts, hourlyViewData, hourlyViewMode, rainColor, topViewHeight, weatherDataLayout } from '~/variables';
    import HourlyChartView from './HourlyChartView.svelte';
    import WindyView from './WindyView.svelte';

    const PADDING_LEFT = 7;
    const einkBmpShader = isEInk ? new BitmapShader(ImageSource.fromFileSync('~/assets/images/pattern.png'), TileMode.REPEAT, TileMode.REPEAT) : null;

    const textIconPaint = new Paint();
    textIconPaint.setTextAlign(Align.CENTER);
    const textPaint = new Paint();

    interface Item extends Currently {
        minutely?: MinutelyData[];
        lastUpdate: number;
        hourly?: Hourly[];
    }

    function formatLastUpdate(date) {
        if (dayjs(date).isBefore(dayjs().startOf('d'))) {
            return formatDate(date, 'ddd LT');
        } else {
            return formatTime(date, 'LT');
        }
    }

    function getHourlyViewMode(): string {
        return ApplicationSettings.getString(SETTINGS_HOURLY_VIEW_MODE, HOURLY_VIEW_MODE);
    }
</script>

<script lang="ts">
    const currentData = weatherDataService.currentWeatherData;

    let currentHourlyData: WeatherProps[], dataToShow: WeatherProps[];

    function updateDataToShow(hourlyViewData: WeatherProps[]) {
        currentHourlyData = hourlyViewData;
        DEV_LOG && console.log('currentHourlyData', currentHourlyData);
        dataToShow = [
            ...new Set(
                currentHourlyData
                    .filter((s) => currentData.includes(s))
                    .concat(currentHourlyData.indexOf(WeatherProps.iconId) !== -1 ? [WeatherProps.iconId] : [])
                    .concat(currentHourlyData.indexOf(WeatherProps.temperature) !== -1 ? [WeatherProps.temperature] : [])
                    .concat(currentHourlyData.indexOf(WeatherProps.windBearing) !== -1 ? [WeatherProps.windBearing] : [])
            )
        ];
    }
    $: updateDataToShow($hourlyViewData);

    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline } = $colors);

    // const arcPaint = new Paint();
    // arcPaint.style = Style.STROKE;
    // arcPaint.setTextAlign(Align.CENTER);
    // arcPaint.strokeCap = Cap.ROUND;
    export let item: Item;
    export let weatherLocation: FavoriteLocation;
    export let height;
    export let fakeNow;
    export let animated = false;
    let lineChart: NativeViewElementNode<LineChart>;
    const weatherIconSize = 110;
    let chartInitialized = false;
    let precipChartSet: LineDataSet;
    let cloudChartSet: LineDataSet;
    let lastChartData: {
        time: number;
        intensity: number;
    }[];

    let hasPrecip = false;

    // we need a factor cause using timestamp means
    // using 64bit data which canvas does not support (android Matrix specifically)
    const timeFactor = 1 / (1000 * 60 * 10);
    function updateLineChart(item: Item) {
        const chart = lineChart?.nativeView;
        if (chart) {
            let data = item.minutely;
            if (!data) {
                return;
            }
            let now = fakeNow || Date.now();
            const index = data.findIndex((v) => v.time >= now);
            now = Math.floor(now * timeFactor);
            const delta = now;
            now -= delta;

            data = data
                .slice(index)
                .map((d) => ({ ...d, time: Math.floor(d.time * timeFactor - delta) }))
                .filter((item, pos, arr) => arr.findIndex((d) => d.time === item.time) === pos);
            if (lastChartData === data) {
                return;
            }
            lastChartData = data;
            if (!data || data.length === 0) {
                hasPrecip = false;
                if (precipChartSet) {
                    precipChartSet.clear();
                }
                if (cloudChartSet) {
                    cloudChartSet.clear();
                }
                return;
            }
            if (data[0].time > 0) {
                data.unshift({ time: data[0].time - 1, intensity: 0 });
            }
            // DEV_LOG && console.log('data', JSON.stringify(data));
            const xAxis = chart.xAxis;
            const leftAxis = chart.leftAxis;
            if (!chartInitialized) {
                chartInitialized = true;
                chart.noDataText = null;
                chart.autoScaleMinMaxEnabled = true;
                chart.doubleTapToZoomEnabled = false;
                // chart.getLegend().enabled =(false);
                xAxis.enabled = true;
                xAxis.textSize = 10 * $fontScale;
                xAxis.labelTextAlign = Align.CENTER;
                xAxis.drawGridLines = false;
                // xAxis.setCenterAxisLabels(true);
                xAxis.ensureLastLabel = true;
                // xAxis.setGranularity(10 * 60 * 1000)
                // xAxis.setGranularityEnabled(true)
                xAxis.drawMarkTicks = true;
                xAxis.valueFormatter = {
                    getAxisLabel: (value, axis) => dayjs(value / timeFactor + delta).diff(now / timeFactor + delta, 'm') + 'm'
                };
                xAxis.position = XAxisPosition.BOTTOM;

                // const rightAxis = char   t.getAxisRight();
                // rightAxis.setEnabled(false);

                leftAxis.axisMinimum = 0;
                leftAxis.drawGridLines = false;
                leftAxis.drawLabels = false;
                leftAxis.drawMarkTicks = false;
                leftAxis.drawAxisLine = false;
                // leftAxis.removeAllLimitLines();
                [
                    { limit: 1, label: l('light') },
                    { limit: 2, label: l('medium') },
                    { limit: 3, label: l('heavy') }
                ].forEach((l) => {
                    const limitLine = new LimitLine(l.limit, l.label.toUpperCase());
                    limitLine.lineWidth = 1;
                    limitLine.xOffset = 0;
                    limitLine.textSize = 8 * $fontScale;
                    limitLine.yOffset = 1;
                    limitLine.enableDashedLine(2, 2, 0);
                    // limitLine.setLineColor('red');
                    limitLine.labelPosition = LimitLabelPosition.RIGHT_TOP;
                    leftAxis.addLimitLine(limitLine);
                });
            }
            const limitColor = new Color(colorOnSurface).setAlpha(100).hex;
            leftAxis.limitLines.forEach((l) => {
                l.textColor = limitColor;
                l.lineColor = limitColor;
            });
            xAxis.textColor = colorOnSurface;
            xAxis.axisMinimum = 0;

            // we want exactly one label per 10 min
            const labelCount = Math.max(0, Math.min(data.length ? (data[data.length - 1].time - now) / (10 * 60 * 1000 * timeFactor) + 1 : 0, 7));
            xAxis.labelCount = labelCount;
            xAxis.forceLabelsEnabled = true;

            let needsToSetData = false;
            let needsUpdate = false;
            hasPrecip = data.some((d) => d.intensity > 0);

            leftAxis.axisMinimum = 0;
            leftAxis.axisMaximum = 4;
            leftAxis.drawLimitLines = hasPrecip;
            if (hasPrecip) {
                const color = isEInk ? '#7f7f7f' : item.hourly?.[0]?.precipColor || rainColor.hex;
                if (!precipChartSet) {
                    needsToSetData = true;
                    precipChartSet = new LineDataSet(data, 'intensity', 'time', 'intensity');
                    precipChartSet.axisDependency = AxisDependency.LEFT;
                    precipChartSet.lineWidth = 1;
                    // precipChartSet.drawCircles=(true);
                    precipChartSet.drawFilledEnabled = true;
                    precipChartSet.fillAlpha = 150;
                    precipChartSet.mode = Mode.CUBIC_BEZIER;
                    precipChartSet.cubicIntensity = 0.4;
                    if (einkBmpShader) {
                        precipChartSet.fillShader = einkBmpShader;
                    }
                } else {
                    precipChartSet.values = data;
                    needsUpdate = true;
                }

                precipChartSet.setColor(color);
                precipChartSet.fillColor = color;
            } else if (precipChartSet && precipChartSet.entryCount > 0) {
                precipChartSet.clear();
                needsToSetData = true;
            }
            // const hasCloud = data.some((d) => d.cloudCeiling > 0);
            // const rightAxis = chart.getAxisRight();
            // rightAxis.drawLabels=(hasCloud);
            // // console.log('hasCloud', hasCloud, data);
            // if (hasCloud) {
            //     // rightAxis.labelCount=(4, false);
            //     if (!cloudChartSet) {
            //         needsToSetData = true;
            //         cloudChartSet = new LineDataSet(data, 'cloudCeiling', 'time', 'cloudCeiling');
            //         cloudChartSet.setAxisDependency(AxisDependency.RIGHT);
            //         cloudChartSet.lineWidth=(2);
            //         cloudChartSet.drawIconsEnabled=(false);
            //         cloudChartSet.drawValuesEnabled=(false);
            //         cloudChartSet.drawFilled=(false);
            //         cloudChartSet.setColor('gray');
            //         cloudChartSet.mode=(Mode.HORIZONTAL_BEZIER);
            //     } else {
            //         cloudChartSet.values=(data);
            //         needsUpdate = true;
            //     }
            // } else if (cloudChartSet) {
            //     cloudChartSet.clear();
            // }
            if (needsToSetData) {
                chart.data = new LineData([precipChartSet].filter((s) => !!s));
            } else if (needsUpdate) {
                precipChartSet.notifyDataSetChanged();
                chart.data.notifyDataChanged();
                chart.notifyDataSetChanged();
            }
        }
    }
    $: hasPrecip && canvasView?.nativeView.invalidate();
    $: item && canvasView?.nativeView.invalidate();
    $: if (lineChart) {
        updateLineChart(item);
    }

    $: if (weatherLocation) {
        weatherLocation.isFavorite = isFavorite(weatherLocation);
    }

    onThemeChanged(() => {
        const chart = lineChart?.nativeView;
        if (chart) {
            chart.xAxis.textColor = colorOnSurface;
            chart.invalidate();
            const limitColor = new Color(colorOnSurface).setAlpha(0.5).hex;
            chart.leftAxis.limitLines.forEach((l) => {
                l.textColor = limitColor;
                l.lineColor = limitColor;
            });
        }
    });
    let canvasView;
    function redraw() {
        const chart = lineChart?.nativeView;
        if (chartInitialized && chart) {
            const xAxis = chart.xAxis;
            const leftAxis = chart.leftAxis;
            leftAxis.limitLines.forEach((l) => {
                l.textSize = 8 * $fontScale;
            });
            xAxis.textSize = 10 * $fontScale;
        }
        lineChart?.nativeView.invalidate();
        canvasView?.nativeView.invalidate();
    }
    fontScale.subscribe(redraw);
    function drawOnCanvas({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const w2 = Utils.layout.toDeviceIndependentPixels(lineChart.nativeElement.getMeasuredWidth()) / 2;
        // canvas.translate(26, 0);

        textPaint.setColor(colorOnSurface);
        textPaint.setTextAlign(Align.LEFT);
        if (item.temperature) {
            textPaint.textSize = 36 * $fontScale;
            canvas.drawText(formatWeatherValue(item, WeatherProps.temperature), 10, 36 * $fontScale, textPaint);
        }
        const nString = createNativeAttributedString({
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
        });
        canvas.save();
        let staticLayout = new StaticLayout(nString, textPaint, w - 10, LayoutAlignment.ALIGN_OPPOSITE, 1, 0, false);
        canvas.translate(0, 30 * $fontScale);
        staticLayout.draw(canvas);
        canvas.restore();

        canvas.save();
        canvas.translate(10, h - 8 - 14 * $fontScale);
        textPaint.textSize = 14 * $fontScale;
        staticLayout = new StaticLayout(
            createNativeAttributedString({
                spans: [
                    {
                        color: '#ffa500',
                        fontFamily: $fonts.wi,
                        fontSize: 14 * $fontScale,
                        text: 'wi-sunrise '
                    },
                    {
                        text: formatTime(item.sunriseTime, undefined, item.timezoneOffset)
                    },
                    {
                        color: '#ff7200',
                        fontSize: 14 * $fontScale,
                        fontFamily: $fonts.wi,
                        text: '  wi-sunset '
                    },
                    {
                        text: formatTime(item.sunsetTime, undefined, item.timezoneOffset)
                    }
                ]
            }),
            textPaint,
            w - 10,
            LayoutAlignment.ALIGN_NORMAL,
            1,
            0,
            false
        );

        let iconsBottom = 26 * $fontScale;
        if ($fontScale > 1.5) {
            canvas.translate(0, -22 * $fontScale);
            iconsBottom += 22 * $fontScale;
        }
        staticLayout.draw(canvas);
        canvas.restore();

        textPaint.setTextAlign(Align.RIGHT);
        textPaint.textSize = 20 * $fontScale;
        canvas.drawText(formatDate(item.time, 'dddd', item.timezoneOffset), w - 10, 22 * $fontScale, textPaint);

        textPaint.textSize = 14 * $fontScale;
        canvas.drawText(`${lc('last_updated')}: ${formatLastUpdate(item.lastUpdate)}`, w - 10, h - 8, textPaint);

        if (item.description?.length) {
            textPaint.textSize = 15 * $fontScale;
            const width = w - 10 - 250;
            textPaint.setTextAlign(Align.LEFT);
            canvas.save();
            const staticLayout = new StaticLayout(item.description, textPaint, width, LayoutAlignment.ALIGN_OPPOSITE, 1, 0, false);
            canvas.translate(w - width - 10, h - iconsBottom - staticLayout.getHeight() - textPaint.textSize * 1.4);
            staticLayout.draw(canvas);
            canvas.restore();
        }

        //    canvas.drawText(item.description, w - 10, h - 8 - iconsBottom - textPaint.textSize , textPaint);

        textPaint.setColor(colorOutline);
        canvas.drawLine(0, h, w, h - 1, textPaint);

        const smallItemsToDraw = weatherDataService.getSmallIconsData({ item, type: 'currently' }).reverse();
        let iconRight = PADDING_LEFT;
        for (let index = 0; index < smallItemsToDraw.length; index++) {
            const c = smallItemsToDraw[index];

            const paint = c.paint || textIconPaint;
            paint.setTextAlign(Align.RIGHT);
            paint.setTextSize(c.iconFontSize);
            paint.setColor(c.color || colorOnSurface);
            if (c.customDraw) {
                const result = c.customDraw(canvas, $fontScale, paint, c, w - iconRight, h - iconsBottom - 15 * $fontScale, false);
                iconRight += result;
            } else if (c.icon) {
                canvas.drawText(c.icon, w - iconRight, h - iconsBottom, paint);
                iconRight += 24 * $fontScale;
            }
        }
        const centeredItemsToDraw = weatherDataService.getIconsData({ item, filter: [WeatherProps.windBeaufort], type: 'currently' });
        canvas.clipRect(0, 0, w - weatherIconSize * (2 - $fontScale), h);
        switch ($weatherDataLayout) {
            case 'line': {
                textPaint.setTextAlign(Align.LEFT);
                textIconPaint.setTextAlign(Align.CENTER);
                textIconPaint.color = colorOutline;
                const iconsTop = hasPrecip ? 45 * $fontScale : $topViewHeight / 2 - 20 * $fontScale;
                const lineHeight = 20 * $fontScale;
                const lineWidth = 100 * $fontScale;
                const nbLines = Math.ceil(centeredItemsToDraw.length / 2);
                canvas.drawLine(w2, iconsTop, w2, iconsTop + lineHeight * nbLines, textIconPaint);
                for (let index = 0; index < nbLines - 1; index++) {
                    const y = iconsTop + lineHeight * (index + 1);
                    canvas.drawLine(w2 - lineWidth, y, w2 + lineWidth, y, textIconPaint);
                }
                const iconDelta = 20 * $fontScale;
                for (let index = 0; index < centeredItemsToDraw.length; index++) {
                    const columnIndex = index % 2;
                    const lineIndex = Math.floor(index / 2);
                    const y = iconsTop + lineHeight * lineIndex;
                    const c = centeredItemsToDraw[index];
                    const paint = c.paint || textIconPaint;
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
                        canvas.translate(columnIndex === 0 ? w2 - lineWidth : w2 + 2, y + lineHeight / 2 - staticLayout.getHeight() / 2);
                        staticLayout.draw(canvas);
                        canvas.restore();
                    }
                    const dataNString = createNativeAttributedString(
                        {
                            spans: [
                                c.value
                                    ? {
                                          fontSize: 12 * $fontScale,
                                          color: c.color || colorOnSurface,
                                          text: c.value + ' '
                                      }
                                    : undefined,
                                c.subvalue
                                    ? {
                                          fontSize: 9 * $fontScale,
                                          color: c.color || colorOnSurface,
                                          text: c.subvalue + ' '
                                      }
                                    : undefined
                            ].filter((s) => !!s)
                        },
                        null
                    );
                    canvas.save();
                    const staticLayout = new StaticLayout(dataNString, textPaint, lineWidth, LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
                    canvas.translate(iconDelta + (columnIndex === 0 ? w2 - lineWidth + 5 : w2 + 5), y + lineHeight / 2 - staticLayout.getHeight() / 2);
                    // const staticLayout = new StaticLayout(dataNString, textPaint, lineWidth, columnIndex === 0 ? LayoutAlignment.ALIGN_OPPOSITE : LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
                    // canvas.translate(columnIndex === 0 ? w2 - lineWidth - 5 : w2 + 5, y + lineHeight / 2 - staticLayout.getHeight() / 2);
                    staticLayout.draw(canvas);
                    canvas.restore();
                }
                break;
            }
            default:
            case 'default': {
                const iconsTop = hasPrecip ? 45 * $fontScale : $topViewHeight / 2 - 20 * $fontScale;
                const iconsLeft = 26;
                centeredItemsToDraw.forEach((c, index) => {
                    const x = index * 45 * $fontScale + iconsLeft;
                    const paint = c.paint || textIconPaint;
                    paint.textSize = c.iconFontSize;
                    paint.setColor(c.iconColor || c.color || colorOnSurface);
                    paint.setTextAlign(Align.CENTER);
                    // if (c.customDraw) {
                    //     c.customDraw(canvas, $fontScale, textIconPaint, c, x, iconsTop + 20, 40);
                    // } else {
                    if (c.icon) {
                        canvas.drawText(c.icon, x, iconsTop + 20, paint);
                    }
                    if (c.value) {
                        textIconPaint.textSize = 12 * $fontScale;
                        textIconPaint.setColor(c.color || colorOnSurface);
                        canvas.drawText(c.value + '', x, iconsTop + 20 + 19 * $fontScale, textIconPaint);
                    }
                    if (c.subvalue) {
                        textIconPaint.textSize = 9 * $fontScale;
                        textIconPaint.setColor(c.color || colorOnSurface);
                        canvas.drawText(c.subvalue + '', x, iconsTop + 20 + 30 * $fontScale, textIconPaint);
                    }
                    // }
                });
                break;
            }
        }
    }

    function onChartConfigure(chart: CombinedChart): void {
        chart.leftAxis.drawAxisLine = false;
        chart.leftAxis.drawGridLines = false;
        chart.leftAxis.drawLabels = false;
        chart.rightAxis.drawAxisLine = false;
        chart.rightAxis.drawGridLines = false;
        chart.rightAxis.drawLabels = false;
        chart.setExtraOffsets(0, 40, 0, 10);
    }

    let hourlyChartNbHours = ApplicationSettings.getNumber(SETTINGS_MAIN_CHART_NB_HOURS, MAIN_CHART_NB_HOURS);
    prefs.on(`key:${SETTINGS_MAIN_CHART_NB_HOURS}`, () => {
        hourlyChartNbHours = ApplicationSettings.getNumber(SETTINGS_MAIN_CHART_NB_HOURS, MAIN_CHART_NB_HOURS);
    });
</script>

<gridlayout columns="*,auto" {height} rows={`${$topViewHeight},*`}>
    <canvasview bind:this={canvasView} id="topweather" colSpan={2} paddingBottom={10} paddingLeft={10} paddingRight={10} on:draw={drawOnCanvas}>
        <!-- <cgroup fontSize={14 * $fontScale} verticalAlignment="bottom">
            <cspan color="#ffa500" fontFamily={$fonts.wi} text="wi-sunrise " />
            <cspan text={formatTime(item.sunriseTime)} />
            <cspan color="#ff7200" fontFamily={$fonts.wi} text="  wi-sunset " />
            <cspan text={formatTime(item.sunsetTime)} />
        </cgroup> -->
    </canvasview>
    <!-- <mdbutton
        col={1}
        variant="text"
        class="icon-btn"
        marginRight={4}
        width={30}
        height={30}
        color={favoriteIconColor(weatherLocation)}
        rippleColor="#EFB644"
        on:tap={() => toggleItemFavorite(weatherLocation)}
        text={favoriteIcon(weatherLocation)}
        verticalAlignment="top"
        horizontalAlignment="left"
    /> -->
    <!-- the gridlayout is there to ensure a max width for the chart -->
    <gridlayout height={90} horizontalAlignment="left" marginBottom={45 * $fontScale} verticalAlignment="bottom" width={300}>
        <linechart bind:this={lineChart} visibility={hasPrecip ? 'visible' : 'hidden'} />
    </gridlayout>
    <WeatherIcon
        {animated}
        col={1}
        horizontalAlignment="right"
        iconData={[item.iconId, item.isDay]}
        marginBottom={$fontScale > 1 ? 17 * $fontScale * $fontScale : 17 * $fontScale}
        size={(weatherIconSize * 0.9) / Math.sqrt($fontScale)}
        verticalAlignment="middle"
        on:tap />
    {#if $hourlyViewMode === 'chart'}
        <HourlyChartView
            barWidth={1}
            borderBottomColor={colorOutline}
            borderBottomWidth={1}
            colSpan={2}
            {dataToShow}
            fixedBarScale={false}
            hourly={item.hourly.slice(0, hourlyChartNbHours)}
            {onChartConfigure}
            rightAxisSuggestedMaximum={8}
            row={1}
            showCurrentTimeLimitLine={false}
            temperatureLineWidth={3} />
    {:else if $hourlyViewMode === 'windy'}
        <WindyView colSpan={2} {dataToShow} items={item.hourly} row={1} />
    {:else}
        <HourlyView colSpan={2} items={item.hourly} row={1} />
    {/if}
</gridlayout>
