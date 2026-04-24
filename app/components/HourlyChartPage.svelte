<script context="module" lang="ts">
    import { Align, Canvas, FontMetrics, Paint } from '@nativescript-community/ui-canvas';
    import DrawerElement from '@nativescript-community/ui-drawer/svelte';
    import { Application, ApplicationSettings, Color, ObservableArray, OrientationChangedEventData } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { l, lc } from '~/helpers/locale';
    import type { WeatherData } from '~/services/providers/weather';
    import { colors, fontScale, screenWidthDips, windowInset } from '~/variables';

    import { NavigatedData, Page } from '@nativescript/core';
    import { onDestroy, onMount } from 'svelte';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { CHARTS_LANDSCAPE, CHARTS_PORTRAIT_FULLSCREEN } from '~/helpers/constants';
    import { FavoriteLocation } from '~/helpers/favorites';
    import { NetworkConnectionStateEvent, NetworkConnectionStateEventData, networkService } from '~/services/api';
    import { WeatherProps, weatherDataService } from '~/services/weatherData';
    import { actionBarButtonHeight } from '~/variables';
    import HourlyChartView from './HourlyChartView.svelte';

    const legendIconPaint = new Paint();
    legendIconPaint.textSize = 13;

    legendIconPaint.strokeWidth = 2;
    const legendPaint = new Paint();
    legendPaint.textSize = 13;
    const labelPaint = new Paint();
    labelPaint.textSize = 13;
    labelPaint.setTextAlign(Align.CENTER);

    const mFontMetricsBuffer = new FontMetrics();
</script>

<script lang="ts">
    let { colorBackground, colorOnSurface, colorOutline } = $colors;
    $: ({ colorBackground, colorOnSurface, colorOutline } = $colors);
    export let weatherLocation: FavoriteLocation;
    export let weatherData: WeatherData;
    export let forecast = 'hourly';
    const currentData = weatherDataService.currentWeatherData;
    export let dataToShow = [
        ...new Set(
            [WeatherProps.windSpeed, WeatherProps.precipAccumulation, WeatherProps.cloudCover]
                .filter((s) => currentData.includes(s))
                .concat([WeatherProps.windSpeed, WeatherProps.windBearing, WeatherProps.iconId, WeatherProps.temperature])
        )
    ];

    let page: NativeViewElementNode<Page>;
    // let pullRefresh: NativeViewElementNode<PullToRefresh>;
    let networkConnected = networkService.connected;
    const loading = false;
    const screenOrientation = ApplicationSettings.getBoolean('charts_landscape', CHARTS_LANDSCAPE) ? 'landscape' : undefined;
    let chartHeight = !screenOrientation && !ApplicationSettings.getBoolean('charts_portrait_fullscreen', CHARTS_PORTRAIT_FULLSCREEN) ? screenWidthDips : undefined;
    let chartView: HourlyChartView;

    let chartInitialized;
    let drawer: DrawerElement;
    const hidden: string[] = [];
    let legends: ObservableArray<any>;

    function onOrientationChanged(event: OrientationChangedEventData) {
        const isLandscape = event.newValue === 'landscape';
        chartHeight = !isLandscape && !ApplicationSettings.getBoolean('charts_portrait_fullscreen', CHARTS_PORTRAIT_FULLSCREEN) ? screenWidthDips : undefined;
    }

    onMount(async () => {
        Application.on(Application.orientationChangedEvent, onOrientationChanged);

        networkService.on(NetworkConnectionStateEvent, (event: NetworkConnectionStateEventData) => {
            try {
                if (networkConnected !== event.data.connected) {
                    networkConnected = event.data.connected;
                }
            } catch (error) {
                showError(error);
            }
        });
        networkConnected = networkService.connected;
    });
    onDestroy(() => {
        Application.off(Application.orientationChangedEvent, onOrientationChanged);
    });

    function onNavigatedTo(args: NavigatedData): void {
        // updateLineChart();
        updatePaint();
    }

    function updatePaint() {
        labelPaint.textSize = 10 * $fontScale;
        labelPaint.getFontMetrics(mFontMetricsBuffer);
        chartView?.nativeView?.invalidate();
    }
    fontScale.subscribe(updatePaint);

    function swipeMenuTranslationFunction(side, width, value, delta, progress) {
        const result = {
            bottomDrawer: {
                translateY: side === 'left' ? -value : value
                //    translateX: side === 'right' ? -delta : delta
            },
            backDrop: {
                // translateX: side === 'right' ? -delta : delta,
                opacity: progress * 0.05
            }
        } as any;

        return result;
    }
    function onDrawLegend({ color, enabled, id, name, subtitle }: { id: string; subtitle: string; name: string; color: string; enabled: boolean }, { canvas }: { canvas: Canvas }) {
        const h = canvas.getHeight();
        legendIconPaint.color = color || colorOnSurface;
        legendPaint.color = color || colorOnSurface;
        if (enabled) {
            // legendIconPaint.setStyle(enabled ? Style.FILL : Style.STROKE);

            canvas.drawRect(0, 0, 5, h, legendIconPaint);
        }
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
            const hiddenIndex = hidden.indexOf(legendItem.id);
            if (hiddenIndex >= 0 && legendItem.enabled) {
                hidden.splice(hiddenIndex, 1);
            } else if (hiddenIndex === -1 && !legendItem.enabled) {
                hidden.push(legendItem.id);
            }
            if (index >= 0) {
                const chart = chartView?.getChart();
                if (chart) {
                    const enabled = legendItem.enabled;
                    const set = chart.data.getDataSetByLabel(legendItem.id, false);
                    set.visible = enabled;
                    // switch (legendItem.chartType) {
                    //     case 'scatterchart':
                    //         (set as ScatterDataSet).scatterShapeSize=(enabled ? 4 : 0);
                    //         break;
                    //     default:
                    //         (set as LineDataSet).drawCircles=(enabled);
                    //         (set as LineDataSet).lineWidth = (enabled ? LINE_WIDTH : 0);
                    //         break;
                    // }
                    chart.invalidate();
                }
                legends.setItem(index, legendItem);
            }
        } catch (error) {
            showError(error);
        }
    }
