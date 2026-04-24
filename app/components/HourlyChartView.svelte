<svelte:options accessors />

<script context="module" lang="ts">
    import { Align, Canvas, CanvasView, DashPathEffect, LinearGradient, Paint, Path, Rect, RectF } from '@nativescript-community/ui-canvas';
    import { CombinedChart } from '@nativescript-community/ui-chart';
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
    import { windIcon } from '~/helpers/formatter';
    import { formatTime, getLocalTime, lc } from '~/helpers/locale';
    import { isEInk, onThemeChanged } from '~/helpers/theme';
    import type { CommonWeatherData, DailyData, Hourly } from '~/services/providers/weather';
    import { cloudyColor, colors, dailyDateFormat, fontScale, rainColor, screenWidthDips, snowColor } from '~/variables';

    import { AxisDependency } from '@nativescript-community/ui-chart/components/YAxis';
    import { BarData } from '@nativescript-community/ui-chart/data/BarData';
    import { BarDataSet } from '@nativescript-community/ui-chart/data/BarDataSet';
    import { Entry } from '@nativescript-community/ui-chart/data/Entry';
    import { Utils as ChartUtils } from '@nativescript-community/ui-chart/utils/Utils';
    import { onDestroy, onMount } from 'svelte';
    import { iconService } from '~/services/icon';
    import { WeatherProps, appPaint, convertWeatherValueToUnit, getWeatherDataColor, getWeatherDataTitle, showHourlyPopover, weatherDataService } from '~/services/weatherData';
    import { generateGradient, loadImage } from '~/utils/utils.common';

    const highlightPaint = new Paint();
    highlightPaint.setColor('white');
    highlightPaint.setStrokeWidth(2);
    highlightPaint.setPathEffect(new DashPathEffect([3, 3], 0));
    highlightPaint.setTextAlign(Align.LEFT);
    highlightPaint.setTextSize(10);

    const LINE_WIDTH = 2;

    const CHART_TYPE = {
        [WeatherProps.precipAccumulation]: 'precipitationchart',
        [WeatherProps.cloudCover]: 'linechart'
    };
</script>

