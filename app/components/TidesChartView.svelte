<script context="module" lang="ts">
    import { Align, Canvas, Paint } from '@nativescript-community/ui-canvas';
    import { CombinedChart } from '@nativescript-community/ui-chart';
    import { AxisBase } from '@nativescript-community/ui-chart/components/AxisBase';
    import { AxisDependency } from '@nativescript-community/ui-chart/components/YAxis';
    import { XAxisPosition } from '@nativescript-community/ui-chart/components/XAxis';
    import { CombinedData } from '@nativescript-community/ui-chart/data/CombinedData';
    import { LineData } from '@nativescript-community/ui-chart/data/LineData';
    import { LineDataSet, Mode } from '@nativescript-community/ui-chart/data/LineDataSet';
    import type { Highlight } from '@nativescript-community/ui-chart/highlight/Highlight';
    import { Color } from '@nativescript/core';
    import BaseChart from '~/components/common/BaseChart.svelte';
    import type { HighlightCardContent } from '~/utils/chartDraw';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { formatTime, getStartOfDay, lc } from '~/helpers/locale';
    import { modernColors } from '~/helpers/modernTheme';
    import type { Tide } from '~/services/providers/weather';
    import { tideCurve } from '~/utils/tides';
    import { colors, designStyle, fontScale, onFontScaleChanged } from '~/variables';
    import { onThemeChanged } from '~/helpers/theme';
    import { get } from 'svelte/store';

    const labelPaint = new Paint();
    labelPaint.setTextAlign(Align.CENTER);
    const underwaterPaint = new Paint();
    const seaLevelPaint = new Paint();
    // x values are 10 minutes since the start of the day, like the astronomy chart
    const MINUTES_PER_X = 10;
    const DAY_X = (24 * 60) / MINUTES_PER_X;
    const HIGH_COLOR = '#0288d1';
    const LOW_COLOR = '#80cbc4';
</script>

