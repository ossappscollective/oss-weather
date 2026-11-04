import dayjs from 'dayjs';
import { WeatherDataType, weatherDataIconColors } from '~/helpers/formatter';
import { getEndOfDay, getStartOfDay, lang, lc, titlecase } from '~/helpers/locale';
import { RequestResult, WeatherLocation, request } from '~/services/api';
import type { Coord, Dailyforecast, ForecastForecast, MFCurrent, MFForecastResult, MFMinutely, MFWarningDictionary, MFWarningText, MFWarnings, MFWarningsOverseas, Probabilityforecast } from './meteofrance';
import { AlertSeverity, colorFromSeverity, sortAlerts } from '~/services/providers/alerts';
import { GetWeatherOptions, WeatherProvider } from '~/services/providers/weatherprovider';
import { Alert, Currently, DailyData, Hourly, MinutelyData, WeatherData } from '~/services/providers/weather';
import { ApplicationSettings } from '@nativescript/core';
import { NB_DAYS_FORECAST, NB_HOURS_FORECAST, NB_MINUTES_FORECAST } from '~/helpers/constants';
import { prefs } from '~/services/preferences';
import { getFile } from '@nativescript-community/https';
import { logRequestAsCurl } from '@shared/utils/curlify';

interface MFParams extends Partial<Coord> {
    domain?: string;
    /** `J0` (today) or `J1` (tomorrow), warnings only */
    echeance?: string;
    warning_type?: string;
}

const API_KEY_SETTING = 'mfApiKey';

export class MFProvider extends WeatherProvider {
    static id = 'meteofrance';
    id = MFProvider.id;

    static getUrl() {
        return 'https://meteofrance.com';
    }

    static getBRA(massifId) {
        const url = `https://public-api.meteofrance.fr/public/DPBRA/v1/massif/BRA?id-massif=${massifId}&format=pdf`;
        const params = {
            url,
            method: 'GET',
            headers: {
                apikey: this.apiKey
            }
        };
        if (__DEV__) {
            logRequestAsCurl(url, params as any);
            DEV_LOG && console.log('getBRA', massifId, url, this.apiKey);
        }
        return getFile(params as any);
    }

