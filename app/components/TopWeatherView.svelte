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
    import { HOURLY_VIEW_MODE, MAIN_CHART_NB_HOURS, MAIN_CHART_VISIBLE_HOURS, SETTINGS_HOURLY_VIEW_MODE, SETTINGS_MAIN_CHART_NB_HOURS, SETTINGS_MAIN_CHART_VISIBLE_HOURS } from '~/helpers/constants';
    import type { FavoriteLocation } from '~/helpers/favorites';
    import { isFavorite } from '~/helpers/favorites';
    import { formatDate, formatTime, l, lc } from '~/helpers/locale';
    import { isDarkTheme, isEInk, onThemeChanged } from '~/helpers/theme';
    import { prefs } from '~/services/preferences';
    import type { Currently, Hourly, MinutelyData } from '~/services/providers/weather';
    import { WeatherProps, formatWeatherValue, wdPaint, weatherDataService } from '~/services/weatherData';
    import {
        accentFontWeight,
        colors,
        dataIntensity,
        designStyle,
        fontScale,
        fonts,
        hourlyViewData,
        hourlyViewMode,
        rainColor,
        showEmptyData,
        topViewHeight,
        weatherDataLayout,
        windowSize
    } from '~/variables';
    import { cardBackgroundAlpha, dataTextStyle, headerTextStyle, precipKind, precipitationFill, styledDataIcon } from '~/utils/designStyle';
    import { getMoonIlluminationPercent } from '~/helpers/moon';
    import { drawChips, prepareChips } from '~/helpers/chips';
    import { TOP_GRID_OPTIONS, drawCenteredValue, drawGrid, prepareGrid } from '~/helpers/dataGrid';
    import { minutelyAxisLabel, minutelyAxisTicks, minutelyIntensity, minutelySummary } from '~/utils/minutelySummary';
    import HourlyChartView from './HourlyChartView.svelte';
    import WindyView from './WindyView.svelte';
    import { screenWidthDips } from '~/variables';

    const weatherIconSize = 110;
    const timeFactor = 1 / (1000 * 60 * 10);
    const PADDING_LEFT = 7;
    const CHIPS_TOP = 46;
    const MINUTELY_CHART_HEIGHT = 90;
    const LIMIT_LABELS = [l('light'), l('medium'), l('heavy')];

    // modern layout: hero, data block, minutely card (only with precipitation), sun line
    const MODERN_PADDING = 16;
    const MODERN_CARD_PADDING = 12;
    const MODERN_CARD_RADIUS = 14;
    const MODERN_HERO_HEIGHT = 124;
    const MODERN_ICON_SIZE = 84;
    const MODERN_MINUTELY_HEIGHT = 104;
    const MODERN_MINUTELY_CHART_TOP = 28;
    const MODERN_MINUTELY_CHART_HEIGHT = 52;
    const MODERN_SUN_LINE_HEIGHT = 30;
    const MODERN_GAP = 12;
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
        // DEV_LOG && console.log('currentHourlyData', currentHourlyData);
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

    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline, colorOutlineVariant } = $colors);
    $: chipsTheme = { onSurface: colorOnSurface, onSurfaceVariant: colorOnSurfaceVariant };
    $: header = headerTextStyle($designStyle, $fontScale, $accentFontWeight);

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
    let chartInitialized = false;
    let precipChartSet: LineDataSet;
    let cloudChartSet: LineDataSet;
    let lastChartData: {
        time: number;
        intensity: number;
    }[];

    let actualWeatherIconSize = 0;
    $: actualWeatherIconSize = (weatherIconSize * 0.9) / Math.sqrt($fontScale);
    $: minutelyChartWidth = Math.min(300, screenWidthDips - actualWeatherIconSize);
    // we need a factor cause using timestamp means
    // using 64bit data which canvas does not support (android Matrix specifically)
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
                // keeps the first ("now") and last labels inside the chart instead of clipped on the edges
                xAxis.avoidFirstLastClipping = true;
                // the right axis is unused but reserves room for labels
                chart.rightAxis.enabled = false;
                // xAxis.setGranularity(10 * 60 * 1000)
                // xAxis.setGranularityEnabled(true)
                xAxis.drawMarkTicks = true;
                xAxis.valueFormatter = {
                    getAxisLabel: (value, axis) => minutelyAxisLabel(Math.round(value / timeFactor / 60000), value >= axis.axisMaximum, lc('now'))
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
                LIMIT_LABELS.map((label, index) => ({ limit: index + 1, label })).forEach((l) => {
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
            const modernStyle = $designStyle === 'modern';
            // modern: faint solid level lines, the level name is in the card title instead
            const limitColor = new Color(colorOnSurface).setAlpha(modernStyle ? 25 : 100).hex;
            leftAxis.limitLines.forEach((limitLine, index) => {
                limitLine.textColor = limitColor;
                limitLine.lineColor = limitColor;
                limitLine.label = modernStyle ? '' : LIMIT_LABELS[index].toUpperCase();
                if (modernStyle) {
                    limitLine.dashPathEffect = null;
                } else {
                    limitLine.enableDashedLine(2, 2, 0);
                }
            });
            chart.minOffset = modernStyle ? 0 : 15;
            xAxis.textColor = modernStyle ? colorOnSurfaceVariant : colorOnSurface;
            xAxis.drawMarkTicks = !modernStyle;
            // modern: the card draws its own time labels under the chart
            xAxis.drawLabels = !modernStyle;
            xAxis.drawAxisLine = !modernStyle;
            xAxis.axisMinimum = 0;

            // we want exactly one label per 10 min
            const labelCount = Math.max(0, Math.min(data.length ? (data[data.length - 1].time - now) / (10 * 60 * 1000 * timeFactor) + 1 : 0, 7));
            xAxis.labelCount = labelCount;
            xAxis.forceLabelsEnabled = true;

            let needsToSetData = false;
            let needsUpdate = false;
            const chartHasPrecip = data.some((d) => d.intensity > 0);

            leftAxis.axisMinimum = 0;
            leftAxis.axisMaximum = 4;
            leftAxis.drawLimitLines = chartHasPrecip;
            if (chartHasPrecip) {
                const firstHour = item.hourly?.[0];
                const color = isEInk ? '#7f7f7f' : precipitationFill($designStyle, precipKind(firstHour ?? {}), firstHour?.precipColor || rainColor.hex, 100).color;
                if (!precipChartSet) {
                    needsToSetData = true;
                    precipChartSet = new LineDataSet(data, 'intensity', 'time', 'intensity');
                    precipChartSet.axisDependency = AxisDependency.LEFT;
                    // precipChartSet.drawCircles=(true);
                    precipChartSet.drawFilledEnabled = true;
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
                precipChartSet.lineWidth = modernStyle ? 1.5 : 1;
                precipChartSet.fillAlpha = modernStyle ? 90 : 150;
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
    $: modern = $designStyle === 'modern';
    // .modernCard vertical margins (app/_modern.scss)
    const MODERN_HOURLY_CARD_MARGINS = 10;
    // modern shows feels like in the hero and the moon in the sun line, not in the data block
    $: topDataFilter = modern ? [WeatherProps.windBeaufort, WeatherProps.moon, WeatherProps.apparentTemperature] : [WeatherProps.windBeaufort];
    $: topIconsData = weatherDataService.getIconsData({ item, filter: topDataFilter, type: 'currently' });
    $: blockWidth = modern ? $windowSize.width - 2 * MODERN_PADDING : $windowSize.width - weatherIconSize * (2 - $fontScale) - 20;
    $: gridPadding = modern ? MODERN_CARD_PADDING * $fontScale : 0;
    // chips and grid wrap: the top part grows to fit them, the hourly part keeps its height
    // with "show missing values", grid and chips keep a placeholder for data with no value
    $: blockItems = $showEmptyData ? weatherDataService.getIconsSlots({ item, filter: topDataFilter, type: 'currently' }) : topIconsData;
    $: chips = $weatherDataLayout === 'chips' ? prepareChips(blockItems, blockWidth, $designStyle, chipsTheme, $fontScale) : null;
    $: grid = $weatherDataLayout === 'grid' ? prepareGrid(blockItems, blockWidth - 2 * gridPadding, TOP_GRID_OPTIONS, $fontScale) : null;
    $: blockHeight = chips?.height ?? (grid ? grid.height + 2 * gridPadding : undefined);
    $: chipsExtraHeight =
        blockHeight !== undefined ? Math.max(0, CHIPS_TOP * $fontScale + blockHeight + (hasPrecip ? 6 + MINUTELY_CHART_HEIGHT + 45 * $fontScale : 34 * $fontScale) - $topViewHeight) : 0;

    $: modernDataHeight = blockHeight ?? (topIconsData.length ? 60 * $fontScale : 0);
    $: modernDataTop = MODERN_HERO_HEIGHT * $fontScale;
    $: modernMinutelyTop = modernDataTop + modernDataHeight + (modernDataHeight ? MODERN_GAP * $fontScale : 0);
    $: modernSunTop = modernMinutelyTop + (hasPrecip ? (MODERN_MINUTELY_HEIGHT + MODERN_GAP / 2) * $fontScale : 0);
    $: topRowHeight = modern ? modernSunTop + MODERN_SUN_LINE_HEIGHT * $fontScale : $topViewHeight + chipsExtraHeight;
    // derived from the data, not from the chart, so the height is right on the first layout
    $: upcomingMinutely = (item.minutely ?? []).filter((entry) => entry.time >= (fakeNow || Date.now()));
    $: minutely = minutelySummary(upcomingMinutely, fakeNow || Date.now());
    $: hasPrecip = minutely.kind !== 'none';
    $: hasPrecip && canvasView?.nativeView.invalidate();
    $: item && $designStyle && $accentFontWeight && canvasView?.nativeView.invalidate();
    $: $dataIntensity !== undefined && canvasView?.nativeView.invalidate();
    $: if (lineChart && $designStyle) {
        updateLineChart(item);
    }

    $: if (weatherLocation) {
        weatherLocation.isFavorite = isFavorite(weatherLocation);
    }

    onThemeChanged(() => {
        const chart = lineChart?.nativeView;
        if (chart) {
            chart.xAxis.textColor = $designStyle === 'modern' ? colorOnSurfaceVariant : colorOnSurface;
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
    function minutelySummaryText() {
        switch (minutely.kind) {
            case 'all':
                return lc('precip_all_hour');
            case 'starting':
                return lc('precip_starting_in', minutely.minutes);
            case 'stopping':
                return lc('precip_stopping_in', minutely.minutes);
            case 'intermittent':
                return lc('precip_intermittent');
            default:
                return '';
        }
    }

    function drawModernCard(canvas: Canvas, left: number, top: number, right: number, bottom: number) {
        const radius = MODERN_CARD_RADIUS * $fontScale;
        textIconPaint.setColor(colorOnSurface);
        textIconPaint.setAlpha(cardBackgroundAlpha(isDarkTheme()));
        canvas.drawRoundRect(left, top, right, bottom, radius, radius, textIconPaint);
    }

    function drawModern(canvas: Canvas, w: number, h: number) {
        const left = MODERN_PADDING;
        const right = w - MODERN_PADDING;

        // hero: temperature, condition, feels like + high/low; the weather icon sits top right
        textPaint.setTextAlign(Align.LEFT);
        textPaint.setColor(colorOnSurface);
        if (item.temperature !== undefined && item.temperature !== null) {
            textPaint.setTextSize(64 * $fontScale);
            textPaint.setFontWeight(300);
            canvas.drawText(formatWeatherValue(item, WeatherProps.temperature), left, 62 * $fontScale, textPaint);
            textPaint.setFontWeight('normal');
        }
        if (item.description?.length) {
            textPaint.setTextSize(16 * $fontScale);
            canvas.drawText(item.description, left, 88 * $fontScale, textPaint);
        }
        const feelsLike =
            weatherDataService.isDataEnabled(WeatherProps.apparentTemperature) && item.apparentTemperature !== undefined && item.apparentTemperature !== null
                ? `${lc('feels_like')} ${formatWeatherValue(item, WeatherProps.apparentTemperature)} · `
                : '';
        const temperaturesLayout = new StaticLayout(
            createNativeAttributedString({
                spans: [
                    { fontSize: 13 * $fontScale, color: colorOnSurfaceVariant, text: feelsLike },
                    { fontSize: header.maxTempSize * 0.8, fontWeight: header.maxTempWeight, color: colorOnSurface, text: formatWeatherValue(item, WeatherProps.temperatureMax) },
                    { fontSize: 13 * $fontScale, color: colorOnSurfaceVariant, text: ' / ' + formatWeatherValue(item, WeatherProps.temperatureMin) }
                ]
            }),
            textPaint,
            right - left,
            LayoutAlignment.ALIGN_NORMAL,
            1,
            0,
            false
        );
        canvas.save();
        canvas.translate(left, 96 * $fontScale);
        temperaturesLayout.draw(canvas);
        canvas.restore();
        textPaint.setTextAlign(Align.RIGHT);
        textPaint.setTextSize(12 * $fontScale);
        textPaint.setColor(colorOnSurfaceVariant);
        canvas.drawText(formatDate(item.time, 'dddd', item.timezoneOffset), right, (8 + MODERN_ICON_SIZE + 14) * $fontScale, textPaint);

        // data block
        switch ($weatherDataLayout) {
            case 'chips':
                if (chips) {
                    drawChips(canvas, chips, left, modernDataTop, $designStyle, chipsTheme, $fontScale);
                }
                break;
            case 'grid':
                if (grid) {
                    drawModernCard(canvas, left, modernDataTop, right, modernDataTop + blockHeight);
                    drawGrid(canvas, grid, left + gridPadding, modernDataTop + gridPadding, $designStyle, chipsTheme, $fontScale);
                }
                break;
            default:
                canvas.save();
                drawData(canvas, w, w / 2, modernDataTop, right);
                canvas.restore();
                break;
        }

        // minutely card: the chart itself is a native view placed over it
        if (hasPrecip) {
            drawModernCard(canvas, left, modernMinutelyTop, right, modernMinutelyTop + MODERN_MINUTELY_HEIGHT * $fontScale);
            const titleBaseline = modernMinutelyTop + 20 * $fontScale;
            textPaint.setTextAlign(Align.LEFT);
            textPaint.setTextSize(13 * $fontScale);
            textPaint.setFontWeight($accentFontWeight);
            textPaint.setColor(colorOnSurface);
            canvas.drawText(minutelySummaryText(), left + MODERN_CARD_PADDING * $fontScale, titleBaseline, textPaint);
            textPaint.setFontWeight('normal');
            const now = fakeNow || Date.now();
            const totalMinutes = upcomingMinutely.length ? Math.round((upcomingMinutely[upcomingMinutely.length - 1].time - now) / 60000) : 0;
            const chartLeft = left + MODERN_CARD_PADDING * $fontScale;
            const chartWidth = right - left - 2 * MODERN_CARD_PADDING * $fontScale;
            const ticksBaseline = modernMinutelyTop + (MODERN_MINUTELY_CHART_TOP + MODERN_MINUTELY_CHART_HEIGHT + 13) * $fontScale;
            textPaint.setTextSize(11 * $fontScale);
            textPaint.setColor(colorOnSurfaceVariant);
            const ticks = minutelyAxisTicks(totalMinutes);
            ticks.forEach((tick, index) => {
                textPaint.setTextAlign(tick.align === 'left' ? Align.LEFT : tick.align === 'right' ? Align.RIGHT : Align.CENTER);
                canvas.drawText(minutelyAxisLabel(tick.minutes, index === ticks.length - 1, lc('now')), chartLeft + tick.fraction * chartWidth, ticksBaseline, textPaint);
            });
            const intensity = minutelyIntensity(upcomingMinutely);
            if (intensity) {
                textPaint.setTextAlign(Align.RIGHT);
                textPaint.setTextSize(12 * $fontScale);
                textPaint.setColor(colorOnSurfaceVariant);
                canvas.drawText(l(intensity), right - MODERN_CARD_PADDING * $fontScale, titleBaseline, textPaint);
            }
        }

        // sun line: sunrise, sunset, small icons, last update
        const sunBaseline = modernSunTop + 19 * $fontScale;
        let x = left;
        // shared icon paints: each keeps its own font, so measuring and drawing use the right one
        const sunLineItem = (icon: string, iconPaint: Paint, color: string, text: string) => {
            iconPaint.setTextAlign(Align.LEFT);
            iconPaint.setTextSize(16 * $fontScale);
            iconPaint.setColor(color);
            canvas.drawText(icon, x, sunBaseline + 1, iconPaint);
            x += iconPaint.measureText(icon) + 4 * $fontScale;
            textPaint.setTextAlign(Align.LEFT);
            textPaint.setTextSize(13 * $fontScale);
            textPaint.setColor(colorOnSurface);
            canvas.drawText(text, x, sunBaseline, textPaint);
            x += textPaint.measureText(text) + 14 * $fontScale;
        };
        sunLineItem('wd-sunrise', wdPaint, '#EF9F27', formatTime(item.sunriseTime, undefined, item.timezoneOffset));
        sunLineItem('wd-sunset', wdPaint, '#D85A30', formatTime(item.sunsetTime, undefined, item.timezoneOffset));
        if (weatherDataService.isDataEnabled(WeatherProps.moon) && item.moonIcon) {
            // modern moon glyph; the lit percentage is shorter than the phase name and the icon already shows the phase
            sunLineItem(styledDataIcon('modern', { fontFamily: 'wi', icon: item.moonIcon }).icon, wdPaint, '#7F77DD', `${getMoonIlluminationPercent(new Date(item.time))}%`);
        }
        for (const c of weatherDataService.getSmallIconsData({ item, type: 'currently', filter: [WeatherProps.moon] })) {
            const paint = c.paint || textIconPaint;
            paint.setTextAlign(Align.LEFT);
            paint.setTextSize(c.iconFontSize * 0.75);
            paint.setColor(c.color || colorOnSurfaceVariant);
            if (c.customDraw) {
                x += c.customDraw(canvas, $fontScale, paint, c, x, sunBaseline - 12 * $fontScale, false);
            } else if (c.icon) {
                canvas.drawText(c.icon, x, sunBaseline + 1, paint);
                x += paint.measureText(c.icon) + 8 * $fontScale;
            }
        }
        textPaint.setTextAlign(Align.RIGHT);
        textPaint.setTextSize(12 * $fontScale);
        textPaint.setColor(colorOnSurfaceVariant);
        canvas.drawText(`${lc('last_updated')} ${formatLastUpdate(item.lastUpdate)}`, right, sunBaseline, textPaint);
        // no separator: the hourly section under it is a card
    }

    function drawOnCanvas({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        if (modern) {
            drawModern(canvas, w, h);
            return;
        }
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
                    fontSize: header.minTempSize,
                    color: colorOnSurfaceVariant,
                    text: formatWeatherValue(item, WeatherProps.temperatureMin)
                },
                {
                    fontSize: header.maxTempSize,
                    fontWeight: header.maxTempWeight,
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
        const modernStyle = $designStyle === 'modern';
        staticLayout = new StaticLayout(
            createNativeAttributedString({
                spans: [
                    {
                        color: '#ffa500',
                        fontFamily: modernStyle ? $fonts.wd : $fonts.wi,
                        fontSize: 14 * $fontScale,
                        text: modernStyle ? 'wd-sunrise ' : 'wi-sunrise '
                    },
                    {
                        text: formatTime(item.sunriseTime, undefined, item.timezoneOffset)
                    },
                    {
                        color: '#ff7200',
                        fontSize: 14 * $fontScale,
                        fontFamily: modernStyle ? $fonts.wd : $fonts.wi,
                        text: modernStyle ? '  wd-sunset ' : '  wi-sunset '
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
            const width = w - 10 - minutelyChartWidth;
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
        canvas.clipRect(0, 0, w - weatherIconSize * (2 - $fontScale), h);
        drawData(canvas, w, w2, hasPrecip ? 45 * $fontScale : $topViewHeight / 2 - 20 * $fontScale, w - weatherIconSize * (2 - $fontScale));
    }

    function drawData(canvas: Canvas, w: number, w2: number, iconsTop: number, clipRight: number) {
        const centeredItemsToDraw = topIconsData;
        canvas.clipRect(0, 0, clipRight, canvas.getHeight());
        switch ($weatherDataLayout) {
            case 'chips':
                if (chips) {
                    drawChips(canvas, chips, 10, CHIPS_TOP * $fontScale, $designStyle, chipsTheme, $fontScale);
                }
                break;
            case 'grid':
                if (grid) {
                    drawGrid(canvas, grid, 10, CHIPS_TOP * $fontScale, $designStyle, chipsTheme, $fontScale);
                }
                break;
            default:
            case 'default': {
                const iconsLeft = 26;
                centeredItemsToDraw.forEach((c, index) => {
                    const x = index * 45 * $fontScale + iconsLeft;
                    const textStyle = dataTextStyle($designStyle, c, { onSurface: colorOnSurface, onSurfaceVariant: colorOnSurfaceVariant }, $fontScale);
                    const paint = c.paint || textIconPaint;
                    paint.textSize = c.iconFontSize;
                    paint.setColor(textStyle.iconColor);
                    paint.setTextAlign(Align.CENTER);
                    // if (c.customDraw) {
                    //     c.customDraw(canvas, $fontScale, textIconPaint, c, x, iconsTop + 20, 40);
                    // } else {
                    if (c.icon) {
                        canvas.drawText(c.icon, x, iconsTop + 20, paint);
                    }
                    if (c.value) {
                        textIconPaint.textSize = textStyle.valueFontSize;
                        textIconPaint.setColor(textStyle.valueColor);
                        if (modern) {
                            drawCenteredValue(canvas, textIconPaint, c.value, x, iconsTop + 20 + 19 * $fontScale, $fontScale);
                        } else {
                            canvas.drawText(c.value + '', x, iconsTop + 20 + 19 * $fontScale, textIconPaint);
                        }
                    }
                    if (c.subvalue) {
                        textIconPaint.textSize = textStyle.subvalueFontSize;
                        textIconPaint.setColor(textStyle.subvalueColor);
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
        // modern: less room under the hour labels
        chart.setExtraOffsets(0, 40, 0, $designStyle === 'modern' ? 2 : 10);
    }

    let hourlyChartNbHours = ApplicationSettings.getNumber(SETTINGS_MAIN_CHART_NB_HOURS, MAIN_CHART_NB_HOURS);
    prefs.on(`key:${SETTINGS_MAIN_CHART_NB_HOURS}`, () => {
        hourlyChartNbHours = ApplicationSettings.getNumber(SETTINGS_MAIN_CHART_NB_HOURS, MAIN_CHART_NB_HOURS);
    });
    let hourlyChartVisibleHours = ApplicationSettings.getNumber(SETTINGS_MAIN_CHART_VISIBLE_HOURS, MAIN_CHART_VISIBLE_HOURS);
    prefs.on(`key:${SETTINGS_MAIN_CHART_VISIBLE_HOURS}`, () => {
        hourlyChartVisibleHours = ApplicationSettings.getNumber(SETTINGS_MAIN_CHART_VISIBLE_HOURS, MAIN_CHART_VISIBLE_HOURS);
    });
</script>

<!-- modern: the hourly section is a card (its margins are added to the height) -->
<gridlayout columns="*,auto" height={height - $topViewHeight + topRowHeight + (modern ? MODERN_HOURLY_CARD_MARGINS : 0)} rows={`${topRowHeight},*`}>
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
    <gridlayout
        colSpan={modern ? 2 : 1}
        height={modern ? MODERN_MINUTELY_CHART_HEIGHT * $fontScale : MINUTELY_CHART_HEIGHT}
        horizontalAlignment="left"
        marginBottom={modern ? 0 : 45 * $fontScale}
        marginLeft={modern ? MODERN_PADDING + MODERN_CARD_PADDING * $fontScale : 0}
        marginTop={modern ? modernMinutelyTop + MODERN_MINUTELY_CHART_TOP * $fontScale : 0}
        verticalAlignment={modern ? 'top' : 'bottom'}
        width={modern ? $windowSize.width - 2 * (MODERN_PADDING + MODERN_CARD_PADDING * $fontScale) : minutelyChartWidth}>
        <linechart bind:this={lineChart} visibility={hasPrecip ? 'visible' : 'hidden'} />
    </gridlayout>
    <WeatherIcon
        {animated}
        col={1}
        horizontalAlignment="right"
        iconData={[item.iconId, item.isDay]}
        marginBottom={modern ? 0 : $fontScale > 1 ? 17 * $fontScale * $fontScale : 17 * $fontScale}
        marginRight={modern ? MODERN_PADDING : 0}
        marginTop={modern ? 8 * $fontScale : 0}
        size={modern ? MODERN_ICON_SIZE * $fontScale : actualWeatherIconSize}
        verticalAlignment={modern ? 'top' : 'middle'}
        on:tap />
    <gridlayout class={modern ? 'modernCard' : ''} colSpan={2} row={1}>
    {#if $hourlyViewMode === 'chart'}
        <HourlyChartView
            barWidth={1}
            borderBottomColor={colorOutline}
            borderBottomWidth={modern ? 0 : 1}
            {dataToShow}
            fixedBarScale={false}
            hourly={item.hourly.slice(0, hourlyChartNbHours)}
            {onChartConfigure}
            rightAxisSuggestedMaximum={8}
            showCurrentTimeLimitLine={false}
            temperatureLineWidth={3}
            visibleHours={hourlyChartVisibleHours} />
    {:else if $hourlyViewMode === 'windy'}
        <WindyView {dataToShow} items={item.hourly} />
    {:else}
        <HourlyView items={item.hourly} />
    {/if}
    </gridlayout>
</gridlayout>
