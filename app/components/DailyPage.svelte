<script context="module" lang="ts">
    import { createNativeAttributedString } from '@nativescript-community/text';
    import { Align, Canvas, CanvasView, LayoutAlignment, Paint, StaticLayout } from '@nativescript-community/ui-canvas';
    import { CombinedChart } from '@nativescript-community/ui-chart';
    import { ApplicationSettings, Page, StackLayout } from '@nativescript/core';
    import dayjs, { Dayjs } from 'dayjs';
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import AstronomyView from '~/components/astronomy/AstronomyView.svelte';
    import { DAILY_PAGE_HOURLY_CHART, SETTINGS_DAILY_PAGE_HOURLY_CHART, SETTINGS_SHOW_CURRENT_DAY_DAILY, SHOW_CURRENT_DAY_DAILY } from '~/helpers/constants';
    import { formatDate, isSameDay, lc } from '~/helpers/locale';
    import { POLLENS_POLLUTANTS_TITLES } from '~/services/airQualityData';
    import { WeatherLocation } from '~/services/api';
    import { iconService, onIconAnimationsChanged } from '~/services/icon';
    import type { DailyData, Hourly, Tide } from '~/services/providers/weather';
    import { WeatherProps, formatWeatherValue, getWeatherDataShortTitle, weatherDataService } from '~/services/weatherData';
    import { colors, fontScale, onFontScaleChanged, weatherDataLayout, windowInset } from '~/variables';
    import CActionBar from './common/CActionBar.svelte';
    import HourlyChartView from './HourlyChartView.svelte';
    import HourlyView from './HourlyView.svelte';
    import WeatherIcon from './WeatherIcon.svelte';
    const weatherIconSize = 100;
    const PADDING_LEFT = 7;

    const textIconPaint = new Paint();
    textIconPaint.setTextAlign(Align.CENTER);
    const textPaint = new Paint();
    const indicatorPaint = new Paint();
    const titlesPaint = new Paint();
    const dataPaint = new Paint();

    titlesPaint.fontWeight = 'bold';
    const subtitlesPaint = new Paint();
    // const arcPaint = new Paint();
    // arcPaint.style = Style.STROKE;
    // arcPaint.setTextAlign(Align.CENTER);
    // arcPaint.strokeCap = Cap.ROUND;
    const topViewHeight = 150;
</script>