    private getDaily(weatherLocation: WeatherLocation, hourly: Hourly[], hourlyForecast: ForecastForecast[], dailyForecast: Dailyforecast) {
        let precipitationTotal = 0;
        let snowfallTotal = 0;
        let rainTotal = 0;
        const probPrecipitationTotal = { count: 0, total: 0 };
        const rainSnowLimitTotal = { count: 0, total: 0 };
        const isoTotal = { count: 0, total: 0 };

        // MF does not handle timezone correctly and will return start of day for UTC
        // we want times based on real start of day
        const msTimezoneOffset = -weatherLocation.timezoneOffset * 60 * 60 * 1000;

        let precipProbability = 0;

        const time = dailyForecast.time * 1000 + msTimezoneOffset;

        const startOfDay = getStartOfDay(time + 60000, weatherLocation.timezoneOffset).valueOf();
        const endOfDay = getEndOfDay(time + 60000, weatherLocation.timezoneOffset)
            .add(1, 'm')
            .valueOf();
        if (hourly) {
            for (const hour of hourly) {
                const htime = hour.time + msTimezoneOffset;
                if (htime >= startOfDay && htime < endOfDay) {
                    // Precipitation
                    snowfallTotal += hour.snowfall;
                    rainTotal += hour.rain;
                    if (hour.precipAccumulation) {
                        precipitationTotal += hour.precipAccumulation;
                        // Precipitation probability
                    }

                    if (hour.precipProbability) {
                        precipProbability = Math.max(precipProbability, hour.precipProbability);
                        probPrecipitationTotal.count++;
                        probPrecipitationTotal.total += hour.precipProbability;
                    }

                    if (hour.rainSnowLimit) {
                        rainSnowLimitTotal.count++;
                        rainSnowLimitTotal.total += hour.rainSnowLimit;
                    }
                    if (hour.iso) {
                        isoTotal.count++;
                        isoTotal.total += hour.iso;
                    }
                }
            }
        }

        const cloudCover = { count: 0, total: 0 };
        const windSpeed = { count: 0, total: 0 };
        // const windSpeeds = [];
        const windDegree = { count: 0, total: 0 };
        let windGust = null;
        if (hourlyForecast) {
            for (const hourForecast of hourlyForecast) {
                const time = hourForecast.time * 1000;
                if (time >= startOfDay && time < endOfDay) {
                    cloudCover.count++;
                    cloudCover.total += hourForecast.total_cloud_cover;
                    if (hourForecast.wind_speed) {
                        windSpeed.count++;
                        windSpeed.total += hourForecast.wind_speed;
                        // windSpeeds.push(hourForecast.wind.speed);
                    }
                    if (hourForecast.wind_direction !== -1) {
                        windDegree.count++;
                        windDegree.total += hourForecast.wind_direction;
                    }

                    if (windGust == null || hourForecast.wind_speed_gust > windGust) {
                        windGust = hourForecast.wind_speed_gust;
                    }
                }
            }
        }

        const d = {
            time,
            description: dailyForecast.daily_weather_description == null ? '' : dailyForecast.daily_weather_description,
            iconId: this.convertMFICon(dailyForecast.daily_weather_icon),
            temperatureMax: dailyForecast.T_max,
            temperatureMin: dailyForecast.T_min,
            relativeHumidity: (dailyForecast.relative_humidity_max + dailyForecast.relative_humidity_min) / 2,
            uvIndex: dailyForecast.uv_index,
            windGust: Math.round(windGust * 3.6),
            windSpeed: windSpeed.count > 1 ? Math.round((windSpeed.total / (windSpeed.count || 1)) * 3.6) : 0,
            windBearing: windDegree.count > 1 ? Math.round((windDegree.total / windDegree.count) * 3.6) : -1,
            cloudCover: cloudCover.count > 1 ? Math.round(cloudCover.total / (cloudCover.count || 1)) : -1,
            isDay: true
            // sunriseTime: dailyForecast.sunrise_time * 1000,
            // sunsetTime: dailyForecast.sunset_time * 1000
        } as DailyData;
        if (precipProbability > 0) {
            d.precipProbability = Math.round(precipProbability);
        }
        const precipAccumulation = Math.max(precipitationTotal, dailyForecast.total_precipitation_24h);
        if (precipAccumulation > 0) {
            d.precipAccumulation = precipAccumulation;
        }

        if (rainSnowLimitTotal.count > 0) {
            d.rainSnowLimit = Math.round(rainSnowLimitTotal.total / rainSnowLimitTotal.count);
        }
        if (isoTotal.count > 0) {
            d.iso = Math.round(isoTotal.total / isoTotal.count);
        }
        // console.log(
        //     'day:',
        //     dayjs(dayStartTime).format('ddd DD/MM'),
        //     dailyForecast.daily_weather_icon,
        //     snowfallTotal,
        //     rainTotal,
        //     precipitationTotal,
        //     dailyForecast.total_precipitation_24h,
        //     probPrecipitationTotal
        // );

        // const probRain = Math.round(probRainPrecipitationTotal.total / (probRainPrecipitationTotal.count || 1));
        // const probSnow = Math.round(probSnowPrecipitationTotal.total / (probSnowPrecipitationTotal.count || 1));
        // console.log('daily', d, WeatherDataType.DAILY, weatherLocation.coord, probRain, probSnow)
        weatherDataIconColors(d, WeatherDataType.DAILY, weatherLocation.coord, snowfallTotal === 0 && rainTotal === 0 ? precipAccumulation : rainTotal, snowfallTotal);
        return d;
        // return new HalfDay(
        //     dailyForecast.weather12H == null ? WeatherCode.CLEAR : getWeatherCode(dailyForecast.weather12H.icon),
        //     new Temperature(temp, null, null, null, tempWindChill, null, null),
        //     new Precipitation(precipitationTotal, null, precipitationRain, precipitationSnow, null),
        //     new PrecipitationProbability(probPrecipitationTotal, null, probPrecipitationRain, probPrecipitationSnow, probPrecipitationIce),
        //     new Precipitati`onDuration(null, null, null, null, null),
        //     new Wind(windDirection, windDegree, windSpeed, windLevel),
        //     cloudCover
        // );
    }

