<script context="module" lang="ts">
    import { Align, Canvas, DashPathEffect, Paint } from '@nativescript-community/ui-canvas';
    import { LineChart } from '@nativescript-community/ui-chart';
    import { AxisBase } from '@nativescript-community/ui-chart/components/AxisBase';
    import { XAxisPosition } from '@nativescript-community/ui-chart/components/XAxis';
    import { LineData } from '@nativescript-community/ui-chart/data/LineData';
    import { LineDataSet, Mode } from '@nativescript-community/ui-chart/data/LineDataSet';
    import { Highlight } from '@nativescript-community/ui-chart/highlight/Highlight';
    import { Utils } from '@nativescript-community/ui-chart/utils/Utils';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { formatTime, getStartOfDay } from '~/helpers/locale';
    import type { Tide } from '~/services/providers/weather';
    import { colors, fontScale, onFontScaleChanged } from '~/variables';
    import { onThemeChanged } from '~/helpers/theme';

    const highlightPaint = new Paint();
    highlightPaint.setColor('white');
    highlightPaint.setStrokeWidth(2);
    highlightPaint.setPathEffect(new DashPathEffect([3, 3], 0));
    highlightPaint.setTextAlign(Align.LEFT);
    highlightPaint.setTextSize(10);

    const labelPaint = new Paint();
    labelPaint.setTextAlign(Align.CENTER);
</script>

