import { ApplicationSettings } from '@nativescript/core';
import dayjs from 'dayjs';
import { WeatherLocation, request } from '../api';
import { Tide, WeatherData } from './weather';
import { DailyData, Hourly } from './weather';

const BASE_URL = 'https://ws.meteoconsult.fr/meteoconsultmarine';
const SEARCH_URL = `${BASE_URL}/android/100/fr/v30/recherche.php`;
const FORECAST_URL = `${BASE_URL}/androidtab/115/fr/v30/previsionsSpot.php`;

/** Maximum distance (km) to consider a marine station relevant for a location */
const MAX_DISTANCE_KM = 50;

/** Cache TTL for marine location search: ~1 year in ms */
const MARINE_LOCATION_CACHE_TTL = 365 * 24 * 60 * 60 * 1000;

/** Cache TTL for marine weather data: 1 hour in ms */
const MARINE_WEATHER_CACHE_TTL = 60 * 60 * 1000;

interface MeteoConsultMarineLocation {
    id: string | number;
    nom: string;
    lat: number;
    lon: number;
    presence_houle: boolean;
    presence_maree: boolean;
    presence_coef_maree: boolean;
}

interface MeteoConsultSimplePrevis {
    date: string;
    teau?: number | null;
    hauteurvague?: number | null;
    hauteurvaguemax?: number | null;
    hauteurhoule?: number | null;
}

interface MeteoConsultDetailPrevis {
    date: string;
    heure: number;
    teau?: number | null;
    hauteurvague?: number | null;
    hauteurvaguemax?: number | null;
    hauteurhoule?: number | null;
}

interface MeteoConsultMaree {
    date: string;
    heure: number;
    hauteur: number;
    type: 'PM' | 'BM'; // PM = Pleine Mer (high), BM = Basse Mer (low)
    coef?: number;
}

interface MeteoConsultForecastResponse {
    marees?: MeteoConsultMaree[];
    previs?: {
        simple?: MeteoConsultSimplePrevis[];
        detail?: MeteoConsultDetailPrevis[];
    };
}