    private convertMFICon(icon: string) {
        if (!icon) {
            return 801;
        }
        switch (parseInt(icon.replace(/^\D+/g, ''), 10)) {
            case 2:
                return 802;
            case 3:
                return 804;
            case 31:
                return 731;
            case 32:
            case 33:
            case 34:
                return 781;
            case 4:
            case 5:
                return 721;
            case 6:
            case 7:
            case 8:
                return 741;
            case 9:
            case 10:
            case 11:
                return 500;
            case 12:
            case 13:
            case 14:
                return 502;
            case 15:
                return 504;
            case 16:
                return 200;
            case 24:
            case 30:
                return 201;
            case 25:
                return 202;
            case 26:
                return 210;
            case 27:
                return 211;
            case 28:
                return 212;
            case 29:
                return 221;
            case 17:
                return 620;
            case 18:
                return 600;
            case 19:
                return 615;
            case 20:
                return 616;
            case 21:
                return 621;
            case 22:
                return 601;
            case 23:
                return 602;
            case 1:
            default:
                return 800;
        }
    }

    private getHourlyPrecipitationProbability(probabilityForecastResult: Probabilityforecast[], dt: number) {
        let rainProbability = 0;
        let snowProbability = 0;
        let iceProbability = 0;

        let probabilityForecast: Probabilityforecast;
        for (let i = 0; i < probabilityForecastResult.length; i++) {
            probabilityForecast = probabilityForecastResult[i];
            /*
             * Probablity are given every 3 hours, sometimes every 6 hours.
             * Sometimes every 3 hour-schedule give 3 hours probability AND 6 hours probability,
             * sometimes only one of them
             * It's not very clear but we take all hours in order.
             */
            if (probabilityForecast.time === dt || probabilityForecast.time - 3600 === dt || probabilityForecast.time - 3600 * 2 === dt) {
                if (probabilityForecast.rain_hazard_3h != null) {
                    rainProbability = probabilityForecast.rain_hazard_3h;
                } else if (probabilityForecast.rain_hazard_6h != null) {
                    rainProbability = probabilityForecast.rain_hazard_6h;
                }
                if (probabilityForecast.snow_hazard_3h != null) {
                    snowProbability = probabilityForecast.snow_hazard_3h;
                } else if (probabilityForecast.snow_hazard_6h != null) {
                    snowProbability = probabilityForecast.snow_hazard_6h;
                }
                iceProbability = probabilityForecast.freezing_hazard;
            } else if (probabilityForecast.time - 3600 * 3 === dt || probabilityForecast.time - 3600 * 4 === dt || probabilityForecast.time - 3600 * 5 === dt) {
                /*
                 * If it's found as part of the "6 hour schedule" and we find later a "3 hour schedule"
                 * the "3 hour schedule" will overwrite the "6 hour schedule" below with the above
                 */
                if (probabilityForecast.rain_hazard_6h != null) {
                    rainProbability = probabilityForecast.rain_hazard_6h;
                }
                if (probabilityForecast.snow_hazard_6h != null) {
                    snowProbability = probabilityForecast.snow_hazard_6h;
                }
                iceProbability = probabilityForecast.freezing_hazard;
            }
            if (rainProbability || snowProbability) {
                break;
            }
        }
        return {
            rain: rainProbability,
            snow: snowProbability,
            ice: iceProbability
        };
    }

    private async fetch<T = any>(apiName: string, queryParams: MFParams = {}) {
        return request<T>({
            url: `https://webservice.meteofrance.com/${apiName}`,
            method: 'GET',
            queryParams: {
                lang,
                formatDate: 'timestamp',
                token: MFProvider.apiKey,
                ...queryParams
            },
            headers: {
                'Cache-Control': `max-age=${60 * 5}`
            }
        });
    }

