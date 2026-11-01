<script context="module" lang="ts">
    import { Align, Canvas, DashPathEffect, Paint, RectF, Style } from '@nativescript-community/ui-canvas';
    import { CombinedChart } from '@nativescript-community/ui-chart';
    import type { HighlightEventData } from '@nativescript-community/ui-chart/charts/Chart';
    import { XAxisPosition } from '@nativescript-community/ui-chart/components/XAxis';
    import { AxisDependency } from '@nativescript-community/ui-chart/components/YAxis';
    import { CombinedData } from '@nativescript-community/ui-chart/data/CombinedData';
    import { LineData } from '@nativescript-community/ui-chart/data/LineData';
    import { LineDataSet } from '@nativescript-community/ui-chart/data/LineDataSet';
    import { Highlight } from '@nativescript-community/ui-chart/highlight/Highlight';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Color } from '@nativescript/core';
    import { formatValueToUnit } from '~/helpers/formatter';
    import { formatDate, formatTime, getLocalTime } from '~/helpers/locale';
    import { modernColors } from '~/helpers/modernTheme';
    import { onThemeChanged } from '~/helpers/theme';
    import { WeatherProps, defaultPropUnit, getWeatherDataIcon, getWeatherDataTitle, propToUnit } from '~/services/weatherData';
    import { modernDataColor, modernLineStyle, styledDataIcon, textFontFamily } from '~/utils/designStyle';
    import type { MetarPoint } from '~/utils/metar';
    import { accentFontWeight, colors, designStyle, fontScale, fonts } from '~/variables';

    // same look as the hourly chart: temperature is the thick reference line, the other metrics are thinner
    const TEMPERATURE_LINE_WIDTH = 3;
    const LINE_WIDTH = 2;
    const HOUR = 3600 * 1000;
    const highlightPaint = new Paint();
    highlightPaint.setTextAlign(Align.LEFT);
    highlightPaint.setTextSize(10);
    const selectionPaint = new Paint();
    selectionPaint.setStrokeWidth(1.5);
    const selectionTextPaint = new Paint();
    selectionTextPaint.setTextAlign(Align.CENTER);
    const pointPaint = new Paint();
    const labelPaint = new Paint();
    labelPaint.setTextAlign(Align.CENTER);
    // card with the values at the selected time, like the compare charts
    const tooltipPaint = new Paint();
    const tooltipBorderPaint = new Paint();
    tooltipBorderPaint.setStyle(Style.STROKE);
    tooltipBorderPaint.strokeWidth = 1;
    const tooltipTextPaint = new Paint();
</script>

