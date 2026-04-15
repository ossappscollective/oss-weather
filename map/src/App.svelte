<script lang="ts">
    import { ColorRamp, RadarLayer, type WeatherPayload } from '@maptiler/weather';
    import { type LngLatLike, Map, MapStyle, Marker, type StyleSpecification, config } from '@maptiler/sdk';


    import './global.css';
    import './rainviewer.css';
    import { onDestroy } from 'svelte';
    // import RainViewerLegend from './RainViewerLegend.svelte';
    import RangeSlider from 'svelte-range-slider-pips';
    let weatherLayer: RadarLayer;
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
            acc[sParameterName[0]] = sParameterName.slice(1).join('=');
            return acc;
        }, {});
    }
    const urlParamers = GetURLParameters();
    let map: Map;

    let options = {
        apiKey: urlParamers['apiKey'],
        source: urlParamers['source'],
        position: urlParamers['position']?.split(',').map(parseFloat).reverse() as LngLatLike,
        mapCenter: (urlParamers['mapCenter'] || '45.18453,5.75').split(',').map(parseFloat).reverse() as LngLatLike,
        zoom: parseFloat(urlParamers['zoom'] || '8'),
        useToPickLocation: parseFloat(urlParamers['useToPickLocation'] || '0') === 1,
        layerOpacity: parseFloat(urlParamers['opacity'] || '0.8'),
        animationSpeed: parseFloat(urlParamers['animationSpeed'] || '1'),
        animated: (urlParamers['animated'] || 'false') === 'true',
        hideAttribution: (urlParamers['hideAttribution'] || 'false') === 'true',
        dark: urlParamers['dark'] || 'light',
        language: urlParamers['lang'] || 'en',
        colors: urlParamers['colors'] || 'RADAR',
        timeInterval: parseFloat(urlParamers['timeInterval'] || 30),
        tileSize: parseFloat(urlParamers['tileSize'] || '256') // can be 256 or 512.
    };

    // Make sure you set your MapTiler Cloud API key:
    config.apiKey = options.apiKey;
    // console.log(`options ${JSON.stringify(options)}`);

    const catalog = {};
    const data: any[] = [];
    const dataLength: number = 0;
    document.documentElement.style.setProperty('--bottom-padding', options.useToPickLocation ? '0px' : '100px');

    document.documentElement.setAttribute('data-dark', options.dark === 'black' ? 'dark' : options.dark);
    if (options.dark === 'dark' || options.dark === 'black') {
        document.documentElement.style.setProperty('--background-color', options.dark === 'black' ? '#000' : '#333');
        document.documentElement.style.setProperty('--button-color', 'white');
    }

    function createMap(container) {
        return new Promise<Map>(async (resolve, reject) => {
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
            map = new Map({
                fadeDuration: 0,
                validateStyle: false,
                attributionControl: options.hideAttribution
                    ? null
                    : {
                          compact: true,
                          customAttribution: ['<a href="https://maplibre.org/">MapLibre</a>', '<a href="https://www.openstreetmap.org">OpenStreetMap</a>'].concat(
                              options.useToPickLocation ? [] : ['<a href="https://www.rainviewer.com/api.html">RainViewer</a>']
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

    class colorRampLegendControl {
        private _options: any;
        private _container: HTMLDivElement;
        private _map: any;
        constructor(options) {
            this._options = { ...options };
            this._container = document.createElement('div');
            this._container.classList.add('maplibregl-ctrl');
            this._container.classList.add('maplibregl-ctrl-color-ramp');
        }
        onAdd(map) {
            this._map = map;
            const canvas = colorramp.getCanvasStrip({ horizontal: false, smooth: true });
            canvas.style.height = '200px';
            canvas.style.width = '30px';
            canvas.style.border = '1px dashed #00000059';

            const bounds = colorramp.getBounds();

            const desc = document.createElement('div');
            desc.classList.add('color-ramp-label');
            // desc.innerHTML = `(min: ${bounds.min}, max: ${bounds.max})`;

            // this._container.appendChild(desc);
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

    let legendControl: colorRampLegendControl;
    function refreshWeatherLayer() {
        if (legendControl) {
            map.removeControl(legendControl);
        }
        if (weatherLayer) {
            map.removeLayer(weatherLayer.id);
        }
        colorramp = ColorRamp.builtin[options.colors];
        weatherLayer = new RadarLayer({
            opacity: options.layerOpacity,
            colorramp: ColorRamp.builtin[options.colors]
        });
        // console.log('creating radar layer');
        weatherLayer.on('sourceReady', (event) => {
            // console.log('sourceReady');

            const startDate = weatherLayer.getAnimationStartDate();
            const endDate = weatherLayer.getAnimationEndDate();

            const currentDate = weatherLayer.getAnimationTimeDate();
            sliderMin = +startDate;
            sliderMax = +endDate;
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
        // console.log('added radar layer');
        legendControl = new colorRampLegendControl({ colorRamp: colorramp });
        map.addControl(legendControl, 'top-right');
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
                } else {
                    refreshWeatherLayer();
                }
            })
            .catch((err) => console.error(err));
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

    // Update the date time display
    function refreshTime() {
        const d = weatherLayer.getAnimationTimeDate();
        // console.log('refreshTime', d);
        document.getElementById('timestamp').innerHTML = d.toLocaleString(options.language, { timeStyle: 'medium', dateStyle: 'short' });
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
        weatherLayer.animate(0);
        //   playPauseButton.innerText = "Play 3600x";
        isPlaying = false;
    }

    function playAnimation() {
        weatherLayer.animate(options.timeInterval * 10 * options.animationSpeed);
        isPlaying = true;
    }
    function startStopAnimation() {
        weatherLayer.setAnimationTime(sliderValue / 1000);
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
            weatherLayer.setAnimationTime(value / 1000);
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
        map?.remove();
    });

    function getFormattedDate(value) {
        return new Date(value).toLocaleTimeString();
    }

    const handleFormatter = (value) => getFormattedDate(value);
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
                weatherLayer.setOpacity(options.layerOpacity);
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

    {#if !options.useToPickLocation}
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
                        step={options.timeInterval * 60 * 1000}
                        values={[sliderValue]}
                        on:start={pauseAnimation}
                        on:change={(e) => setIndex(e.detail.value)} />
                </div>
            </div>
        </div>
    {/if}
</div>