    public override async getWeather(weatherLocation: WeatherLocation, { current, minutely, warnings }: { warnings?: boolean; minutely?: boolean; current?: boolean } = {}) {
        const feelsLikeTemperatures = ApplicationSettings.getBoolean('feels_like_temperatures', false);
        const coords = weatherLocation.coord;

        const result = await Promise.all([
            this.fetch<MFForecastResult>('v2/forecast', coords),
            minutely !== false ? this.fetch<MFMinutely>('v3/nowcast/rain', coords) : Promise.resolve(undefined as RequestResult<MFMinutely>),
            current !== false ? this.fetch<MFCurrent>('v2/observation', coords) : Promise.resolve(undefined as RequestResult<MFCurrent>)
        ]);
        // if (forecast.position.dept) {
        // we are in france we can get more

        const forecast_days = ApplicationSettings.getNumber('forecast_nb_days', NB_DAYS_FORECAST);
        const forecast_hours = ApplicationSettings.getNumber('forecast_nb_hours', NB_HOURS_FORECAST);
        const forecast_minutely = ApplicationSettings.getNumber('forecast_nb_minutes', NB_MINUTES_FORECAST);

        const forecast = result[0]?.content;
        const rain = result[1]?.content;
        const currentData = result[2]?.content;
        const now = Date.now();
        const alerts = warnings !== false ? await this.getAlerts(weatherLocation, { warnings }, forecast) : [];
        // }
        // DEV_LOG && console.log('forecast', JSON.stringify(forecast));
        // DEV_LOG && console.log('rain', JSON.stringify(rain));
        // DEV_LOG && console.log('current', JSON.stringify(current));
        const forecastData = forecast.properties.forecast;
        let hourlyData: Hourly[];
        if (forecastData) {
            const startOfHour = dayjs(now).startOf('h').valueOf() / 1000;
            const firstHourIndex = forecastData.findIndex((d) => d.time > startOfHour);
            let hourlyLastIndex = forecastData.findIndex((d) => d.weather_icon === null || d.T === null || (d.time - now / 1000) / 3600 > forecast_hours);
            if (hourlyLastIndex === -1) {
                hourlyLastIndex = forecastData.length - 1;
            }
            hourlyData = forecastData?.slice(Math.max(firstHourIndex - 1, 0), hourlyLastIndex).map((data, index) => {
                const d = {} as Hourly;
                d.time = data.time * 1000;
                const icon = data.weather_icon;

                d.isDay = icon.endsWith('j');
                d.iconId = this.convertMFICon(icon);
                d.description = titlecase(data.weather_description);
                d.temperature = feelsLikeTemperatures ? data.T_windchill : data.T;
                d.apparentTemperature = data.T_windchill;

                d.windBearing = data.wind_direction;
                d.sealevelPressure = data.P_sea;
                d.relativeHumidity = data.relative_humidity;

                d.snowfall = data.snow_1h || data.snow_3h || data.snow_6h || data.snow_12h || data.snow_24h || 0;
                d.rain = data.rain_1h || data.rain_3h || data.rain_6h || data.rain_12h || data.rain_24h || 0;

                const acc = d.snowfall * 10 + d.rain;
                if (acc > 0) {
                    d.precipAccumulation = acc;
                }

                const probabilities = this.getHourlyPrecipitationProbability(forecast.properties.probability_forecast || [], data.time);
                const prob = Math.round(Math.max(probabilities.rain, probabilities.snow, probabilities.ice));
                d.precipProbability = Math.round(Math.max(probabilities.rain, probabilities.snow, probabilities.ice));
                if (d.precipAccumulation && prob === 0) {
                    d.precipProbability = -1;
                }
                if (prob >= 0) {
                    d.precipProbability = prob;
                }
                // d.precipProbabilities = probabilities;
                d.cloudCover = data.total_cloud_cover;
                d.windGust = data.wind_speed_gust * 3.6;
                d.windSpeed = data.wind_speed * 3.6;
                d.iso = data.iso0;
                if (typeof data.rain_snow_limit === 'number') {
                    d.rainSnowLimit = data.rain_snow_limit;
                }
                // d.pressure = data.pressure;
                // console.log('hourly', data.weather_icon, dayjs(d.time).format('ddd DD/MM'), d.rain, d.snowfall, d.precipAccumulation);
                return weatherDataIconColors(d, WeatherDataType.HOURLY, weatherLocation.coord, d.rain, d.snowfall);
            });
        }

        const currentConditions = currentData?.properties?.gridded;
        // DEV_LOG && console.log('current', JSON.stringify(currentData));
        const r = {
            time: Date.now(), // we use phone local current time as reference
            // time: result[0].time,
            currently: currentConditions
                ? weatherDataIconColors(
                      {
                          time: currentConditions.time * 1000,
                          temperature: currentConditions.T,
                          //   apparentTemperature: currentConditions.T_windchill,
                          windSpeed: currentConditions.wind_speed,
                          //   windGust: currentConditions.wind,
                          windBearing: currentConditions.wind_direction,
                          isDay: currentConditions.weather_icon ? currentConditions.weather_icon.endsWith('j') : undefined,
                          iconId: currentConditions.weather_icon ? this.convertMFICon(currentConditions.weather_icon) : undefined,
                          description: currentConditions.weather_description ? titlecase(currentConditions.weather_description) : undefined
                      } as Currently,
                      WeatherDataType.CURRENT,
                      coords
                  )
                : {},
            daily: {
                data: forecast.properties.daily_forecast.slice(0, forecast_days).map((data) => this.getDaily(weatherLocation, hourlyData, forecastData, data))
            },
            minutely: {
                data:
                    rain?.properties?.forecast.map(
                        (h) =>
                            ({
                                intensity: Math.max(h.rain_intensity - 1, 0),
                                time: h.time * 1000
                            }) as MinutelyData
                    ) || []
            },
            alerts
        } as WeatherData;
        r.hourly = hourlyData || [];
        return r;
    }

