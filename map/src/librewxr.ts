export interface Frame {
    time: number;
    path: string;
}

export interface SelectedFrame extends Frame {
    nowcast: boolean;
}

export interface FrameSelectionOptions {
    showHistory: boolean;
    // hours, 0 = no limit
    maxTimeSpan: number;
    // minutes
    timeInterval: number;
}

export interface RadarTileOptions {
    color: number;
    snow: boolean;
}

// 256px webp: every frame is preloaded, 512px png costs ~4x (radar) to ~7x (satellite) more data
export function radarTileUrl(host: string, frame: Frame, options: RadarTileOptions) {
    return `${host}${frame.path}/256/{z}/{x}/{y}/${options.color}/1_${options.snow ? 1 : 0}.webp`;
}

export function satelliteTileUrl(host: string, frame: Frame) {
    return `${host}${frame.path}/256/{z}/{x}/{y}/0/0_0.webp`;
}

// the current frame is the latest observed one: it anchors history, interval spacing and span
export function selectFrames(past: Frame[], nowcast: Frame[], options: FrameSelectionOptions): { frames: SelectedFrame[]; currentIndex: number } {
    const all: SelectedFrame[] = past.map((frame) => ({ ...frame, nowcast: false })).concat(nowcast.map((frame) => ({ ...frame, nowcast: true })));
    if (all.length === 0) {
        return { frames: [], currentIndex: -1 };
    }
    const current = all[Math.max(past.length - 1, 0)];
    const interval = options.timeInterval * 60;

    const before: SelectedFrame[] = [];
    if (options.showHistory) {
        let lastTime = current.time;
        for (let index = all.indexOf(current) - 1; index >= 0; index--) {
            if (lastTime - all[index].time >= interval) {
                before.unshift(all[index]);
                lastTime = all[index].time;
            }
        }
    }
    const after: SelectedFrame[] = [];
    let lastTime = current.time;
    for (let index = all.indexOf(current) + 1; index < all.length; index++) {
        if (all[index].time - lastTime >= interval) {
            after.push(all[index]);
            lastTime = all[index].time;
        }
    }

    let frames = before.concat([current], after);
    if (options.maxTimeSpan > 0) {
        const maxTime = frames[0].time + options.maxTimeSpan * 3600;
        frames = frames.filter((frame) => frame.time <= maxTime);
    }
    const currentIndex = frames.indexOf(current);
    return { frames, currentIndex: currentIndex >= 0 ? currentIndex : frames.length - 1 };
}

export interface StyleLayerInfo {
    id: string;
    type?: string;
    'source-layer'?: string;
}

const OVERLAY_SOURCE_LAYERS = ['boundary', 'transportation'];

// radar goes under the first label, borders and roads are moved back above it
export function radarLayerPlacement(layers: StyleLayerInfo[]): { beforeId?: string; overlayIds: string[] } {
    return {
        beforeId: layers.find((layer) => layer.type === 'symbol')?.id,
        overlayIds: layers.filter((layer) => layer.type === 'line' && OVERLAY_SOURCE_LAYERS.includes(layer['source-layer'])).map((layer) => layer.id)
    };
}

export function satelliteFrameAt(frames: Frame[], time: number): Frame | undefined {
    let result = frames[0];
    for (const frame of frames) {
        if (frame.time > time) {
            break;
        }
        result = frame;
    }
    return result;
}
