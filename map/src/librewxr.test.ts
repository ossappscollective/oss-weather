import { describe, expect, it } from 'vitest';
import darkTheme from './dark_theme.json';
import { type Frame, type StyleLayerInfo, radarLayerPlacement, radarTileUrl, satelliteFrameAt, satelliteTileUrl, selectFrames } from './librewxr';
import lightTheme from './light_theme.json';

const HOST = 'https://api.librewxr.net';
const STEP = 600;
const NOW = 1790581200;

function frameAt(time: number): Frame {
    return { time, path: `/v2/radar/${time}` };
}
// 12 past frames ending at NOW, 6 nowcast frames after, 10 min apart
const past = Array.from({ length: 12 }, (_, index) => frameAt(NOW - (11 - index) * STEP));
const nowcast = Array.from({ length: 6 }, (_, index) => frameAt(NOW + (index + 1) * STEP));
const allOptions = { showHistory: true, maxTimeSpan: 0, timeInterval: 10 };

function times(frames: Frame[]) {
    return frames.map((frame) => frame.time);
}

describe('radarTileUrl', () => {
    it('builds a smoothed radar tile template', () => {
        expect(radarTileUrl(HOST, frameAt(NOW), { color: 7, snow: false })).toBe(`${HOST}/v2/radar/${NOW}/256/{z}/{x}/{y}/7/1_0.webp`);
    });
    it('sets the snow flag', () => {
        expect(radarTileUrl(HOST, frameAt(NOW), { color: 10, snow: true })).toBe(`${HOST}/v2/radar/${NOW}/256/{z}/{x}/{y}/10/1_1.webp`);
    });
});

describe('satelliteTileUrl', () => {
    it('uses the fixed 0/0_0 segment', () => {
        const frame = { time: NOW, path: `/v2/satellite/${NOW}` };
        expect(satelliteTileUrl(HOST, frame)).toBe(`${HOST}/v2/satellite/${NOW}/256/{z}/{x}/{y}/0/0_0.webp`);
    });
});

describe('selectFrames', () => {
    it('keeps past and nowcast frames, starting on the latest past one', () => {
        const { currentIndex, frames } = selectFrames(past, nowcast, allOptions);
        expect(times(frames)).toEqual(times(past.concat(nowcast)));
        expect(currentIndex).toBe(11);
        expect(frames[11].nowcast).toBe(false);
        expect(frames[12].nowcast).toBe(true);
    });
    it('drops frames before the current one without history', () => {
        const { currentIndex, frames } = selectFrames(past, nowcast, { ...allOptions, showHistory: false });
        expect(times(frames)).toEqual([NOW].concat(times(nowcast)));
        expect(currentIndex).toBe(0);
    });
    it('caps the span after the first kept frame', () => {
        const { currentIndex, frames } = selectFrames(past, nowcast, { ...allOptions, showHistory: false, maxTimeSpan: 0.5 });
        expect(times(frames)).toEqual([NOW, NOW + STEP, NOW + 2 * STEP, NOW + 3 * STEP]);
        expect(currentIndex).toBe(0);
    });
    it('falls back to the last kept frame when the span excludes the current one', () => {
        const { currentIndex, frames } = selectFrames(past, nowcast, { ...allOptions, maxTimeSpan: 1 });
        expect(frames[frames.length - 1].time).toBe(NOW - 5 * STEP);
        expect(currentIndex).toBe(frames.length - 1);
    });
    it('spaces frames by the time interval, anchored on the current frame', () => {
        const { currentIndex, frames } = selectFrames(past, nowcast, { ...allOptions, timeInterval: 30 });
        expect(times(frames)).toEqual([NOW - 9 * STEP, NOW - 6 * STEP, NOW - 3 * STEP, NOW, NOW + 3 * STEP, NOW + 6 * STEP]);
        expect(currentIndex).toBe(3);
    });
    it('keeps the closest spacing above an interval that is not a multiple of the cadence', () => {
        const { frames } = selectFrames(past, [], { ...allOptions, showHistory: true, timeInterval: 15 });
        expect(times(frames)).toEqual([NOW - 10 * STEP, NOW - 8 * STEP, NOW - 6 * STEP, NOW - 4 * STEP, NOW - 2 * STEP, NOW]);
    });
    it('handles an empty frame list', () => {
        expect(selectFrames([], [], allOptions)).toEqual({ frames: [], currentIndex: -1 });
    });
});

describe('radarLayerPlacement', () => {
    const layers: StyleLayerInfo[] = [
        { id: 'background', type: 'background' },
        { id: 'water', type: 'fill', 'source-layer': 'water' },
        { id: 'waterway', type: 'line', 'source-layer': 'waterway' },
        { id: 'boundary_country', type: 'line', 'source-layer': 'boundary' },
        { id: 'highway_minor', type: 'line', 'source-layer': 'transportation' },
        { id: 'building', type: 'fill', 'source-layer': 'building' },
        { id: 'highway_name', type: 'symbol', 'source-layer': 'transportation_name' },
        { id: 'place_city', type: 'symbol', 'source-layer': 'place' }
    ];
    it('puts the radar under the first label', () => {
        expect(radarLayerPlacement(layers).beforeId).toBe('highway_name');
    });
    it('draws borders and roads back above the radar', () => {
        expect(radarLayerPlacement(layers).overlayIds).toEqual(['boundary_country', 'highway_minor']);
    });
    it('stays on top without labels', () => {
        expect(radarLayerPlacement(layers.slice(0, 6)).beforeId).toBeUndefined();
    });
    it.each([
        ['light', lightTheme.layers],
        ['dark', darkTheme.layers]
    ])('finds a label and overlay layers below it in the %s theme', (_name, themeLayers) => {
        const { beforeId, overlayIds } = radarLayerPlacement(themeLayers);
        const ids = themeLayers.map((layer) => layer.id);
        expect(beforeId).toBeDefined();
        expect(overlayIds.length).toBeGreaterThan(0);
        overlayIds.forEach((id) => expect(ids.indexOf(id)).toBeLessThan(ids.indexOf(beforeId)));
    });
});

describe('satelliteFrameAt', () => {
    const satellite = [frameAt(NOW - 7200), frameAt(NOW - 3600), frameAt(NOW)];
    it('picks the latest frame at or before the time', () => {
        expect(satelliteFrameAt(satellite, NOW - 60)?.time).toBe(NOW - 3600);
        expect(satelliteFrameAt(satellite, NOW)?.time).toBe(NOW);
        expect(satelliteFrameAt(satellite, NOW + 1800)?.time).toBe(NOW);
    });
    it('falls back to the first frame before the series', () => {
        expect(satelliteFrameAt(satellite, NOW - 10000)?.time).toBe(NOW - 7200);
    });
    it('returns undefined without frames', () => {
        expect(satelliteFrameAt([], NOW)).toBeUndefined();
    });
});
