<script context="module" lang="ts">
    import { Align, Canvas, DashPathEffect, FontMetrics, Paint, RectF, Style } from '@nativescript-community/ui-canvas';
    import { CombinedChart } from '@nativescript-community/ui-chart';
    import { ScatterShape } from '@nativescript-community/ui-chart/charts/ScatterChart';
    import { LimitLine } from '@nativescript-community/ui-chart/components/LimitLine';
    import { XAxisPosition } from '@nativescript-community/ui-chart/components/XAxis';
    import { BarData } from '@nativescript-community/ui-chart/data/BarData';
    import { BarDataSet } from '@nativescript-community/ui-chart/data/BarDataSet';
    import { BarLineScatterCandleBubbleDataSet } from '@nativescript-community/ui-chart/data/BarLineScatterCandleBubbleDataSet';
    import { CombinedData } from '@nativescript-community/ui-chart/data/CombinedData';
    import { Entry } from '@nativescript-community/ui-chart/data/Entry';
    import { LineData } from '@nativescript-community/ui-chart/data/LineData';
    import { LineDataSet, Mode } from '@nativescript-community/ui-chart/data/LineDataSet';
    import { ScatterData } from '@nativescript-community/ui-chart/data/ScatterData';
    import { ScatterDataSet } from '@nativescript-community/ui-chart/data/ScatterDataSet';
    import { Highlight } from '@nativescript-community/ui-chart/highlight/Highlight';
    import DrawerElement from '@nativescript-community/ui-drawer/svelte';
    import { EventData } from '@nativescript-community/ui-image';
    import { Application, ApplicationSettings, Color, ObservableArray, OrientationChangedEventData } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import dayjs from 'dayjs';
    import { onDestroy, onMount } from 'svelte';
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CHARTS_PORTRAIT_FULLSCREEN } from '~/helpers/constants';
    import { FavoriteLocation } from '~/helpers/favorites';
    import { formatDate, formatTime, getLocalTime, lc } from '~/helpers/locale';
    import { onThemeChanged } from '~/helpers/theme';
    import type { DailyData, Hourly, WeatherData } from '~/services/providers/weather';
    import { convertWeatherValueToUnit, getWeatherDataIcon, getWeatherDataTitle, propToUnit } from '~/services/weatherData';
    import ModernCardTitle from '~/components/common/ModernCardTitle.svelte';
    import { accentFontWeight, colors, designStyle, fontScale, fonts, screenWidthDips } from '~/variables';
    import { drawLegendChip } from '~/helpers/legendChip';
    import { modernDataColor, styledDataIcon, textFontFamily } from '~/utils/designStyle';
    import { nightSpans } from '~/utils/chartLabels';
    import { modernColors } from '~/helpers/modernTheme';
    import { isLandscape } from '~/utils/ui';
    import { highlightRows } from '~/utils/highlightRows';

    const legendIconPaint = new Paint();
    legendIconPaint.textSize = 13;

    legendIconPaint.strokeWidth = 2;
    const legendPaint = new Paint();
    legendPaint.textSize = 13;
    const labelPaint = new Paint();
    labelPaint.textSize = 13;
    labelPaint.setTextAlign(Align.CENTER);
    const mFontMetricsBuffer = new FontMetrics();

    const LINE_WIDTH = 2;
    // modern: smoother and a bit thicker lines, light night shading, the now line in the hourly chart color
    const MODERN_LINE_WIDTH = 2.5;
    const MODERN_NIGHT_ALPHA = 12;
    const MODERN_NOW_COLOR = '#D85A30';
    const nightPaint = new Paint();
    // modern highlight: a line with a dot on each model, and a card with the model values
    const highlightLinePaint = new Paint();
    highlightLinePaint.strokeWidth = 1;
    const highlightDotPaint = new Paint();
    const tooltipPaint = new Paint();
    const tooltipBorderPaint = new Paint();
    tooltipBorderPaint.setStyle(Style.STROKE);
    tooltipBorderPaint.strokeWidth = 1;
    const tooltipTextPaint = new Paint();
</script>

