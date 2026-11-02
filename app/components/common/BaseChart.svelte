<script context="module" lang="ts">
    import { Canvas, Paint } from '@nativescript-community/ui-canvas';
    import type { CombinedChart } from '@nativescript-community/ui-chart';
    import { LimitLine } from '@nativescript-community/ui-chart/components/LimitLine';
    import type { Highlight } from '@nativescript-community/ui-chart/highlight/Highlight';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { getLocalTime } from '~/helpers/locale';
    import { modernColors } from '~/helpers/modernTheme';
    import { onDestroy } from 'svelte';
    import { chartScrolled } from '~/utils/chartEvents';
    import { colors, designStyle, fontScale } from '~/variables';
    import { MODERN_NOW_COLOR, createTimeAxisRenderer, drawHighlightCard, drawNightShading } from '~/utils/chartDraw';
    import type { HighlightCardContent } from '~/utils/chartDraw';
    import { textFontFamily } from '~/utils/designStyle';

    const highlightLinePaint = new Paint();
    highlightLinePaint.strokeWidth = 1;
    const highlightDotPaint = new Paint();
</script>

<!--
    The combined chart shared by the weather charts: modern/classic axis style, day grid and labels, night shading,
    now line, and the highlight (line, a dot per series and a card). A chart gives its data (through chartView)
    and options; it can hook the drawing with onDraw (before the chart) and onDrawn (after, under the card).
