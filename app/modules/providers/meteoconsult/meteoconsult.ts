import { ApplicationSettings } from '@nativescript/core';
import dayjs from 'dayjs';
import { WeatherLocation, request } from '~/services/api';
import { Daily, Tide, WeatherData } from '~/services/providers/weather';
import { DailyData, Hourly } from '~/services/providers/weather';
import { MarineWeatherProvider } from '~/services/providers/marineweatherprovider';
import { GetWeatherOptions } from '~/services/providers/weatherprovider';
import { startOfDay } from '~/utils/time/dayBounds';

const BASE_URL = 'https://ws.meteoconsult.fr/meteoconsultmarine';
const SEARCH_URL = `${BASE_URL}/android/100/fr/v30/recherche.php`;
const FORECAST_URL = `${BASE_URL}/androidtab/115/fr/v30/previsionsSpot.php`;

/** Maximum distance (km) to consider a marine station relevant for a location */
const MAX_DISTANCE_KM = 10;

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
    datetime: string;
    teau?: number | null;
    hauteurvague?: number | null;
    hauteurvaguemax?: number | null;
    hauteurhoule?: number | null;
}

interface MeteoConsultDetailPrevis {
    datetime: string;
    heure: number;
    teau?: number | null;
    hauteurvague?: number | null;
    hauteurvaguemax?: number | null;
    hauteurhoule?: number | null;
}

interface MeteoConsultMaree {
    datetime: string;

    etales: {
        datetime: string;
        hauteur: number;
        type_etale: 'PM' | 'BM'; // PM = Pleine Mer (high), BM = Basse Mer (low)
        coef?: number;
    }[];
}

interface MeteoConsultForecastResponse {
    marees?: MeteoConsultMaree[];
    previs?: {
        simple?: MeteoConsultSimplePrevis[];
        detail?: MeteoConsultDetailPrevis[];
    };
}