    private get warningLabels(): MFWarningLabels {
        return {
            phenomenon: (phenomenonId) => this.getWarningType(phenomenonId),
            level: (colorId) => this.getWarningText(colorId),
            consequencesTitle: lc('possible_consequences'),
            adviceTitle: lc('behavioral_tips'),
            bulletinTitle: lc('weather_bulletin')
        };
    }

    /**
     * Metropolitan France publishes today (J0) and tomorrow (J1) on `v3`; overseas territories have
     * their own `v2` endpoints, whose phenomenon names and colors come from a dictionary.
     *
     * @param forecast the `v2/forecast` payload when `getWeather` already fetched it: it carries the
     * department the vigilance domain is derived from
     */
    public override async getAlerts(weatherLocation: WeatherLocation, options?: GetWeatherOptions, forecast?: MFForecastResult): Promise<Alert[]> {
        const properties = forecast ? forecast.properties : (await this.fetch<MFForecastResult>('v2/forecast', weatherLocation.coord))?.content?.properties;
        const domain = getMfDomain(properties?.french_department);
        if (!domain) {
            return [];
        }
        const now = Date.now();
        if (domain.startsWith('VIGI')) {
            const [warnings, dictionary] = await Promise.all([
                this.fetch<MFWarningsOverseas>('v2/warning/full', {
                    domain,
                    // needed for La Réunion
                    ...(domain === 'VIGI974' ? { warning_type: 'vigilance4colors' } : {})
                }).catch(() => null as RequestResult<MFWarningsOverseas>),
                this.fetch<MFWarningDictionary>('v2/warning/dictionary', { domain }).catch(() => null as RequestResult<MFWarningDictionary>)
            ]);
            return buildOverseasAlerts(warnings?.content, dictionary?.content, now, this.warningLabels);
        }
        const [today, tomorrow] = await Promise.all([
            this.fetch<MFWarnings>('v3/warning/full', { domain, echeance: 'J0' }).catch(() => null as RequestResult<MFWarnings>),
            // tomorrow is not published yet right after midnight
            this.fetch<MFWarnings>('v3/warning/full', { domain, echeance: 'J1' }).catch(() => null as RequestResult<MFWarnings>)
        ]);
        return buildAlertsFromWarnings(today?.content, tomorrow?.content, now, this.warningLabels);
    }