<script lang="ts">
    export let series: { weatherProp: WeatherProps; points: MetarPoint[] }[] = [];
    export let timezoneOffset: number;

    let { colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorSurface } = $colors;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorSurface } = $colors);
    $: modern = $designStyle === 'modern';

    interface ChartSeries {
        weatherProp: WeatherProps;
        color: string;
        // `value` is what is plotted, `raw` the measure itself (they differ for the rescaled pressure)
        entries: { hours: number; value: number; raw: number }[];
    }

    let chartView: NativeViewElementNode<CombinedChart>;
    let chartInitialized = false;
    // the x axis is in hours since this hour-aligned time
    let startTimestamp = 0;
    let chartSeries: ChartSeries[] = [];
    let hidden: WeatherProps[] = [];
    let highlighted: Highlight = null;

    function isShown(item: ChartSeries) {
        return hidden.indexOf(item.weatherProp) === -1;
    }
    function nearestEntry(item: ChartSeries, hours: number) {
        return item.entries.reduce((nearest, entry) => (Math.abs(entry.hours - hours) < Math.abs(nearest.hours - hours) ? entry : nearest));
    }
    function formatRaw(weatherProp: WeatherProps, raw: number) {
        return formatValueToUnit(raw, propToUnit(weatherProp), defaultPropUnit(weatherProp));
    }
    function axisDependency(item: ChartSeries) {
        return item.weatherProp === WeatherProps.windSpeed ? AxisDependency.RIGHT : AxisDependency.LEFT;
    }

    // the wind has its own axis, the pressure shares the temperature one: it is rescaled into its range
    function buildSeries(): ChartSeries[] {
        const result = series.map(({ points, weatherProp }) => ({
            weatherProp,
            color: modernDataColor(weatherProp),
            entries: points.map((point) => ({ hours: (point.time - startTimestamp) / HOUR, value: point.value, raw: point.value }))
        }));
        const reference = result.find((item) => item.weatherProp === WeatherProps.temperature);
        const pressure = result.find((item) => item.weatherProp === WeatherProps.sealevelPressure);
        if (reference && pressure) {
            const [referenceMin, referenceMax] = extent(reference.entries.map((entry) => entry.raw));
            const [pressureMin, pressureMax] = extent(pressure.entries.map((entry) => entry.raw));
            for (const entry of pressure.entries) {
                const ratio = pressureMax === pressureMin ? 0.5 : (entry.raw - pressureMin) / (pressureMax - pressureMin);
                entry.value = referenceMin + ratio * (referenceMax - referenceMin);
            }
        }
        return result;
    }
    function extent(values: number[]) {
        return [Math.min(...values), Math.max(...values)];
    }

    function updateChartData() {
        const chart = chartView.nativeView;
        const { leftAxis, rightAxis, xAxis } = chart;
        startTimestamp = Math.floor(Math.min(...series.map((item) => item.points[0].time)) / HOUR) * HOUR;
        chartSeries = buildSeries();
        const fontFamily = textFontFamily($designStyle);
        [selectionTextPaint, labelPaint, highlightPaint, tooltipTextPaint].forEach((paint) => paint.setFontFamily(fontFamily));

        if (!chartInitialized) {
            chartInitialized = true;
            chart.minOffset = 0;
            chart.autoScaleMinMaxEnabled = true;
            chart.clipDataToContent = true;
            chart.highlightsFilterByAxis = false;
            chart.highlightPerTapEnabled = true;
            chart.dragEnabled = false;
            chart.pinchZoomEnabled = false;
            chart.scaleXEnabled = false;
            chart.scaleYEnabled = false;
            xAxis.enabled = true;
            xAxis.textSize = 10 * $fontScale;
            xAxis.labelTextAlign = Align.CENTER;
            xAxis.ensureLastLabel = true;
            xAxis.position = XAxisPosition.BOTTOM;
            xAxis.forcedInterval = 1;
            leftAxis.spaceBottom = rightAxis.spaceBottom = 5;
            leftAxis.spaceTop = rightAxis.spaceTop = 5;
            rightAxis.enabled = true;
            rightAxis.drawGridLines = false;
            rightAxis.axisMinimum = 0;
            const gridLinePathEffect = new DashPathEffect([4, 8], 0);
            xAxis.customRenderer = {
                drawGridLine(canvas: Canvas, axis, rect: RectF, lineX: number, lineY: number, axisValue: number, paint: Paint) {
                    const hours = getLocalTime(startTimestamp + axisValue * HOUR, timezoneOffset).get('h');
                    // modern: only the day separation
                    if (modern) {
                        if (hours === 0) {
                            paint.setPathEffect(null);
                            canvas.drawLine(lineX, rect.bottom, lineX, rect.top, paint);
                        }
                        return;
                    }
                    if (hours % 4 === 0) {
                        paint.setPathEffect(hours === 0 ? null : gridLinePathEffect);
                        canvas.drawLine(lineX, rect.bottom, lineX, rect.top, paint);
                    }
                },
                drawLabel(canvas: Canvas, axis, text, labelX, labelY, paint: Paint) {
                    if (text) {
                        const lines = text.split('\n');
                        for (let index = 0; index < lines.length; index++) {
                            canvas.drawText(lines[index], labelX, labelY + index * paint.textSize, paint);
                        }
                    }
                }
            };
            xAxis.valueFormatter = {
                getAxisLabel: (value) => {
                    const date = getLocalTime(startTimestamp + value * HOUR, timezoneOffset);
                    if (date.get('h') === 0) {
                        return formatDate(date.valueOf(), 'ddd\nDD/MM', timezoneOffset);
                    } else if (date.get('h') % 4 === 0) {
                        return formatTime(date.valueOf(), 'HH', timezoneOffset);
                    }
                }
            };
            // axes hold the plotted values, so they are formatted in the units the user picked
            leftAxis.valueFormatter = {
                getAxisLabel: (value) => formatRaw(chartSeries.some((item) => item.weatherProp === WeatherProps.temperature) ? WeatherProps.temperature : WeatherProps.sealevelPressure, value)
            };
            rightAxis.valueFormatter = {
                getAxisLabel: (value) => formatRaw(WeatherProps.windSpeed, value)
            };
            chart.customRenderer = { drawHighlight: drawSelection };
        }
        // modern: no value axes, the line labels, chips and selection give the values
        chart.setExtraOffsets(0, modern ? 26 : 10, 0, 0);
        xAxis.yOffset = modern ? 3 + xAxis.textSize : 12;
        leftAxis.drawLabels = rightAxis.drawLabels = !modern;
        leftAxis.drawAxisLine = rightAxis.drawAxisLine = false;
        leftAxis.drawGridLines = !modern;
        updateAxisColors();

        const dataSets = chartSeries.map((item) => {
            const set = new LineDataSet(item.entries, item.weatherProp, 'hours', 'value');
            const isTemperature = item.weatherProp === WeatherProps.temperature;
            const lineStyle = modern ? modernLineStyle(item.weatherProp) : { width: LINE_WIDTH };
            set.color = item.color;
            set.lineWidth = isTemperature ? TEMPERATURE_LINE_WIDTH : lineStyle.width;
            if (!isTemperature && lineStyle.dash) {
                set.enableDashedLine(lineStyle.dash[0], lineStyle.dash[1], 0);
            }
            set.drawCirclesEnabled = false;
            set.drawValuesEnabled = false;
            set.visible = isShown(item);
            set.axisDependency = axisDependency(item);
            return set;
        });
        xAxis.axisMinimum = -0.5;
        xAxis.axisMaximum = Math.max(...chartSeries.map((item) => item.entries[item.entries.length - 1].hours)) + 0.5;
        const data = new CombinedData();
        data.lineData = new LineData(dataSets);
        chart.data = data;
        chart.data.notifyDataChanged();
        chart.notifyDataSetChanged();
    }

    function updateAxisColors() {
        const chart = chartView?.nativeView;
        if (!chart) {
            return;
        }
        const { leftAxis, rightAxis, xAxis } = chart;
        leftAxis.textSize = rightAxis.textSize = xAxis.textSize = 10 * $fontScale;
        leftAxis.textColor = rightAxis.textColor = highlightPaint.color = colorOnSurface;
        xAxis.textColor = modern ? colorOnSurfaceVariant : colorOnSurface;
        leftAxis.gridColor = xAxis.gridColor = colorOnSurfaceVariant + '33';
        xAxis.axisLineColor = modern ? new Color(colorOnSurface).setAlpha(40).hex : colorOnSurfaceVariant + '33';
        if (modern) {
            // the day separation
            xAxis.gridColor = new Color(colorOnSurface).setAlpha(40).hex;
        }
    }

    $: if (chartView && series.length) {
        try {
            // a design change redraws everything
            modern;
            updateChartData();
        } catch (error) {
            console.error('MetarChartView', error);
        }
    }

    onThemeChanged(() => {
        updateAxisColors();
        chartView?.nativeView?.invalidate();
    });
    fontScale.subscribe(() => {
        updateAxisColors();
        chartView?.nativeView?.invalidate();
    });

    function onHighlight({ highlight }: HighlightEventData) {
        highlighted = highlight ?? null;
    }

    function toggleSeries(weatherProp: WeatherProps) {
        hidden = hidden.indexOf(weatherProp) === -1 ? [...hidden, weatherProp] : hidden.filter((item) => item !== weatherProp);
        const chart = chartView?.nativeView;
        const set = chart?.data?.getDataSetByLabel(weatherProp, false);
        if (set) {
            set.visible = hidden.indexOf(weatherProp) === -1;
            chart.invalidate();
        }
    }

    $: legendItems = chartSeries.map((item) => ({
        weatherProp: item.weatherProp,
        color: item.color,
        name: getWeatherDataTitle(item.weatherProp),
        icon: styledDataIcon($designStyle, getWeatherDataIcon(item.weatherProp)),
        enabled: hidden.indexOf(item.weatherProp) === -1
    }));

    function drawSelection(canvas: Canvas, highlight: Highlight) {
        const chart = chartView.nativeView;
        const text = formatTime(startTimestamp + highlight.x * HOUR, undefined, timezoneOffset);
        if (modern) {
            // solid line and a pill with the time, like the hourly chart
            selectionTextPaint.setTextSize(11 * $fontScale);
            selectionTextPaint.setFontWeight($accentFontWeight);
            const pillHeight = 18 * $fontScale;
            const pillWidth = selectionTextPaint.measureText(text) + 14 * $fontScale;
            const pillLeft = Math.min(Math.max(0, highlight.drawX - pillWidth / 2), canvas.getWidth() - pillWidth);
            selectionPaint.setColor(colorOnSurfaceVariant);
            selectionPaint.setAlpha(160);
            canvas.drawLine(highlight.drawX, pillHeight, highlight.drawX, canvas.getHeight(), selectionPaint);
            canvas.drawRoundRect(pillLeft, 0, pillLeft + pillWidth, pillHeight, pillHeight / 2, pillHeight / 2, selectionPaint);
            selectionTextPaint.setColor(colorSurface);
            canvas.drawText(text, pillLeft + pillWidth / 2, pillHeight / 2 + 4 * $fontScale, selectionTextPaint);
            for (const item of chartSeries.filter(isShown)) {
                const entry = nearestEntry(item, highlight.x);
                const pixel = chart.getPixelForValues(entry.hours, entry.value, axisDependency(item));
                drawPoint(canvas, pixel.x, pixel.y, item.color);
            }
            return;
        }
        canvas.drawLine(highlight.drawX, 0, highlight.drawX, canvas.getHeight(), highlightPaint);
        for (const item of chartSeries.filter(isShown)) {
            const entry = nearestEntry(item, highlight.x);
            const pixel = chart.getPixelForValues(entry.hours, entry.value, axisDependency(item));
            drawPoint(canvas, pixel.x, pixel.y, item.color);
        }
    }

    function drawPoint(canvas: Canvas, pointX: number, pointY: number, color: string) {
        pointPaint.setColor(colorSurface);
        canvas.drawCircle(pointX, pointY, 4.5, pointPaint);
        pointPaint.setColor(color);
        canvas.drawCircle(pointX, pointY, 3, pointPaint);
    }

    // card next to the selection line: the values of each shown series (the time too, when there is no pill)
    function drawValuesCard(canvas: Canvas, chart: CombinedChart) {
        const rows = chartSeries.filter(isShown).map((item) => ({
            name: getWeatherDataTitle(item.weatherProp),
            color: item.color,
            text: formatRaw(item.weatherProp, nearestEntry(item, highlighted.x).raw)
        }));
        if (!rows.length) {
            return;
        }
        const title = modern ? null : formatDate(startTimestamp + highlighted.x * HOUR, 'ddd', timezoneOffset) + ' ' + formatTime(startTimestamp + highlighted.x * HOUR, undefined, timezoneOffset);
        const scale = $fontScale;
        const padding = 10 * scale;
        const lineHeight = 18 * scale;
        const dotSpace = 14 * scale;
        const lineCount = rows.length + (title ? 1 : 0);
        tooltipTextPaint.setTextSize(12 * scale);
        tooltipTextPaint.setFontWeight('normal');
        const namesWidth = Math.max(...rows.map((row) => tooltipTextPaint.measureText(row.name)));
        tooltipTextPaint.setFontWeight($accentFontWeight);
        const valuesWidth = Math.max(...rows.map((row) => tooltipTextPaint.measureText(row.text)));
        const width = Math.max(title ? tooltipTextPaint.measureText(title) : 0, dotSpace + namesWidth + 12 * scale + valuesWidth) + 2 * padding;
        const height = lineCount * lineHeight + 2 * padding;
        const content = chart.viewPortHandler.contentRect;
        const lineX = highlighted.drawX;
        const left = lineX + 12 + width <= content.right ? lineX + 12 : Math.max(content.left, lineX - 12 - width);
        const top = content.top + 8;
        tooltipPaint.setColor(modern ? $modernColors.colorModernSurface : colorSurface);
        canvas.drawRoundRect(left, top, left + width, top + height, 10, 10, tooltipPaint);
        tooltipBorderPaint.setColor(modern ? $modernColors.colorModernHairlineStrong : colorOutlineVariant);
        canvas.drawRoundRect(left, top, left + width, top + height, 10, 10, tooltipBorderPaint);
        const baseline = lineHeight * 0.7;
        tooltipTextPaint.setTextAlign(Align.LEFT);
        if (title) {
            tooltipTextPaint.setColor(colorOnSurface);
            canvas.drawText(title, left + padding, top + padding + baseline, tooltipTextPaint);
        }
        rows.forEach((row, index) => {
            const rowTop = top + padding + (index + (title ? 1 : 0)) * lineHeight;
            pointPaint.setColor(row.color);
            canvas.drawCircle(left + padding + 4 * scale, rowTop + lineHeight / 2, 4 * scale, pointPaint);
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

    // modern: the highest, lowest and latest temperatures are labelled, like the hourly chart
    function onChartDrawn({ canvas }: { canvas: Canvas }) {
        const chart = chartView?.nativeView;
        if (chart && highlighted && highlighted.drawX !== undefined) {
            drawValuesCard(canvas, chart);
        }
        const temperature = chartSeries.find((item) => item.weatherProp === WeatherProps.temperature);
        if (!modern || !chart || !temperature || !isShown(temperature)) {
            return;
        }
        const { entries } = temperature;
        const highest = entries.reduce((max, entry) => (entry.raw > max.raw ? entry : max));
        const lowest = entries.reduce((min, entry) => (entry.raw < min.raw ? entry : min));
        labelPaint.setTextSize(11 * $fontScale);
        labelPaint.setFontWeight($accentFontWeight);
        labelPaint.setColor(colorOnSurface);
        for (const entry of new Set([highest, lowest, entries[entries.length - 1]])) {
            const pixel = chart.getPixelForValues(entry.hours, entry.value, AxisDependency.LEFT);
            drawPoint(canvas, pixel.x, pixel.y, temperature.color);
            canvas.drawText(formatRaw(WeatherProps.temperature, entry.raw), pixel.x, entry === lowest && entry !== highest ? pixel.y + 18 : pixel.y - 8, labelPaint);
        }
    }
</script>

<stacklayout {...$$restProps}>
    <combinedchart bind:this={chartView} height={220} on:highlight={onHighlight} on:postDraw={onChartDrawn} />
    <wraplayout padding="4 11 8 11">
        {#each legendItems as legend (legend.weatherProp)}
            {#if modern}
                <label
                    class="modernChip"
                    backgroundColor={legend.enabled ? new Color(legend.color).setAlpha(40).hex : $modernColors.colorModernCard}
                    margin={3}
                    opacity={legend.enabled ? 1 : 0.5}
                    verticalTextAlignment="center"
                    on:tap={() => toggleSeries(legend.weatherProp)}>
                    <cspan color={legend.color} fontFamily={$fonts[legend.icon?.fontFamily]} fontSize={16 * $fontScale} text={legend.icon?.icon} />
                    <cspan text={' ' + legend.name} />
                </label>
            {:else}
                <label margin={3} opacity={legend.enabled ? 1 : 0.5} padding="5 10 5 10" verticalTextAlignment="center" on:tap={() => toggleSeries(legend.weatherProp)}>
                    <cspan color={legend.color} fontFamily={$fonts[legend.icon?.fontFamily]} fontSize={16 * $fontScale} text={legend.icon?.icon} />
                    <cspan text={' ' + legend.name} />
                </label>
            {/if}
        {/each}
    </wraplayout>
</stacklayout>
