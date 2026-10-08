<svelte:options accessors />

<script context="module" lang="ts">
    import { Align, Canvas, CanvasView, DashPathEffect, LinearGradient, Paint, Path, Rect, RectF } from '@nativescript-community/ui-canvas';
    import { CombinedChart } from '@nativescript-community/ui-chart';
    import { DrawOrder } from '@nativescript-community/ui-chart/charts/CombinedChart';
    import { ScatterShape } from '@nativescript-community/ui-chart/charts/ScatterChart';
    import { LimitLine } from '@nativescript-community/ui-chart/components/LimitLine';
    import { XAxisPosition } from '@nativescript-community/ui-chart/components/XAxis';
    import { CombinedData } from '@nativescript-community/ui-chart/data/CombinedData';
    import { LineData } from '@nativescript-community/ui-chart/data/LineData';
    import { LineDataSet, Mode } from '@nativescript-community/ui-chart/data/LineDataSet';
    import { ScatterData } from '@nativescript-community/ui-chart/data/ScatterData';
    import { ScatterDataSet } from '@nativescript-community/ui-chart/data/ScatterDataSet';
    import { Highlight } from '@nativescript-community/ui-chart/highlight/Highlight';
    import { Application, Color, CoreTypes, EventData, ImageSource, ObservableArray, OrientationChangedEventData, Utils } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import type HourlyPopover__SvelteComponent_ from '~/components/HourlyPopover.svelte';
    import { formatValueToUnit, windIcon } from '~/helpers/formatter';
    import { formatTime, getLocalTime, lc } from '~/helpers/locale';
    import { isEInk, onThemeChanged } from '~/helpers/theme';
    import type { CommonWeatherData, DailyData, Hourly } from '~/services/providers/weather';
    import { accentFontWeight, cloudyColor, colors, dailyDateFormat, designStyle, fontScale, rainColor, screenWidthDips, snowColor } from '~/variables';
    import { modernDataColor, modernLineStyle, modernPrecipColor, precipKind, precipitationFill, styledDataIcon, windSpeedColor } from '~/utils/designStyle';

    import { AxisDependency } from '@nativescript-community/ui-chart/components/YAxis';
    import { BarData } from '@nativescript-community/ui-chart/data/BarData';
    import { BarDataSet } from '@nativescript-community/ui-chart/data/BarDataSet';
    import { Entry } from '@nativescript-community/ui-chart/data/Entry';
    import { Utils as ChartUtils } from '@nativescript-community/ui-chart/utils/Utils';
    import { onDestroy, onMount } from 'svelte';
    import { iconService } from '~/services/icon';
    import {
        WeatherProps,
        appPaint,
        convertWeatherValueToUnit,
        defaultPropUnit,
        getWeatherDataColor,
        getWeatherDataTitle,
        propToUnit,
        showHourlyPopover,
        wdPaint,
        weatherDataService
    } from '~/services/weatherData';
    import { ValueRange, computeDataRange, getNaturalRange, makeScaler, pickReferenceProp, resolveRange } from '~/utils/chartScale';
    import { generateGradient, loadImage, tempColor } from '~/utils/utils.common';
    import { contentGradientRange, extremaIndexes, nightSpans, plotPadding } from '~/utils/chartLabels';

    const highlightPaint = new Paint();
    highlightPaint.setColor('white');
    highlightPaint.setStrokeWidth(2);
    highlightPaint.setPathEffect(new DashPathEffect([3, 3], 0));
    highlightPaint.setTextAlign(Align.LEFT);
    highlightPaint.setTextSize(10);

    const LINE_WIDTH = 2;

    // modern: night shading instead of a grid, solid temperature line, dashed labelled secondary lines
    const MODERN_NOW_COLOR = '#D85A30';
    const MODERN_NIGHT_ALPHA = 12;
    const MODERN_BAR_RADIUS = 3;
    const MODERN_CLOUD_ALPHA = 40;
    // modern plot paddings (px): room for the low labels under the lines, the high labels and day pills over them
    const MODERN_BOTTOM_PADDING = 18;
    const cloudPaint = new Paint();
    const nightPaint = new Paint();
    const tagPaint = new Paint();
    const dayLabelPaint = new Paint();
    dayLabelPaint.setTextAlign(Align.LEFT);
    const pointPaint = new Paint();
    const selectionPaint = new Paint();
    selectionPaint.setStrokeWidth(1.5);
    const selectionTextPaint = new Paint();
    selectionTextPaint.setTextAlign(Align.CENTER);
    let classicAxes: { leftLabels: boolean; rightLabels: boolean; leftLine: boolean; rightLine: boolean; xLineColor: string };

    const CHART_TYPE = {
        [WeatherProps.precipAccumulation]: 'precipitationchart',
        [WeatherProps.cloudCover]: 'linechart'
    };

    const SCALED_SUFFIX = 'ChartScaled';
    // iconId and windBearing are fake sets pinned to the right axis, cloudCover already rescales
    // itself through `ignoreForMinMax` and the `drawFill` custom renderer
    const NOT_SCALED: WeatherProps[] = [WeatherProps.iconId, WeatherProps.windBearing, WeatherProps.cloudCover];
</script>