    private getWarningType(phemononId: string) {
        switch (phemononId) {
            case '1':
                return lc('wind');
            case '2':
                return lc('rain_flood');
            case '3':
                return lc('thunderstorms');
            case '4':
                return lc('flood');
            case '5':
                return lc('snow_ice');
            case '6':
                return lc('heat_wave');
            case '7':
                return lc('extreme_cold');
            case '8':
                return lc('avalanche');
            case '9':
                return lc('coastal_flooding');
            default:
                return lc('divers');
        }
    }

    private getWarningText(colorId: number) {
        switch (colorId) {
            case 4:
                return lc('absolute_vigilance');
            case 3:
                return lc('be_extra_vigilant');
            case 2:
                return lc('be_vigilant');
            default:
                return lc('no_particular_vigilance');
        }
    }

    static apiKey = MFProvider.readApiKeySetting();

    static readApiKeySetting() {
        let key = ApplicationSettings.getString(API_KEY_SETTING, MF_DEFAULT_KEY);
        if (!key || key?.length === 0) {
            ApplicationSettings.remove(API_KEY_SETTING);
            key = MF_DEFAULT_KEY;
        }
        return key?.trim();
    }

    public static setApiKey(apiKey: string) {
        MFProvider.apiKey = apiKey?.trim();
        if (MFProvider.apiKey?.length) {
            ApplicationSettings.setString(API_KEY_SETTING, MFProvider.apiKey);
        } else {
            ApplicationSettings.remove(API_KEY_SETTING);
        }
    }

    public static requiresApiKey() {
        return true;
    }

    public static hasApiKey() {
        return !!MFProvider.apiKey && MFProvider.apiKey.length > 0;
    }

    public static getApiKey() {
        return MFProvider.apiKey;
    }
    public static getSettings() {
        return [
            {
                type: 'prompt',
                valueType: 'string',
                id: 'setting',
                key: API_KEY_SETTING,
                onClear: () => MFProvider.setApiKey(null),
                default: () => MFProvider.apiKey,
                description: lc('api_key_required'),
                title: lc('api_key')
            }
        ];
    }
}

prefs.on(`key:${API_KEY_SETTING}`, (event) => {
    MFProvider.apiKey = MFProvider.readApiKeySetting();
});

// Météo France vigilance mapping: the localized labels are injected by the provider
export interface MFWarningLabels {
    phenomenon(phenomenonId: string): string;
    level(colorId: number): string;
    consequencesTitle: string;
    adviceTitle: string;
    bulletinTitle: string;
}

/** Metropolitan vigilance level: 1 green, 2 yellow, 3 orange, 4 red. */
export function severityFromVigilanceColorId(colorId: number): AlertSeverity {
    switch (colorId) {
        case 4:
            return AlertSeverity.EXTREME;
        case 3:
            return AlertSeverity.SEVERE;
        case 2:
            return AlertSeverity.MODERATE;
        case 1:
            return AlertSeverity.MINOR;
        default:
            return AlertSeverity.UNKNOWN;
    }
}

/** Overseas vigilance levels are only named, not numbered the same way as the metropolitan ones. */
export function severityFromColorName(colorName: string): AlertSeverity {
    const name = colorName?.toLowerCase() ?? '';
    if (name.includes('rouge') || name.includes('violet')) {
        return AlertSeverity.EXTREME;
    }
    if (name.includes('orange')) {
        return AlertSeverity.SEVERE;
    }
    if (name.includes('jaune') || name.includes('blanc')) {
        return AlertSeverity.MODERATE;
    }
    if (name.includes('vert') || name.includes('bleu')) {
        return AlertSeverity.MINOR;
    }
    return AlertSeverity.UNKNOWN;
}

/** Overseas territories are not served by `v3/warning/full`, they have their own `VIGI*` domain. */
const OVERSEAS_TERRITORIES = ['971', '972', '973', '974', '975', '976', '977', '978', '986', '987', '988'];

const METROPOLITAN_DEPARTMENT = /^(?:0[1-9]|[1-8]\d|9[0-5]|2[AB])$/;

export function getMfDomain(frenchDepartment: string): string {
    if (!frenchDepartment) {
        return null;
    }
    if (METROPOLITAN_DEPARTMENT.test(frenchDepartment)) {
        return frenchDepartment;
    }
    if (OVERSEAS_TERRITORIES.includes(frenchDepartment)) {
        // Saint-Barthélemy and Saint-Martin share a single bulletin
        return frenchDepartment === '977' || frenchDepartment === '978' ? 'VIGI978-977' : `VIGI${frenchDepartment}`;
    }
    return null;
}

