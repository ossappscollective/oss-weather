<script context="module" lang="ts">
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import type { Canvas } from '@nativescript-community/ui-canvas';
    import { Paint, Style } from '@nativescript-community/ui-canvas';
    import { Application, ApplicationSettings, Color, type GridLayout, type Image, Screen } from '@nativescript/core';
    import { onDestroy, onMount } from 'svelte';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import {
        RADAR_WIDGET_AUTOLOOP,
        RADAR_WIDGET_BACKGROUND,
        RADAR_WIDGET_CHANGED,
        RADAR_WIDGET_FADE,
        RADAR_WIDGET_FRAME_DURATION,
        RADAR_WIDGET_FUTURE,
        RADAR_WIDGET_GRID_COLOR,
        RADAR_WIDGET_OPACITY,
        RADAR_WIDGET_PAST,
        RADAR_WIDGET_SMOOTH,
        SETTINGS_RADAR_WIDGET_AUTOLOOP,
        SETTINGS_RADAR_WIDGET_BACKGROUND,
        SETTINGS_RADAR_WIDGET_BACKGROUND_COLOR,
        SETTINGS_RADAR_WIDGET_FADE,
        SETTINGS_RADAR_WIDGET_FRAME_DURATION,
        SETTINGS_RADAR_WIDGET_FUTURE,
        SETTINGS_RADAR_WIDGET_GRID_COLOR,
        SETTINGS_RADAR_WIDGET_OPACITY,
        SETTINGS_RADAR_WIDGET_PAST,
        SETTINGS_RADAR_WIDGET_SMOOTH
    } from '~/helpers/constants';
    import { lc } from '~/helpers/locale';
    import { modernColors } from '~/helpers/modernTheme';
    import { request } from '~/services/api';
    import { LIBREWXR_COLORS, LIBREWXR_URL, SETTINGS_LIBREWXR_COLORS, SETTINGS_LIBREWXR_URL } from '~/services/providers/librewxr';
    import { SETTINGS_WEATHER_MAP_SHOW_SNOW, WEATHER_MAP_SHOW_SNOW } from '~/services/providers/maptiler';
    import { chartScrolled } from '~/utils/charts/chartEvents';
    import { colors, designStyle, onSettingsChanged } from '~/variables';
    import { type RadarFrame, mapTilePlacements, radarFrameOffset, radarLoopFrames, radarPointTileUrl } from './RadarWidget';

    const RADAR_ZOOM = 7;
    const RADAR_SIZE = 256;
    const CATALOG_MAX_AGE = 5 * 60 * 1000;
    // the OpenStreetMap tile servers answer requests without an identifying User-Agent with a "blocked" tile (status 200)
    const TILE_HEADERS = { 'User-Agent': `OSSWeather/${__APP_VERSION__} (+https://github.com/ossappscollective/oss-weather)` };

    interface Catalog {
        baseUrl: string;
        host: string;
        past: RadarFrame[];
        nowcast: RadarFrame[];
        loadedAt: number;
    }
    let catalog: Catalog | undefined;

    async function loadCatalog(baseUrl: string) {
        if (catalog && catalog.baseUrl === baseUrl && Date.now() - catalog.loadedAt < CATALOG_MAX_AGE) {
            return catalog;
        }
        const { content } = await request<{ host?: string; radar: { past: RadarFrame[]; nowcast?: RadarFrame[] } }>({ url: `${baseUrl}/public/weather-maps.json`, method: 'GET' });
        catalog = { baseUrl, host: content.host || baseUrl, past: content.radar.past, nowcast: content.radar.nowcast ?? [], loadedAt: Date.now() };
        return catalog;
    }
</script>