<script lang="ts">
    let { colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorPrimary } = $colors;
    $: ({ colorBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorPrimary } = $colors);
    $: modern = $designStyle === 'modern';
    $: dataIcon = styledDataIcon($designStyle, getWeatherDataIcon(item.id));

    interface Item {
        weatherData: { weatherData: WeatherData; model: { id: string; name: string; subtitle: string; color: string } }[];
        forecast: string;
        chartType: 'linechart' | 'scatterchart' | 'barchart';
        id: string;
        timestamp: number;
        hidden: string[];
    }
    export let item: Item & { startingSide: string };
    export let screenOrientation: string = null;
    export let weatherLocation: FavoriteLocation;
    // modern: the page model chips are the legend, and the chart can fill the page
    export let fullscreen = false;
    export let onFullscreen: () => void = null;
    const timezoneOffset = weatherLocation.timezoneOffset;
    let chartHeight;
    $: {
        chartHeight = !fullscreen && !screenOrientation && !ApplicationSettings.getBoolean('charts_portrait_fullscreen', CHARTS_PORTRAIT_FULLSCREEN) ? screenWidthDips : undefined;
    }
    // $: console.log('item changed', (item?.weatherData?.[0]?.model));
    // export let startingSide;

    let chartView: NativeViewElementNode<CombinedChart>;
    let drawer: DrawerElement;
    let chartInitialized = false;

    $: if (drawer) {
        drawer.nativeView.on('open', () => (item.startingSide = 'top'));
        drawer.nativeView.on('close', () => (item.startingSide = null));
    }

    // we need a factor cause using timestamp means
    // using 64bit data which canvas does not support (android Matrix specifically)
    const legends = new ObservableArray([]);
    let lastKey: string;
    let globalStartTimestamp = Number.MAX_SAFE_INTEGER;
    let nightRanges: { from: number; to: number }[] = [];
    let lastGridX: number;
    $: lineWidth = modern ? MODERN_LINE_WIDTH : LINE_WIDTH;
    let maxDatalength = 0;
    function updateLineChart(item: Item) {
        const key = item.id + item.forecast + item.timestamp;
        if (key === lastKey) {
            return;
        }
        try {
            const { weatherData, ...others } = item;
            lastKey = key;
            const chart = chartView?.nativeView;
            if (chart) {
                const xAxis = chart.xAxis;
                const leftAxis = chart.leftAxis;
                if (!chartInitialized) {
                    chartInitialized = true;

                    leftAxis.textColor = colorOnSurface;
                    chart.xAxis.textColor = colorOnSurface;
                    chart.minOffset = 0;
                    // chart.highlightFullBarEnabled = false;
                    chart.autoScaleMinMaxEnabled = true;
                    chart.clipDataToContent = true;
                    chart.pinchZoomEnabled = true;
                    chart.dragEnabled = true;
                    // chart.highlightsFilterByAxis = false;
                    chart.scaleXEnabled = true;
                    chart.scaleYEnabled = false;
                    // chart.highlightPerTapEnabled = true;
                    // chart.highlightPerDragEnabled = true;
                    chart.setExtraOffsets(0, 0, 0, 0);
                    xAxis.enabled = true;
                    xAxis.textSize = 10 * $fontScale;
                    xAxis.labelTextAlign = Align.CENTER;
                    xAxis.ensureLastLabel = true;
                    xAxis.position = XAxisPosition.BOTTOM;
                    xAxis.yOffset = 12;

                    leftAxis.spaceBottom = 5;
                    leftAxis.spaceTop = 5;
                    if (modern) {
                        chart.highlightPerTapEnabled = true;
                        chart.highlightsFilterByAxis = false;
                        chart.customRenderer = { drawHighlight: drawModernHighlight };
                    }
                } else {
                    chart.resetZoom();
                }

                leftAxis.gridColor = modern ? $modernColors.colorModernHairline : colorOnSurfaceVariant + '33';
                xAxis.gridColor = modern ? $modernColors.colorModernHairlineStrong : colorOnSurfaceVariant + '33';
                if (modern) {
                    leftAxis.textColor = xAxis.textColor = colorOnSurfaceVariant;
                    leftAxis.drawAxisLine = false;
                    xAxis.axisLineColor = $modernColors.colorModernHairlineStrong;
                }
                const newLegends = [];
                if (item.forecast === 'hourly') {
                    xAxis.forcedInterval = 1;

                    xAxis.valueFormatter = {
                        getAxisLabel: (value, axis) => {
                            const date = getLocalTime(globalStartTimestamp + value * 3600 * 1000, timezoneOffset);
                            // if (date.get('m') === 0) {
                            if (date.get('h') === 0) {
                                return formatDate(date.valueOf(), 'ddd\nDD/MM', timezoneOffset);
                            } else if (date.get('h') % 4 === 0) {
                                return formatTime(date.valueOf(), 'HH', timezoneOffset);
                            }
                            // }
                        }
                    };
                } else {
                    xAxis.forcedInterval = 24;
                    xAxis.valueFormatter = {
                        getAxisLabel: (value, axis) => formatDate(getLocalTime(globalStartTimestamp + value * 3600 * 1000, timezoneOffset), 'DD/MM', timezoneOffset)
                    };
                }

                const gridLinePathEffect = new DashPathEffect([4, 8], 0);
                xAxis.customRenderer = {
                    drawGridLine(c: Canvas, axis, rect: RectF, x: any, y: any, axisValue: any, paint: Paint) {
                        const hours = getLocalTime(globalStartTimestamp + axisValue * 3600 * 1000, timezoneOffset).get('h');
                        // modern: night shading between hour lines (x is in zoomed pixels here), then only the day separations
                        if (modern) {
                            if (lastGridX !== undefined && x > lastGridX && nightRanges.some((range) => axisValue - 0.5 >= range.from && axisValue - 0.5 < range.to)) {
                                nightPaint.setColor(colorOnSurface);
                                nightPaint.setAlpha(MODERN_NIGHT_ALPHA);
                                c.drawRect(lastGridX, rect.top, x, rect.bottom, nightPaint);
                            }
                            lastGridX = x;
                            if (hours === 0) {
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
                const chartType = item.chartType;
                const data = new CombinedData();
                maxDatalength = 0;
                let xAxisMaximum = -1;
                const dataSets = item.weatherData
                    .map((wData) => {
                        const key = item.id;
                        const sourceData = item.forecast === 'hourly' ? wData.weatherData.hourly : wData.weatherData.daily.data;
                        if (sourceData.length === 0) {
                            return;
                        }
                        const startTimestamp = sourceData[0]?.time;
                        const data = sourceData.map((d: DailyData | Hourly) => ({
                            ...d,
                            deltaHours: (d.time - startTimestamp) / (3600 * 1000),
                            [key]: convertWeatherValueToUnit(d, key as any, { round: false })[0]
                        }));
                        maxDatalength = Math.max(maxDatalength, data.length);
                        xAxisMaximum = Math.max(xAxisMaximum, data[data.length - 1].deltaHours);
                        globalStartTimestamp = Math.min(globalStartTimestamp, startTimestamp);
                        const color = wData.model.color;
                        const enabled = item.hidden.indexOf(wData.model.id) === -1;
                        newLegends.push({
                            name: wData.model.name,
                            subtitle: wData.model.subtitle,
                            id: wData.model.id,
                            enabled,
                            color
                        });
                        let set: BarLineScatterCandleBubbleDataSet<any>;
                        switch (chartType) {
                            case 'scatterchart': {
                                const scatterDataSet = (set = new ScatterDataSet(data, wData.model.id, 'deltaHours', key));
                                scatterDataSet.scatterShape = ScatterShape.CIRCLE;
                                scatterDataSet.drawIconsEnabled = enabled;
                                scatterDataSet.scatterShapeSize = enabled ? 4 : 0;
                                break;
                            }
                            case 'barchart': {
                                const barDataSet = (set = new BarDataSet(data, wData.model.id, 'deltaHours', key));
                                barDataSet.visible = enabled;
                                break;
                            }
                            case 'linechart':
                            default: {
                                {
                                    const lineDataSet = (set = new LineDataSet(data, wData.model.id, 'deltaHours', key));
                                    lineDataSet.lineWidth = enabled ? lineWidth : 0;
                                    if (modern) {
                                        lineDataSet.mode = Mode.CUBIC_BEZIER;
                                    }
                                    break;
                                }
                            }
                        }
                        set['modelId'] = wData.model.id;
                        set.color = color;
                        set.highlightColor = colorPrimary;
                        return set;
                    })
                    .filter((s) => !!s);
                if (!screenOrientation && Application.orientation() !== 'landscape') {
                    chart.setScale(10 / (screenWidthDips / maxDatalength), 1);
                }
                xAxis.axisMinimum = -1.5;
                xAxis.axisMaximum = xAxisMaximum + 1.5;
                legends.splice(0, legends.length, ...newLegends);
                // DEV_LOG && console.log('legends', JSON.stringify(legends));
                switch (chartType) {
                    case 'scatterchart':
                        data.scatterData = new ScatterData(dataSets as ScatterDataSet[]);
                        break;
                    case 'barchart':
                        const barData = new BarData(dataSets as BarDataSet[]);
                        const nbDataSets = dataSets.length;
                        const groupSpace = 0.3 / nbDataSets;
                        const barSpace = 0.01; // x2 dataset
                        const barWidth = (1 - groupSpace - barSpace * nbDataSets) / nbDataSets;
                        // (0.45 + 0.02) * 2 + 0.06 = 1.00 -> interval per "group"
                        barData.barWidth = barWidth;
                        barData.groupBars(0, groupSpace, barSpace, true, true); // start at x = 0
                        // DEV_LOG && console.log('create barData', nbDataSets, barWidth, barSpace, groupSpace);
                        data.barData = barData;
                        break;
                    default:
                        data.lineData = new LineData(dataSets as LineDataSet[]);
                        break;
                }

                const limitLine = new LimitLine((Date.now() - globalStartTimestamp) / (3600 * 1000));
                if (modern) {
                    limitLine.lineWidth = 1.5;
                    limitLine.lineColor = MODERN_NOW_COLOR;
                } else {
                    limitLine.lineWidth = 2;
                    limitLine.enableDashedLine(4, 2, 0);
                    limitLine.lineColor = colorOnSurfaceVariant;
                }
                // night shading from the first model hours (all models share the location)
                const firstHourly = item.forecast === 'hourly' && modern ? item.weatherData[0]?.weatherData.hourly : null;
                nightRanges = firstHourly ? nightSpans(firstHourly.map((hour) => ({ hours: (hour.time - globalStartTimestamp) / (3600 * 1000), isDay: hour.isDay }))) : [];
                xAxis.removeAllLimitLines();
                xAxis.addLimitLine(limitLine);

                chart.data = data;
                // DEV_LOG && console.log('set combined data');
                chart.data.notifyDataChanged();
                chart.notifyDataSetChanged();
            }
        } catch (error) {
            showError(error);
        }
    }
    $: if (chartView) {
        updateLineChart(item);
    }

    onThemeChanged(() => {
        const chart = chartView?.nativeView;
        if (chart) {
            const newColor = $colors.colorOnSurface;
            const leftAxis = chart.leftAxis;
            const xAxis = chart.xAxis;
            leftAxis.textColor = newColor;
            xAxis.textColor = newColor;

            leftAxis.gridColor = colorOnSurfaceVariant + '33';
            xAxis.gridColor = colorOnSurfaceVariant + '33';
            leftAxis.limitLines.forEach((l) => (l.lineColor = newColor));
            if (modern) {
                leftAxis.textColor = xAxis.textColor = $colors.colorOnSurfaceVariant;
                leftAxis.gridColor = $modernColors.colorModernHairline;
                xAxis.gridColor = xAxis.axisLineColor = $modernColors.colorModernHairlineStrong;
            }
            // chart.getLegend().textColor = (newColor);
            chart.invalidate();
        }
    });
    let canvasView;
    function redraw() {
        const chart = chartView?.nativeView;
        if (chartInitialized && chart) {
            const xAxis = chart.xAxis;
            const leftAxis = chart.leftAxis;
            leftAxis.textSize = 10 * $fontScale;
            xAxis.textSize = 10 * $fontScale;
            labelPaint.textSize = 10 * $fontScale;
        }
        labelPaint.getFontMetrics(mFontMetricsBuffer);
        chartView?.nativeView.invalidate();
        canvasView?.nativeView.invalidate();
    }
    fontScale.subscribe(redraw);

    function swipeMenuTranslationFunction(side, width, value, delta, progress) {
        const result = {
            topDrawer: {
                translateY: -value
                //    translateX: side === 'right' ? -delta : delta
            },
            backDrop: {
                // translateX: side === 'right' ? -delta : delta,
                opacity: 0
            }
        } as any;

        return result;
    }
    function onDrawLegend({ color, enabled, id, name, subtitle }: { id: string; subtitle: string; name: string; color: string; enabled: boolean }, { canvas }: { canvas: Canvas }) {
        if (modern) {
            drawLegendChip(canvas, { color, enabled, name, subtitle }, colorOnSurface, textFontFamily($designStyle), $fontScale);
            return;
        }
        const h = canvas.getHeight();
        legendIconPaint.color = color;
        legendPaint.color = color;
        if (enabled) {
            // legendIconPaint.setStyle(enabled ? Style.FILL : Style.STROKE);

            canvas.drawRect(0, 0, 5, h, legendIconPaint);
        }
        // const nameAndKey = name.split(': ');
        if (subtitle) {
            canvas.drawText(name, 15, h / 2 - 3, legendPaint);
            canvas.drawText(subtitle, 15, h / 2 - mFontMetricsBuffer.ascent, legendPaint);
        } else {
            canvas.drawText(name, 15, h / 2 - mFontMetricsBuffer.ascent / 2, legendPaint);
        }
    }

    function toggleLegend(legendItem, event) {
        try {
            legendItem.enabled = !legendItem.enabled;
            const index = legends.findIndex((l) => l.id === legendItem.id);
            const hiddenIndex = item.hidden.indexOf(legendItem.id);
            if (hiddenIndex >= 0 && legendItem.enabled) {
                item.hidden.splice(hiddenIndex, 1);
            } else if (hiddenIndex === -1 && !legendItem.enabled) {
                item.hidden.push(legendItem.id);
            }
            if (index >= 0) {
                const chart = chartView?.nativeView;
                if (chart) {
                    const enabled = legendItem.enabled;
                    const set = chart.data.getDataSetByLabel(legendItem.id, false);
                    switch (item.chartType) {
                        case 'scatterchart':
                            (set as ScatterDataSet).scatterShapeSize = enabled ? 4 : 0;
                            break;
                        case 'barchart':
                            (set as BarDataSet).visible = enabled;
                            break;
                        default:
                            // (set as LineDataSet).drawCirclesEnabled = enabled;
                            (set as LineDataSet).lineWidth = enabled ? lineWidth : 0;
                            break;
                    }
                    chart.invalidate();
                }
                legends.setItem(index, legendItem);
            }
        } catch (error) {
            showError(error);
        }
    }
    export function toggleModel(modelId: string) {
        const legendItem = legends.find((legend) => legend.id === modelId);
        if (legendItem) {
            toggleLegend(legendItem, null);
        }
    }
    function getUnit(prop) {
        const result = propToUnit(prop);
        return typeof result === 'function' ? result() : result;
    }
    // modern: tapping highlights every model at that time (the chart only keeps the closest one)
    let highlighted: Highlight[] = [];
    function onModernHighlight({ highlight, object: chart }: { object: CombinedChart; highlight: Highlight }) {
        highlighted = highlight ? (chart.getHighlightByXValue(highlight.x) ?? []) : [];
        if (highlighted.length > 1) {
            chart.highlights(highlighted);
        }
    }
    function clearModernHighlight() {
        if (highlighted.length) {
            highlighted = [];
            chartView?.nativeView.highlight(null);
        }
    }
    // renderers pass different arguments after the highlight (data set, bar rect...)
    function drawModernHighlight(canvas: Canvas, highlight: Highlight) {
        const set = chartView.nativeView.data.getDataSetByHighlight(highlight);
        if (!set || item.hidden.indexOf(set['modelId']) !== -1) {
            return;
        }
        const content = chartView.nativeView.viewPortHandler.contentRect;
        highlightLinePaint.setColor(colorOnSurfaceVariant);
        highlightLinePaint.setAlpha(120);
        canvas.drawLine(highlight.drawX, content.top, highlight.drawX, content.bottom, highlightLinePaint);
        highlightDotPaint.setColor($modernColors.colorModernCard);
        canvas.drawCircle(highlight.drawX, highlight.drawY, 6, highlightDotPaint);
        highlightDotPaint.setColor(set.color);
        canvas.drawCircle(highlight.drawX, highlight.drawY, 4, highlightDotPaint);
    }
    // card next to the highlight line: the time, then each model value (highest first)
    function onChartDrawn({ canvas }: { canvas: Canvas }) {
        const chart = chartView?.nativeView;
        if (!modern || !chart || !highlighted.length || highlighted[0].drawX === undefined) {
            return;
        }
        const rows = highlightRows(
            highlighted
                .map((highlight) => ({ highlight, set: chart.data.getDataSetByHighlight(highlight) }))
                .filter(({ set }) => set && item.hidden.indexOf(set['modelId']) === -1)
                .map(({ highlight, set }) => {
                    const model = item.weatherData.find((data) => data.model.id === set['modelId'])?.model;
                    return { name: model?.subtitle || model?.name || set['modelId'], color: set.color, value: highlight.entry?.[item.id] ?? highlight.y };
                }),
            getUnit(item.id) || ''
        );
        if (!rows.length) {
            return;
        }
        const timestamp = globalStartTimestamp + highlighted[0].x * 3600 * 1000;
        const title =
            item.forecast === 'hourly' ? formatDate(timestamp, 'ddd', timezoneOffset) + ' ' + formatTime(timestamp, undefined, timezoneOffset) : formatDate(timestamp, 'ddd DD/MM', timezoneOffset);
        const scale = $fontScale;
        const padding = 10 * scale;
        const lineHeight = 18 * scale;
        const dotSpace = 14 * scale;
        tooltipTextPaint.setTextSize(12 * scale);
        tooltipTextPaint.setFontWeight('normal');
        const namesWidth = Math.max(...rows.map((row) => tooltipTextPaint.measureText(row.name)));
        tooltipTextPaint.setFontWeight($accentFontWeight);
        const valuesWidth = Math.max(...rows.map((row) => tooltipTextPaint.measureText(row.text)));
        const width = Math.max(tooltipTextPaint.measureText(title), dotSpace + namesWidth + 12 * scale + valuesWidth) + 2 * padding;
        const height = (rows.length + 1) * lineHeight + 2 * padding;
        const content = chart.viewPortHandler.contentRect;
        const lineX = highlighted[0].drawX;
        const left = lineX + 12 + width <= content.right ? lineX + 12 : Math.max(content.left, lineX - 12 - width);
        const top = content.top + 8;
        tooltipPaint.setColor($modernColors.colorModernSurface);
        canvas.drawRoundRect(left, top, left + width, top + height, 10, 10, tooltipPaint);
        tooltipBorderPaint.setColor($modernColors.colorModernHairlineStrong);
        canvas.drawRoundRect(left, top, left + width, top + height, 10, 10, tooltipBorderPaint);
        const baseline = lineHeight * 0.7;
        tooltipTextPaint.setColor(colorOnSurface);
        tooltipTextPaint.setTextAlign(Align.LEFT);
        canvas.drawText(title, left + padding, top + padding + baseline, tooltipTextPaint);
        rows.forEach((row, index) => {
            const rowTop = top + padding + (index + 1) * lineHeight;
            highlightDotPaint.setColor(row.color);
            canvas.drawCircle(left + padding + 4 * scale, rowTop + lineHeight / 2, 4 * scale, highlightDotPaint);
            tooltipTextPaint.setFontWeight('normal');
            tooltipTextPaint.setColor(colorOnSurfaceVariant);
            tooltipTextPaint.setTextAlign(Align.LEFT);
            canvas.drawText(row.name, left + padding + dotSpace, rowTop + baseline, tooltipTextPaint);
            tooltipTextPaint.setFontWeight($accentFontWeight);
            tooltipTextPaint.setColor(colorOnSurface);
            tooltipTextPaint.setTextAlign(Align.RIGHT);
            canvas.drawText(row.text, left + width - padding, rowTop + baseline, tooltipTextPaint);
        });
    }
    function onChartHighlight({ entry, highlight, highlights, object: chart }: { object: CombinedChart; entry: Entry; highlight: Highlight; highlights: Highlight[] }) {
        // highlighted = highlights
        //     .sort((a, b) => a.dataSetIndex - b.dataSetIndex)
        //     .map((h) => {
        //         const dataSet = (chart.data[h.dataType] as ChartData<any, any>).getDataSetByIndex(h.dataSetIndex);
        //         return {
        //             entry: h.entry,
        //             x: h.x,
        //             y: h.y,
        //             xTouchPx: h.xTouchPx,
        //             yTouchPx: h.yTouchPx,
        //             modelName: dataSet['modelId'],
        //             color: dataSet.color,
        //             timestamp: globalStartTimestamp + h.x * 3600 * 1000
        //         };
        //     });
        // DEV_LOG && console.log('onChartHighlight', highlights.length, JSON.stringify(highlighted));
    }

    let chartNeedsZoomUpdate = false;
    function onOrientationChanged(event: OrientationChangedEventData) {
        const chart = chartView?.nativeElement;
        if (!chart) {
            return;
        }
        const landscape = isLandscape(event.newValue);
        chartHeight = !fullscreen && !landscape && !ApplicationSettings.getBoolean('charts_portrait_fullscreen', CHARTS_PORTRAIT_FULLSCREEN) ? screenWidthDips : undefined;
        chartNeedsZoomUpdate = true;
    }
    function onLayoutChanged(event: EventData) {
        const chart = event.object as CombinedChart;
        chart.once('postDraw', () => {
            //use a timeout to ensure we are called after chart layout changed was called
            // setTimeout(() => {
            // DEV_LOG && console.log('onLayoutChanged', chartNeedsZoomUpdate, screenOrientation, Application.orientation());
            if (chartNeedsZoomUpdate) {
                chartNeedsZoomUpdate = false;
                chart.highlight(null);
                if (screenOrientation || Application.orientation() === 'landscape') {
                    chart.resetZoom();
                } else {
                    chart.setScale(10 / (screenWidthDips / maxDatalength), 1);
                }
                if (__IOS__) {
                    // On iOS calling setNeedsDisplay from drawRect does not seem to work so let s timeout
                    setTimeout(() => {
                        chart.invalidate();
                    }, 0);
                } else {
                    chart.invalidate();
                }
            }
            // }, 0);
        });
    }
    onMount(() => {
        Application.on(Application.orientationChangedEvent, onOrientationChanged);
    });
    onDestroy(() => {
        Application.off(Application.orientationChangedEvent, onOrientationChanged);
    });
</script>

<drawer
    bind:this={drawer}
    closeAnimationDuration={100}
    gestureEnabled={false}
    openAnimationDuration={100}
    startingSide={item.startingSide}
    topDrawerMode="over"
    topSwipeDistance={200}
    translationFunction={swipeMenuTranslationFunction}
    {...$$restProps}>
    <gridlayout prop:mainContent rows="auto,*">
        {#if modern}
            <!-- data icon and title, the forecast as a chip, then the legend toggle -->
            <ModernCardTitle
                icon={dataIcon?.icon}
                iconColor={modernDataColor(item.id)}
                iconFontFamily={$fonts[dataIcon?.fontFamily]}
                paddingRight={4}
                title={`${getWeatherDataTitle(item.id)} ${getUnit(item.id) || ''}`}>
                <mdbutton class="actionBarButton" col={2} text={fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'} variant="text" verticalAlignment="center" on:tap={() => onFullscreen?.()} />
            </ModernCardTitle>
        {:else}
            <label class="sectionHeader" paddingTop={10} text={`${getWeatherDataTitle(item.id)} ${getUnit(item.id) || ''} (${lc(item.forecast)})`} />
            <mdbutton class="mdi" horizontalAlignment="right" text="mdi-format-list-bulleted-square" variant="text" on:tap={() => drawer.toggle()} />
        {/if}

        <!-- horizontal pans only: vertical moves fail fast to let the page scroll -->
        <combinedchart
            bind:this={chartView}
            height={chartHeight}
            panGestureOptions={{
                activeOffsetXStart: -10,
                activeOffsetXEnd: 10,
                failOffsetYStart: -10,
                failOffsetYEnd: 10
            }}
            row={1}
            verticalAlignment={chartHeight ? 'center' : 'stretch'}
            on:highlight={modern ? onModernHighlight : onChartHighlight}
            on:postDraw={onChartDrawn}
            on:pan={clearModernHighlight}
            on:zoom={clearModernHighlight}
            on:layoutChanged={onLayoutChanged} />
        <!-- <label
            backgroundColor={new Color(colorBackground).setAlpha(200)}
            borderRadius={10}
            horizontalAlignment="right"
            margin="0 10 25 0"
            row={1}
            textAlignment="right"
            verticalAlignment="bottom"
            visibility={highlighted && highlighted.length ? 'visible' : 'hidden'}>
            <cspan text={highlighted && highlighted.length ? dayjs(highlighted[0].timestamp).format('L LT') : null} />
            {#each highlighted as high}
                <cspan color={high.color} fontWeight="bold" text={'\n' + '-- '} />
                <cspan text={high.y + getUnit(item.id)} />
            {/each}
        </label> -->
    </gridlayout>
    <gridlayout prop:topDrawer columns="*" height={40 + 36} rows="36,*">
        <collectionview backgroundColor={new Color(colorBackground).setAlpha(200)} colWidth={150} height="40" items={legends} orientation="horizontal" row={1} verticalAlignment="top">
            <Template let:item>
                <canvasview rippleColor={item.color} on:draw={(event) => onDrawLegend(item, event)} on:tap={(event) => toggleLegend(item, event)} />
            </Template>
        </collectionview>
    </gridlayout>
</drawer>