function cleanupText(text: string): string {
    return text?.replace(/<br\s*\/?>/gi, '\n').trim();
}

function appendSection(content: string[], title: string, text: string) {
    const cleaned = cleanupText(text);
    if (cleaned?.length) {
        content.push(title ? `${title}:\n${cleaned}` : cleaned);
    }
}

/**
 * Bulletin text blocks, filtered on the phenomenon they describe. `hazard_code` is `null` on the
 * general situation blocks, which is what the overall bulletin uses.
 */
function getTextBlocsContent(text: MFWarningText, phenomenonId: string): string[] {
    const content: string[] = [];
    text?.text_bloc_item?.forEach((blocItem) => {
        const textItems = blocItem.text_items?.filter((textItem) => (textItem.hazard_code ?? null) === phenomenonId);
        if (!textItems?.length) {
            return;
        }
        const blocContent: string[] = [];
        textItems.forEach((textItem) => {
            textItem.term_items?.forEach((termItem) => {
                termItem.subdivision_text?.forEach((subdivision) => {
                    const parts: string[] = [];
                    if (subdivision.underline_text?.length) {
                        parts.push(subdivision.underline_text);
                    }
                    if (subdivision.bold_text?.length) {
                        parts.push(subdivision.bold_text);
                    }
                    if (subdivision.text?.length) {
                        parts.push(subdivision.text.join('\n'));
                    }
                    if (parts.length) {
                        blocContent.push(parts.join(' '));
                    }
                });
            });
        });
        if (blocContent.length) {
            content.push(blocItem.type_name?.length ? `${blocItem.type_name}:\n${blocContent.join('\n\n')}` : blocContent.join('\n\n'));
        }
    });
    return content;
}

/**
 * MF only fills `consequences`/`advices` from the orange level upwards, the yellow ones only have
 * the bulletin text blocks — so both sources are used.
 */
function getWarningContent(phenomenonId: string, warnings: MFWarnings, labels: MFWarningLabels): string {
    const content = getTextBlocsContent(warnings.text, phenomenonId);
    appendSection(content, labels.consequencesTitle, warnings.consequences?.find((it) => it.phenomenon_id === phenomenonId)?.text_consequence);
    appendSection(content, labels.adviceTitle, warnings.advices?.find((it) => it.phenomenon_id === phenomenonId)?.text_advice);
    return content.length ? content.join('\n\n') : null;
}

/** The overall vigilance bulletin: the text blocks that are not tied to a phenomenon. */
function getBulletinAlert(warnings: MFWarnings, labels: MFWarningLabels): Alert {
    if (!warnings?.text) {
        return null;
    }
    const description = getWarningContent(null, warnings, labels);
    if (!description) {
        return null;
    }
    return {
        start: warnings.update_time * 1000,
        end: warnings.end_validity_time * 1000,
        event: warnings.text.bloc_title?.length ? warnings.text.bloc_title : labels.bulletinTitle,
        description,
        // shown first: it summarizes every phenomenon, so it carries no vigilance color of its own
        severity: AlertSeverity.EXTREME,
        color: null
    };
}

function getPhenomenonAlerts(warnings: MFWarnings, labels: MFWarningLabels): Alert[] {
    if (!warnings?.timelaps) {
        return [];
    }
    return warnings.timelaps.reduce((acc, timelaps) => {
        timelaps.timelaps_items
            ?.filter((item) => item.color_id > 1)
            .forEach((item) => {
                const severity = severityFromVigilanceColorId(item.color_id);
                acc.push({
                    start: item.begin_time * 1000,
                    end: item.end_time * 1000,
                    event: `${labels.phenomenon(timelaps.phenomenon_id)} - ${labels.level(item.color_id)}`,
                    description: getWarningContent(timelaps.phenomenon_id, warnings, labels),
                    severity,
                    color: colorFromSeverity(severity)
                });
            });
        return acc;
    }, [] as Alert[]);
}