<script lang="ts">
    import type { Dayjs } from 'dayjs';

    export let tides: Tide[] = [];
    export let startTime: Dayjs;
    export let timezoneOffset;

    let { colorOnSurface } = $colors;
    $: ({ colorOnSurface } = $colors);
    $: modern = $designStyle === 'modern';

    let chartView: NativeViewElementNode<CombinedChart>;
    let chartInitialized = false;

    function updateTheme() {
        // below the sea level the curve and its fill are dimmed by the card color, like below the horizon in the astronomy chart
        underwaterPaint.color = $designStyle === 'modern' ? new Color(get(modernColors).colorModernCard).setAlpha(150) : new Color($colors.colorBackground).setAlpha(120);
        seaLevelPaint.color = new Color($colors.colorOnSurface).setAlpha($designStyle === 'modern' ? 60 : 150);
        seaLevelPaint.strokeWidth = 1;
    }
    updateTheme();

    onThemeChanged(() => {
        updateTheme();
        const chart = chartView?.nativeView;
        if (chart) {
            const newColor = $colors.colorOnSurface;
            chart.leftAxis.textColor = chart.xAxis.textColor = newColor;
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
    });

    onFontScaleChanged(() => {
        chartView?.nativeView?.invalidate();
    });

    function getComputeStartTime() {
        return getStartOfDay(startTime, timezoneOffset);
    }

    function tideX(tide: Tide) {
        return (tide.time - getComputeStartTime().valueOf()) / (MINUTES_PER_X * 60000);
    }

    function curveEntries() {
        const dayStart = getComputeStartTime().valueOf();
        return tideCurve(tides, dayStart, dayStart + 24 * 3600 * 1000, MINUTES_PER_X * 60000).map((point) => ({ x: (point.time - dayStart) / (MINUTES_PER_X * 60000), y: point.height }));
    }

    function tideEntries() {
        return tides.map((tide) => ({ x: tideX(tide), y: tide.height }));
    }

    function updateChartData() {
        if (!chartView || !tides.length) {
            return;
        }

        const chart = chartView.nativeView;
        const curve = curveEntries();
        const entries = tideEntries();
        const heights = tides.map((tide) => tide.height);
        // the sea level (0) stays in the chart, with room for the value labels
        const margin = Math.max(0.4, (Math.max(...heights, 0) - Math.min(...heights, 0)) * 0.25);

        if (!chartInitialized) {
            chartInitialized = true;

            const leftAxis = chart.leftAxis;
            const xAxis = chart.xAxis;

            leftAxis.textColor = xAxis.textColor = colorOnSurface;
            if (modern) {
                xAxis.textColor = $colors.colorOnSurfaceVariant;
                xAxis.textSize = 11 * $fontScale;
            }
            chart.setExtraOffsets(0, 10, 0, 40);
            chart.minOffset = 0;
            // the values are only drawn when the chart shows fewer points than this: the curve has one every 10 minutes
            chart.maxVisibleValueCount = 10000;
            chart.clipDataToContent = false;
            leftAxis.drawLabels = false;
            leftAxis.drawGridLines = false;
            leftAxis.drawAxisLine = false;

            xAxis.position = XAxisPosition.BOTTOM_INSIDE;
            xAxis.drawAxisLine = false;
            xAxis.drawGridLines = false;
            xAxis.ensureVisible = true;
            xAxis.labelTextAlign = Align.CENTER;
            xAxis.drawLabels = true;
            xAxis.forcedInterval = 24;
            xAxis.axisMinimum = 0;
            xAxis.axisMaximum = DAY_X;
            xAxis.valueFormatter = {
                getAxisLabel(value: any, axis: AxisBase) {
                    const time = getComputeStartTime()
                        .add(value * MINUTES_PER_X, 'minutes')
                        .valueOf();
                    // modern: hours only, like the hourly chart
                    return formatTime(time, modern ? 'HH' : undefined, timezoneOffset);
                }
            };

            // the curve, filled down to the sea level
            const curveSet = new LineDataSet(curve.length ? curve : entries, 'tides', 'x', 'y');
            curveSet.fillFormatter = {
                getFillLinePosition: (dataSet, dataProvider) => 0
            };
            curveSet.fillColor = HIGH_COLOR;
            curveSet.color = HIGH_COLOR;
            curveSet.fillAlpha = 50;
            curveSet.drawFilledEnabled = true;
            curveSet.lineWidth = 3;
            curveSet.mode = Mode.LINEAR;
            curveSet.drawCirclesEnabled = false;
            curveSet.drawValuesEnabled = false;

            // the tides: a point and the height of each
            const tidesSet = new LineDataSet(entries, 'extremes', 'x', 'y');
            tidesSet.lineWidth = 0;
            tidesSet.color = HIGH_COLOR;
            tidesSet.drawCirclesEnabled = true;
            tidesSet.circleRadius = 5;
            tidesSet.drawValuesEnabled = true;
            tidesSet.valueTextSize = 11 * $fontScale;
            tidesSet.valueTextColor = colorOnSurface;
            tidesSet.valueFormatter = {
                getFormattedValue(value: number, entry?) {
                    return value.toFixed(2) + 'm';
                }
            } as any;

            const data = new CombinedData();
            data.lineData = new LineData([curveSet, tidesSet]);
            chart.data = data;
        } else {
            const lineData = chart.lineData;
            lineData.getDataSetByIndex(0).values = curve.length ? curve : entries;
            lineData.getDataSetByIndex(1).values = entries;
            lineData.dataSets.forEach((dataSet) => dataSet.notifyDataSetChanged());
            chart.data.notifyDataChanged();
        }
        chart.leftAxis.axisMinimum = Math.min(...heights, 0) - margin;
        chart.leftAxis.axisMaximum = Math.max(...heights, 0) + margin;
        chart.notifyDataSetChanged();
        chart.invalidate();
    }

    $: {
        try {
            if (chartView) {
                updateChartData();
            }
        } catch (err) {
            // ignore
        }
    }

    // time of the tide at the touched time (within 15 minutes), its height otherwise
    function tideAt(x: number) {
        return tides.find((tide) => Math.abs(tideX(tide) - x) <= 1.5);
    }

    function highlightCard(highlights: Highlight[], chart: CombinedChart): HighlightCardContent {
        const x = highlights[0].x;
        const time = getComputeStartTime()
            .add(x * MINUTES_PER_X, 'minutes')
            .valueOf();
        const tide = tideAt(x);
        if (tide) {
            const isHigh = tide.type === 'high';
            return {
                title: formatTime(tide.time, undefined, timezoneOffset),
                rows: [
                    { name: lc(isHigh ? 'tide_high' : 'tide_low'), color: isHigh ? HIGH_COLOR : LOW_COLOR, text: tide.height.toFixed(2) + 'm', extra: tide.coef != null ? `(${tide.coef})` : undefined }
                ]
            };
        }
        return { title: formatTime(time, undefined, timezoneOffset), rows: [{ name: lc('tides'), color: HIGH_COLOR, text: highlights[0].entry['y'].toFixed(2) + 'm' }] };
    }

    // the curve only is highlighted: its points are every 10 minutes
    function isCurve(dataSet) {
        return dataSet.label === 'tides';
    }

    // the height of a tide at the start or the end of the day stays in the chart
    const customRenderer = {
        drawValue(canvas: Canvas, chart: CombinedChart, dataSet, dataSetIndex: number, entry, entryIndex: number, valueText: string, x: number, y: number, color: string | Color, paint: Paint) {
            const content = chart.viewPortHandler.contentRect;
            const halfWidth = paint.measureText(valueText) / 2;
            paint.setColor(color);
            canvas.drawText(valueText, Math.min(Math.max(x, content.left + halfWidth), content.right - halfWidth), y, paint);
        }
    };

    // under the sea level over the curve, and the time and the height of each tide under the chart
    function drawSeaLevel(canvas: Canvas, chart: CombinedChart) {
        const content = chart.viewPortHandler.contentRect;
        const seaLevelY = chart.getTransformer(AxisDependency.LEFT).getPixelForValues(0, 0).y;
        if (seaLevelY < content.bottom) {
            canvas.drawRect(content.left, Math.max(seaLevelY, content.top), content.right, content.bottom, underwaterPaint);
        }
        canvas.drawLine(content.left, seaLevelY, content.right, seaLevelY, seaLevelPaint);
        labelPaint.textSize = 12 * $fontScale;
        tides.forEach((tide) => {
            const isHigh = tide.type === 'high';
            const timeText = (isHigh ? '▲ ' : '▼ ') + formatTime(tide.time, undefined, timezoneOffset);
            const heightText = tide.height.toFixed(1) + 'm' + (tide.coef != null ? ` (${tide.coef})` : '');
            const pointX = chart.getTransformer(AxisDependency.LEFT).getPixelForValues(tideX(tide), 0).x;
            const halfWidth = Math.max(labelPaint.measureText(timeText), labelPaint.measureText(heightText)) / 2;
            // a tide at the start or the end of the day keeps its labels in the chart: against its edge
            let x = pointX;
            labelPaint.setTextAlign(Align.CENTER);
            if (pointX - halfWidth < content.left) {
                x = content.left + 2;
                labelPaint.setTextAlign(Align.LEFT);
            } else if (pointX + halfWidth > content.right) {
                x = content.right - 2;
                labelPaint.setTextAlign(Align.RIGHT);
            }
            labelPaint.color = isHigh ? HIGH_COLOR : LOW_COLOR;
            canvas.drawText(timeText, x, content.bottom + 18 * $fontScale, labelPaint);
            labelPaint.color = colorOnSurface;
            canvas.drawText(heightText, x, content.bottom + 34 * $fontScale, labelPaint);
            labelPaint.setTextAlign(Align.CENTER);
        });
    }
</script>

<BaseChart
    {customRenderer}
    height={200}
    {highlightCard}
    highlightFilter={isCurve}
    highlightPerDrag={true}
    onDrawn={drawSeaLevel}
    panGestureOptions={{
        minDist: 50,
        failOffsetYStart: -40,
        failOffsetYEnd: 40
    }}
    styleAxes={false}
    timeGrid={false}
    {timezoneOffset}
    bind:chartView
    {...$$restProps} />
