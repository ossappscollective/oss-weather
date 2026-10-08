<script lang="ts">
    import { ColorRamp, PrecipitationLayer, PressureLayer, RadarLayer, TemperatureLayer, TileLayer, type WeatherPayload, WindLayer } from '@maptiler/weather';
    import { type LngLatLike, Map, MapMLGL, MapStyle, Marker, type StyleSpecification, config } from '@maptiler/sdk';
    import '@maptiler/sdk/dist/maptiler-sdk.css';
    import './global.css';
    import './rainviewer.css';
    import { onDestroy } from 'svelte';
    // import RainViewerLegend from './RainViewerLegend.svelte';
    import RangeSlider from 'svelte-range-slider-pips';
    import { LIBREWXR_MODES, LibreWXRLayer } from './LibreWXRLayer';
    let weatherLayer: TileLayer;
    let isPlaying = false;
    let currentTime = null;
    let sliderMin = 0;
    let sliderMax = 11;
    let sliderValue = 0;
    let colorramp = ColorRamp.builtin.RADAR;

    function GetURLParameters() {
        // console.log('GetURLParameters ' + window.location.search);
        const sPageURL = decodeURI(window.location.search).substring(1);
        const sURLVariables = sPageURL.split('&');
        return sURLVariables.reduce((acc, val) => {
            const sParameterName = decodeURIComponent(val).split('=');

            acc[sParameterName[0]] = sParameterName.length > 1 ? sParameterName.slice(1).join('=') : 'true';
            return acc;
        }, {});
    }
    const urlParamers = GetURLParameters();
    let map: InstanceType<typeof MapMLGL>;

    let options = {
        apiKey: urlParamers['apiKey'],
        mapSource: urlParamers['mapSource'] ?? 'librewxr',
        librewxrUrl: urlParamers['librewxrUrl'] || 'https://api.librewxr.net',
        snow: (urlParamers['snow'] ?? 'true') === 'true',
        forecastLabel: urlParamers['forecastLabel'] || 'forecast',
        source: urlParamers['source'],
        layer: urlParamers['layer'] ?? 'radar',
        position: urlParamers['position']?.split(',').map(parseFloat).reverse() as LngLatLike,
        mapCenter: (urlParamers['mapCenter'] || '45.18453,5.75').split(',').map(parseFloat).reverse() as LngLatLike,
        zoom: parseFloat(urlParamers['zoom'] || '8'),
        useToPickLocation: parseFloat(urlParamers['useToPickLocation'] || '0') === 1,
        layerOpacity: parseFloat(urlParamers['opacity'] || '0.8'),
        animationSpeed: parseFloat(urlParamers['animationSpeed'] || '1'),
        animated: (urlParamers['animated'] || 'false') === 'true',
        hideAttribution: (urlParamers['hideAttribution'] || 'false') === 'true',
        dark: urlParamers['dark'] || 'light',
        modern: (urlParamers['modern'] || 'false') === 'true',
        language: urlParamers['lang'] || 'en',
        colors: urlParamers['colors'] || 'RADAR',
        timeInterval: parseFloat(urlParamers['timeInterval'] || 30),
        maxTimeSpan: parseFloat(urlParamers['maxTimeSpan'] || 0),
        showHistory: (urlParamers['showHistory'] ?? 'true') === 'true',
        tileSize: parseFloat(urlParamers['tileSize'] || '256') // can be 256 or 512.
    };

    // the location picker and LibreWXR use plain maplibre: no MapTiler request or telemetry
    const isLibreWXR = options.mapSource !== 'maptiler';
    let libreWXRLayer: LibreWXRLayer;
    let animationTimer: ReturnType<typeof setInterval>;

    // Make sure you set your MapTiler Cloud API key:
    config.apiKey = options.apiKey;
    // console.log(`options ${JSON.stringify(options)}`);

    document.documentElement.style.setProperty('--bottom-padding', options.useToPickLocation ? '0px' : options.modern ? '120px' : '100px');

    document.documentElement.setAttribute('data-dark', options.dark === 'black' ? 'dark' : options.dark);
    // modern design style of the app (see global.css)
    document.documentElement.setAttribute('data-modern', options.modern ? 'true' : 'false');
    if (options.dark === 'dark' || options.dark === 'black') {
        document.documentElement.style.setProperty('--background-color', options.dark === 'black' ? '#000' : '#333');
        document.documentElement.style.setProperty('--button-color', 'white');
    }

    function createMap(container) {
        return new Promise<typeof map>(async (resolve, reject) => {
            // Initialise the map
            const style: StyleSpecification = await import(`./${options.dark === 'light' ? 'light' : 'dark'}_theme.json`);
            if (options.source) {
                try {
                    // we test if the custom tile source is available.
                    // if not we add the default
                    await fetch(options.source.replace(/\{(x|y|z)\}/g, '0'), {
                        method: 'HEAD'
                    });
                    style.sources.openmaptiles = {
                        type: 'vector',
                        tiles: [options.source],
                        maxzoom: 14
                    };
                } catch (error) {
                    console.error('error loading source', options.source, error);
                    // reject(error);
                }
            }

            // Let's assume you have a div container to place your map in
            // console.log('create map');
            const MapClass = isLibreWXR || options.useToPickLocation ? MapMLGL : Map;
            map = new MapClass({
                fadeDuration: 0,
                validateStyle: false,
                attributionControl: {
                    compact: true,
                    customAttribution: options.hideAttribution
                        ? []
                        : ['<a href="https://maplibre.org/">MapLibre</a>', '<a href="https://www.openstreetmap.org">OpenStreetMap</a>'].concat(
                              options.useToPickLocation ? [] : [isLibreWXR ? '<a href="https://librewxr.net/">LibreWXR</a>' : '<a href="https://www.maptiler.com/weather/">MapTiler</a>']
                          )
                },
                container,
                style,
                center: options.mapCenter,
                zoom: options.zoom
            });
            map.on('load', () => {
                // console.log('loaded map', resolve, map);
                resolve(map);
            });
            // map = new Map({
            //     fadeDuration: 0,
            //     validateStyle: false,
            //     attributionControl: options.hideAttribution
            //         ? false
            //         : {
            //               compact: true,
            //               customAttribution: ['<a href="https://maplibre.org/">MapLibre</a>', '<a href="https://www.openstreetmap.org">OpenStreetMap</a>'].concat(
            //                   options.useToPickLocation ? [] : ['<a href="https://www.rainviewer.com/api.html">RainViewer</a>']
            //               )
            //           },
            //     //  refreshExpiredTiles:false,
            //     container,
            //     // style:'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json',
            //     style,
            //     center: options.mapCenter,
            //     zoom: options.zoom
            // });
            map.touchZoomRotate.disableRotation();
            map.on('styledata', () => {
                // console.log('loaded styledata');
                const languageFieldName = `name:${options.language}`;
                map?.getStyle()
                    ?.layers?.filter((layer) => layer.type === 'symbol' && layer.layout?.['text-field'])
                    .forEach(function (layer) {
                        const result = ['coalesce', ['get', languageFieldName], ['get', 'name'], ['get', 'name:latin'], ['get', 'name']];
                        map.setLayoutProperty(layer.id, 'text-field', result);
                    });
            });
        });
    }

    class ColorRampLegendControl {
        private _options: any;
        private _container: HTMLDivElement;
        private _map: any;
        constructor(options) {
            this._options = { ...options };
        }
        onAdd(map) {
            this._map = map;
            this._container = document.createElement('div');
            this._container.className = 'maplibregl-ctrl-group maplibregl-ctrl';
            const canvas = colorramp.getCanvasStrip({ horizontal: false, smooth: true, size: 100 });
            canvas.style.height = '150px';
            canvas.style.width = '20px';
            canvas.style.margin = '6px';
            canvas.style.borderRadius = '3px';

            // const desc = document.createElement('div');
            // desc.classList.add('color-ramp-label');
            // // desc.innerHTML = `(min: ${bounds.min}, max: ${bounds.max})`;

            // // this._container.appendChild(desc);
            this._container.appendChild(canvas);

            return this._container;
        }
        onRemove() {
            if (!this._map || !this._container) {
                return;
            }
            this._container.parentNode.removeChild(this._container);
            this._map = undefined;
            delete this._map;
        }
    }

    let legendControl: ColorRampLegendControl;
    function refreshWeatherLayer() {
        if (legendControl) {
            map.removeControl(legendControl);
        }
        if (weatherLayer) {
            map.removeLayer(weatherLayer.id);
        }
        colorramp = ColorRamp.builtin[options.colors];
        switch (options.layer) {
            case 'precipitation':
                weatherLayer = new PrecipitationLayer({
                    opacity: options.layerOpacity,
                    colorramp: ColorRamp.builtin[options.colors]
                });
                break;

            case 'pressure':
                weatherLayer = new PressureLayer({
                    opacity: options.layerOpacity,
                    colorramp: ColorRamp.builtin[options.colors]
                });
                break;

            case 'temperature':
                weatherLayer = new TemperatureLayer({
                    opacity: options.layerOpacity,
                    colorramp: ColorRamp.builtin[options.colors]
                });
                break;

            case 'wind':
                weatherLayer = new WindLayer({
                    opacity: options.layerOpacity,
                    colorramp: ColorRamp.builtin[options.colors]
                });
                break;

            default:
                weatherLayer = new RadarLayer({
                    opacity: options.layerOpacity,
                    colorramp: ColorRamp.builtin[options.colors]
                });
                break;
        }
        // console.log('creating radar layer');
        weatherLayer.on('sourceReady', (event) => {
            const startDate = weatherLayer.getAnimationStartDate();
            const endDate = weatherLayer.getAnimationEndDate();

            const currentDate = weatherLayer.getAnimationTimeDate();
            sliderMin = options.showHistory ? +startDate : +currentDate;
            sliderMax = options.maxTimeSpan > 0 ? Math.min(sliderMin + options.maxTimeSpan * 3600 * 1000, +endDate) : +endDate;
            console.log('sourceReady', sliderMin, sliderMax, +endDate);
            sliderValue = +currentDate;
            refreshTime();
        });
        // Called when the animation is progressing
        weatherLayer.on('tick', (event) => {
            // console.log('weatherLayer tick');
            refreshTime();
        });
        currentTime = weatherLayer.getAnimationTime();
        map.addLayer(weatherLayer as any);
        console.log('added radar layer');
        try {
            legendControl = new ColorRampLegendControl({ colorRamp: colorramp });
            map.addControl(legendControl, 'top-left');
        } catch (error) {
            console.error('failed to create legendControl', error.toString());
        }
    }
    function mapAction(container) {
        createMap(container)
            .then((map) => {
                // console.log('mapAction done');
                if (options.position) {
                    const el = document.createElement('div');
                    el.className = 'marker';
                    new Marker({ element: el }).setLngLat(options.position).addTo(map);
                }
                if (options.useToPickLocation) {
                    let positionMarker: Marker;
                    map.on('click', (e) => {
                        if (!positionMarker) {
                            const el = document.createElement('div');
                            el.className = 'marker';
                            positionMarker = new Marker({ element: el }).setLngLat(e.lngLat).addTo(map);
                        } else {
                            positionMarker.setLngLat(e.lngLat);
                        }
                        if (window['nsWebViewBridge']) {
                            // console.log('emitNSEvent ', name, value);
                            window['nsWebViewBridge'].emit('position', e.lngLat);
                        }
                    });
                } else if (isLibreWXR) {
                    loadLibreWXRLayer();
                } else {
                    refreshWeatherLayer();
                }
            })
            .catch((err) => console.error(err));
    }
    async function loadLibreWXRLayer() {
        const color = parseInt(options.colors, 10);
        libreWXRLayer = new LibreWXRLayer(map, {
            url: options.librewxrUrl,
            mode: LIBREWXR_MODES.find((mode) => mode === options.layer) ?? 'radar',
            color: isNaN(color) ? 7 : color,
            snow: options.snow,
            opacity: options.layerOpacity,
            showHistory: options.showHistory,
            maxTimeSpan: options.maxTimeSpan,
            timeInterval: options.timeInterval
        });
        try {
            await libreWXRLayer.load();
        } catch (error) {
            console.error('failed to load LibreWXR', error);
            return;
        }
        sliderMin = 0;
        sliderMax = Math.max(libreWXRLayer.frames.length - 1, 0);
        refreshTime();
        if (options.animated && libreWXRLayer.frames.length) {
            playAnimation();
        }
    }
    // let currentIndex = 0;
    // let lastIndex = -1;
    // let animationInterval;
    // function stopAnimation() {
    //     if (animationInterval) {
    //         clearInterval(animationInterval);
    //         animationInterval = null;
    //     }
    // }

    // modern: weekday and time, then the day and whether it is a forecast
    function showModernTime(date: Date, forecast: boolean) {
        document.getElementById('timestamp').innerText = date.toLocaleString(options.language, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
        const day = date.toLocaleDateString(options.language, { day: 'numeric', month: 'long' });
        document.getElementById('timestampSub').innerText = forecast ? `${day} · ${options.forecastLabel}` : day;
    }
    // Update the date time display
    function refreshTime() {
        if (isLibreWXR) {
            const frame = libreWXRLayer.frames[libreWXRLayer.currentIndex];
            if (frame) {
                if (options.modern) {
                    showModernTime(new Date(frame.time * 1000), frame.nowcast);
                } else {
                    const label = new Date(frame.time * 1000).toLocaleString(options.language, { timeStyle: 'short', dateStyle: 'short' });
                    document.getElementById('timestamp').innerText = frame.nowcast ? `${label} (${options.forecastLabel})` : label;
                }
                sliderValue = libreWXRLayer.currentIndex;
            }
            return;
        }
        const d = weatherLayer.getAnimationTimeDate();
        // console.log('refreshTime', d);
        if (options.modern) {
            showModernTime(d, +d > Date.now());
        } else {
            document.getElementById('timestamp').innerHTML = d.toLocaleString(options.language, { timeStyle: 'medium', dateStyle: 'short' });
        }
        sliderValue = +d;
        // timeTextDiv.innerText = d.toString();
    }

    // function refreshMap() {
    //     const frame = data[currentIndex];
    //     // apiData.radar.past.forEach((frame, index) => {
    //     document.getElementById('timestamp').innerHTML = new Date(frame.timestamp).toLocaleTimeString();
    //     // });
    //     if (lastIndex >= 0) {
    //         const frame = data[lastIndex];
    //         console.log('refreshMap', JSON.stringify(frame));
    //         // let opacity = 1;
    //         // setTimeout(() => {
    //         // const i2 = setInterval(() => {
    //         //     if (opacity <= 0) {
    //         //         return clearInterval(i2);
    //         //     }
    //         map.setPaintProperty(`rainviewer_${frame.id}`, 'raster-opacity', 0, { validate: false });
    //         // opacity -= 0.1;
    //         // }, 50);
    //         // }, 400);
    //     }
    //     map.setPaintProperty(`rainviewer_${frame.id}`, 'raster-opacity', options.layerOpacity, { validate: false });
    // }

    function pauseAnimation() {
        if (isLibreWXR) {
            clearInterval(animationTimer);
            animationTimer = undefined;
        } else {
            weatherLayer.animate(0);
        }
        //   playPauseButton.innerText = "Play 3600x";
        isPlaying = false;
    }

    function playAnimation() {
        if (isLibreWXR) {
            // animationSpeed defaults to 100: 500ms per frame
            animationTimer = setInterval(() => {
                libreWXRLayer.showFrame((libreWXRLayer.currentIndex + 1) % libreWXRLayer.frames.length);
                refreshTime();
            }, options.animationSpeed * 5);
        } else {
            weatherLayer.animate(options.timeInterval * 10 * options.animationSpeed);
        }
        isPlaying = true;
    }
    function startStopAnimation() {
        if (isLibreWXR) {
            if (!libreWXRLayer?.frames.length) {
                return;
            }
        } else {
            weatherLayer.setAnimationTime(sliderValue / 1000);
        }
        if (!isPlaying) {
            playAnimation();
        } else {
            pauseAnimation();
        }
        //     stopAnimation();
        //     return;
        // }
        // animationInterval = setInterval(() => {
        //     // if (i > apiData.radar.past.length - 1) {
        //     //     clearInterval(interval);
        //     //     return;
        //     // } else {
        //     lastIndex = currentIndex;
        //     currentIndex = (currentIndex + 1) % dataLength;
        //     refreshMap();
        //     // }
        // }, options.animationSpeed);
    }
    function showNextFrame() {
        // stopAnimation();
        // lastIndex = currentIndex;
        // currentIndex = (currentIndex + 1) % dataLength;
        // refreshMap();
    }
    function showPreviousFrame() {
        // weatherLayer.getCurrentFrames();
        // stopAnimation();
        // lastIndex = currentIndex;
        // currentIndex = (currentIndex - 1 + dataLength) % dataLength;
        // refreshMap();
    }
    function setIndex(value) {
        try {
            // console.log('setIndex', typeof value, value);
            if (isLibreWXR) {
                libreWXRLayer?.showFrame(value);
            } else {
                weatherLayer.setAnimationTime(value / 1000);
            }
            refreshTime();
            // stopAnimation();
            // lastIndex = currentIndex;
            // currentIndex = value % dataLength;
            // refreshMap();
        } catch (error) {
            console.error(error);
        }
    }
    onDestroy(() => {
        clearInterval(animationTimer);
        map?.remove();
    });

    function getFormattedDate(value) {
        return new Date(value).toLocaleTimeString();
    }

    const handleFormatter = (value) => (isLibreWXR ? getFormattedDate((libreWXRLayer?.frames[value]?.time ?? 0) * 1000) : getFormattedDate(value));
    //@ts-ignore
    window.getZoom = function () {
        return map.getZoom();
    };
    //@ts-ignore
    window.getParameters = function () {
        return {
            animated: isPlaying,
            zoom: map.getZoom(),
            mapCenter: map.getCenter()
        };
    };

    //@ts-ignore
    window.updateOption = function (key, value) {
        options[key] = value;
        options = options;
        switch (key) {
            case 'animationSpeed':
                if (isPlaying) {
                    pauseAnimation();
                    playAnimation();
                }
                // if (!!animationInterval) {
                //     stopAnimation();
                //     startStopAnimation();
                // }
                break;
            case 'layerOpacity':
                if (isLibreWXR) {
                    libreWXRLayer?.setOpacity(options.layerOpacity);
                } else {
                    weatherLayer.setOpacity(options.layerOpacity);
                }
                // refreshMap();
                break;
            case 'colors':
                refreshWeatherLayer();
                // refreshMap();
                break;
            default:
                break;
        }
    };
</script>

<!-- <svelte:window on:resize={resizeMap} /> -->

<div style="height:100%;width:100%;display:flex;justify-content:center  ">
    <div style="height:100%;width:100%;" class="map" use:mapAction />

    {#if !options.useToPickLocation && options.modern}
        <!-- modern: round play button, the time and its day, then a thin slider filled up to the handle -->
        <div class="popup modernPlayback">
            <div class="modernPlaybackRow">
                <span class="playWrap" on:click={startStopAnimation}><button id={isPlaying ? 'pauseBtn' : 'playBtn'} class="button" /></span>
                <div class="modernPlaybackText">
                    <div id="timestamp" class="label modernTime"></div>
                    <div id="timestampSub" class="modernTimeSub"></div>
                </div>
            </div>
            <RangeSlider
                float
                {handleFormatter}
                max={sliderMax}
                min={sliderMin}
                range="min"
                step={isLibreWXR ? 1 : options.timeInterval * 60 * 1000}
                values={[sliderValue]}
                on:start={pauseAnimation}
                on:change={(e) => setIndex(e.detail.value)} />
        </div>
    {:else if !options.useToPickLocation}
        <div style="position: absolute; bottom:5px; width: 90%; height: 60px;  align-content: center;flex-direction: row;display: flex;" class="popup">
            <div style="display: flex;flex-direction: column;flex-grow:1;">
                <div style="display: flex;flex-direction: row;flex-grow:1;">
                    <div style="text-align:left; height: 30px;flex-direction: row;flex-grow: 1;">
                        <!-- <button id="prevBtn" style="width:30px;height:30px;" class="button" on:click={showPreviousFrame} /> -->
                        <button id={isPlaying ? 'pauseBtn' : 'playBtn'} style="width:30px;height:30px;" class="button" on:click={startStopAnimation} />
                        <!-- <button id="nextBtn" style="width:30px;height:30px;" class="button" on:click={showNextFrame} /> -->
                    </div>
                    <div id="timestamp" style="text-align:center; font-weight:bold;padding:4px" class="label"></div>
                </div>

                <div style="padding: 0px 0px;">
                    <RangeSlider
                        float
                        {handleFormatter}
                        max={sliderMax}
                        min={sliderMin}
                        pips
                        step={isLibreWXR ? 1 : options.timeInterval * 60 * 1000}
                        values={[sliderValue]}
                        on:start={pauseAnimation}
                        on:change={(e) => setIndex(e.detail.value)} />
                </div>
            </div>
        </div>
    {/if}
</div>
