import { Photon } from '../../typings/photon';
import { MetarReport } from '~/utils/metar';
import { MetarStation, StationInfo, bboxAround, isStationCode, sortByDistance, stationFromInfo } from '~/utils/metarStations';
import { request } from './api';

const AVIATION_WEATHER_URL = 'https://aviationweather.gov/api/data';
const PHOTON_AERODROME_LIMIT = 8;
// a missed hourly report must not make the latest one unusable: look back further than the max age
const LATEST_METAR_HOURS = 3;
// the forecast waits for it, so it fails fast
const LATEST_METAR_TIMEOUT = 3000;

async function fetchStations(queryParams: { ids?: string; bbox?: string }) {
    const result = await request<StationInfo[]>({
        url: `${AVIATION_WEATHER_URL}/stationinfo`,
        method: 'GET',
        timeout: 15000,
        queryParams: { format: 'json', ...queryParams }
    });
    // the API answers with an empty body when nothing matches
    return Array.isArray(result.content) ? result.content.map(stationFromInfo).filter((station) => !!station) : [];
}

async function searchAerodromeNames(query: string) {
    const result = await request<Photon>({
        url: 'https://photon.komoot.io/api',
        method: 'GET',
        timeout: 15000,
        queryParams: { q: query, limit: PHOTON_AERODROME_LIMIT, osm_tag: 'aeroway:aerodrome' }
    });
    const nearestStations = await Promise.all(
        result.content.features.map(async (feature) => {
            const coord = { lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] };
            return sortByDistance(await fetchStations({ bbox: bboxAround(coord) }), coord)[0];
        })
    );
    // an aerodrome can be listed twice, the order of the results is kept
    const stations = new Map<string, MetarStation>();
    for (const station of nearestStations) {
        if (station) {
            stations.set(station.icao, station);
        }
    }
    return [...stations.values()];
}

/** an ICAO code is looked up directly, anything else (or an unknown code) goes through an aerodrome name search */
export async function searchStations(query: string) {
    const trimmed = query.trim();
    if (isStationCode(trimmed)) {
        const stations = await fetchStations({ ids: trimmed.toUpperCase() });
        if (stations.length) {
            return stations;
        }
    }
    return trimmed.length ? searchAerodromeNames(trimmed) : [];
}

export async function fetchMetarReports(icao: string, hours = LATEST_METAR_HOURS, timeout = 5000) {
    const result = await request<MetarReport[]>({
        url: `${AVIATION_WEATHER_URL}/metar`,
        method: 'GET',
        timeout,
        queryParams: { ids: icao, format: 'json', hours }
    });
    return Array.isArray(result.content) ? result.content : [];
}

export async function fetchLatestMetar(icao: string) {
    const reports = await fetchMetarReports(icao, LATEST_METAR_HOURS, LATEST_METAR_TIMEOUT);
    return reports.reduce<MetarReport | null>((latest, report) => (!latest || report.obsTime > latest.obsTime ? report : latest), null);
}