</script>

<page bind:this={page} id="comparesingle" actionBarHidden={true} {screenOrientation} on:navigatedTo={onNavigatedTo}>
    <gridlayout class="pageContent" rows="auto,*">
        {#if !networkConnected && !weatherData}
            <label horizontalAlignment="center" row={1} text={l('no_network').toUpperCase()} verticalAlignment="middle" />
        {:else}
            <drawer
                bind:this={drawer}
                bottomDrawerMode="over"
                bottomSwipeDistance={200}
                closeAnimationDuration={100}
                gestureEnabled={false}
                openAnimationDuration={100}
                row={1}
                translationFunction={swipeMenuTranslationFunction}
                {...$$restProps}>
                <gridlayout prop:mainContent rows="auto,*">
                    <!-- <label class="sectionHeader" paddingTop={10} text={`${item.id} ${getUnit(item.id) || ''} (${lc(item.forecast)})`} /> -->
                    <HourlyChartView
                        bind:this={chartView}
                        {dataToShow}
                        height={chartHeight}
                        hourly={weatherData.hourly}
                        row={1}
                        verticalAlignment={chartHeight ? 'center' : 'stretch'}
                        bind:legends
                        bind:chartInitialized />
                    <!-- <combinedchart
                        bind:this={chartView}
                        height={chartHeight}
                        iosOverflowSafeArea={false}
                        row={1}
                        verticalAlignment={chartHeight ? 'center' : 'stretch'}
                        on:layoutChanged={onLayoutChanged} /> -->
                </gridlayout>
                <gridlayout prop:bottomDrawer backgroundColor={new Color(colorBackground).setAlpha(200)} columns="*" height={40 + $windowInset.bottom} rows="*">
                    <collectionview colWidth={150} height="40" items={legends} orientation="horizontal" verticalAlignment="top">
                        <Template let:item>
                            <canvasview rippleColor={item.color || colorOnSurface} on:draw={(event) => onDrawLegend(item, event)} on:tap={(event) => toggleLegend(item, event)} />
                        </Template>
                    </collectionview>
                </gridlayout>
            </drawer>
        {/if}
        <CActionBar showMenuIcon titleProps={{ visibility: 'visible' }}>
            <span slot="subtitle" text={weatherLocation && weatherLocation.name} />
            <span slot="subtitle2" color={colorOutline} fontSize={12} text={'\n' + lc(forecast)} />
            <activityIndicator busy={loading} height={$actionBarButtonHeight} verticalAlignment="middle" visibility={loading ? 'visible' : 'collapse'} width={$actionBarButtonHeight} />
            <mdbutton class="actionBarButton" text="mdi-format-list-bulleted-square" variant="text" on:tap={() => drawer.toggle()} />
        </CActionBar>
    </gridlayout>
</page>
