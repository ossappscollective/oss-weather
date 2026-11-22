import type { MapMLGL } from '@maptiler/sdk';
import { type Frame, type FrameSelectionOptions, type SelectedFrame, radarLayerPlacement, radarTileUrl, satelliteFrameAt, satelliteTileUrl, selectFrames } from './librewxr';

type MapLibreMap = InstanceType<typeof MapMLGL>;

export const LIBREWXR_MODES = ['radar', 'satellite', 'radar_satellite'] as const;
export type LibreWXRMode = (typeof LIBREWXR_MODES)[number];

export interface LibreWXROptions extends FrameSelectionOptions {
    url: string;
    mode: LibreWXRMode;
    color: number;
    snow: boolean;
    opacity: number;
}

interface WeatherMapsData {
    host?: string;
    radar: { past: Frame[]; nowcast?: Frame[] };
    satellite?: { infrared?: Frame[] };
}

// layers stay at a tiny opacity instead of 0 so maplibre still preloads their tiles
const HIDDEN_OPACITY = 0.001;
const SERVER_MAX_ZOOM = 12;

export class LibreWXRLayer {
    frames: SelectedFrame[] = [];
    currentIndex = -1;
    private satelliteFrames: Frame[] = [];
    private visibleLayerIds: string[] = [];
    private labelsLayerId: string | undefined;

    constructor(
        private map: MapLibreMap,
        private options: LibreWXROptions
    ) {}

    async load() {
        const response = await fetch(`${this.options.url}/public/weather-maps.json`);
        if (!response.ok) {
            throw new Error(`LibreWXR ${response.status} ${response.statusText}`);
        }
        const data: WeatherMapsData = await response.json();
        const host = data.host || this.options.url;
        const infrared = data.satellite?.infrared ?? [];

        const selection = this.options.mode === 'satellite' ? selectFrames(infrared, [], this.options) : selectFrames(data.radar.past, data.radar.nowcast ?? [], this.options);
        this.frames = selection.frames;
        this.currentIndex = selection.currentIndex;

        const current = this.frames[this.currentIndex];
        if (!current) {
            return;
        }
        const placement = radarLayerPlacement(this.map.getStyle().layers);
        this.labelsLayerId = placement.beforeId;
        // shown frames first so their tiles are not queued behind every preloaded frame
        const addFrameLayer = (frame: Frame) =>
            this.addRasterLayer(
                this.layerId(frame),
                this.options.mode === 'satellite' ? satelliteTileUrl(host, frame) : radarTileUrl(host, frame, { color: this.options.color, snow: this.options.snow })
            );
        addFrameLayer(current);
        if (this.options.mode === 'radar_satellite') {
            this.satelliteFrames = infrared;
            new Set([satelliteFrameAt(infrared, current.time)].concat(this.frames.map((frame) => satelliteFrameAt(infrared, frame.time)))).forEach((frame) => {
                if (frame) {
                    // below radar
                    this.addRasterLayer(this.satelliteLayerId(frame), satelliteTileUrl(host, frame), this.layerId(current));
                }
            });
        }
        this.frames.filter((frame) => frame !== current).forEach(addFrameLayer);
        placement.overlayIds.forEach((id) => this.map.moveLayer(id, placement.beforeId));
        this.showFrame(this.currentIndex);
    }

    showFrame(index: number) {
        const frame = this.frames[index];
        if (!frame) {
            return;
        }
        this.currentIndex = index;
        const layerIds = [this.layerId(frame)];
        const satelliteFrame = satelliteFrameAt(this.satelliteFrames, frame.time);
        if (satelliteFrame) {
            layerIds.push(this.satelliteLayerId(satelliteFrame));
        }
        this.visibleLayerIds.filter((id) => !layerIds.includes(id)).forEach((id) => this.setLayerOpacity(id, HIDDEN_OPACITY));
        layerIds.forEach((id) => this.setLayerOpacity(id, this.options.opacity));
        this.visibleLayerIds = layerIds;
    }

    setOpacity(opacity: number) {
        this.options.opacity = opacity;
        this.visibleLayerIds.forEach((id) => this.setLayerOpacity(id, opacity));
    }

    private layerId(frame: Frame) {
        return `librewxr_${frame.path}`;
    }

    private satelliteLayerId(frame: Frame) {
        return `librewxr_satellite_${frame.path}`;
    }

    private setLayerOpacity(id: string, opacity: number) {
        this.map.setPaintProperty(id, 'raster-opacity', opacity, { validate: false });
    }

    private addRasterLayer(id: string, url: string, beforeId = this.labelsLayerId) {
        this.map.addLayer(
            {
                id,
                type: 'raster',
                source: {
                    type: 'raster',
                    tiles: [url],
                    tileSize: 256,
                    maxzoom: SERVER_MAX_ZOOM
                },
                paint: {
                    'raster-opacity': HIDDEN_OPACITY,
                    'raster-opacity-transition': { duration: 0, delay: 0 },
                    'raster-fade-duration': 0
                }
            },
            beforeId
        );
    }
}
