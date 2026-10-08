<script context="module" lang="ts">
    import { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { textAttributedString } from '~/utils/ui/attributedString';
    import { Align, Canvas, CanvasView, LayoutAlignment, Paint, StaticLayout } from '@nativescript-community/ui-canvas';
    import { CombinedChart } from '@nativescript-community/ui-chart';
    import { ApplicationSettings, Color, Page, StackLayout } from '@nativescript/core';
    import dayjs, { Dayjs } from 'dayjs';
    import AstronomyView from '~/components/astronomy/AstronomyView.svelte';
    import WindyView, { computeWindyViewMinHeight } from '~/components/WindyView.svelte';
    import { SETTINGS_SHOW_CURRENT_DAY_DAILY, SHOW_CURRENT_DAY_DAILY } from '~/helpers/constants';
    import { formatDate, isSameDay, lc } from '~/helpers/locale';
    import { POLLENS_POLLUTANTS_TITLES, Pollutants, getPollutantIndex } from '~/services/airQualityData';
    import { AQI_LEVEL_KEYS, AQI_THRESHOLDS, MODERN_LEVEL_COLORS, POLLEN_THRESHOLDS, levelIndex } from '~/utils/airQualityLevel';
    import { mixColors } from '~/utils/modernThemeColors';
    import { levelFraction } from '~/utils/levelFraction';
    import { WeatherLocation } from '~/services/api';
    import { iconService, onIconAnimationsChanged } from '~/services/icon';
    import type { DailyData, Hourly, Tide } from '~/services/providers/weather';
    import { WeatherProps, formatWeatherValue, getWeatherDataShortTitle, weatherDataService } from '~/services/weatherData';
    import { accentFontWeight, colors, designStyle, fontScale, hourlyViewData, hourlyViewMode, onFontScaleChanged, weatherDataLayout } from '~/variables';
    import { textFontFamily } from '~/utils/designStyle';
    import DailyView from './DailyView.svelte';
    import CActionBar from './common/CActionBar.svelte';
    import ModernCardTitle from './common/ModernCardTitle.svelte';
    import HourlyChartView from './HourlyChartView.svelte';
    import HourlyView from './HourlyView.svelte';
    import TidesChartView from './TidesChartView.svelte';
    import WeatherIcon from './WeatherIcon.svelte';
    const weatherIconSize = 70;
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
    const currentData = weatherDataService.currentWeatherData;
    const currentHourlyData: WeatherProps[] = $hourlyViewData;
    const dataToShow: WeatherProps[] = [
        ...new Set(
            currentHourlyData
                .filter((s) => currentData.includes(s))
                .concat(currentHourlyData.indexOf(WeatherProps.iconId) !== -1 ? [WeatherProps.iconId] : [])
                .concat(currentHourlyData.indexOf(WeatherProps.temperature) !== -1 ? [WeatherProps.temperature] : [])
                .concat(currentHourlyData.indexOf(WeatherProps.windBearing) !== -1 ? [WeatherProps.windBearing] : [])
        )
    ];

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
    let hourlyViewHeight = 250 * $fontScale;
    $: {
        hourlyViewHeight = 250 * $fontScale;
        if (shownHourlyMode === 'windy') {
            hourlyViewHeight = computeWindyViewMinHeight($hourlyViewData, $fontScale);
        }
    }
    // modern card icons, in the data palette
    const MODERN_SECTION_COLORS = { hourly: '#378ADD', airQuality: '#97C459', tides: '#0288D1', astronomy: '#EF9F27' };
    // modern: the hourly card switches between the views without changing the setting
    const HOURLY_MODES = ['classic', 'chart', 'windy'];
    let pageHourlyMode: string = null;
    $: shownHourlyMode = (modern && pageHourlyMode) || $hourlyViewMode;
    // modern air quality and pollens: two columns of values with a level bar (pollutants with an index scale)
    const INDEXED_POLLUTANTS: string[] = [Pollutants.O3, Pollutants.NO2, Pollutants.PM10, Pollutants.PM25, Pollutants.SO2, Pollutants.CO];
    function isIndexedPollutant(key: string): key is Pollutants {
        return INDEXED_POLLUTANTS.includes(key);
    }
    function levelValue(key: string, value: number, pollutants: boolean) {
        if (!pollutants) {
            return value;
        }
        return isIndexedPollutant(key) ? getPollutantIndex(key, value) : null;
    }
    function levelEntries(polls: Record<string, { value: number; unit: string; color?: string }>, pollutants: boolean) {
        return Object.keys(polls)
            .filter((key) => key !== 'interval')
            .map((key) => {
                const value = levelValue(key, polls[key].value, pollutants);
                const level = levelIndex(value, pollutants ? AQI_THRESHOLDS : POLLEN_THRESHOLDS);
                return {
                    key,
                    title: POLLENS_POLLUTANTS_TITLES[key] ?? key,
                    value: polls[key].value + '',
                    unit: polls[key].unit ?? '',
                    color: level === null ? colorOnSurfaceVariant : MODERN_LEVEL_COLORS[level],
                    fraction: levelFraction(value, 100)
                };
            });
    }
    // "Fair · 38" chip, tinted with the level color
    $: aqiLevel = levelIndex(item.aqi, AQI_THRESHOLDS);
    $: aqiColor = aqiLevel === null ? colorOnSurfaceVariant : MODERN_LEVEL_COLORS[aqiLevel];
    let animated = iconService.animated;
    $: ({ colorOnSurface, colorOnSurfaceVariant, colorOutline } = $colors);
    // modern: the daily row header on top, then each section in a light card
    $: modern = $designStyle === 'modern';

    /** Tides that fall within the current day (start of day → end of day) */
    $: dayTides = (() => {
        if (!item.tides?.length) return [];
        const start = startTime.startOf('day').valueOf();
        const end = startTime.endOf('day').valueOf();
        return item.tides.filter((t) => t.time >= start && t.time <= end);
    })();

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

        const iconsTop = 55 * $fontScale - padding;
        // canvas.translate(26, 0);
        switch ($weatherDataLayout) {
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
        const nString = textAttributedString({
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
            textAttributedString({
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
        // modern: the chart keeps its own room for the icons and labels
        if (!modern) {
            chart.setExtraOffsets(0, 40, 0, 10);
        }
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
        drawSectionLine(canvas, w, h);
    }

    $: {
        titlesPaint.textSize = (modern ? 15 : 17) * $fontScale;
        titlesPaint.fontWeight = modern ? $accentFontWeight : 'bold';
        subtitlesPaint.textSize = 12 * $fontScale;
        dataPaint.textSize = 14 * $fontScale;
        const fontFamily = textFontFamily($designStyle);
        [titlesPaint, subtitlesPaint, dataPaint].forEach((paint) => paint.setFontFamily(fontFamily));
    }
    // the cards already separate the sections
    function drawSectionLine(canvas: Canvas, w: number, h: number) {
        if (!modern) {
            canvas.drawLine(0, h - 1, w, h - 1, subtitlesPaint);
        }
    }
    $: {
        dataPaint.color = colorOnSurface;
        titlesPaint.color = colorOnSurface;
        subtitlesPaint.color = modern ? colorOnSurfaceVariant : colorOutline;
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
        drawSectionLine(canvas, w, h);
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
        drawSectionLine(canvas, w, h);
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
            startTime = data.startTime;
            item = data.item;
            itemIndex = data.itemIndex;
            items = data.items;
            itemsCount = items.length;
            redraw();
        } else if (e.direction === 2 && itemIndex < itemsCount - 1) {
            const delta = showDayDataInCurrent && itemIndex === 0 ? 2 : 1;
            const data = getDailyPageProps(items[itemIndex + delta]);
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
                {#if modern}
                    <gridlayout on:swipe={onSwipe}>
                        <DailyView {animated} fullDate={true} {item} />
                    </gridlayout>
                {:else}
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
                {/if}
                {#if item.hourly && item.hourly.length}
                    <gridlayout class={modern ? 'modernCard' : ''} rows="auto,auto">
                        {#if modern}
                            <!-- title and a view switch (classic list, chart, windy) for this page only -->
                            <ModernCardTitle icon="mdi-clock-outline" iconColor={MODERN_SECTION_COLORS.hourly} title={lc('hourly')}>
                                <gridlayout class="modernSegmented" col={2} columns="auto,auto,auto" verticalAlignment="center">
                                    {#each HOURLY_MODES as mode, index}
                                        <label
                                            class={shownHourlyMode === mode ? 'modernSegment modernSegmentCompact modernSegmentSelected' : 'modernSegment modernSegmentCompact'}
                                            col={index}
                                            text={lc(mode + '_view')}
                                            on:tap={() => (pageHourlyMode = mode)} />
                                    {/each}
                                </gridlayout>
                            </ModernCardTitle>
                        {/if}
                        {#if shownHourlyMode === 'chart'}
                            <HourlyChartView
                                barWidth={1}
                                borderBottomColor={colorOutline}
                                borderBottomWidth={modern ? 0 : 1}
                                {dataToShow}
                                fixedBarScale={false}
                                height={hourlyViewHeight}
                                hourly={item.hourly}
                                {onChartConfigure}
                                rightAxisSuggestedMaximum={8}
                                row={1}
                                showCurrentTimeLimitLine={false}
                                showDayLabels={false}
                                startTime={isCurrentDay ? Date.now() : undefined}
                                temperatureLineWidth={3}
                                visibility={item.hourly.length > 0 ? 'visible' : 'collapsed'} />
                        {:else if shownHourlyMode === 'windy'}
                            <WindyView {dataToShow} height={hourlyViewHeight} items={item.hourly} row={1} />
                        {:else}
                            <HourlyView height={hourlyViewHeight} items={item.hourly} row={1} />
                        {/if}
                    </gridlayout>
                {/if}
                {#if modern}
                    {#if last24Data.length > 0 || next24Data.length > 0}
                        <stacklayout class="modernCard" paddingBottom={8}>
                            {#each [{ title: lc('last_24_hours'), rows: last24Data, icon: 'mdi-history' }, { title: lc('next_24_hours'), rows: next24Data, icon: 'mdi-clock-outline' }] as section}
                                {#if section.rows.length > 0}
                                    <ModernCardTitle icon={section.icon} iconColor={MODERN_SECTION_COLORS.hourly} title={section.title} />
                                    {#each section.rows as data}
                                        <gridlayout class="modernKeyValue" columns="auto,*,auto">
                                            <absolutelayout backgroundColor={data.iconColor || data.color} borderRadius={4} height={8} marginRight={10} verticalAlignment="center" width={8} />
                                            <label class="modernSubtitle" col={1} text={getWeatherDataShortTitle(data.key)} verticalAlignment="center" />
                                            <label class="modernTitle modernStrong" col={2} text={data.value + ''} verticalAlignment="center" />
                                        </gridlayout>
                                    {/each}
                                {/if}
                            {/each}
                        </stacklayout>
                    {/if}
                    {#each [{ polls: item.pollutants, title: lc('air_quality'), pollutants: true, icon: 'mdi-leaf' }, { polls: item.pollens, title: lc('pollens'), pollutants: false, icon: 'mdi-flower' }] as levels}
                        {#if levels.polls}
                            <stacklayout class="modernCard" paddingBottom={10}>
                                <ModernCardTitle icon={levels.icon} iconColor={MODERN_SECTION_COLORS.airQuality} title={levels.title}>
                                    <label
                                        class="modernChip modernStrong"
                                        backgroundColor={new Color(aqiColor).setAlpha(40).hex}
                                        col={2}
                                        color={mixColors(aqiColor, colorOnSurface, 0.35)}
                                        text={(aqiLevel === null ? '' : lc(AQI_LEVEL_KEYS[aqiLevel]) + ' · ') + item.aqi}
                                        verticalAlignment="center"
                                        visibility={levels.pollutants && Number.isFinite(item.aqi) ? 'visible' : 'collapse'} />
                                </ModernCardTitle>
                                <gridlayout columns="*,*" padding="2 10 0 16" rows={Array(Math.ceil(levelEntries(levels.polls, levels.pollutants).length / 2)).fill('auto').join(',')}>
                                    {#each levelEntries(levels.polls, levels.pollutants) as entry, index}
                                        <stacklayout col={index % 2} padding="6 6 6 0" row={Math.floor(index / 2)}>
                                            <gridlayout columns="*,auto,auto">
                                                <label class="modernSubtitle modernEllipsis" text={entry.title} verticalAlignment="bottom" />
                                                <label class="modernTitle modernStrong" col={1} marginLeft={4} text={entry.value} verticalAlignment="bottom" />
                                                <label class="modernSubtitle" col={2} marginLeft={3} text={entry.unit} verticalAlignment="bottom" />
                                            </gridlayout>
                                            <gridlayout class="modernLevelTrack" columns={`${Math.round(Math.max(entry.fraction, 0.02) * 1000)}*,${Math.round((1 - Math.max(entry.fraction, 0.02)) * 1000)}*`}>
                                                <absolutelayout class="modernLevelFill" backgroundColor={entry.color} />
                                            </gridlayout>
                                        </stacklayout>
                                    {/each}
                                </gridlayout>
                            </stacklayout>
                        {/if}
                    {/each}
                {:else}
                    {#if last24Data.length > 0 || next24Data.length > 0}
                        <stacklayout>
                            {#if last24Data.length > 0}
                                <canvasview height={Math.ceil(last24Data.length * 30 + 45) * $fontScale} on:draw={drawLast24} />
                            {/if}
                            {#if next24Data.length > 0}
                                <canvasview height={Math.ceil(next24Data.length * 30 + (last24Data.length > 0 ? 45 : 15)) * $fontScale} on:draw={drawNext24} />
                            {/if}
                        </stacklayout>
                    {/if}

                    {#if item.pollutants}
                        <canvasview height={Math.ceil((Object.keys(item.pollutants).length / 2) * 40 + 55) * $fontScale} on:draw={drawPollutants} />
                    {/if}

                    {#if item.pollens}
                        <canvasview height={Math.ceil((Object.keys(item.pollens).length / 2) * 40 + 55) * $fontScale} on:draw={drawPollens} />
                    {/if}
                {/if}
                {#if dayTides.length > 0}
                    <stacklayout class={modern ? 'modernCard' : ''}>
                        {#if modern}
                            <ModernCardTitle icon="mdi-waves" iconColor={MODERN_SECTION_COLORS.tides} title={lc('tides')} />
                        {:else}
                            <label color="#0288d1" fontSize={17} fontWeight="bold" padding={10} text={lc('tides')} />
                        {/if}
                        <TidesChartView {startTime} tides={dayTides} {timezoneOffset} />
                    </stacklayout>
                {/if}
                <stacklayout class={modern ? 'modernCard' : ''}>
                    {#if modern}
                        <ModernCardTitle icon="mdi-theme-light-dark" iconColor={MODERN_SECTION_COLORS.astronomy} title={lc('sun_and_moon')} />
                    {:else}
                        <label color="#ffa500" fontSize={17} fontWeight="bold" padding={10} text={lc('astronomy')} />
                    {/if}
                    <AstronomyView {isCurrentDay} {location} selectableDate={false} startTime={isCurrentDay ? dayjs() : startTime} {timezoneOffset} />
                </stacklayout>
            </stacklayout>
        </scrollview>
        <CActionBar title={weatherLocation && weatherLocation.name} on:swipe={onSwipe}>
            {#if modern}
                <!-- previous / next day, like swiping the header -->
                <mdbutton class="actionBarButton" isEnabled={itemIndex > minIndex} text="mdi-chevron-left" variant="text" on:tap={() => onSwipe({ direction: 1 })} />
                <mdbutton class="actionBarButton" isEnabled={itemIndex < itemsCount - 1} text="mdi-chevron-right" variant="text" on:tap={() => onSwipe({ direction: 2 })} />
            {/if}
        </CActionBar>
    </gridlayout>
</page>