<script lang="ts">
    const showHourlyChart = ApplicationSettings.getBoolean(SETTINGS_DAILY_PAGE_HOURLY_CHART, DAILY_PAGE_HOURLY_CHART);

    const currentData = weatherDataService.currentWeatherData;
    export let dataToShow = [...new Set([WeatherProps.windSpeed, WeatherProps.precipAccumulation].filter((s) => currentData.includes(s)).concat([WeatherProps.iconId, WeatherProps.temperature]))];
    export let getDailyPageProps: Function;
    export let itemIndex: number;
    export let items: any[];

    export let item: DailyData & { hourly: Hourly[]; tides?: Tide[] };
    export let location: WeatherLocation;
    export let weatherLocation: WeatherLocation;
    export let timezoneOffset;
    export let startTime: Dayjs;

    let isCurrentDay = false;

    $: isCurrentDay = isSameDay(startTime, Date.now(), timezoneOffset);
    // $: DEV_LOG && console.log('startTime', startTime);
    // $: DEV_LOG && console.log('isCurrentDay', startTime, dayjs(), isCurrentDay);
    let itemsCount = items.length;

    const last24 = item.last24;
    const last24Keys = last24 ? Object.keys(last24) : [];
    const last24Data = last24Keys.map((k: WeatherProps) => weatherDataService.getItemData(k, last24)).filter((s) => !!s);
    const next24Data = [WeatherProps.rainPrecipitation, WeatherProps.snowfall].map((k: WeatherProps) => weatherDataService.getItemData(k, item)).filter((s) => !!s);
    let page: NativeViewElementNode<Page>;
    let stackHolder: NativeViewElementNode<StackLayout>;
    let topCanvasView: NativeViewElementNode<CanvasView>;
    let animated = iconService.animated;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline } = $colors);

    /** Tides that fall within the current day (start of day → end of day) */
    $: dayTides = (() => {
        DEV_LOG && console.log('dayTides', JSON.stringify(item.tides), JSON.stringify(item));
        if (!item.tides?.length) return [];
        const start = startTime.startOf('day').valueOf();
        const end = startTime.endOf('day').valueOf();
        return item.tides.filter((t) => t.time >= start && t.time <= end);
    })();

    function drawTides({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const dx = 25;
        canvas.drawText(lc('tides'), dx - 5, 25 * $fontScale, titlesPaint);

        // Draw a simple tide chart: plot tide heights as a mini bar/point chart
        if (dayTides.length === 0) return;

        const maxH = Math.max(...dayTides.map((t) => t.height), 0.1);
        const chartTop = 40 * $fontScale;
        const chartBottom = h - 25 * $fontScale;
        const chartHeight = chartBottom - chartTop;
        const colWidth = (w - 2 * dx) / dayTides.length;

        dayTides.forEach((tide, index) => {
            const x = dx + index * colWidth + colWidth / 2;
            const barH = (tide.height / maxH) * chartHeight;
            const y = chartBottom - barH;

            indicatorPaint.color = tide.type === 'high' ? '#0288d1' : '#80cbc4';
            canvas.drawRect(x - colWidth * 0.3, y, x + colWidth * 0.3, chartBottom, indicatorPaint);

            dataPaint.setTextAlign(Align.CENTER);
            dataPaint.textSize = 11 * $fontScale;
            dataPaint.color = colorOnSurface;
            const timeStr = dayjs(tide.time).format('HH:mm');
            canvas.drawText(timeStr, x, chartBottom + 15 * $fontScale, dataPaint);
            canvas.drawText(tide.height.toFixed(2) + 'm', x, y - 4 * $fontScale, dataPaint);
            if (tide.coef != null) {
                subtitlesPaint.setTextAlign(Align.CENTER);
                subtitlesPaint.textSize = 10 * $fontScale;
                canvas.drawText(`(${tide.coef})`, x, y - 15 * $fontScale, subtitlesPaint);
            }
            dataPaint.setTextAlign(Align.LEFT);
        });
        canvas.drawLine(0, h - 1, w, h - 1, subtitlesPaint);
    }

    onIconAnimationsChanged((event) => (animated = event.animated));
    onFontScaleChanged(redraw);

    // let canvasView;
    function redraw() {
        topCanvasView?.nativeView?.invalidate();
        stackHolder?.nativeView.eachChild((d) => {
            if (typeof d['invalidate'] === 'function') {
                d['invalidate']();
            }
            return true;
        });
    }
    // fontScale.subscribe(redraw);
    function drawOnCanvas({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const smallItemsToDraw = weatherDataService.getSmallIconsData({ item, type: 'daily' });
        let iconRight = PADDING_LEFT;
        for (let index = 0; index < smallItemsToDraw.length; index++) {
            const c = smallItemsToDraw[index];

            const paint = c.paint || textIconPaint;
            paint.setTextAlign(Align.LEFT);
            paint.setTextSize(c.iconFontSize);
            paint.setColor(c.color || colorOnSurface);
            if (c.customDraw) {
                const result = c.customDraw(canvas, $fontScale, paint, c, iconRight, h - 7 - 15 * $fontScale, false);
                iconRight += result;
            } else if (c.icon) {
                canvas.drawText(c.icon, iconRight, h - 7, paint);
                iconRight += 24 * $fontScale;
            }
        }
        const centeredItemsToDraw = weatherDataService.getIconsData({ item, filter: [WeatherProps.windBeaufort], type: 'daily' });

        textPaint.setColor(colorOutline);
        canvas.drawLine(0, h, w, h - 1, textPaint);

        const padding = 10;

        const lineHeight = 20 * $fontScale;
        const lineWidth = 100 * $fontScale;
        const iconsTop = 55 * $fontScale - padding;
        // canvas.translate(26, 0);
        switch ($weatherDataLayout) {
            case 'line': {
                textPaint.setTextAlign(Align.LEFT);
                textIconPaint.setTextAlign(Align.CENTER);
                textIconPaint.color = colorOutline;
                const nbLines = Math.ceil(centeredItemsToDraw.length / 2);
                canvas.drawLine(lineWidth, iconsTop, lineWidth, iconsTop + lineHeight * nbLines, textIconPaint);
                for (let index = 0; index < nbLines - 1; index++) {
                    const y = iconsTop + lineHeight * (index + 1);
                    canvas.drawLine(padding, y, padding + 2 * lineWidth, y, textIconPaint);
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
                        canvas.translate(padding + (columnIndex === 0 ? 0 : lineWidth), y + lineHeight / 2 - staticLayout.getHeight() / 2);
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
                    canvas.translate(padding + iconDelta + (columnIndex === 0 ? 5 : lineWidth + 5), y + lineHeight / 2 - staticLayout.getHeight() / 2);
                    // const staticLayout = new StaticLayout(dataNString, textPaint, lineWidth, columnIndex === 0 ? LayoutAlignment.ALIGN_OPPOSITE : LayoutAlignment.ALIGN_NORMAL, 1, 0, true);
                    // canvas.translate(columnIndex === 0 ? w2 - lineWidth - 5 : w2 + 5, y + lineHeight / 2 - staticLayout.getHeight() / 2);
                    staticLayout.draw(canvas);
                    canvas.restore();
                }
                break;
            }
            default:
            case 'default': {
                const iconsLeft = 26;
                centeredItemsToDraw.forEach((c, index) => {
                    const x = index * 45 * $fontScale + iconsLeft;
                    const paint = c.paint || textIconPaint;
                    paint.setTextAlign(Align.CENTER);
                    paint.textSize = c.iconFontSize;
                    paint.setColor(c.iconColor || c.color || colorOnSurface);
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
                });
                break;
            }
        }

        textPaint.setColor(colorOnSurface);
        textPaint.setTextAlign(Align.LEFT);
        // if (item.temperature) {
        //     textPaint.textSize = 36 * $fontScale;
        //     canvas.drawText(formatWeatherValue(item, 'temperature'), 10, 36 * $fontScale, textPaint);
        // }
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
        const staticLayout = new StaticLayout(nString, textPaint, w - 10, LayoutAlignment.ALIGN_NORMAL, 1, 0, false);
        canvas.translate(10, 0);
        staticLayout.draw(canvas);
        canvas.translate(-10, 0);
        new StaticLayout(
            createNativeAttributedString({
                spans: [
                    {
                        text: formatDate(item.time, 'dddd', item.timezoneOffset) + '\n',
                        fontSize: 20 * $fontScale
                    },
                    {
                        text: formatDate(item.time, 'LL', item.timezoneOffset),
                        fontSize: 16 * $fontScale
                    }
                ]
            }),
            textPaint,
            w - 10,
            LayoutAlignment.ALIGN_OPPOSITE,
            1,
            0,
            false
        ).draw(canvas);

        // const smallItemsToDraw = weatherDataService.getSmallIconsData(item);
        // let iconRight = 10;
        // for (let index = 0; index < smallItemsToDraw.length; index++) {
        //     const c = smallItemsToDraw[index];

        //     const paint = c.paint || textIconPaint;
        //     paint.setTextAlign(Align.LEFT);
        //     paint.setTextSize(c.iconFontSize);
        //     paint.setColor(c.color || colorOnSurface);
        //     if (c.customDraw) {
        //         const result = c.customDraw(canvas, $fontScale, paint, c, iconRight, h - 7 - 15 * $fontScale, false);
        //         iconRight += result;
        //     } else if (c.icon) {
        //         canvas.drawText(c.icon, iconRight, h - 7, paint);
        //         iconRight += 24 * $fontScale;
        //     }
        // }
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

    function drawPollOnCanvas(polls, title: string, canvas: Canvas) {
        delete polls['interval'];
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        let row, col, dx, dy, data;
        canvas.drawText(title, 20, 25 * $fontScale, titlesPaint);

        Object.keys(polls).forEach((k, index) => {
            col = index % 2;
            row = Math.floor(index / 2);
            dx = (col * w) / 2 + 25;
            dy = (row * 40 + 50) * $fontScale;
            data = polls[k];
            indicatorPaint.color = data.color;
            canvas.drawCircle(dx + 2, dy + 13, 4, indicatorPaint);
            canvas.drawText(POLLENS_POLLUTANTS_TITLES[k], dx + 20, dy + 11 * $fontScale, dataPaint);
            canvas.drawText(data.value + ' ' + data.unit, dx + 20, dy + 26 * $fontScale, subtitlesPaint);
        });
        canvas.drawLine(0, h - 1, w, h - 1, subtitlesPaint);
    }

    $: {
        titlesPaint.textSize = 17 * $fontScale;
        subtitlesPaint.textSize = 12 * $fontScale;
        dataPaint.textSize = 14 * $fontScale;
        titlesPaint.textSize = 17 * $fontScale;
    }
    $: {
        dataPaint.color = colorOnSurface;
        titlesPaint.color = colorOnSurface;
        subtitlesPaint.color = colorOutline;
    }
    function drawLast24({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const dx = 25;
        let dy = 40 * $fontScale;
        canvas.drawText(lc('last_24_hours'), dx - 5, 25 * $fontScale, titlesPaint);

        last24Data.forEach((data, index) => {
            dy += index * 30 * $fontScale;
            indicatorPaint.color = data.iconColor;
            canvas.drawCircle(dx + 2, dy + 13, 8, indicatorPaint);
            canvas.drawText(getWeatherDataShortTitle(data.key), dx + 20, dy + 18, dataPaint);
            dataPaint.setTextAlign(Align.RIGHT);
            canvas.drawText(data.value + '', w - dx, dy + 18, dataPaint);
            dataPaint.setTextAlign(Align.LEFT);
        });
        canvas.drawLine(0, h - 1, w, h - 1, subtitlesPaint);
    }
    function drawNext24({ canvas }: { canvas: Canvas }) {
        const w = canvas.getWidth();
        const h = canvas.getHeight();
        const dx = 25;
        let dy = 10 * $fontScale;

        if (last24Data.length > 0) {
            dy = 40 * $fontScale;
            canvas.drawText(lc('next_24_hours'), dx - 5, 25 * $fontScale, titlesPaint);
        }

        next24Data.forEach((data, index) => {
            dy += index * 30 * $fontScale;
            indicatorPaint.color = data.iconColor;
            canvas.drawCircle(dx + 2, dy + 13, 8, indicatorPaint);
            canvas.drawText(getWeatherDataShortTitle(data.key), dx + 20, dy + 18, dataPaint);
            dataPaint.setTextAlign(Align.RIGHT);
            canvas.drawText(data.value + '', w - dx, dy + 18, dataPaint);
            dataPaint.setTextAlign(Align.LEFT);
        });
        canvas.drawLine(0, h - 1, w, h - 1, subtitlesPaint);
    }
    function drawPollutants({ canvas }: { canvas: Canvas }) {
        drawPollOnCanvas(item.pollutants, lc('pollutants'), canvas);
    }
    function drawPollens({ canvas }: { canvas: Canvas }) {
        drawPollOnCanvas(item.pollens, lc('pollens'), canvas);
    }

    const showDayDataInCurrent = ApplicationSettings.getBoolean(SETTINGS_SHOW_CURRENT_DAY_DAILY, SHOW_CURRENT_DAY_DAILY);
    const minIndex = showDayDataInCurrent ? 1 : 0;
    function onSwipe(e) {
        if (e.direction === 1 && itemIndex > minIndex) {
            const data = getDailyPageProps(items[itemIndex - 1]);
            DEV_LOG && console.log('swiping left', startTime, data.startTime);
            startTime = data.startTime;
            item = data.item;
            itemIndex = data.itemIndex;
            items = data.items;
            itemsCount = items.length;
            redraw();
        } else if (e.direction === 2 && itemIndex < itemsCount - 1) {
            const delta = showDayDataInCurrent && itemIndex === 0 ? 2 : 1;
            const data = getDailyPageProps(items[itemIndex + delta]);
            DEV_LOG && console.log('swiping right', startTime, data.startTime);
            startTime = data.startTime;
            item = data.item;
            itemIndex = data.itemIndex;
            items = data.items;
            itemsCount = items.length;
            redraw();
        }
    }
</script>

<page bind:this={page} actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,*">
        <scrollview row={1}>
            <stacklayout bind:this={stackHolder}>
                <gridlayout columns="*,auto" height={topViewHeight * $fontScale} on:swipe={onSwipe}>
                    <canvasview bind:this={topCanvasView} colSpan={2} paddingBottom={10} paddingLeft={10} paddingRight={10} on:draw={drawOnCanvas} />
                    <WeatherIcon
                        {animated}
                        col={1}
                        horizontalAlignment="right"
                        iconData={[item.iconId, item.isDay]}
                        marginBottom={12}
                        size={weatherIconSize * (2 - $fontScale)}
                        verticalAlignment="bottom" />
                </gridlayout>
                ${#if item.hourly && item.hourly.length}
                    {#if showHourlyChart}
                        <HourlyChartView
                            barWidth={1}
                            borderBottomColor={colorOutline}
                            borderBottomWidth={1}
                            {dataToShow}
                            fixedBarScale={false}
                            height={200 * $fontScale}
                            hourly={item.hourly}
                            {onChartConfigure}
                            rightAxisSuggestedMaximum={8}
                            row={1}
                            showCurrentTimeLimitLine={false}
                            startTime={isCurrentDay ? Date.now() : undefined}
                            temperatureLineWidth={3}
                            visibility={item.hourly.length > 0 ? 'visible' : 'collapsed'} />
                    {:else}
                        <HourlyView height={250 * $fontScale} items={item.hourly} row={1} />
                    {/if}
                {/if}
                {#if last24Data.length > 0}
                    <canvasview height={Math.ceil(last24Data.length * 30 + 45) * $fontScale} on:draw={drawLast24} />
                {/if}
                {#if next24Data.length > 0}
                    <canvasview height={Math.ceil(next24Data.length * 30 + (last24Data.length > 0 ? 45 : 15)) * $fontScale} on:draw={drawNext24} />
                {/if}

                {#if item.pollutants}
                    <canvasview height={Math.ceil((Object.keys(item.pollutants).length / 2) * 40 + 55) * $fontScale} on:draw={drawPollutants} />
                {/if}

                {#if item.pollens}
                    <canvasview height={Math.ceil((Object.keys(item.pollens).length / 2) * 40 + 55) * $fontScale} on:draw={drawPollens} />
                {/if}
                {#if dayTides.length > 0}
                    <canvasview height={(dayTides.length * 70 + 55) * $fontScale} on:draw={drawTides} />
                {/if}
                <AstronomyView {isCurrentDay} {location} selectableDate={false} startTime={isCurrentDay ? dayjs() : startTime} {timezoneOffset} />
            </stacklayout>
        </scrollview>
        <CActionBar title={weatherLocation && weatherLocation.name} on:swipe={onSwipe} />
    </gridlayout>
</page>