<script lang="ts">
    import { ComponentInstanceInfo } from '~/utils/ui';
    import { PROVIDER_PADDING } from '~/helpers/constants';

    let { colorOnSurface, colorOnSurfaceVariant, colorOutline, colorSurface, colorSurfaceContainer } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline, colorSurface, colorSurfaceContainer } = $colors);

    const currentData = weatherDataService.currentWeatherData;
    const screenOrientation = undefined;
    const combinedChartData = new CombinedData();
    const hidden: string[] = [];

    export let hourly: Hourly[];
    export let dataToShow = [...new Set([WeatherProps.precipAccumulation].filter((s) => currentData.includes(s)).concat([WeatherProps.windBearing, WeatherProps.iconId, WeatherProps.temperature]))];
    export let temperatureLineWidth = 3;
    export let barWidth = 0.8;
    export let fixedBarScale = false;
    export let rightAxisSuggestedMaximum = 10;
    export let showCurrentTimeLimitLine = true;
    // modern: day name pills on each day change (useless for a single day chart)
    export let showDayLabels = true;
    export let onChartConfigure: (chart: CombinedChart) => void = null;
    export let maxDatalength = 0;
    export const legends = new ObservableArray([]);
    export let startTime: number = null;

    let chartView: NativeViewElementNode<CombinedChart>;
    let highlightCanvas: NativeViewElementNode<CanvasView>;

    let temperatureData: ValueRange;
    // plotted raw, so the left axis describes it. Every other line metric is remapped into its range
    let referenceProp: WeatherProps;
    // modern night ranges, in hours from the start
    let nightRanges: { from: number; to: number }[] = [];
    let startTimestamp = 0;
    let timeRange = 0;
    let timezoneOffset;
    let chartNeedsZoomUpdate = false;
    let iconCache: { [k: string]: ImageSource } = {};
    export let chartInitialized = false;
    let highlightedItem: CommonWeatherData;
    let highlightedMargin: string;
    let highlightedAlignment: CoreTypes.HorizontalAlignmentType;

    export function getChart() {
        return chartView?.nativeElement;
    }

    function getIcon(iconId, isDay): ImageSource {
        if (!iconId) {
            return null;
        }
        const realIcon = iconService.getIconPath(iconId, isDay, false);
        if (!realIcon) {
            return null;
        }
        let icon = iconCache[realIcon];
        if (icon) {
            return icon;
        }
        icon = loadImage(realIcon, { resizeThreshold: 80 });
        if (icon && !realIcon.startsWith('android.resource://')) {
            iconCache[realIcon] = icon;
        }
        return icon;
    }
    onMount(async () => {
        Application.on(Application.orientationChangedEvent, onOrientationChanged);
    });

    onDestroy(() => {
        Application.off(Application.orientationChangedEvent, onOrientationChanged);
        if (__ANDROID__) {
            Object.values(iconCache).forEach((item) => (item.android as android.graphics.Bitmap)?.recycle());
            iconCache = null;
        }
    });

    let lastIconHour: number;
    let lastWindIconHour: number;
    let lastXLabelIconHour: number;
    let valuesToDraw: number[] = [];
    let hasSnowFall = false;

    // the left axis spans every line metric at once, so the biggest magnitude used to flatten all the
    // others. Returns the property each remapped metric is plotted from, raw values staying untouched
    function computeScaledValues(data: CommonWeatherData[]) {
        const scaledKeys: { [k: string]: string } = {};
        const lineProps = dataToShow.filter((key) => (CHART_TYPE[key] || 'linechart') === 'linechart' && NOT_SCALED.indexOf(key) === -1);
        referenceProp = pickReferenceProp(lineProps);
        if (lineProps.length < 2) {
            return scaledKeys;
        }
        const referenceRange = referenceProp === WeatherProps.temperature ? temperatureData : computeDataRange(data.map((d) => d[referenceProp]));
        // a flat reference leaves nothing to map the others into, better keep the chart as it was
        if (!referenceRange || referenceRange.max <= referenceRange.min) {
            return scaledKeys;
        }
        for (const key of lineProps) {
            if (key === referenceProp) {
                continue;
            }
            const sourceRange = getNaturalRange(key) || computeDataRange(data.map((d) => d[key]));
            if (!sourceRange) {
                continue;
            }
            const scale = makeScaler(sourceRange, referenceRange);
            const scaledKey = key + SCALED_SUFFIX;
            for (const entry of data) {
                const value = entry[key];
                if (value !== undefined && value !== null && !isNaN(value)) {
                    entry[scaledKey] = scale(value);
                }
            }
            scaledKeys[key] = scaledKey;
        }
        return scaledKeys;
    }

    function updateLineChart(setData = true) {
        try {
            const chart = chartView?.nativeView;
            if (chart) {
                chart.maxVisibleValueCount = 10000;
                const xAxis = chart.xAxis;
                const leftAxis = chart.leftAxis;
                const rightAxis = chart.rightAxis;
                if (!chartInitialized) {
                    chartInitialized = true;
                    rightAxis.enabled = true;
                    rightAxis.drawGridLines = false;
                    // leftAxis.textColor = rightAxis.textColor = xAxis.textColor = highlightPaint.color = labelPaint.color = colorOnSurface;
                    leftAxis.textColor = rightAxis.textColor = xAxis.textColor = highlightPaint.color = colorOnSurface;
                    leftAxis.gridColor = rightAxis.gridColor = xAxis.gridColor = colorOnSurfaceVariant + '33';
                    chart.minOffset = -100;
                    chart.clipValuesToContent = false;
                    chart.disableScrollEnabled = false;
                    // modern: the plot starts under the icons and wind arrows (drawn up to 40), so lines never cross them
                    chart.setExtraOffsets(0, $designStyle === 'modern' ? 46 : 30, 0, 0);
                    chart.highlightsFilterByAxis = false;
                    chart.highlightPerTapEnabled = true;
                    chart.highlightPerDragEnabled = true;
                    chart.pinchZoomEnabled = true;
                    chart.dragEnabled = true;
                    chart.scaleXEnabled = true;
                    chart.scaleYEnabled = false;
                    chart.autoScaleMinMaxEnabled = false;
                    xAxis.enabled = true;
                    xAxis.textSize = 10 * $fontScale;
                    xAxis.labelTextAlign = Align.CENTER;
                    xAxis.ensureLastLabel = true;
                    xAxis.avoidFirstLastClipping = false;
                    xAxis.position = XAxisPosition.BOTTOM;
                    xAxis.yOffset = 12;
                    xAxis.axisMinimum = -1.5;
                    leftAxis.spaceBottom = rightAxis.spaceBottom = 5;
                    leftAxis.spaceTop = rightAxis.spaceTop = 5;
                    // axes hold raw values, so they must be converted to the units the user picked
                    leftAxis.valueFormatter = {
                        getAxisLabel: (value) => (referenceProp ? formatValueToUnit(value, propToUnit(referenceProp), defaultPropUnit(referenceProp)) : value + '')
                    };
                    rightAxis.valueFormatter = {
                        getAxisLabel: (value) =>
                            dataToShow.indexOf(WeatherProps.precipAccumulation) !== -1
                                ? formatValueToUnit(value, propToUnit(WeatherProps.precipAccumulation), defaultPropUnit(WeatherProps.precipAccumulation))
                                : value + ''
                    };
                    chart.data = combinedChartData;
                    chart.customRenderer = {
                        drawFill(canvas: Canvas, dataSet: LineDataSet, spline: Path, trans: any, min: number, max: number, superMethod: Function) {
                            if (dataSet.label === WeatherProps.cloudCover && $designStyle === 'modern') {
                                // rounded bars like the rain ones, 100% reaching the top padding of the lines
                                const contentRect = chart.viewPortHandler.contentRect;
                                const maxHeight = contentRect.height() - modernTopPadding();
                                const hourWidth = chart.getPixelForValues(1, 0, AxisDependency.LEFT).x - chart.getPixelForValues(0, 0, AxisDependency.LEFT).x;
                                const halfWidth = (hourWidth * barWidth) / 2 - 1;
                                const radius = Math.min(MODERN_BAR_RADIUS, halfWidth);
                                cloudPaint.setColor(modernDataColor(WeatherProps.cloudCover));
                                cloudPaint.setAlpha(MODERN_CLOUD_ALPHA);
                                for (let index = 0; index < dataSet.entryCount; index++) {
                                    const entry = dataSet.getEntryForIndex(index);
                                    if (entry.deltaHours < min - 1 || entry.deltaHours > max + 1 || !(entry.cloudCover > 0)) {
                                        continue;
                                    }
                                    const x = chart.getPixelForValues(entry.deltaHours, 0, AxisDependency.LEFT).x;
                                    const top = contentRect.bottom - (Math.min(100, entry.cloudCover) / 100) * maxHeight;
                                    canvas.drawRoundRect(x - halfWidth, top, x + halfWidth, contentRect.bottom, radius, radius, cloudPaint);
                                }
                            } else if (dataSet.label === WeatherProps.cloudCover) {
                                const scale = chart.yChartMax / 100;
                                canvas.save();
                                canvas.scale(1, scale, 0, chart.viewPortHandler.contentRect.bottom);
                                superMethod();
                                canvas.restore();
                            } else {
                                superMethod();
                            }
                        },
                        drawIcon(canvas: Canvas, chart: CombinedChart, dataSet, dataSetIndex, entry, entryIndex, icon: any, x: number, y: number) {
                            const date = getLocalTime(startTimestamp + entry['deltaHours'] * 3600 * 1000, timezoneOffset);
                            const scaleX = chart.viewPortHandler.scaleX;
                            const hour = date.valueOf() / (3600 * 1000);
                            const modulo = Math.max(Math.round(timeRange / (scaleX * 10)), 1);
                            if (dataSet.label === WeatherProps.iconId) {
                                const imageSource = icon as ImageSource;
                                const iconSize = 30;
                                const padding = iconService.usingProvider ? PROVIDER_PADDING : 0;
                                if ((icon && Math.abs(hour - lastIconHour) >= modulo) || (lastIconHour === undefined && hour % modulo === 0)) {
                                    const drawOffsetX = x - iconSize / 2;
                                    const drawOffsetY = 0;
                                    canvas.drawBitmap(
                                        imageSource,
                                        new Rect(0, 0, imageSource.width, imageSource.height),
                                        new RectF(drawOffsetX + padding, drawOffsetY + padding, drawOffsetX + iconSize - 2 * padding, drawOffsetY + iconSize - 2 * padding),
                                        null
                                    );
                                    lastIconHour = hour;
                                }
                            } else if (dataSet.label === WeatherProps.windBearing) {
                                if (Math.abs(hour - lastWindIconHour) >= modulo || (lastWindIconHour === undefined && hour % modulo === 0)) {
                                    const item = entry as Hourly | DailyData;
                                    const drawOffsetY = 40;
                                    if ($designStyle === 'modern') {
                                        // Tabler arrow from the data icon font, colored by speed
                                        wdPaint.setTextAlign(Align.CENTER);
                                        wdPaint.setTextSize(12);
                                        wdPaint.setColor(isEInk ? dataSet.color : windSpeedColor(item.windSpeed, modernDataColor(WeatherProps.windBearing) ?? colorOnSurface));
                                        canvas.drawText(styledDataIcon('modern', { fontFamily: 'app', icon: icon as string }).icon, x, drawOffsetY, wdPaint);
                                    } else {
                                        appPaint.setTextSize(10);
                                        appPaint.color = !isEInk ? (item.windSpeed >= 70 ? '#ff0353' : item.windSpeed > 40 ? '#FFBC03' : dataSet.color) : dataSet.color;
                                        canvas.drawText(icon as string, x, drawOffsetY, appPaint);
                                    }
                                    lastWindIconHour = hour;
                                }
                            }
                        },
                        drawValue(c: Canvas, chart, dataSet, dataSetIndex: number, entry, entryIndex: number, valueText: string, x: number, y: number, color: string | Color, paint: Paint) {
                            // the label keeps the real prop even when the set is plotted from a scaled one
                            const yProperty = dataSet.label;
                            const value = entry as CommonWeatherData;
                            if ($designStyle === 'modern' && yProperty !== WeatherProps.temperature) {
                                return;
                            }
                            if (valuesToDraw.indexOf(entryIndex) !== -1) {
                                const prevValue: CommonWeatherData = entryIndex > 0 ? dataSet.getEntryForIndex(entryIndex - 1) : null;
                                // const nextValue: CommonWeatherData = entryIndex < dataSet.entryCount - 1 ? dataSet.getEntryForIndex(entryIndex + 1) : null;
                                const current = convertWeatherValueToUnit(value, yProperty as WeatherProps);
                                // const next = nextValue ? convertWeatherValueToUnit(nextValue, yProperty as WeatherProps) : null;
                                const prev = prevValue ? convertWeatherValueToUnit(prevValue, yProperty as WeatherProps) : null;
                                const showUnder = prev && current[0] < prev[0];
                                if ($designStyle === 'modern') {
                                    // value labels sit 3.5px above their point when circles are off
                                    const pointY = y + 3.5;
                                    // same scale and raw (celsius) value as the line gradient (generateGradient uses -20..30)
                                    pointPaint.setColor(colorSurface);
                                    c.drawCircle(x, pointY, 4.5, pointPaint);
                                    pointPaint.setColor(tempColor(value.temperature, -20, 30));
                                    c.drawCircle(x, pointY, 3, pointPaint);
                                    paint.setFontWeight($accentFontWeight);
                                    paint.setColor(colorOnSurface);
                                    c.drawText(current.join(''), x, showUnder ? pointY + 16 : y - 4, paint);
                                    paint.setFontWeight('normal');
                                    return;
                                }
                                paint.setColor(color);
                                c.drawText(current.join(''), x, y + (showUnder ? 14 : 0), paint);
                            }
                        },
                        drawBar(c: Canvas, e, dataSet, left: number, top: number, right: number, bottom: number, paint: Paint) {
                            const precipProbability = e.precipProbability;
                            if ($designStyle === 'modern' && !hasSnowFall && e.precipColor) {
                                const fill = precipitationFill('modern', precipKind({ precipShowSnow: e.precipShowSnow, mixedRainSnow: e.mixedRainSnow }), e.precipColor, precipProbability);
                                paint.setColor(fill.color);
                                paint.setAlpha(fill.alpha);
                                const radius = Math.min(MODERN_BAR_RADIUS, (right - left) / 2, (bottom - top) / 2);
                                c.drawRoundRect(left + 1, top, right - 1, bottom, radius, radius, paint);
                                return;
                            }
                            if ($designStyle === 'modern' && hasSnowFall) {
                                // stacked rain and snow (colors from the set): only the top of the stack is rounded
                                paint.setAlpha(precipitationFill('modern', 'rain', '', precipProbability).alpha);
                                const total = (e.yVals ?? []).reduce((sum, value) => sum + value, 0);
                                if (Math.abs(chart.getPixelForValues(e.deltaHours, total, AxisDependency.RIGHT).y - top) < 1) {
                                    const radius = Math.min(MODERN_BAR_RADIUS, (right - left) / 2, bottom - top);
                                    // rounded on top only: the bottom corners are clipped away
                                    c.save();
                                    c.clipRect(left, top, right, bottom);
                                    c.drawRoundRect(left + 1, top, right - 1, bottom + radius, radius, radius, paint);
                                    c.restore();
                                } else {
                                    c.drawRect(left + 1, top, right - 1, bottom, paint);
                                }
                                return;
                            }
                            paint.setAlpha(precipProbability === -1 ? 125 : precipProbability * 2.55);
                            if (hasSnowFall) {
                                c.drawRect(left + 1, top + 1, right - 0.5, bottom - 0.5, paint);
                            } else if (e.precipColor) {
                                paint.setColor(e.precipColor);
                                paint.setAlpha(precipProbability === -1 ? 125 : precipProbability * 2.55);
                                c.drawRect(left, top, right, bottom, paint);
                            }
                        },
                        drawHighlight(c: Canvas, h: Highlight<Entry>) {
                            const date = getLocalTime(startTimestamp + h.entry['deltaHours'] * 3600 * 1000, timezoneOffset);
                            if ($designStyle === 'modern') {
                                // solid line and a pill with the time, like the "now" marker
                                const text = formatTime(date);
                                selectionTextPaint.setTextSize(11 * $fontScale);
                                selectionTextPaint.setFontWeight($accentFontWeight);
                                const pillHeight = 18 * $fontScale;
                                const pillWidth = selectionTextPaint.measureText(text) + 14 * $fontScale;
                                const pillLeft = Math.min(Math.max(0, h.drawX - pillWidth / 2), c.getWidth() - pillWidth);
                                selectionPaint.setColor(colorOnSurfaceVariant);
                                selectionPaint.setAlpha(160);
                                c.drawLine(h.drawX, pillHeight, h.drawX, c.getHeight(), selectionPaint);
                                c.drawRoundRect(pillLeft, 0, pillLeft + pillWidth, pillHeight, pillHeight / 2, pillHeight / 2, selectionPaint);
                                selectionTextPaint.setColor(colorSurface);
                                c.drawText(text, pillLeft + pillWidth / 2, pillHeight / 2 + 4 * $fontScale, selectionTextPaint);
                                return;
                            }
                            c.drawLine(h.drawX, 0, h.drawX, c.getHeight(), highlightPaint);
                            highlightPaint.setTextAlign(Align.LEFT);
                            let x = h.drawX + 4;
                            const text = formatTime(date);
                            const size = ChartUtils.calcTextSize(highlightPaint, text);
                            if (x > c.getWidth() - size.width) {
                                x = h.drawX - 4;
                                highlightPaint.setTextAlign(Align.RIGHT);
                            }
                            c.drawText(text, x, 50, highlightPaint);
                        }
                    };
                    onChartConfigure?.(chart);
                    classicAxes = {
                        leftLabels: leftAxis.drawLabels,
                        rightLabels: rightAxis.drawLabels,
                        leftLine: leftAxis.drawAxisLine,
                        rightLine: rightAxis.drawAxisLine,
                        xLineColor: xAxis.axisLineColor
                    };
                }
                if (!setData) {
                    return;
                }

                const newLegends = [];
                const lineDataSets: LineDataSet[] = [];
                const scatterDataSets: ScatterDataSet[] = [];
                const barDataSets: BarDataSet[] = [];

                const sourceData = hourly;
                if (sourceData.length === 0) {
                    return;
                }
                timezoneOffset = sourceData[0].timezoneOffset;
                startTimestamp = sourceData[0].time;
                timeRange = (sourceData[sourceData.length - 1].time - sourceData[0].time) / (3600 * 1000);

                const modern = $designStyle === 'modern';
                // modern: tighter x labels and a light axis line
                // labels are drawn from their baseline: the offset must cover their height
                xAxis.yOffset = modern ? 3 + xAxis.textSize : 12;
                leftAxis.spaceTop = leftAxis.spaceBottom = modern ? 0 : 5;
                xAxis.axisLineColor = modern ? new Color(colorOnSurface).setAlpha(40).hex : classicAxes.xLineColor;
                // modern: no y axis, rain bars drawn over the lines
                leftAxis.drawLabels = !modern && classicAxes.leftLabels;
                rightAxis.drawLabels = !modern && classicAxes.rightLabels;
                leftAxis.drawAxisLine = !modern && classicAxes.leftLine;
                rightAxis.drawAxisLine = !modern && classicAxes.rightLine;
                chart.drawOrder = modern ? [DrawOrder.LINE, DrawOrder.SCATTER, DrawOrder.BAR] : [DrawOrder.BAR, DrawOrder.BUBBLE, DrawOrder.LINE, DrawOrder.CANDLE, DrawOrder.SCATTER];
                xAxis.textColor = modern ? colorOnSurfaceVariant : colorOnSurface;
                if (showCurrentTimeLimitLine) {
                    const limitLine = new LimitLine((getLocalTime(undefined, timezoneOffset).valueOf() - startTimestamp) / (3600 * 1000));
                    limitLine.lineWidth = modern ? 1.5 : 2;
                    if (!modern) {
                        limitLine.enableDashedLine(4, 2, 0);
                    }
                    limitLine.lineColor = modern ? MODERN_NOW_COLOR : colorOnSurfaceVariant;
                    xAxis.removeAllLimitLines();
                    xAxis.addLimitLine(limitLine);
                }

                // if (forecast === 'hourly') {
                xAxis.forcedInterval = 1;

                xAxis.valueFormatter = {
                    getAxisLabel: (value, axis) => {
                        const scaleX = chart.viewPortHandler.scaleX;
                        const hour = value;

                        // DEV_LOG && console.log('getAxisLabel', scaleX, hour, modulo);
                        // we add 1 minute to ensure we always show next day with 12:00PM
                        const timestamp = startTimestamp + hour * 3600 * 1000 + 6000;
                        const date = getLocalTime(timestamp, timezoneOffset);
                        const dateHours = date.get('h');
                        let modulo = Math.max(Math.round(timeRange / (scaleX * 10)), 1);
                        if (modulo >= 24) {
                            modulo = 24;
                        } else if (modulo >= 12) {
                            modulo = 12;
                        } else if (modulo >= 8) {
                            modulo = 8;
                        } else if (modulo >= 6) {
                            modulo = 6;
                        } else if (modulo >= 4) {
                            modulo = 4;
                        } else if (modulo >= 2) {
                            modulo = 2;
                        }
                        if (dateHours % modulo === 0 && (Math.abs(hour - lastXLabelIconHour) >= modulo || lastXLabelIconHour === undefined)) {
                            lastXLabelIconHour = hour;
                            // modern shows the day at the top of its separation line instead
                            if (dateHours === 0 && modern) {
                                return '';
                            }
                            return formatTime(timestamp, dateHours === 0 ? `ddd\n${dailyDateFormat}` : 'HH', timezoneOffset);
                        }
                        // }
                    }
                };
                const gridLinePathEffect = new DashPathEffect([4, 8], 0);
                xAxis.customRenderer = {
                    drawGridLine(c: Canvas, axis, rect: RectF, x: any, y: any, axisValue: any, paint: Paint) {
                        const hours = getLocalTime(startTimestamp + axisValue * 3600 * 1000).get('h');
                        if ($designStyle === 'modern') {
                            // only the day boundaries as lines (in the location time); night shading and day
                            // labels are drawn before and after the chart (onChartDraw, onChartDrawn)
                            if (getLocalTime(startTimestamp + axisValue * 3600 * 1000, timezoneOffset).get('h') === 0) {
                                paint.setPathEffect(null);
                                c.drawLine(x, rect.bottom, x, rect.top, paint);
                            }
                            return;
                        }
                        if (hours % 4 === 0) {
                            if (hours === 0) {
                                paint.setPathEffect(null);
                            } else {
                                paint.setPathEffect(gridLinePathEffect);
                            }
                            c.drawLine(x, rect.bottom, x, rect.top, paint);
                        }
                    },
                    drawLabel(c: Canvas, axis, text, x, y, paint: Paint, anchor, angleDegrees) {
                        if (text) {
                            const lines = text.split('\n');
                            for (let index = 0; index < lines.length; index++) {
                                c.drawText(lines[index], x, y + index * paint.textSize, paint);
                            }
                        }
                    }
                };
                let tempMin = Number.MAX_SAFE_INTEGER;
                let tempMax = Number.MIN_SAFE_INTEGER;
                hasSnowFall = false;

                let lastDrawnValue: number;
                valuesToDraw = [];
                const nbData = sourceData.length;
                const data = sourceData.map((d: DailyData | Hourly, index) => {
                    const result = { ...d, deltaHours: (d.time - startTimestamp) / (3600 * 1000) };
                    if (result['snowfall'] > 0) {
                        hasSnowFall = true;
                    }
                    dataToShow.forEach((k) => {
                        if (result.hasOwnProperty(k)) {
                            if (k === WeatherProps.iconId || k === WeatherProps.windBearing) {
                                result['setFakeKey'] = 1;
                            } else if (k === WeatherProps.precipAccumulation) {
                                // result.snow = convertWeatherValueToUnit(d, k, { round: false })[0];
                            } else if (k === WeatherProps.temperature) {
                                const value = d[k];
                                if (value !== undefined && value !== null && !isNaN(value)) {
                                    tempMin = Math.min(tempMin, value);
                                    tempMax = Math.max(tempMax, value);
                                }
                                // result[k] = convertWeatherValueToUnit(d, k, { round: false })[0];

                                // compute values to draw
                                // TODO: still needs improvement. Some "peaks/trough" are not drawn
                                const prevValue = index > 0 ? sourceData[index - 1] : null;
                                const nextValue = index < nbData - 1 ? sourceData[index + 1] : null;
                                const current = convertWeatherValueToUnit(d, k);
                                const next = nextValue ? convertWeatherValueToUnit(nextValue, k) : null;
                                const prev = prevValue ? convertWeatherValueToUnit(prevValue, k) : null;
                                if (
                                    next === null ||
                                    prev === null ||
                                    lastDrawnValue === null ||
                                    (Math.abs(lastDrawnValue - current[0]) > 1 && !(lastDrawnValue < current[0] && current[0] < next[0]) && !(lastDrawnValue > current[0] && current[0] > next[0]))
                                ) {
                                    valuesToDraw.push(index);
                                    lastDrawnValue = current[0];
                                }
                            } else {
                                // result[k] = convertWeatherValueToUnit(d, k, { round: false })[0];
                            }
                        }
                    });
                    return result;
                });

                // modern: updatePlotPadding sets them once the plot size is known
                leftAxis.spaceMin = 0;
                leftAxis.spaceMax = 0; // add space so that highest values does not show over icons
                rightAxis.spaceMax = 0; // add space so that highest bars does not show over icons
                rightAxis.axisSuggestedMaximum = rightAxisSuggestedMaximum; // we set a max to get hourly precipitations at a "correct" level

                if (modern && dataToShow.indexOf(WeatherProps.temperature) !== -1) {
                    // label the actual highs and lows
                    valuesToDraw = extremaIndexes(
                        sourceData.map((d) => convertWeatherValueToUnit(d, WeatherProps.temperature)[0]),
                        1
                    );
                }
                maxDatalength = Math.round((data[data.length - 1].time - data[0].time) / (1000 * 3600));
                if (dataToShow.indexOf(WeatherProps.temperature) !== -1) {
                    temperatureData = { min: tempMin, max: tempMax };
                }
                const scaledKeys = computeScaledValues(data);
                nightRanges = nightSpans(data.map((entry) => ({ hours: entry.deltaHours, isDay: entry.isDay })));
                xAxis.axisMaximum = data[data.length - 1].deltaHours + 1.5;
                // const lastTimestamp = data[data.length - 1].time;
                // weatherData.daily.data.forEach((d) => {
                //     const index = data.findIndex((h) => h.time === d.time);
                //     if (index >= 0) {
                //         const result = data[index];
                //         Object.keys(d).forEach((k) => {
                //             if (dataToShow.indexOf(k) !== -1) {
                //                 if (k === WeatherProps.iconId) {
                //                     result['iconFake'] = 1;
                //                 } else if (k === WeatherProps.precipAccumulation) {
                //                     result[k] = convertWeatherValueToUnit(d, k, { round: false })[0] * 10;
                //                 } else {
                //                     result[k] = convertWeatherValueToUnit(d, k, { round: false })[0];
                //                 }
                //             }
                //         });
                //     } else if (d.time > lastTimestamp) {
                //         const time = dayjs.utc(d.time).startOf('d').valueOf();
                //         const result = { ...d, time, timedeltaHours: (time - startTimestamp) / (3600 * 1000) };
                //         dataToShow.forEach((k) => {
                //             if (result.hasOwnProperty(k)) {
                //                 if (k === WeatherProps.iconId) {
                //                     result['iconFake'] = 1;
                //                 } else if (k === WeatherProps.precipAccumulation) {
                //                     result[k] = convertWeatherValueToUnit(d, k, { round: false })[0] * 10;
                //                 } else {
                //                     result[k] = convertWeatherValueToUnit(d, k, { round: false })[0];
                //                 }
                //             }
                //         });
                //         data.push(result);
                //     }
                //     DEV_LOG && console.log('daily', d.time, index, lastTimestamp);
                // });
                if (!screenOrientation && Application.orientation() !== 'landscape') {
                    chart.setScale(10 / (screenWidthDips / maxDatalength), 1);
                } else {
                    chart.resetZoom();
                }
                dataToShow.forEach((key) => {
                    const chartType = CHART_TYPE[key];
                    // if (data[0][key] === undefined) {
                    //     return;
                    // }
                    const enabled = hidden.indexOf(key) === -1;
                    const color = (modern && modernDataColor(key)) || getWeatherDataColor(key);
                    const setColor = color || colorOnSurface;
                    newLegends.push({
                        name: getWeatherDataTitle(key),
                        id: key,
                        enabled,
                        color
                    });
                    switch (chartType) {
                        case 'scatterchart': {
                            const set = new ScatterDataSet(data, key, 'deltaHours', key);
                            // set['modelId'] = wData.model.id;
                            set.scatterShape = ScatterShape.CIRCLE;
                            set.visible = enabled;
                            // set.drawIconsEnabled=(enabled);
                            set.scatterShapeSize = 4;
                            // set.scatterShapeSize=(enabled ? 4 : 0);
                            set.color = setColor;
                            // set.fillColor=(color);
                            scatterDataSets.push(set);
                            break;
                        }
                        case 'barchart': {
                            const set = new BarDataSet(data, key, 'deltaHours', key);
                            set.visible = enabled;
                            set.color = setColor;
                            set.axisDependency = AxisDependency.RIGHT;
                            // set.fillColor=(color);
                            barDataSets.push(set);
                            break;
                        }
                        case 'precipitationchart': {
                            const values = hasSnowFall
                                ? data.map((d) => ({
                                      ...d,
                                      yVals: [d['rain'] || 0, d['snowfall'] || 0]
                                  }))
                                : data;
                            const set = new BarDataSet(values, key, 'deltaHours', hasSnowFall ? undefined : key);

                            if (hasSnowFall) {
                                set.stackLabels = [lc('rain'), lc('snow')];
                                set.colors = modern ? [modernPrecipColor('rain'), modernPrecipColor('snow')] : [rainColor, snowColor];
                            } else {
                                set.color = setColor;
                            }
                            set.visible = enabled;
                            set.axisDependency = AxisDependency.RIGHT;
                            // set.fillColor=(color);
                            barDataSets.push(set);
                            break;
                        }
                        case 'linechart':
                        default: {
                            const yProperty = scaledKeys[key] || (key === WeatherProps.iconId || key === WeatherProps.windBearing ? 'setFakeKey' : key);
                            const set = new LineDataSet(data, key, 'deltaHours', yProperty);
                            set.color = setColor;
                            switch (key) {
                                case WeatherProps.windSpeed:
                                    set.getEntryIcon = function (entry) {
                                        return windIcon(entry.windBearing);
                                    };
                                    set.drawIconsEnabled = true;
                                    set.mode = Mode.CUBIC_BEZIER;
                                    // set.cubicIntensity = 0.4;
                                    set.spaceBottom = modern ? 0 : 2; // ensure lowest value label can be seen (modern: updatePlotPadding)
                                    // set.drawValuesEnabled = true;
                                    // set.valueTextColor = colorOnSurface;
                                    // set.valueTextSize = 10;
                                    break;
                                case WeatherProps.windBearing:
                                    set.lineWidth = 0;
                                    set.axisDependency = AxisDependency.RIGHT;
                                    set.getEntryIcon = function (entry) {
                                        return windIcon(entry.windBearing);
                                    };
                                    set.drawIconsEnabled = true;
                                    break;
                                case WeatherProps.cloudCover:
                                    set.color = cloudyColor;
                                    set.lineWidth = 0;
                                    set.ignoreForMinMax = true;
                                    set.mode = Mode.CUBIC_BEZIER;
                                    set.drawFilledEnabled = true;
                                    set.fillFormatter = {
                                        getFillLinePosition(dataSet, dataProvider) {
                                            return dataProvider.yChartMin;
                                        }
                                    };
                                    // modern: a light veil, the chart stays readable under full cloud cover
                                    set.fillColor = modern ? modernDataColor(WeatherProps.cloudCover) : cloudyColor.setAlpha(100);
                                    if (modern) {
                                        // the chart applies fillAlpha on top of the fill color
                                        set.fillAlpha = 30;
                                    }
                                    break;
                                case WeatherProps.temperature:
                                    // the line color follows the temperature
                                    updateGradient();
                                    set.shader = lastGradient?.gradient;
                                    set.lineWidth = modern ? 2.5 : temperatureLineWidth;
                                    set.mode = Mode.CUBIC_BEZIER;
                                    // set.cubicIntensity = 0.4;
                                    set.spaceBottom = modern ? 0 : 2; // ensure lowest value label can be seen (modern: updatePlotPadding)
                                    set.drawValuesEnabled = true;
                                    set.valueTextColor = colorOnSurface;
                                    set.valueTextSize = modern ? 12 : 10;
                                    // set.valueFormatter = {
                                    //     getFormattedValue(value: number, entry?: CommonWeatherData) {
                                    //         return Math.round(value) + toImperialUnit(UNITS.Celcius);
                                    //     }
                                    // } as any;
                                    break;

                                case WeatherProps.iconId:
                                    set.lineWidth = 0;
                                    set.axisDependency = AxisDependency.RIGHT;
                                    set.getEntryIcon = function (entry) {
                                        return getIcon(entry.iconId, entry.isDay);
                                    };
                                    set.drawIconsEnabled = true;
                                    break;

                                default:
                                    if (modern) {
                                        const lineStyle = modernLineStyle(key);
                                        set.drawCirclesEnabled = false;
                                        set.lineWidth = lineStyle.width;
                                        if (lineStyle.dash) {
                                            set.enableDashedLine(lineStyle.dash[0], lineStyle.dash[1], 0);
                                        }
                                        set.drawValuesEnabled = enabled;
                                        set.valueTextColor = setColor;
                                        set.valueTextSize = 11;
                                    } else {
                                        set.drawCirclesEnabled = enabled;
                                        set.circleRadius = LINE_WIDTH;
                                        set.lineWidth = LINE_WIDTH;
                                    }
                                    break;
                            }
                            // set.drawValuesEnabled=(true);
                            // set.fillColor=(color);
                            lineDataSets.push(set);
                            break;
                        }
                    }
                });
                legends.splice(0, legends.length, ...newLegends);
                // DEV_LOG && console.log('legends', JSON.stringify(legends));
                if (lineDataSets.length) {
                    combinedChartData.data = new LineData(lineDataSets);
                } else {
                    combinedChartData.lineData = null;
                }
                if (scatterDataSets.length) {
                    combinedChartData.data = new ScatterData(scatterDataSets);
                } else {
                    combinedChartData.scatterData = null;
                }
                if (barDataSets.length) {
                    const barData = new BarData(barDataSets);
                    barData.barWidth = barWidth;
                    barData.fixedBarScale = fixedBarScale;
                    combinedChartData.data = barData;
                } else {
                    combinedChartData.barData = null;
                }
                chart.data = combinedChartData;
                if (updatePlotPadding()) {
                    chart.notifyDataSetChanged();
                }
                // setting the data recomputes the axis bounds and invalidates before the shader
                // changes, so the gradient can only be built now, and needs its own invalidate
                if (updateGradient()) {
                    chart.invalidate();
                }
                if (startTime !== null) {
                    highlightOnDate(startTime);
                }
            }
        } catch (error) {
            showError(error);
        }
    }
    $: if (dataToShow && chartView && hourly && $designStyle) {
        updateLineChart(true);
    }

    onThemeChanged(() => {
        const chart = chartView?.nativeView;
        if (chart) {
            const newColor = $colors.colorOnSurface;
            // DEV_LOG && console.log('onThemeChanged', !!chart, colorOnSurface, newColor);
            const leftAxis = chart.leftAxis;
            const rightAxis = chart.rightAxis;
            const xAxis = chart.xAxis;
            // leftAxis.textColor = rightAxis.textColor = xAxis.textColor = highlightPaint.color = labelPaint.color = newColor;
            leftAxis.textColor = rightAxis.textColor = xAxis.textColor = highlightPaint.color = newColor;
            if ($designStyle === 'modern') {
                xAxis.textColor = $colors.colorOnSurfaceVariant;
            }

            xAxis.gridColor = leftAxis.gridColor = rightAxis.gridColor = colorOnSurfaceVariant + '33';
            leftAxis.limitLines.forEach((l) => (l.lineColor = newColor));
            const dataSets = chart.data?.dataSets;
            if (dataSets) {
                dataSets.forEach((d) => {
                    if (d.drawValuesEnabled) {
                        d.valueTextColor = newColor;
                    }
                });
                chart.invalidate();
            }
        }
        highlightCanvas?.nativeElement.redraw();
    });
    function redraw() {
        const chart = chartView?.nativeView;
        if (chartInitialized && chart) {
            const xAxis = chart.xAxis;
            const leftAxis = chart.leftAxis;
            leftAxis.textSize = 10 * $fontScale;
            xAxis.textSize = 10 * $fontScale;
            // labelPaint.textSize = 10 * $fontScale;
        }
        // labelPaint.getFontMetrics(mFontMetricsBuffer);
        chartView?.nativeView.invalidate();
    }
    fontScale.subscribe(redraw);

    function onOrientationChanged(event: OrientationChangedEventData) {
        DEV_LOG && console.log('onOrientationChanged');
        chartNeedsZoomUpdate = true;
    }
    let lastGradient: { min; max; height; nbColors: number; axisMin: number; axisMax: number; contentTop: number; contentHeight: number; gradient: LinearGradient };

    function updateGradient() {
        const chart = chartView?.nativeView;
        const contentRect = chart.viewPortHandler.contentRect;
        const height = contentRect.height();
        if (!temperatureData || !height) {
            return false;
        }
        // the gradient spans the whole content height, so it follows the axis, not the temperature
        // range. Temperature is always the reference when charted, so the axis is in the same unit
        // the plot top is axisMinimum + axisRange: axisMaximum leaves out the spaceTop/spaceBottom room
        const { max, min } = resolveRange(chart.leftAxis.axisMinimum, chart.leftAxis.axisMinimum + chart.leftAxis.axisRange, temperatureData);
        // modern: more stops so the line matches the exact temperature colors of its points
        const nbColors = $designStyle === 'modern' ? 20 : 5;
        const top = contentRect.top;
        if (
            lastGradient &&
            lastGradient.contentHeight === height &&
            lastGradient.contentTop === top &&
            lastGradient.axisMin === min &&
            lastGradient.axisMax === max &&
            lastGradient.nbColors === nbColors
        ) {
            return false;
        }
        // the shader starts at y=0 of the canvas, not at the top of the plot
        const range = contentGradientRange(min, max, top, height);
        lastGradient = { ...generateGradient(nbColors, range.min, range.max, range.height, 0), nbColors, axisMin: min, axisMax: max, contentTop: top, contentHeight: height };
        const dataSet = chart.lineData?.getDataSetByLabel(WeatherProps.temperature, false);
        if (dataSet) {
            dataSet.shader = lastGradient.gradient;
        }
        return true;
    }
    function modernTopPadding() {
        return 20 + 18 * $fontScale;
    }
    // modern: pixel room under the lows and over the highs for their labels and the day pills
    function updatePlotPadding() {
        const chart = chartView?.nativeView;
        const leftAxis = chart.leftAxis;
        const contentHeight = chart.viewPortHandler.contentRect.height();
        let padding = { spaceMin: 0, spaceMax: 0 };
        if ($designStyle === 'modern' && chart.data && contentHeight) {
            padding = plotPadding(chart.data.getYMin(AxisDependency.LEFT), chart.data.getYMax(AxisDependency.LEFT), contentHeight, MODERN_BOTTOM_PADDING, modernTopPadding());
        }
        if (padding.spaceMin === leftAxis.spaceMin && padding.spaceMax === leftAxis.spaceMax) {
            return false;
        }
        leftAxis.spaceMin = padding.spaceMin;
        leftAxis.spaceMax = padding.spaceMax;
        return true;
    }
    function onFirstOffsetsCalculated() {
        if (updatePlotPadding()) {
            // not from within the offsets computation: the value matrix would keep the old range
            setTimeout(() => {
                chartView?.nativeView.notifyDataSetChanged();
                if (updateGradient()) {
                    chartView?.nativeView.invalidate();
                }
            }, 0);
            return;
        }
        updateGradient();
    }
    function drawNightShading(canvas: Canvas) {
        const chart = chartView?.nativeView;
        const rect = chart.viewPortHandler.contentRect;
        nightPaint.setColor(colorOnSurface);
        nightPaint.setAlpha(MODERN_NIGHT_ALPHA);
        canvas.save();
        canvas.clipRect(rect.left, rect.top, rect.right, rect.bottom);
        for (const range of nightRanges) {
            const left = chart.getPixelForValues(range.from, 0, AxisDependency.LEFT).x;
            const right = chart.getPixelForValues(range.to, 0, AxisDependency.LEFT).x;
            canvas.drawRect(left, rect.top, right, rect.bottom, nightPaint);
        }
        canvas.restore();
    }
    // day name at the top of each day separation line, over the data, on a pill so lines below stay readable
    function drawDayLabels(canvas: Canvas) {
        const chart = chartView?.nativeView;
        const rect = chart.viewPortHandler.contentRect;
        dayLabelPaint.setTextSize(12 * $fontScale);
        dayLabelPaint.setFontWeight($accentFontWeight);
        dayLabelPaint.setColor(colorOnSurface);
        const labelTop = rect.top + 2 * $fontScale;
        const labelHeight = 16 * $fontScale;
        const end = startTimestamp + timeRange * 3600 * 1000;
        canvas.save();
        canvas.clipRect(rect.left, rect.top, rect.right, rect.bottom);
        // getLocalTime: hourly data can come without a timezone offset (local time)
        for (let day = getLocalTime(startTimestamp, timezoneOffset).startOf('d').add(1, 'd'); day.valueOf() <= end; day = day.add(1, 'd')) {
            const x = chart.getPixelForValues((day.valueOf() - startTimestamp) / (3600 * 1000), 0, AxisDependency.LEFT).x;
            const dayText = formatTime(day.valueOf(), `ddd ${dailyDateFormat}`, timezoneOffset);
            nightPaint.setColor(colorSurface);
            nightPaint.setAlpha(220);
            canvas.drawRoundRect(x + 2, labelTop, x + 10 * $fontScale + dayLabelPaint.measureText(dayText), labelTop + labelHeight, labelHeight / 2, labelHeight / 2, nightPaint);
            canvas.drawText(dayText, x + 6 * $fontScale, labelTop + 12 * $fontScale, dayLabelPaint);
        }
        canvas.restore();
    }
    function onLayoutChanged(event: EventData) {
        if (updatePlotPadding()) {
            chartView?.nativeView.notifyDataSetChanged();
        }
        updateGradient();
        //use a timeout to ensure we are called after chart layout changed was called
        setTimeout(() => {
            const chart = event.object as CombinedChart;
            if (chart && chartNeedsZoomUpdate) {
                chartNeedsZoomUpdate = false;
                if (screenOrientation || Application.orientation() === 'landscape') {
                    chart.resetZoom();
                } else {
                    chart.setScale(10 / (screenWidthDips / maxDatalength), 1);
                }
                chart.highlight(null);
                chart.invalidate();
            }
        }, 2);
    }
    function onChartPostDraw(event) {
        if (!lastGradient) {
            // we need to wait for offsets to be calculated before we can compute the gradient
            const chart = event.object as CombinedChart;
            updateGradient();
            setTimeout(() => {
                chart.invalidate();
            }, 0);
        }
    }
    // called after the chart draws
    function onChartDrawn(event) {
        if ($designStyle === 'modern' && showDayLabels && hourly?.length) {
            drawDayLabels(event.canvas);
        }
    }
    // called before the chart draws
    function onChartDraw(event) {
        lastIconHour = undefined;
        lastWindIconHour = undefined;
        lastXLabelIconHour = undefined;
        if ($designStyle === 'modern' && nightRanges.length) {
            drawNightShading(event.canvas);
        }
    }

    function highlightOnDate(timestamp: number) {
        const chart = chartView?.nativeView;
        if (chart) {
            const x = (timestamp - startTimestamp) / (3600 * 1000);
            // DEV_LOG && console.log('highlightOnDate', timestamp,  dayjs(timestamp),startTimestamp, x);
            const highlights = chart.getHighlightByXValue(x);
            chart.highlight(highlights);
        }
    }
    let popoverInstance: HourlyPopover__SvelteComponent_;
    async function showPopover(item, highlightedMargin) {
        try {
            if (popoverInstance) {
                popoverInstance.$set({ item });
                return;
            }
            await showHourlyPopover(
                item,
                { legendKeys: dataToShow },
                {
                    anchor: chartView?.nativeView,
                    onDismiss: () => {
                        chartView?.nativeView?.highlightValues(null);
                        popoverInstance = null;
                        highlightedItem = null;
                    },
                    x: highlightedMargin
                },
                (data: ComponentInstanceInfo) => {
                    popoverInstance = data.viewInstance as any;
                }
            );
        } catch (error) {
            showError(error);
        }
    }
    function onHighlight({ highlight, object }: { object: CombinedChart; highlight: Highlight }) {
        const popoverWidth = 150 * $fontScale;
        const fullWidth = Utils.layout.toDeviceIndependentPixels(chartView.nativeView.getMeasuredWidth());
        const highlightedX = highlight.xPx;
        highlightedAlignment = highlightedX >= fullWidth - popoverWidth ? 'right' : 'left';
        highlightedMargin = highlightedAlignment === 'left' ? `40 0 0 ${highlightedX}` : `40 ${fullWidth - highlightedX} 0 0`;
        highlightedItem = highlight.entry as CommonWeatherData;
        showPopover(highlightedItem, highlightedX > fullWidth / 2 ? 0 : fullWidth * 2);
    }
    function clearHighlight() {
        highlightedItem = null;
        // currentHighlight = null;
    }
    // function onDrawHighlight({ canvas }: { canvas: Canvas }) {
    //     const entry = currentHighlight?.entry as CommonWeatherData;
    //     if (!entry) {
    //         return;
    //     }
    //     const w = canvas.getWidth();
    //     const dx = 0;
    //     const data = weatherDataService.getIconsData(entry, ['windBeaufort'], ['temperature']);
    //     labelPaint.textSize = 12;
    //     const nativeText = createNativeAttributedString({
    //         spans: [
    //             {
    //                 text: dayjs(entry.time).format('L LT') + '\n\n',
    //                 fontSize: 12 * $fontScale,
    //                 fontWeight: 'bold'
    //             }
    //         ].concat(
    //             data
    //                 .map((c) =>
    //                     [
    //                         c.icon
    //                             ? {
    //                                   fontSize: c.iconFontSize * 0.7,
    //                                   color: c.iconColor || c.color || colorOnSurface,
    //                                   fontFamily: (c.paint || labelPaint).fontFamily,
    //                                   //   verticalAlignment: 'center',
    //                                   text: c.icon + ' '
    //                               }
    //                             : undefined,
    //                         c.value
    //                             ? {
    //                                   fontSize: 12 * $fontScale,
    //                                   //   verticalAlignment: 'center',
    //                                   color: c.color || colorOnSurface,
    //                                   text: c.value + (c.subvalue ? ' ' : '\n')
    //                               }
    //                             : undefined,
    //                         c.subvalue
    //                             ? {
    //                                   fontSize: 9 * $fontScale,
    //                                   color: c.color || colorOnSurface,
    //                                   //   verticalAlignment: 'center',
    //                                   text: c.subvalue + '\n'
    //                               }
    //                             : undefined
    //                     ].filter((s) => !!s)
    //                 )
    //                 .flat() as any
    //         )
    //     });
    //     canvas.save();
    //     const staticLayout = new StaticLayout(nativeText, labelPaint, highlightViewWidth - 10, LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
    //     canvas.translate(5, 5);
    //     // const staticLayout = new StaticLayout(dataNString, textPaint, lineWidth, columnIndex === 0 ? LayoutAlignment.ALIGN_OPPOSITE : LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
    //     // canvas.translate(columnIndex === 0 ? w2 - lineWidth - 5 : w2 + 5, y + lineHeight / 2 - staticLayout.getHeight() / 2);
    //     staticLayout.draw(canvas);
    //     canvas.restore();
    // }
    // function getNativeText(highlight: Highlight) {
    //     const entry = currentHighlight?.entry as CommonWeatherData;
    //     if (!entry) {
    //         return;
    //     }
    //     const data = weatherDataService.getIconsData(entry, ['windBeaufort'], ['temperature']);
    //     return createNativeAttributedString({
    //         spans: [
    //             {
    //                 text: dayjs(entry.time).format('L LT') + '\n\n',
    //                 fontSize: 12 * $fontScale,
    //                 fontWeight: 'bold'
    //             }
    //         ].concat(
    //             data
    //                 .map((c) =>
    //                     [
    //                         c.icon
    //                             ? {
    //                                   fontSize: c.iconFontSize * 0.7,
    //                                   color: c.iconColor || c.color || colorOnSurface,
    //                                   fontFamily: (c.paint || labelPaint).fontFamily,
    //                                   //   verticalAlignment: 'center',
    //                                   text: c.icon + ' '
    //                               }
    //                             : undefined,
    //                         c.value
    //                             ? {
    //                                   fontSize: 12 * $fontScale,
    //                                   //   verticalAlignment: 'center',
    //                                   color: c.color || colorOnSurface,
    //                                   text: c.value + (c.subvalue ? ' ' : '\n')
    //                               }
    //                             : undefined,
    //                         c.subvalue
    //                             ? {
    //                                   fontSize: 9 * $fontScale,
    //                                   color: c.color || colorOnSurface,
    //                                   //   verticalAlignment: 'center',
    //                                   text: c.subvalue + '\n'
    //                               }
    //                             : undefined
    //                     ].filter((s) => !!s)
    //                 )
    //                 .flat() as any
    //         )
    //     });
    // }

    // function getParentCollectionView() {
    //     let parent = chartView?.nativeView as View;
    //     while (parent && !(parent instanceof Page) && !(parent instanceof CollectionView) && parent.parent) {
    //         parent = parent.parent as View;
    //     }
    //     return parent instanceof CollectionView ? parent : null;
    // }
    // function onTouch(event: TouchGestureEventData) {
    //     switch (event.action) {
    //         case 'down': {
    //             const parent = getParentCollectionView();
    //             DEV_LOG && console.log('requestDisallowInterceptTouchEvent true', parent?.nativeViewProtected);
    //             parent?.nativeViewProtected?.requestDisallowInterceptTouchEvent(true);
    //             break;
    //         }
    //         case 'up':
    //         case 'cancel': {
    //             const parent = getParentCollectionView();
    //             DEV_LOG && console.log('requestDisallowInterceptTouchEvent false', parent?.nativeViewProtected);
    //             parent?.nativeViewProtected?.requestDisallowInterceptTouchEvent(false);
    //             break;
    //         }
    //     }
    // }