<script lang="ts">
    import type { Dayjs } from 'dayjs';
    import { Rounding } from '@nativescript-community/ui-chart/data/DataSet';

    export let tides: Tide[] = [];
    export let startTime: Dayjs;
    export let timezoneOffset;

    let { colorOnSurface } = $colors;
    $: ({ colorOnSurface } = $colors);

    let chartView: NativeViewElementNode<LineChart>;
    let chartInitialized = false;

    onThemeChanged(() => {
        const chart = chartView?.nativeView;
        if (chart) {
            const newColor = $colors.colorOnSurface;
            chart.leftAxis.textColor = chart.xAxis.textColor = highlightPaint.color = newColor;
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

    function tidesToEntries() {
        const computeStartTime = Math.min(getComputeStartTime().valueOf(), tides[0].time);
        return tides.map((tide) => ({
            x: (tide.time - computeStartTime) / 60000,
            y: tide.height
        }));
    }

    function updateChartData() {
        if (!chartView || !tides.length) {
            return;
        }

        const chart = chartView.nativeView;
        const computeStartTime = getComputeStartTime();
        const entries = tidesToEntries();

        if (!chartInitialized) {
            chartInitialized = true;

            const leftAxis = chart.leftAxis;
            const xAxis = chart.xAxis;

            leftAxis.textColor = xAxis.textColor = highlightPaint.color = colorOnSurface;
            chart.setExtraOffsets(0, 10, 0, 40);
            chart.minOffset = 0;
            chart.clipDataToContent = false;
            chart.highlightPerTapEnabled = true;
            chart.highlightPerDragEnabled = true;
            chart.customRenderer = {
                drawHighlight(c: Canvas, h: Highlight<any>, set: LineDataSet, paint: Paint) {
                    highlightPaint.setTextSize(10 * $fontScale);
                    c.drawLine(h.drawX, 0, h.drawX, c.getHeight() - 46, highlightPaint);
                    const x = h.x;
                    const tideIndex = set.getEntryIndexForXValue(x, NaN, Rounding.CLOSEST);
                    const tide = tides[tideIndex];
                    highlightPaint.setTextAlign(Align.LEFT);
                    let xPos = h.drawX + 4;
                    const text = formatTime(tide.time, undefined, timezoneOffset);
                    const size = Utils.calcTextSize(highlightPaint, text);
                    if (xPos > c.getWidth() - size.width) {
                        xPos = h.drawX - 4;
                        highlightPaint.setTextAlign(Align.RIGHT);
                    }
                    c.drawText(text, xPos, 14, highlightPaint);
                }
            };

            const heights = tides.map((t) => t.height);
            const minH = Math.max(0, Math.min(...heights) - 0.5);
            const maxH = Math.max(...heights) + 0.3;

            leftAxis.drawLabels = false;
            leftAxis.drawGridLines = false;
            leftAxis.drawAxisLine = false;
            // leftAxis.axisMinimum = minH;
            // leftAxis.axisMaximum = maxH;
            // leftAxis.spaceBottom = 100;
            // leftAxis.spaceTop = 100;

            xAxis.position = XAxisPosition.BOTTOM_INSIDE;
            xAxis.drawAxisLine = false;
            xAxis.drawGridLines = false;
            xAxis.ensureVisible = true;
            xAxis.labelTextAlign = Align.CENTER;
            xAxis.drawLabels = true;
            xAxis.forceLabelsEnabled = true;
            xAxis.labelCount = tides.length;
            xAxis.spaceMin = 100;
            xAxis.spaceMax = 100;

            labelPaint.textSize = 13 * $fontScale;
            labelPaint.color = colorOnSurface;
            labelPaint.setTextAlign(Align.CENTER);
            xAxis.customRenderer = {
                drawLabel: (c: Canvas, axis: AxisBase, text: string, x: number, y: number, paint: Paint, anchor, angleDegrees?: number) => {
                    const w = c.getWidth();
                    const h = chart.getHighlightByTouchPoint(x, y);
                    const tide = tides[h.entryIndex];
                    const timeStr = formatTime(tide.time, undefined, timezoneOffset);
                    const heightStr = tide.height.toFixed(0) + 'm' + (tide.coef != null ? ` (${tide.coef})` : '');
                    const isHigh = tide.type === 'high';
                    labelPaint.color = isHigh ? '#0288d1' : '#80cbc4';
                    c.drawText((isHigh ? '▲ ' : '▼ ') + timeStr, h.xPx, y + 35 - 2 * $fontScale, labelPaint);
                    labelPaint.color = colorOnSurface;
                    c.drawText(heightStr, h.xPx, y + 35 + 14 * $fontScale, labelPaint);
                }
            };

            const set = new LineDataSet(entries, 'tides', 'x', 'y');
            set.fillFormatter = {
                getFillLinePosition: (dataSet, dataProvider) => minH
            };
            set.fillColor = '#0288d1';
            set.color = '#0288d1';
            set.fillAlpha = 50;
            set.drawFilledEnabled = true;
            set.lineWidth = 3;
            set.mode = Mode.CUBIC_BEZIER;
            set.drawCirclesEnabled = true;
            set.circleRadius = 5;
            // set.setCircleColor('#0288d1');
            set.drawValuesEnabled = true;
            set.valueTextSize = 11 * $fontScale;
            set.valueTextColor = colorOnSurface;
            set.valueFormatter = {
                getFormattedValue(value: number, entry?) {
                    return value.toFixed(2) + 'm';
                }
            } as any;

            chart.data = new LineData([set]);
        } else {
            const dataSet = chart.data?.getDataSetByIndex(0);
            if (dataSet) {
                dataSet.values = entries;
                dataSet.notifyDataSetChanged();
                chart.data.notifyDataChanged();
                chart.notifyDataSetChanged();
                chart.invalidate();
            }
        }
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

    function drawTideLabels({ canvas }: { canvas: Canvas }) {
        if (!tides.length) return;
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const padding = 10;
        const colWidth = (w - 2 * padding) / tides.length;

        labelPaint.textSize = 13 * $fontScale;
        labelPaint.color = colorOnSurface;
        labelPaint.setTextAlign(Align.CENTER);

        tides.forEach((tide, index) => {
            const x = padding + index * colWidth + colWidth / 2;
            const timeStr = formatTime(tide.time, undefined, timezoneOffset);
            const heightStr = tide.height.toFixed(2) + 'm' + (tide.coef != null ? ` (${tide.coef})` : '');
            const isHigh = tide.type === 'high';
            labelPaint.color = isHigh ? '#0288d1' : '#80cbc4';
            canvas.drawText((isHigh ? '▲ ' : '▼ ') + timeStr, x, h / 2 - 2 * $fontScale, labelPaint);
            labelPaint.color = colorOnSurface;
            canvas.drawText(heightStr, x, h / 2 + 14 * $fontScale, labelPaint);
        });
    }
</script>

<linechart bind:this={chartView} height={200} {...$$restProps} />
<!-- {#if tides.length}
        <canvasview padding="0 10 0 10" row={1} on:draw={drawTideLabels} />
    {/if} -->
