import { minutelySummary } from './TopWeather';

export interface RadarFrame {
    time: number;
    path: string;
}

export interface RadarPointTileOptions {
    size: number;
    zoom: number;
    lat: number;
    lon: number;
    color: number;
    smooth: boolean;
    snow: boolean;
}

export interface MapTilePlacement {
    url: string;
    // position and size as fractions of the radar window
    left: number;
    top: number;
    size: number;
}

// card height as a fraction of its width
export const RADAR_SIZE_RATIOS: Record<string, number> = { small: 1 / 3, medium: 1 / 2, large: 3 / 4 };

const MAP_TILE_SIZE = 256;
const MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAX_MERCATOR_LATITUDE = 85.0511;

// the decimal point in lat/lon tells the server it is not a tile index
export function radarPointTileUrl(host: string, frame: RadarFrame, { color, lat, lon, size, smooth, snow, zoom }: RadarPointTileOptions): string {
    return `${host}${frame.path}/${size}/${zoom}/${lat.toFixed(5)}/${lon.toFixed(5)}/${color}/${smooth ? 1 : 0}_${snow ? 1 : 0}.webp`;
}

// minutes from the reference time, 0 within 2.5 min
export function radarFrameOffset(frameTime: number, referenceTime: number): number {
    const seconds = frameTime - referenceTime;
    return Math.abs(seconds) <= 150 ? 0 : Math.round(seconds / 60);
}

// OSM tiles under a radar window of `size` px centered on lat/lon, same pixel scale as the radar
export function mapTilePlacements(lat: number, lon: number, zoom: number, size: number): MapTilePlacement[] {
    const tileCount = 2 ** zoom;
    const worldSize = MAP_TILE_SIZE * tileCount;
    const clampedLat = Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, lat));
    const sinLat = Math.sin((clampedLat * Math.PI) / 180);
    const centerX = ((lon + 180) / 360) * worldSize;
    const centerY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize;
    const originX = centerX - size / 2;
    const originY = centerY - size / 2;

    const placements: MapTilePlacement[] = [];
    for (let tileY = Math.floor(originY / MAP_TILE_SIZE); tileY <= Math.floor((originY + size - 1) / MAP_TILE_SIZE); tileY++) {
        if (tileY < 0 || tileY >= tileCount) {
            continue;
        }
        for (let tileX = Math.floor(originX / MAP_TILE_SIZE); tileX <= Math.floor((originX + size - 1) / MAP_TILE_SIZE); tileX++) {
            const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
            placements.push({
                url: MAP_TILE_URL.replace('{z}', zoom + '')
                    .replace('{x}', wrappedX + '')
                    .replace('{y}', tileY + ''),
                left: (tileX * MAP_TILE_SIZE - originX) / size,
                top: (tileY * MAP_TILE_SIZE - originY) / size,
                size: MAP_TILE_SIZE / size
            });
        }
    }
    return placements;
}

export interface RadarLoopFrames {
    frames: RadarFrame[];
    currentIndex: number;
}

// the latest past frame is the current one: keep the minutes of past and nowcast frames around it
export function radarLoopFrames(past: RadarFrame[], nowcast: RadarFrame[], pastMinutes: number, futureMinutes: number): RadarLoopFrames {
    if (!past.length) {
        return { frames: [], currentIndex: -1 };
    }
    const currentTime = past[past.length - 1].time;
    const shownPast = past.filter((frame) => frame.time >= currentTime - pastMinutes * 60);
    const shownNowcast = nowcast.filter((frame) => frame.time <= currentTime + futureMinutes * 60);
    return { frames: shownPast.concat(shownNowcast), currentIndex: shownPast.length - 1 };
}

const FORECAST_HORIZON = 2 * 60 * 60 * 1000;

// minutely data when the provider has some, else the hours of the next 2 hours
export function hasUpcomingPrecipitation(minutely: { time: number; intensity: number }[], hourly: { time: number; precipAccumulation?: number }[], now: number): boolean {
    const upcomingMinutely = minutely.filter((entry) => entry.time >= now);
    if (upcomingMinutely.length) {
        return minutelySummary(upcomingMinutely, now).kind !== 'none';
    }
    return hourly.some((hour) => hour.time + 60 * 60 * 1000 > now && hour.time <= now + FORECAST_HORIZON && (hour.precipAccumulation ?? 0) > 0);
}