</script>

<gridlayout {...$$restProps}>
    <combinedchart
        bind:this={chartView}
        panGestureOptions={{
            minDist: 50,
            failOffsetYStart: -40,
            failOffsetYEnd: 40
        }}
        on:draw={onChartDraw}
        on:postDraw={onChartDrawn}
        on:firstOffsetsCalculated={onFirstOffsetsCalculated}
        on:layoutChanged={onLayoutChanged}
        on:highlight={onHighlight}
        on:pan={clearHighlight}
        on:zoom={clearHighlight}>
    </combinedchart>
    <!-- {#if highlightedItem}
        <HourlyPopover horizontalAlignment={highlightedAlignment} item={highlightedItem} margin={highlightedMargin} on:tap={clearHighlight} />
    {/if} -->
    <!-- {#if currentHighlight}
        <nestedscrollview
            backgroundColor={new Color(colorBackground).setAlpha(220)}
            borderColor={colorOutline}
            borderRadius={8}
            borderWidth={1}
            height="80%"
            horizontalAlignment="left"
            translateX={currentHighlight.xPx}
            translateY={30}
            verticalAlignment="top"
            width={highlightViewWidth}
            on:tap={() => (currentHighlight = null)}
            transition:fade={{ duration: 100 }}>
            <stacklayout padding={4}>
                <label lineHeight={16 * $fontScale} text={getNativeText(currentHighlight)}/>
            </stacklayout>
        </nestedscrollview>
    {/if} -->
</gridlayout>