<script lang="ts">
    import { ComponentInstanceInfo } from '~/utils/ui';
    import { PROVIDER_PADDING } from '~/helpers/constants';

    let { colorOnSurface, colorOnSurfaceVariant, colorOutline, colorSurfaceContainer } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline, colorSurfaceContainer } = $colors);

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
    export let onChartConfigure: (chart: CombinedChart) => void = null;
    export let maxDatalength = 0;
    export const legends = new ObservableArray([]);
    export let startTime: number = null;

    let chartView: NativeViewElementNode<CombinedChart>;
    let highlightCanvas: NativeViewElementNode<CanvasView>;

    let temperatureData: { min: number; max: number };
    let startTimestamp = 0;
    let timeRange = 0;
    let timezoneOffset;
    let chartNeedsZoomUpdate = false;
    let iconCache: { [k: string]: ImageSource } = {};
    export let chartInitialized = false;
    let highlightedItem: CommonWeatherData;
    let highlightedMargin: string;
    let highlightedAlignment: CoreTypes.HorizontalAlignmentType;

    $: DEV_LOG && console.log('dataToShow', dataToShow);

    export function getChart() {
        return chartView?.nativeElement;
    }

    function getIcon(iconId, isDay): ImageSource {
        if (!iconId) {
            return null;
        }
        const realIcon = iconService.getIconPath(iconId, isDay, false);
        let icon = iconCache[realIcon];
        if (icon) {
            return icon;
        }
        icon = loadImage(realIcon, { resizeThreshold: 80 });
        if (!realIcon.startsWith('android.resource://')) {
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
    function updateLineChart(setData = true) {
        try {
            DEV_LOG && console.log('updateLineChart');
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
                    chart.setExtraOffsets(0, 30, 0, 0);
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
                    chart.data = combinedChartData;
                    chart.customRenderer = {
                        drawFill(canvas: Canvas, dataSet: LineDataSet, spline: Path, trans: any, min: number, max: number, superMethod: Function) {
                            if (dataSet.label === WeatherProps.cloudCover) {
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
                                    appPaint.setTextSize(10);
                                    appPaint.color = !isEInk ? (item.windSpeed >= 70 ? '#ff0353' : item.windSpeed > 40 ? '#FFBC03' : dataSet.color) : dataSet.color;
                                    canvas.drawText(icon as string, x, drawOffsetY, appPaint);
                                    lastWindIconHour = hour;
                                }
                            }
                        },
                        drawValue(c: Canvas, chart, dataSet, dataSetIndex: number, entry, entryIndex: number, valueText: string, x: number, y: number, color: string | Color, paint: Paint) {
                            if (valuesToDraw.indexOf(entryIndex) !== -1) {
                                const yProperty = dataSet.yProperty;
                                const value = entry as CommonWeatherData;
                                const prevValue: CommonWeatherData = entryIndex > 0 ? dataSet.getEntryForIndex(entryIndex - 1) : null;
                                // const nextValue: CommonWeatherData = entryIndex < dataSet.entryCount - 1 ? dataSet.getEntryForIndex(entryIndex + 1) : null;
                                const current = convertWeatherValueToUnit(value, yProperty as WeatherProps);
                                // const next = nextValue ? convertWeatherValueToUnit(nextValue, yProperty as WeatherProps) : null;
                                const prev = prevValue ? convertWeatherValueToUnit(prevValue, yProperty as WeatherProps) : null;
                                const showUnder = prev && current[0] < prev[0];
                                paint.setColor(color);
                                c.drawText(current.join(''), x, y + (showUnder ? 14 : 0), paint);
                            }
                        },
                        drawBar(c: Canvas, e, dataSet, left: number, top: number, right: number, bottom: number, paint: Paint) {
                            const precipProbability = e.precipProbability;
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

                if (showCurrentTimeLimitLine) {
                    const limitLine = new LimitLine((getLocalTime(undefined, timezoneOffset).valueOf() - startTimestamp) / (3600 * 1000));
                    limitLine.lineWidth = 2;
                    limitLine.enableDashedLine(4, 2, 0);
                    limitLine.lineColor = colorOnSurfaceVariant;
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
                            return formatTime(timestamp, dateHours === 0 ? `ddd\n${dailyDateFormat}` : 'HH', timezoneOffset);
                        }
                        // }
                    }
                };
                const gridLinePathEffect = new DashPathEffect([4, 8], 0);
                xAxis.customRenderer = {
                    drawGridLine(c: Canvas, axis, rect: RectF, x: any, y: any, axisValue: any, paint: Paint) {
                        const hours = getLocalTime(startTimestamp + axisValue * 3600 * 1000).get('h');
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

                leftAxis.spaceMax = 0; // add space so that highest values does not show over icons
                rightAxis.spaceMax = 0; // add space so that highest bars does not show over icons
                rightAxis.axisSuggestedMaximum = rightAxisSuggestedMaximum; // we set a max to get hourly precipitations at a "correct" level

                maxDatalength = Math.round((data[data.length - 1].time - data[0].time) / (1000 * 3600));
                if (dataToShow.indexOf(WeatherProps.temperature) !== -1) {
                    temperatureData = { min: tempMin, max: tempMax };
                }
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
                    const color = getWeatherDataColor(key);
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
                                set.colors = [rainColor, snowColor];
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
                            const set = new LineDataSet(data, key, 'deltaHours', key === WeatherProps.iconId || key === WeatherProps.windBearing ? 'setFakeKey' : key);
                            set.color = setColor;
                            switch (key) {
                                case WeatherProps.windSpeed:
                                    set.getEntryIcon = function (entry) {
                                        return windIcon(entry.windBearing);
                                    };
                                    set.drawIconsEnabled = true;
                                    set.mode = Mode.CUBIC_BEZIER;
                                    // set.cubicIntensity = 0.4;
                                    set.spaceBottom = 2; // ensure lowest value label can be seen
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
                                    set.fillColor = cloudyColor.setAlpha(100);
                                    break;
                                case WeatherProps.temperature:
                                    // if (!lastGradient) {
                                    updateGradient();
                                    // }
                                    set.shader = lastGradient?.gradient;
                                    set.lineWidth = temperatureLineWidth;
                                    set.mode = Mode.CUBIC_BEZIER;
                                    // set.cubicIntensity = 0.4;
                                    set.spaceBottom = 2; // ensure lowest value label can be seen
                                    set.drawValuesEnabled = true;
                                    set.valueTextColor = colorOnSurface;
                                    set.valueTextSize = 10;
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
                                    set.drawCirclesEnabled = enabled;
                                    set.circleRadius = LINE_WIDTH;
                                    set.lineWidth = LINE_WIDTH;
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
                if (startTime !== null) {
                    highlightOnDate(startTime);
                }
            }
        } catch (error) {
            showError(error);
        }
    }
    $: if (dataToShow && chartView && hourly) {
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
    let lastGradient: { min; max; height; gradient: LinearGradient };

    function updateGradient() {
        const chart = chartView?.nativeView;
        const height = chart.viewPortHandler.contentRect.height();
        if (temperatureData && height && (!lastGradient || lastGradient.height !== height || lastGradient.min !== temperatureData.min || lastGradient.max !== temperatureData.max)) {
            lastGradient = generateGradient(5, temperatureData.min, temperatureData.max, height, 0);
            const dataSet = chart.lineData?.getDataSetByLabel(WeatherProps.temperature, false);
            if (dataSet) {
                dataSet.shader = lastGradient.gradient;
            }
            // chartView?.nativeView?.redraw()
        }
    }
    function onLayoutChanged(event: EventData) {
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
    function onChartDraw() {
        lastIconHour = undefined;
        lastWindIconHour = undefined;
        lastXLabelIconHour = undefined;
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
                {},
                {
                    anchor: chartView?.nativeView,
                    onDismiss: () => {
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
        on:firstOffsetsCalculated={updateGradient}
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