/**
 * The same vigilance is published on both the J0 and the J1 bulletin, with a text that gets richer
 * as the level rises. Alerts sharing an event over overlapping periods are merged into a single one
 * covering the whole period, keeping the most detailed text.
 */
function dedupeAlerts(alerts: Alert[]): Alert[] {
    const merged: Alert[] = [];
    alerts.forEach((alert) => {
        const existing = merged.find((candidate) => candidate.event === alert.event && alert.start <= candidate.end && alert.end >= candidate.start);
        if (existing) {
            existing.start = Math.min(existing.start, alert.start);
            existing.end = Math.max(existing.end, alert.end);
            if ((alert.description?.length ?? 0) > (existing.description?.length ?? 0)) {
                existing.description = alert.description;
            }
            return;
        }
        merged.push({ ...alert });
    });
    return merged;
}

/**
 * @param today `v3/warning/full` for `echeance=J0`
 * @param tomorrow same for `echeance=J1`, `null` when it is not published yet
 */
export function buildAlertsFromWarnings(today: MFWarnings, tomorrow: MFWarnings, now: number, labels: MFWarningLabels): Alert[] {
    const alerts = [today, tomorrow]
        .filter((warnings) => !!warnings)
        .reduce((acc, warnings) => {
            const bulletin = getBulletinAlert(warnings, labels);
            if (bulletin) {
                acc.push(bulletin);
            }
            return acc.concat(getPhenomenonAlerts(warnings, labels));
        }, [] as Alert[]);
    return sortAlerts(dedupeAlerts(alerts).filter((alert) => alert.end > now));
}

function getOverseasBulletinAlert(warnings: MFWarningsOverseas, labels: MFWarningLabels): Alert {
    const blocItems = warnings?.text?.text_bloc_item;
    // unlike the metropolitan bulletin, the overseas one is always published, even when every
    // phenomenon is green — only show it once something is actually going on
    if (!blocItems?.length || !(warnings.color_max > 1)) {
        return null;
    }
    const description = blocItems
        .map((blocItem) => [blocItem.title, blocItem.text?.join('\n')].filter((part) => part?.length).join('\n'))
        .filter((part) => part.length)
        .join('\n\n');
    if (!description.length) {
        return null;
    }
    return {
        start: warnings.text.begin_time * 1000,
        end: (warnings.text.end_time ?? warnings.end_validity_time) * 1000,
        event: labels.bulletinTitle,
        description: cleanupText(description),
        severity: AlertSeverity.EXTREME,
        color: null
    };
}

export function buildOverseasAlerts(warnings: MFWarningsOverseas, dictionary: MFWarningDictionary, now: number, labels: MFWarningLabels): Alert[] {
    if (!warnings) {
        return [];
    }
    const alerts: Alert[] = [];
    const bulletin = getOverseasBulletinAlert(warnings, labels);
    if (bulletin) {
        alerts.push(bulletin);
    }
    warnings.timelaps?.forEach((timelaps) => {
        const phenomenonName = dictionary?.phenomenons?.find((phenomenon) => phenomenon.id === timelaps.phenomenon_id)?.name ?? labels.phenomenon(`${timelaps.phenomenon_id}`);
        timelaps.timelaps_items
            ?.filter((item) => item.color_id > 1)
            .forEach((item) => {
                const color = dictionary?.colors?.find((dictionaryColor) => dictionaryColor.id === item.color_id);
                const severity = color ? severityFromColorName(color.name) : severityFromVigilanceColorId(item.color_id);
                alerts.push({
                    start: item.begin_time * 1000,
                    end: item.end_time * 1000,
                    event: `${phenomenonName} - ${color?.name ?? labels.level(item.color_id)}`,
                    description: cleanupText(warnings.consequences?.find((it) => it.phenomenon_id === timelaps.phenomenon_id)?.text_consequence),
                    severity,
                    // the app palette wins over the dictionary color so every provider stays consistent
                    color: colorFromSeverity(severity) ?? color?.hexaCode
                });
            });
    });
    return sortAlerts(dedupeAlerts(alerts).filter((alert) => alert.end > now));
}
