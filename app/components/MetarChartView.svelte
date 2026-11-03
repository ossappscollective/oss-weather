<script context="module" lang="ts">
    import { Align, Canvas, Paint } from '@nativescript-community/ui-canvas';
    import { CombinedChart } from '@nativescript-community/ui-chart';
    import { XAxisPosition } from '@nativescript-community/ui-chart/components/XAxis';
    import { AxisDependency } from '@nativescript-community/ui-chart/components/YAxis';
    import { CombinedData } from '@nativescript-community/ui-chart/data/CombinedData';
    import { LineData } from '@nativescript-community/ui-chart/data/LineData';
    import { LineDataSet } from '@nativescript-community/ui-chart/data/LineDataSet';
    import type { Highlight } from '@nativescript-community/ui-chart/highlight/Highlight';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { Color } from '@nativescript/core';
    import { formatValueToUnit } from '~/helpers/formatter';
    import { formatDate, formatTime, getLocalTime } from '~/helpers/locale';
    import BaseChart from '~/components/common/BaseChart.svelte';
    import { modernColors } from '~/helpers/modernTheme';
    import { WeatherProps, defaultPropUnit, getWeatherDataIcon, getWeatherDataTitle, propToUnit } from '~/services/weatherData';
    import { modernDataColor, modernLineStyle, styledDataIcon, textFontFamily } from '~/utils/designStyle';
    import type { MetarPoint } from '~/utils/metar';
    import { accentFontWeight, colors, designStyle, fontScale, fonts } from '~/variables';
    import type { HighlightCardContent } from '~/utils/chartDraw';

    // same look as the hourly chart: temperature is the thick reference line, the other metrics are thinner
    const TEMPERATURE_LINE_WIDTH = 3;
    const LINE_WIDTH = 2;
    const HOUR = 3600 * 1000;
    const pointPaint = new Paint();
    const labelPaint = new Paint();
    labelPaint.setTextAlign(Align.CENTER);
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

    function isShown(item: ChartSeries) {
        return hidden.indexOf(item.weatherProp) === -1;
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
        labelPaint.setFontFamily(fontFamily);

        if (!chartInitialized) {
            chartInitialized = true;
            chart.minOffset = 0;
            chart.autoScaleMinMaxEnabled = true;
            chart.clipDataToContent = true;
            chart.dragEnabled = false;
            chart.pinchZoomEnabled = false;
            chart.scaleXEnabled = false;
            chart.scaleYEnabled = false;
            xAxis.enabled = true;
            xAxis.labelTextAlign = Align.CENTER;
            xAxis.ensureLastLabel = true;
            xAxis.position = XAxisPosition.BOTTOM;
            xAxis.forcedInterval = 1;
            leftAxis.spaceBottom = rightAxis.spaceBottom = 5;
            leftAxis.spaceTop = rightAxis.spaceTop = 5;
            rightAxis.enabled = true;
            rightAxis.drawGridLines = false;
            rightAxis.axisMinimum = 0;
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
        }
        // modern: no value axes, the line labels, chips and selection give the values
        chart.setExtraOffsets(0, modern ? 26 : 10, 0, 0);
        leftAxis.drawLabels = rightAxis.drawLabels = !modern;
        leftAxis.drawAxisLine = rightAxis.drawAxisLine = false;
        leftAxis.drawGridLines = !modern;

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

    $: if (chartView && series.length && $designStyle) {
        try {
            updateChartData();
        } catch (error) {
            console.error('MetarChartView', error);
        }
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

    function drawPoint(canvas: Canvas, pointX: number, pointY: number, color: string) {
        pointPaint.setColor(colorSurface);
        canvas.drawCircle(pointX, pointY, 4.5, pointPaint);
        pointPaint.setColor(color);
        canvas.drawCircle(pointX, pointY, 3, pointPaint);
    }

    // the values of each shown series at the highlighted time
    function highlightCard(highlights: Highlight[], chart: CombinedChart): HighlightCardContent {
        const rows = highlights.map((highlight) => {
            const item = chartSeries.find((candidate) => candidate.weatherProp === chart.data.getDataSetByHighlight(highlight).label);
            return { name: getWeatherDataTitle(item.weatherProp), color: item.color, text: formatRaw(item.weatherProp, highlight.entry.raw) };
        });
        const timestamp = startTimestamp + highlights[0].x * HOUR;
        return { title: formatDate(timestamp, 'ddd', timezoneOffset) + ' ' + formatTime(timestamp, undefined, timezoneOffset), rows };
    }

    // modern: the highest, lowest and latest temperatures are labelled, like the hourly chart
    function onChartDrawn(canvas: Canvas, chart: CombinedChart) {
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
    <BaseChart height={220} {highlightCard} onDrawn={onChartDrawn} {startTimestamp} {timezoneOffset} bind:chartView />
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