<script lang="ts">
    export let coord: { lat: number; lon: number };
    // card height as a fraction of its width
    export let ratio: number;
    export let margin: number;
    export let width: number;

    const dispatch = createEventDispatcher();
    const gridPaint = new Paint();
    gridPaint.setStyle(Style.STROKE);
    const dotPaint = new Paint();
    dotPaint.setAntiAlias(true);

    let autoloop = true;
    let showMap = false;
    let smooth = true;
    let fade = false;
    let frameDuration = RADAR_WIDGET_FRAME_DURATION;
    let pastMinutes = RADAR_WIDGET_PAST;
    let futureMinutes = RADAR_WIDGET_FUTURE;
    // empty: the app section color
    let backgroundColor = '';
    let gridTint = RADAR_WIDGET_GRID_COLOR;
    let radarOpacity = RADAR_WIDGET_OPACITY;
    function readSettings() {
        autoloop = ApplicationSettings.getBoolean(SETTINGS_RADAR_WIDGET_AUTOLOOP, RADAR_WIDGET_AUTOLOOP);
        showMap = ApplicationSettings.getString(SETTINGS_RADAR_WIDGET_BACKGROUND, RADAR_WIDGET_BACKGROUND) === 'osm';
        smooth = ApplicationSettings.getBoolean(SETTINGS_RADAR_WIDGET_SMOOTH, RADAR_WIDGET_SMOOTH);
        fade = ApplicationSettings.getBoolean(SETTINGS_RADAR_WIDGET_FADE, RADAR_WIDGET_FADE);
        frameDuration = ApplicationSettings.getNumber(SETTINGS_RADAR_WIDGET_FRAME_DURATION, RADAR_WIDGET_FRAME_DURATION);
        pastMinutes = ApplicationSettings.getNumber(SETTINGS_RADAR_WIDGET_PAST, RADAR_WIDGET_PAST);
        futureMinutes = ApplicationSettings.getNumber(SETTINGS_RADAR_WIDGET_FUTURE, RADAR_WIDGET_FUTURE);
        backgroundColor = ApplicationSettings.getString(SETTINGS_RADAR_WIDGET_BACKGROUND_COLOR, '');
        gridTint = ApplicationSettings.getString(SETTINGS_RADAR_WIDGET_GRID_COLOR, RADAR_WIDGET_GRID_COLOR);
        radarOpacity = ApplicationSettings.getNumber(SETTINGS_RADAR_WIDGET_OPACITY, RADAR_WIDGET_OPACITY);
    }
    readSettings();
    onSettingsChanged(RADAR_WIDGET_CHANGED, () => {
        readSettings();
        loadFrames(true);
    });

    let appActive = true;
    let onScreen = false;
    let container: NativeViewElementNode<GridLayout>;
    // by url: keyed blocks keep their elements when the frames change, an index would go stale
    let imageViews: Record<string, NativeViewElementNode<Image>> = {};

    let frames: RadarFrame[] = [];
    let host = '';
    // the latest observation: the other frames are labelled relative to it
    let nowIndex = -1;
    let currentIndex = -1;
    let timer: ReturnType<typeof setInterval> | undefined;

    $: side = width - 2 * margin;
    $: height = side * ratio;
    $: active = onScreen && appActive;
    $: tiles = showMap ? mapTilePlacements(coord.lat, coord.lon, RADAR_ZOOM, RADAR_SIZE) : [];
    $: urls = frames.map((frame) =>
        radarPointTileUrl(host, frame, {
            size: RADAR_SIZE,
            zoom: RADAR_ZOOM,
            lat: coord.lat,
            lon: coord.lon,
            color: ApplicationSettings.getNumber(SETTINGS_LIBREWXR_COLORS, LIBREWXR_COLORS),
            smooth,
            snow: ApplicationSettings.getBoolean(SETTINGS_WEATHER_MAP_SHOW_SNOW, WEATHER_MAP_SHOW_SNOW)
        })
    );
    $: chip = getChip(frames, currentIndex, nowIndex);
    $: if (active) {
        loadFrames();
    }
    $: if (active && autoloop && frames.length > 1) {
        startLoop(frameDuration);
    } else {
        stopLoop();
    }
    $: applyFrame(currentIndex, urls, imageViews, fade && !!timer);
    $: if ($chartScrolled >= 0) {
        checkVisibility();
    }
    $: cardColor = backgroundColor || ($designStyle === 'modern' ? $modernColors.colorModernCard : $colors.colorSurfaceContainer);
    $: gridColor = new Color(gridTint).setAlpha(showMap ? 50 : 26);
    $: crosshairColor = new Color(gridTint).setAlpha(showMap ? 110 : 80);
    $: haloColor = new Color(gridTint).setAlpha(60);
    $: gridColor, crosshairColor, haloColor, gridInvalidate();

    function getChip(shownFrames: RadarFrame[], index: number, referenceIndex: number) {
        if (!shownFrames[index]) {
            return '';
        }
        const offset = radarFrameOffset(shownFrames[index].time, shownFrames[referenceIndex].time);
        return offset === 0 ? lc('now').toUpperCase() : `${offset > 0 ? '+' : ''}${offset} min`;
    }

    // images stay stacked and preloaded: only their opacity changes
    let shownIndex = -1;
    function applyFrame(index: number, frameUrls: string[], viewsByUrl: Record<string, NativeViewElementNode<Image>>, animate: boolean) {
        const views = frameUrls.map((url) => viewsByUrl[url]);
        const previous = shownIndex;
        shownIndex = index;
        const incoming = views[index]?.nativeView;
        const outgoing = views[previous]?.nativeView;
        if (!animate || !incoming || !outgoing || previous === index) {
            views.forEach((viewNode, viewIndex) => {
                if (viewNode?.nativeView) {
                    viewNode.nativeView.opacity = viewIndex === index ? 1 : 0;
                }
            });
            return;
        }
        views.forEach((viewNode, viewIndex) => {
            if (viewNode?.nativeView && viewIndex !== index && viewIndex !== previous) {
                viewNode.nativeView.opacity = 0;
            }
        });
        const duration = Math.min(frameDuration * 0.8, 400);
        // the upper image fades while the lower one stays opaque under it: two half transparent images would dip
        if (index > previous) {
            incoming.opacity = 0;
            outgoing.opacity = 1;
            incoming.animate({ opacity: 1, duration }).then(() => {
                if (shownIndex === index) {
                    outgoing.opacity = 0;
                }
            });
        } else {
            incoming.opacity = 1;
            outgoing.animate({ opacity: 0, duration });
        }
    }

    async function loadFrames(force = false) {
        if (!active && !force) {
            return;
        }
        try {
            const data = await loadCatalog(ApplicationSettings.getString(SETTINGS_LIBREWXR_URL, LIBREWXR_URL));
            const loop = radarLoopFrames(data.past, data.nowcast, pastMinutes, futureMinutes);
            if (force || frames.length !== loop.frames.length || frames[0]?.path !== loop.frames[0]?.path) {
                host = data.host;
                frames = loop.frames;
                nowIndex = loop.currentIndex;
                currentIndex = loop.currentIndex;
                shownIndex = -1;
            }
        } catch (error) {
            DEV_LOG && console.error('RadarWidget loadFrames', error);
        }
    }

    function startLoop(duration: number) {
        stopTimer();
        timer = setInterval(() => {
            currentIndex = (currentIndex + 1) % frames.length;
            if (Date.now() - (catalog?.loadedAt ?? 0) > CATALOG_MAX_AGE) {
                loadFrames();
            }
        }, duration);
    }
    function stopTimer() {
        if (timer) {
            clearInterval(timer);
            timer = undefined;
        }
    }
    function stopLoop() {
        stopTimer();
        // a paused widget shows the latest observation
        currentIndex = nowIndex;
    }

    function checkVisibility() {
        const view = container?.nativeView;
        if (!view?.isLoaded) {
            onScreen = false;
            return;
        }
        const position = view.getLocationOnScreen?.();
        onScreen = !!position && position.y + view.getActualSize().height > 0 && position.y < Screen.mainScreen.heightDIPs;
    }

    const onSuspend = () => (appActive = false);
    const onResume = () => {
        appActive = true;
        checkVisibility();
    };
    onMount(() => {
        Application.on(Application.suspendEvent, onSuspend);
        Application.on(Application.resumeEvent, onResume);
    });
    onDestroy(() => {
        Application.off(Application.suspendEvent, onSuspend);
        Application.off(Application.resumeEvent, onResume);
        stopTimer();
    });

    let canvasView: NativeViewElementNode<any>;
    function gridInvalidate() {
        canvasView?.nativeView?.invalidate();
    }

    // grid, crosshair and location pin of the LibreWXR widget
    function drawGrid(event: { canvas: Canvas }) {
        const { canvas } = event;
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        gridPaint.setStrokeWidth(1);
        gridPaint.setColor(gridColor);
        for (let index = 1; index < 4; index++) {
            canvas.drawLine((canvasWidth * index) / 4, 0, (canvasWidth * index) / 4, canvasHeight, gridPaint);
            canvas.drawLine(0, (canvasHeight * index) / 4, canvasWidth, (canvasHeight * index) / 4, gridPaint);
        }
        gridPaint.setColor(crosshairColor);
        canvas.drawLine(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight, gridPaint);
        canvas.drawLine(0, canvasHeight / 2, canvasWidth, canvasHeight / 2, gridPaint);
        dotPaint.setColor(haloColor);
        canvas.drawCircle(canvasWidth / 2, canvasHeight / 2, 9, dotPaint);
        dotPaint.setColor(gridTint);
        canvas.drawCircle(canvasWidth / 2, canvasHeight / 2, 4, dotPaint);
    }