/** Haversine formula: distance between two lat/lon points in km */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cacheKey(prefix: string, lat: number, lon: number) {
    return `${prefix}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
}

/** Returns cached marine location info (or null if expired/absent) */
function getCachedMarineLocation(lat: number, lon: number): MeteoConsultMarineLocation | null | false {
    const key = cacheKey('marine_location', lat, lon);
    const raw = ApplicationSettings.getString(key);
    if (!raw) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.cachedAt > MARINE_LOCATION_CACHE_TTL) {
            ApplicationSettings.remove(key);
            return undefined;
        }
        return parsed.data; // null means "no relevant marine location"
    } catch {
        return undefined;
    }
}

function setCachedMarineLocation(lat: number, lon: number, data: MeteoConsultMarineLocation | null) {
    const key = cacheKey('marine_location', lat, lon);
    ApplicationSettings.setString(key, JSON.stringify({ cachedAt: Date.now(), data }));
}

/** Fetch and validate a marine location for the given coordinates.
 *  Returns the marine location if eligible, null if no relevant location, or throws on error. */
export async function searchMarineLocation(lat: number, lon: number): Promise<MeteoConsultMarineLocation | null> {
    const cached = getCachedMarineLocation(lat, lon);
    if (cached !== undefined) {
        return cached;
    }

    let locations: MeteoConsultMarineLocation[];
    try {
        const result = await request<MeteoConsultMarineLocation[]>({
            url: SEARCH_URL,
            method: 'GET',
            queryParams: { lat, lon, type: 48 }
        });
        locations = result.content;
    } catch (error) {
        DEV_LOG && console.error('meteoconsult searchMarineLocation error', error);
        return null;
    }

    if (!locations || locations.length === 0) {
        setCachedMarineLocation(lat, lon, null);
        return null;
    }

    const first = locations[0];
    const dist = distanceKm(lat, lon, first.lat, first.lon);
    DEV_LOG && console.log('meteoconsult marine location distance', dist, 'km', first.nom);

    if (dist > MAX_DISTANCE_KM) {
        setCachedMarineLocation(lat, lon, null);
        return null;
    }

    if (!first.presence_houle && !first.presence_maree && !first.presence_coef_maree) {
        setCachedMarineLocation(lat, lon, null);
        return null;
    }

    setCachedMarineLocation(lat, lon, first);
    return first;
}

/** Parse ISO-like date string "YYYY-MM-DD" and hour number into a UTC timestamp (ms) */
function parseDateTime(dateStr: string, hour: number = 0): number {
    return dayjs(dateStr).hour(hour).minute(0).second(0).millisecond(0).valueOf();
}

/** Fetch and parse marine weather for the given coordinates.
 *  Merges tides into weatherData.tides and marine props into daily/hourly arrays. */
export async function getMarineWeather(weatherData: WeatherData, lat: number, lon: number): Promise<void> {
    let response: MeteoConsultForecastResponse;
    try {
        const result = await request<MeteoConsultForecastResponse>({
            url: FORECAST_URL,
            method: 'GET',
            queryParams: { lat, lon }
        });
        response = result.content;
    } catch (error) {
        DEV_LOG && console.error('meteoconsult getMarineWeather error', error);
        return;
    }

    if (!response) {
        return;
    }

    // Parse tides (marees)
    if (response.marees?.length) {
        weatherData.tides = response.marees.map((m) => ({
            time: parseDateTime(m.date, m.heure),
            height: m.hauteur,
            type: m.type === 'PM' ? 'high' : 'low',
            coef: m.coef ?? undefined
        } as Tide));
    }

    const simple = response.previs?.simple ?? [];
    const detail = response.previs?.detail ?? [];

    // Build a lookup of hourly detail data by timestamp
    const hourlyByTime: Record<number, MeteoConsultDetailPrevis> = {};
    for (const h of detail) {
        hourlyByTime[parseDateTime(h.date, h.heure)] = h;
    }

    // Helper to compute average of non-null hourly values for a daily period
    function avgFromHourly(field: keyof MeteoConsultDetailPrevis, startTs: number, endTs: number): number | null {
        let total = 0;
        let count = 0;
        for (const [tsStr, h] of Object.entries(hourlyByTime)) {
            const ts = Number(tsStr);
            if (ts >= startTs && ts < endTs) {
                const v = h[field] as number | null;
                if (v != null) {
                    total += v;
                    count++;
                }
            }
        }
        return count > 0 ? total / count : null;
    }

    // Merge into daily data
    if (weatherData.daily?.data?.length && simple.length) {
        const simpleByDate: Record<string, MeteoConsultSimplePrevis> = {};
        for (const s of simple) {
            simpleByDate[s.date] = s;
        }

        for (const day of weatherData.daily.data as DailyData[]) {
            const dateStr = dayjs(day.time).format('YYYY-MM-DD');
            const s = simpleByDate[dateStr];
            if (!s) {
                continue;
            }
            const startTs = day.time;
            const endTs = startTs + 24 * 60 * 60 * 1000;

            const seaTemperature = s.teau ?? avgFromHourly('teau', startTs, endTs);
            const waveHeight = s.hauteurvague ?? avgFromHourly('hauteurvague', startTs, endTs);
            const waveHeightMax = s.hauteurvaguemax ?? avgFromHourly('hauteurvaguemax', startTs, endTs);
            const swellHeight = s.hauteurhoule ?? avgFromHourly('hauteurhoule', startTs, endTs);

            if (seaTemperature != null) (day as any).seaTemperature = seaTemperature;
            if (waveHeight != null) (day as any).waveHeight = waveHeight;
            if (waveHeightMax != null) (day as any).waveHeightMax = waveHeightMax;
            if (swellHeight != null) (day as any).swellHeight = swellHeight;
        }
    }

    // Merge into hourly data
    if (weatherData.hourly?.length && detail.length) {
        for (const hour of weatherData.hourly as Hourly[]) {
            const h = hourlyByTime[hour.time];
            if (!h) {
                continue;
            }
            if (h.teau != null) (hour as any).seaTemperature = h.teau;
            if (h.hauteurvague != null) (hour as any).waveHeight = h.hauteurvague;
            if (h.hauteurvaguemax != null) (hour as any).waveHeightMax = h.hauteurvaguemax;
            if (h.hauteurhoule != null) (hour as any).swellHeight = h.hauteurhoule;
        }
    }
}
