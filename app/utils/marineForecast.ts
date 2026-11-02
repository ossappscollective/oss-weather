import { startOfDay } from './dayBounds';

interface SeaHour {
    teau?: number | null;
    hauteurvague?: number | null;
    hauteurvaguemax?: number | null;
    hauteurhoule?: number | null;
}

// the service answers any point, but inland ones come back without tides or sea data
export function hasMarineData(response: { marees?: unknown[]; previs?: { detail?: SeaHour[] } } | undefined): boolean {
    return (
        !!response?.marees?.length ||
        !!response?.previs?.detail?.some((hour) => hour.teau != null || hour.hauteurvague != null || hour.hauteurvaguemax != null || hour.hauteurhoule != null)
    );
}

export interface MarineSearchLocation {
    lat: number;
    lon: number;
    presence_houle: boolean;
    presence_maree: boolean;
    presence_coef_maree: boolean;
}

// Haversine formula: distance between two lat/lon points in km
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const earthRadiusKm = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pickMarineLocation<T extends MarineSearchLocation>(locations: T[] | undefined, coord: { lat: number; lon: number }, maxDistanceKm: number): T | null {
    const first = locations?.[0];
    if (!first || distanceKm(coord.lat, coord.lon, first.lat, first.lon) > maxDistanceKm) {
        return null;
    }
    return first.presence_houle || first.presence_maree || first.presence_coef_maree ? first : null;
}

const DAY = 24 * 60 * 60 * 1000;
const FOUND_TTL = 365 * DAY;
// the search can be down or come back: do not remember an empty result for long
const EMPTY_TTL = DAY;

export function isMarineSearchCacheValid(entry: { cachedAt: number; data: unknown }, now: number): boolean {
    return now - entry.cachedAt <= (entry.data ? FOUND_TTL : EMPTY_TTL);
}

// The service dates a day at midnight in UTC for a point without station, in the station offset otherwise:
// only the calendar date counts, the app days start at the local midnight of the location
export function localDayStart(datetime: string, timezoneOffset?: number): number {
    const noonUtc = Date.parse(`${datetime.slice(0, 10)}T12:00:00Z`);
    return startOfDay(noonUtc, timezoneOffset).valueOf();
}