</script>

<gridlayout
    bind:this={container}
    backgroundColor={cardColor}
    borderRadius={14}
    {height}
    marginLeft={margin}
    marginRight={margin}
    on:layoutChanged={checkVisibility}
    on:loaded={checkVisibility}
    on:tap={() => dispatch('open')}
    on:unloaded={() => (onScreen = false)}>
    <absolutelayout height={side} horizontalAlignment="center" isUserInteractionEnabled={false} verticalAlignment="center" width={side}>
        {#each tiles as tile (tile.url)}
            <image headers={TILE_HEADERS} height={tile.size * side} left={tile.left * side} src={tile.url} stretch="fill" top={tile.top * side} width={tile.size * side} />
        {/each}
        <!-- one group so the opacity applies to the visible frames together -->
        <absolutelayout height={side} isUserInteractionEnabled={false} left={0} opacity={radarOpacity} top={0} width={side}>
            {#each urls as url, index (url)}
                <image bind:this={imageViews[url]} height={side} left={0} opacity={0} src={url} stretch="fill" top={0} width={side} />
            {/each}
        </absolutelayout>
    </absolutelayout>
    <canvasview bind:this={canvasView} isUserInteractionEnabled={false} on:draw={drawGrid} />
    {#if chip}
        <label
            backgroundColor="#cc1a1c28"
            borderRadius={12}
            color="#e0e0e0"
            fontSize={13}
            horizontalAlignment="left"
            margin="0 0 10 10"
            padding="3 10 3 10"
            text={chip}
            verticalAlignment="bottom" />
    {/if}
    {#if showMap}
        <label
            backgroundColor="#b3ffffff"
            borderRadius={4}
            color="#333333"
            fontSize={10}
            horizontalAlignment="right"
            margin="0 6 6 0"
            padding="1 4 1 4"
            text="© OpenStreetMap contributors"
            verticalAlignment="bottom" />
    {/if}
</gridlayout>