function cacheKey(prefix: string, lat: number, lon: number) {
    return `${prefix}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
}

/** Returns cached marine location info (null: nothing relevant found, undefined: expired/absent) */
function getCachedMarineLocation(lat: number, lon: number): MeteoConsultMarineLocation | null | undefined {
    const key = cacheKey('marine_location', lat, lon);
    const raw = ApplicationSettings.getString(key);
    if (!raw) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!isMarineSearchCacheValid(parsed, Date.now())) {
            ApplicationSettings.remove(key);
            return undefined;
        }
        return parsed.data;
    } catch {
        return undefined;
    }
}

function setCachedMarineLocation(lat: number, lon: number, data: MeteoConsultMarineLocation | null) {
    ApplicationSettings.setString(cacheKey('marine_location', lat, lon), JSON.stringify({ cachedAt: Date.now(), data }));
}

/** Search the MeteoConsult marine station of a location.
 *  Returns null when there is none (or the search is down): the caller falls back to the coordinates. */
async function searchMarineLocation({ lat, lon }: { lat: number; lon: number }): Promise<MeteoConsultMarineLocation | null> {
    const cached = getCachedMarineLocation(lat, lon);
    if (cached !== undefined) {
        return cached;
    }
    let locations: MeteoConsultMarineLocation[];
    try {
        const result = await request<{ contenu: MeteoConsultMarineLocation[] }>({
            url: SEARCH_URL,
            method: 'GET',
            queryParams: { lat, lon, type: 48 }
        });
        locations = result.content.contenu;
    } catch (error) {
        console.error('meteoconsult searchMarineLocation error', error);
        return null;
    }
    const found = pickMarineLocation(locations, { lat, lon }, MAX_DISTANCE_KM);
    setCachedMarineLocation(lat, lon, found);
    return found;
}

/** Parse ISO-like date string "YYYY-MM-DD" and hour number into a UTC timestamp (ms) */
function parseDateTime(weatherLocation: WeatherLocation, dateStr: string): number {
    return dayjs.utc(dateStr).valueOf();
}

export class MeteoConsultProvider extends MarineWeatherProvider {
    static id = 'meteoconsult';
    id = MeteoConsultProvider.id;
    /** Fetch and parse marine weather for the given coordinates.
     *  Merges tides into weatherData.tides and marine props into daily/hourly arrays. */
    async getMarineWeather(weatherLocation: WeatherLocation, options?: GetWeatherOptions): Promise<Partial<WeatherData>> {
        // the search stopped finding anything: the service also answers the coordinates themselves, with tides only near a station
        const { lat, lon } = (await searchMarineLocation(weatherLocation.coord)) ?? weatherLocation.coord;
        let response: MeteoConsultForecastResponse;
        try {
            const result = await request<{ contenu: MeteoConsultForecastResponse }>({
                url: FORECAST_URL,
                method: 'GET',
                queryParams: { lat, lon }
            });
            response = result.content.contenu;
        } catch (error) {
            console.error('meteoconsult getMarineWeather error', error);
            return;
        }

        if (!hasMarineData(response)) {
            return;
        }
        const tidesByTime: Record<number, Tide[]> = {};
        // Parse tides (marees)
        if (response.marees?.length) {
            for (const t of response.marees) {
                tidesByTime[localDayStart(t.datetime, weatherLocation.timezoneOffset)] = t.etales.map(
                    (m) =>
                        ({
                            time: dayjs.utc(m.datetime).valueOf(),
                            height: m.hauteur,
                            type: m.type_etale === 'PM' ? 'high' : 'low',
                            coef: m.coef ?? undefined
                        }) as Tide
                );
            }
        }

        const simple = response.previs?.simple ?? [];
        const detail = response.previs?.detail ?? [];

        // Build a lookup of hourly detail data by timestamp
        const hourlyByTime: Record<number, MeteoConsultDetailPrevis> = {};
        for (const h of detail) {
            hourlyByTime[parseDateTime(weatherLocation, h.datetime)] = h;
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
        // if (weatherData.daily?.data?.length && simple.length) {
        //     const simpleByDate: Record<string, MeteoConsultSimplePrevis> = {};
        //     for (const s of simple) {
        //         simpleByDate[parseDateTime(weatherLocation, s.datetime)] = s;
        //     }

        //     for (const day of weatherData.daily.data) {
        //         const s = simpleByDate[day.time];
        //         if (!s) {
        //             continue;
        //         }

        //         if (tidesByTime[day.time]) {
        //             day.tides = tidesByTime[day.time];
        //         }
        //         const startTs = day.time;
        //         const endTs = startTs + 24 * 60 * 60 * 1000;

        //         const seaTemperature = s.teau ?? avgFromHourly('teau', startTs, endTs);
        //         const waveHeight = s.hauteurvague ?? avgFromHourly('hauteurvague', startTs, endTs);
        //         const waveHeightMax = s.hauteurvaguemax ?? avgFromHourly('hauteurvaguemax', startTs, endTs);
        //         const swellHeight = s.hauteurhoule ?? avgFromHourly('hauteurhoule', startTs, endTs);

        //         if (seaTemperature != null) day.seaTemperature = seaTemperature;
        //         if (waveHeight != null && waveHeight > 0) day.waveHeight = waveHeight;
        //         if (waveHeightMax != null && waveHeightMax > 0) day.waveHeightMax = waveHeightMax;
        //         if (swellHeight != null && swellHeight > 0) day.swellHeight = swellHeight;
        //     }
        // }

        // // Merge into hourly data
        // if (weatherData.hourly?.length && detail.length) {
        //     for (const hour of weatherData.hourly) {
        //         const h = hourlyByTime[hour.time];
        //         if (!h) {
        //             continue;
        //         }
        //         if (h.teau != null) hour.seaTemperature = h.teau;
        //         if (h.hauteurvague != null) hour.waveHeight = h.hauteurvague;
        //         if (h.hauteurvaguemax != null) hour.waveHeightMax = h.hauteurvaguemax;
        //         if (h.hauteurhoule != null) hour.swellHeight = h.hauteurhoule;
        //     }
        // }

        const simpleByDate: Record<string, MeteoConsultSimplePrevis> = {};
        for (const s of simple) {
            simpleByDate[localDayStart(s.datetime, weatherLocation.timezoneOffset)] = s;
        }
        // DEV_LOG && console.log('simpleByDate', JSON.stringify(simpleByDate));
        const hourlyData = Object.entries(hourlyByTime).map(([time, h]) => {
            const d = {} as Hourly;
            d.time = parseInt(time, 10);
            if (h.teau != null) d.seaTemperature = h.teau;
            if (h.hauteurvague != null) d.waveHeight = h.hauteurvague;
            if (h.hauteurvaguemax != null) d.waveHeightMax = h.hauteurvaguemax;
            if (h.hauteurhoule != null) d.swellHeight = h.hauteurhoule;

            return d;
        });

        const r = {
            time: Date.now(),
            daily: {
                data: Object.entries(simpleByDate).map(([time, day]) => {
                    const d = {} as DailyData;
                    d.time = parseInt(time, 10);
                    if (tidesByTime[d.time]) {
                        d.tides = tidesByTime[d.time];
                    }
                    const startTs = d.time;
                    const endTs = startTs + 24 * 60 * 60 * 1000;

                    const seaTemperature = day.teau ?? avgFromHourly('teau', startTs, endTs);
                    const waveHeight = day.hauteurvague ?? avgFromHourly('hauteurvague', startTs, endTs);
                    const waveHeightMax = day.hauteurvaguemax ?? avgFromHourly('hauteurvaguemax', startTs, endTs);
                    const swellHeight = day.hauteurhoule ?? avgFromHourly('hauteurhoule', startTs, endTs);

                    if (seaTemperature != null) d.seaTemperature = seaTemperature;
                    if (waveHeight != null && waveHeight > 0) d.waveHeight = waveHeight;
                    if (waveHeightMax != null && waveHeightMax > 0) d.waveHeightMax = waveHeightMax;
                    if (swellHeight != null && swellHeight > 0) d.swellHeight = swellHeight;
                    return d;
                })
            },
            hourly: hourlyData
        };
        r.hourly = hourlyData;
        return r;
    }
}

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
