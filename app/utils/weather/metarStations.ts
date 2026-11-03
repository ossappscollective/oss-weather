export interface MetarStation {
    icao: string;
    name: string;
    country?: string;
    coord: { lat: number; lon: number };
}

export interface StationInfo {
    icaoId?: string;
    site?: string;
    country?: string;
    lat?: number;
    lon?: number;
    siteType?: string[];
}

export function isStationCode(query: string) {
    return /^[a-z0-9]{4}$/i.test(query.trim());
}

export function bboxAround(coord: { lat: number; lon: number }, delta = 0.05) {
    const round = (value: number) => Number(value.toFixed(4));
    return [coord.lat - delta, coord.lon - delta, coord.lat + delta, coord.lon + delta].map(round).join(',');
}

export function stationFromInfo(info: StationInfo): MetarStation | undefined {
    if (!info.icaoId || info.lat === undefined || info.lon === undefined || !info.siteType?.includes('METAR')) {
        return undefined;
    }
    return { icao: info.icaoId, name: info.site || info.icaoId, country: info.country, coord: { lat: info.lat, lon: info.lon } };
}

export function sortByDistance(stations: MetarStation[], coord: { lat: number; lon: number }) {
    // equirectangular approximation, enough to rank stations a few km apart
    const squaredDistance = (station: MetarStation) => {
        const deltaLat = station.coord.lat - coord.lat;
        const deltaLon = (station.coord.lon - coord.lon) * Math.cos((coord.lat * Math.PI) / 180);
        return deltaLat * deltaLat + deltaLon * deltaLon;
    };
    return [...stations].sort((first, second) => squaredDistance(first) - squaredDistance(second));
}