-->
<script lang="ts">
    let { colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorSurface } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorSurface } = $colors);
    $: modern = $designStyle === 'modern';

    export let chartView: NativeViewElementNode<CombinedChart>;
    // the x values are hours since startTimestamp (ms), in the timezone of the location
    export let startTimestamp = 0;
    export let timezoneOffset: number;
    // day separations (every 4 hours in classic) and multi-line labels on the x axis
    export let timeGrid = true;
    // colors, text size and offset of the axes. A chart with its own axis drawing can keep them
    export let styleAxes = true;
    // modern: hour ranges shaded as night
    export let nightRanges: { from: number; to: number }[] = [];
    // x value of the now line, null for none
    export let nowHours: number = null;
    // content of the highlight card, from the highlights of the shown series. null for no card
    export let highlightCard: (highlights: Highlight[], chart: CombinedChart) => HighlightCardContent = null;
    // the series with a dot and in the card
    export let highlightFilter: (dataSet: any) => boolean = (dataSet) => dataSet.visible !== false;
    // color of the dot of a series, its line color by default (a series can be colored per point)
    export let highlightColor: (dataSet: any, highlight: Highlight) => string = null;
    export let highlightPerDrag = false;
    // false: the chart shows no highlight at all
    export let highlightEnabled = true;
    // renderers of the chart (drawFill, drawIcon, drawBar...), the highlight is drawn here
    export let customRenderer: { [key: string]: any } = {};
    export let onDraw: (canvas: Canvas, chart: CombinedChart) => void = null;
    export let onDrawn: (canvas: Canvas, chart: CombinedChart) => void = null;
    export let onLayoutChanged: (chart: CombinedChart) => void = null;
    export let onFirstOffsetsCalculated: (chart: CombinedChart) => void = null;
    // after the highlight changed, null when cleared
    export let onHighlight: (highlight: Highlight) => void = null;

    let highlighted: Highlight[] = [];
    let lineDrawn = false;
    let classicAxisLineColor: string;
    let hasNowLine = false;
    onDestroy(chartScrolled.subscribe(() => clearHighlight()));

    export function getChart() {
        return chartView?.nativeView;
    }
    export function clearHighlight() {
        if (highlighted.length) {
            highlighted = [];
            chartView?.nativeView.highlight(null);
        }
    }

    $: if (chartView) {
        const chart = chartView.nativeView;
        chart.highlightsFilterByAxis = false;
        // never set to false: it also turns off the pan gesture, and with it the drag of the chart
        if (highlightEnabled) {
            chart.highlightPerTapEnabled = true;
            if (highlightPerDrag) {
                chart.highlightPerDragEnabled = true;
            }
        }
    }
    $: if (chartView) {
        chartView.nativeView.customRenderer = { ...customRenderer, drawHighlight };
    }
    $: if (chartView && timeGrid) {
        chartView.nativeView.xAxis.customRenderer = createTimeAxisRenderer(
            (axisValue) => getLocalTime(startTimestamp + axisValue * 3600 * 1000, timezoneOffset).get('h'),
            () => modern
        );
    }
    $: if (chartView && styleAxes) {
        applyStyle(modern, $modernColors, colorOnSurface, colorOnSurfaceVariant, $fontScale);
    }
    $: if (chartView) {
        applyNowLine(nowHours, modern, colorOnSurfaceVariant);
    }

    function applyStyle(isModern: boolean, themeColors: typeof $modernColors, onSurface: string, onSurfaceVariant: string, scale: number) {
        const chart = chartView.nativeView;
        const { leftAxis, rightAxis, xAxis } = chart;
        if (classicAxisLineColor === undefined) {
            classicAxisLineColor = xAxis.axisLineColor;
        }
        leftAxis.textColor = rightAxis.textColor = xAxis.textColor = isModern ? onSurfaceVariant : onSurface;
        leftAxis.gridColor = rightAxis.gridColor = isModern ? themeColors.colorModernHairline : onSurfaceVariant + '33';
        xAxis.gridColor = isModern ? themeColors.colorModernHairlineStrong : onSurfaceVariant + '33';
        xAxis.axisLineColor = isModern ? themeColors.colorModernHairlineStrong : classicAxisLineColor;
        leftAxis.textSize = rightAxis.textSize = xAxis.textSize = 10 * scale;
        // labels are drawn from their baseline: the offset must cover their height
        xAxis.yOffset = isModern ? 3 + xAxis.textSize : 12;
        xAxis.typeface = xAxis.typeface?.withFontFamily(textFontFamily($designStyle)) ?? xAxis.typeface;
        chart.invalidate();
    }

    function applyNowLine(hours: number, isModern: boolean, classicColor: string) {
        const xAxis = chartView.nativeView.xAxis;
        const hasHours = hours !== null && hours !== undefined;
        if (!hasHours && !hasNowLine) {
            return;
        }
        xAxis.removeAllLimitLines();
        hasNowLine = hasHours;
        if (!hasHours) {
            return;
        }
        const limitLine = new LimitLine(hours);
        if (isModern) {
            limitLine.lineWidth = 1.5;
            limitLine.lineColor = MODERN_NOW_COLOR;
        } else {
            limitLine.lineWidth = 2;
            limitLine.enableDashedLine(4, 2, 0);
            limitLine.lineColor = classicColor;
        }
        xAxis.addLimitLine(limitLine);
    }

    // renderers pass different arguments after the highlight (data set, bar rect...)
    function drawHighlight(canvas: Canvas, highlight: Highlight) {
        const chart = chartView.nativeView;
        const set = chart.data.getDataSetByHighlight(highlight);
        if (!set) {
            return;
        }
        if (!lineDrawn) {
            lineDrawn = true;
            const content = chart.viewPortHandler.contentRect;
            highlightLinePaint.setColor(colorOnSurfaceVariant);
            highlightLinePaint.setAlpha(120);
            canvas.drawLine(highlight.drawX, content.top, highlight.drawX, content.bottom, highlightLinePaint);
        }
        if (!highlightFilter(set)) {
            return;
        }
        highlightDotPaint.setColor(modern ? $modernColors.colorModernCard : colorSurface);
        canvas.drawCircle(highlight.drawX, highlight.drawY, 6, highlightDotPaint);
        highlightDotPaint.setColor(highlightColor?.(set, highlight) ?? set.color);
        canvas.drawCircle(highlight.drawX, highlight.drawY, 4, highlightDotPaint);
    }

    // a tap highlights every series at that time (the chart only keeps the closest one)
    function handleHighlight({ highlight, object: chart }: { object: CombinedChart; highlight: Highlight }) {
        const atSameX = highlight ? chart.getHighlightByXValue(highlight.x) : null;
        // the chart draws, and so gives a drawX to, only its own highlight object: the one of a single series
        highlighted = !highlight ? [] : atSameX?.length > 1 ? atSameX : [highlight];
        if (highlighted.length > 1) {
            chart.highlights(highlighted);
        }
        onHighlight?.(highlight);
    }

    function onChartDraw({ canvas }: { canvas: Canvas }) {
        const chart = chartView?.nativeView;
        if (!chart) {
            return;
        }
        lineDrawn = false;
        if (modern && nightRanges.length) {
            drawNightShading(canvas, chart, nightRanges, colorOnSurface);
        }
        onDraw?.(canvas, chart);
    }

    function onChartDrawn({ canvas }: { canvas: Canvas }) {
        const chart = chartView?.nativeView;
        if (!chart) {
            return;
        }
        onDrawn?.(canvas, chart);
        if (!highlightCard || !highlighted.length || highlighted[0].drawX === undefined) {
            return;
        }
        const shown = highlighted.filter((highlight) => {
            const set = chart.data.getDataSetByHighlight(highlight);
            return set && highlightFilter(set);
        });
        const content = shown.length ? highlightCard(shown, chart) : null;
        if (!content) {
            return;
        }
        drawHighlightCard(canvas, chart, {
            ...content,
            lineX: highlighted[0].drawX,
            scale: $fontScale,
            colors: modern
                ? { surface: $modernColors.colorModernSurface, border: $modernColors.colorModernHairlineStrong, text: colorOnSurface, textVariant: colorOnSurfaceVariant }
                : { surface: colorSurface, border: colorOutlineVariant, text: colorOnSurface, textVariant: colorOnSurfaceVariant }
        });
    }
</script>

<combinedchart
    bind:this={chartView}
    {...$$restProps}
    on:draw={onChartDraw}
    on:postDraw={onChartDrawn}
    on:highlight={handleHighlight}
    on:pan={clearHighlight}
    on:zoom={clearHighlight}
    on:layoutChanged={(event) => onLayoutChanged?.(event.object)}
    on:firstOffsetsCalculated={(event) => onFirstOffsetsCalculated?.(event.object)} />
