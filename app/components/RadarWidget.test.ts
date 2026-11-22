import { describe, expect, it } from 'vitest';
import { hasUpcomingPrecipitation, mapTilePlacements, radarFrameOffset, radarLoopFrames, radarPointTileUrl } from './RadarWidget';

const HOST = 'https://api.librewxr.net';

describe('radarPointTileUrl', () => {
    const frame = { time: 1700000400, path: '/v2/radar/1700000400' };
    const options = { size: 256, zoom: 7, lat: 45.18453, lon: 5.75, color: 7, smooth: true, snow: false };
    it('builds a point tile centered on the location', () => {
        expect(radarPointTileUrl(HOST, frame, options)).toBe(`${HOST}/v2/radar/1700000400/256/7/45.18453/5.75000/7/1_0.webp`);
    });
    it('keeps the decimal point so the server reads lat/lon and not a tile index', () => {
        expect(radarPointTileUrl(HOST, frame, { ...options, lat: 45, lon: -5 })).toContain('/7/45.00000/-5.00000/');
    });
    it('sets the smooth and snow flags', () => {
        expect(radarPointTileUrl(HOST, frame, { ...options, smooth: false, snow: true })).toMatch(/\/0_1\.webp$/);
    });
});

describe('radarFrameOffset', () => {
    const now = 1700000000;
    it('is 0 for the current frame', () => {
        expect(radarFrameOffset(now, now)).toBe(0);
        expect(radarFrameOffset(now + 100, now)).toBe(0);
        expect(radarFrameOffset(now - 100, now)).toBe(0);
    });
    it('counts minutes of the past and the nowcast', () => {
        expect(radarFrameOffset(now - 25 * 60, now)).toBe(-25);
        expect(radarFrameOffset(now + 7 * 60, now)).toBe(7);
    });
});

describe('mapTilePlacements', () => {
    it('covers the window with the 4 tiles around the center', () => {
        const placements = mapTilePlacements(0, 0, 1, 256);
        expect(placements.map((tile) => tile.url)).toEqual([
            'https://tile.openstreetmap.org/1/0/0.png',
            'https://tile.openstreetmap.org/1/1/0.png',
            'https://tile.openstreetmap.org/1/0/1.png',
            'https://tile.openstreetmap.org/1/1/1.png'
        ]);
        expect(placements.map((tile) => [tile.left, tile.top, tile.size])).toEqual([
            [-0.5, -0.5, 1],
            [0.5, -0.5, 1],
            [-0.5, 0.5, 1],
            [0.5, 0.5, 1]
        ]);
    });
    it('scales the placements to a bigger window', () => {
        const placements = mapTilePlacements(0, 0, 2, 512);
        expect(placements).toHaveLength(4);
        expect(placements[0]).toMatchObject({ url: 'https://tile.openstreetmap.org/2/1/1.png', left: 0, top: 0, size: 0.5 });
    });
    it('wraps tiles across the antimeridian', () => {
        const urls = mapTilePlacements(0, 179.99, 1, 256).map((tile) => tile.url);
        expect(urls).toContain('https://tile.openstreetmap.org/1/0/0.png');
        expect(urls).toContain('https://tile.openstreetmap.org/1/1/0.png');
    });
    it('skips tiles beyond the poles', () => {
        const placements = mapTilePlacements(85, 0, 1, 256);
        expect(placements).toHaveLength(2);
    });
});

describe('radarLoopFrames', () => {
    const frameAt = (time: number) => ({ time, path: `/v2/radar/${time}` });
    const past = Array.from({ length: 12 }, (_, index) => frameAt(index * 600));
    const nowcast = Array.from({ length: 6 }, (_, index) => frameAt((12 + index) * 600));
    const times = (frames: { time: number }[]) => frames.map((frame) => frame.time / 600);
    it('keeps the window around the latest past frame, which is the current one', () => {
        const { currentIndex, frames } = radarLoopFrames(past, nowcast, 60, 60);
        expect(times(frames)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
        expect(currentIndex).toBe(6);
    });
    it('can show only the forecast', () => {
        const { currentIndex, frames } = radarLoopFrames(past, nowcast, 0, 30);
        expect(times(frames)).toEqual([11, 12, 13, 14]);
        expect(currentIndex).toBe(0);
    });
    it('can show only the past', () => {
        const { currentIndex, frames } = radarLoopFrames(past, nowcast, 20, 0);
        expect(times(frames)).toEqual([9, 10, 11]);
        expect(currentIndex).toBe(2);
    });
    it('keeps all the past frames when there are fewer', () => {
        const { currentIndex, frames } = radarLoopFrames(past.slice(-2), [], 60, 60);
        expect(frames).toHaveLength(2);
        expect(currentIndex).toBe(1);
    });
    it('handles an empty catalog', () => {
        expect(radarLoopFrames([], [], 60, 60)).toEqual({ frames: [], currentIndex: -1 });
    });
});

describe('hasUpcomingPrecipitation', () => {
    const now = 1_000_000_000_000;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    it('follows the minutely data when there is some', () => {
        expect(hasUpcomingPrecipitation([{ time: now + 10 * minute, intensity: 1 }], [], now)).toBe(true);
        expect(hasUpcomingPrecipitation([{ time: now + 10 * minute, intensity: 0 }], [{ time: now, precipAccumulation: 5 }], now)).toBe(false);
    });
    it('ignores past minutely entries', () => {
        expect(hasUpcomingPrecipitation([{ time: now - 10 * minute, intensity: 3 }], [], now)).toBe(false);
    });
    it('falls back to the hours of the next 2 hours', () => {
        expect(hasUpcomingPrecipitation([], [{ time: now - 30 * minute, precipAccumulation: 0.2 }], now)).toBe(true);
        expect(hasUpcomingPrecipitation([], [{ time: now + 1 * hour, precipAccumulation: 0.2 }], now)).toBe(true);
        expect(hasUpcomingPrecipitation([], [{ time: now + 3 * hour, precipAccumulation: 4 }], now)).toBe(false);
        expect(hasUpcomingPrecipitation([], [{ time: now, precipAccumulation: 0 }, { time: now + hour }], now)).toBe(false);
    });
    it('is false without data', () => {
        expect(hasUpcomingPrecipitation([], [], now)).toBe(false);
    });
});
