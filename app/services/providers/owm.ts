import { lc, titlecase } from '@nativescript-community/l';
import { ApplicationSettings } from '@nativescript/core';
import { FEELS_LIKE_TEMPERATURE, NB_DAYS_FORECAST, NB_HOURS_FORECAST } from '~/helpers/constants';
import { WeatherDataType, weatherDataIconColors } from '~/helpers/formatter';
import { getStartOfDay, lang } from '~/helpers/locale';
import { WeatherLocation, request } from '../api';
import { prefs } from '../preferences';
import { CityWeather, Coord, OneCallResult } from './openweathermap';
import { buildOwmAlerts } from './owmAlerts';
import { Alert, Currently, DailyData, Hourly, WeatherData } from './weather';
import { GetWeatherOptions, WeatherProvider } from './weatherprovider';

const API_KEY_SETTING = 'owmApiKey';

export class OWMProvider extends WeatherProvider {
    static id = 'openweathermap';
    id = OWMProvider.id;
    static owmApiKey = OWMProvider.readOwmApiKeySetting();

    constructor() {
        super();
    }
    public static getSettings() {
        return [
            {
                type: 'prompt',
                valueType: 'string',
                id: 'setting',
                key: API_KEY_SETTING,
                default: () => OWMProvider.owmApiKey,
                description: lc('owm_api_key_required_description'),
                title: lc('owm_api_key')
            },
            {
                id: 'setting',
                valueType: 'string',
                key: 'owm_one_call_version',
                title: lc('owm_one_call_version'),
                values: [
                    { value: '2.5', title: '2.5' },
                    { value: '3.0', title: '3.0' }
                ],
                rightValue: () => ApplicationSettings.getString('owm_one_call_version', '3.0')
            }
        ];
    }

    private static async fetch<T = any>(apiVersion: string, apiName: string, queryParams: OWMParams = {}) {
        return request<T>({
            url: `https://api.openweathermap.org/data/${apiVersion}/${apiName}`,
            method: 'GET',
            queryParams: {
                lang,
                units: 'metric',
                appid: OWMProvider.owmApiKey,
                ...queryParams
            },
            headers: {
                'Cache-Control': `max-age=${60 * 5}`
            }
        });
    }

    private static fetchOneCall(coords: Coord) {
        const onecallVersion = ApplicationSettings.getString('owm_one_call_version', '3.0');
        return OWMProvider.fetch<OneCallResult>(onecallVersion, 'onecall', coords);
    }

    /**
     * One Call ships the alerts along with the forecast.
     *
     * @param onecall the payload when `getWeather` already fetched it
     */
    public override async getAlerts(weatherLocation: WeatherLocation, options?: GetWeatherOptions, onecall?: OneCallResult): Promise<Alert[]> {
        const forecast = onecall ?? (await OWMProvider.fetchOneCall(weatherLocation.coord))?.content;
        return buildOwmAlerts(forecast?.alerts);
    }

    public override async getWeather(weatherLocation: WeatherLocation, { current, minutely, warnings }: { warnings?: boolean; minutely?: boolean; current?: boolean } = {}) {
        const coords = weatherLocation.coord;
        const feelsLikeTemperatures = ApplicationSettings.getBoolean('feels_like_temperatures', FEELS_LIKE_TEMPERATURE);
        const result = await OWMProvider.fetchOneCall(coords);
        const forecast = result.content;
        const forecast_days = ApplicationSettings.getNumber('forecast_nb_days', NB_DAYS_FORECAST);
        const forecast_hours = ApplicationSettings.getNumber('forecast_nb_hours', NB_HOURS_FORECAST);
        // const forecast_minutely = ApplicationSettings.getNumber('forecast_nb_minutes', NB_MINUTES_FORECAST);
        // console.log('test', JSON.stringify(result.daily));
        const r = {
            time: Date.now(), // we use phone local current time as reference
            // time: result.time,
            currently: weatherDataIconColors(
                {
                    time: forecast.current.dt * 1000,
                    temperature: feelsLikeTemperatures ? forecast.current.feels_like : forecast.current.temp,
                    apparentTemperature: forecast.current.feels_like,
                    usingFeelsLike: feelsLikeTemperatures,
                    sealevelPressure: forecast.current.pressure,
                    relativeHumidity: forecast.current.humidity,
                    dewpoint: forecast.current.dew_point,
                    cloudCover: forecast.current.clouds,
                    windSpeed: forecast.current.wind_speed * 3.6,
                    windGust: forecast.current.wind_gust * 3.6,
                    windBearing: forecast.current.wind_deg,
                    uvIndex: forecast.current.uvi,
                    isDay: forecast.current.dt < forecast.current.sunset && forecast.current.dt > forecast.current.sunrise,
                    // sunriseTime: forecast.current.sunrise * 1000,
                    // sunsetTime: forecast.current.sunset * 1000,
                    iconId: forecast.current.weather[0]?.id,
                    description: titlecase(forecast.current.weather[0]?.description)
                } as Currently,
                WeatherDataType.CURRENT,
                coords
            ),
            daily: {
                data: forecast.daily.slice(0, forecast_days).map((data) => {
                    const d = {} as DailyData;
                    d.time = getStartOfDay(data.dt * 1000, weatherLocation.timezoneOffset).valueOf();
                    d.isDay = true;
                    d.iconId = data.weather[0]?.id;
                    d.description = titlecase(data.weather[0]?.description);
                    d.windSpeed = Math.round(data.wind_speed * 3.6);
                    d.windGust = Math.round(data.wind_gust * 3.6);
                    d.temperatureMin = data.temp.min;
                    d.temperatureMax = data.temp.max;
                    d.temperatureNight = data.temp.night;
                    d.apparentTemperature = data.feels_like.day;

                    d.precipProbability = Math.round(data.pop * 100);
                    d.cloudCover = data.clouds;
                    d.windBearing = data.wind_deg;
                    d.relativeHumidity = data.humidity;
                    d.sealevelPressure = data.pressure;
                    d.dewpoint = data.dew_point;
                    // d.sunriseTime = data.sunrise * 1000;
                    // d.sunsetTime = data.sunset * 1000;
                    d.precipAccumulation = data.snow ? data.snow : data.rain ? data.rain : 0;
                    d.uvIndex = data.uvi;

                    weatherDataIconColors(d, WeatherDataType.DAILY, coords, data.rain, data.snow);
                    // d.hourly = [];
                    return d;
                })
            },
            minutely: {
                data:
                    forecast.minutely
                        ?.map((h) => ({
                            intensity: h.precipitation >= 1.5 ? 3 : h.precipitation >= 0.7 ? 2 : h.precipitation > 0 ? 1 : 0,
                            time: h.dt * 1000
                        }))
                        .filter((d, i) => i % 5 === 0) || []
            },
            alerts: warnings !== false ? await this.getAlerts(weatherLocation, { warnings }, forecast) : []
        } as WeatherData;
        if (forecast.hourly) {
            const hourlyLastIndex = Math.min(forecast.hourly.length, forecast_hours) - 1;
            r.hourly = forecast.hourly.slice(0, hourlyLastIndex + 1).map((data, index) => {
                const hasNext = index < hourlyLastIndex;
                const d = {} as Hourly;
                d.time = data.dt * 1000;
                const icon = data.weather[0]?.icon;
                d.isDay = icon.endsWith('d');
                d.iconId = data.weather[0]?.id;
                d.description = titlecase(data.weather[0]?.description);
                d.windSpeed = Math.round(data.wind_speed * 3.6); // max value
                d.windGust = Math.round(data.wind_gust * 3.6);
                d.temperature = feelsLikeTemperatures ? data.feels_like : data.temp;
                d.apparentTemperature = data.feels_like;
                d.usingFeelsLike = feelsLikeTemperatures;
                d.uvIndex = data.uvi;

                d.windBearing = data.wind_deg;
                const nextData = hasNext ? forecast.hourly[index + 1] : undefined;
                if (hasNext && nextData) {
                    d.snowfall = nextData.snow?.['1h'] || 0;
                    d.rain = nextData.rain?.['1h'] || 0;
                    d.precipAccumulation = d.snowfall + d.rain;
                }
                // d.precipAccumulation = data.snow ? data.snow['1h'] : data.rain ? data.rain['1h'] : 0;
                d.precipProbability = Math.round(data.pop * 100);
                d.cloudCover = data.clouds;
                d.relativeHumidity = data.humidity;
                d.sealevelPressure = data.pressure;
                d.dewpoint = data.dew_point;
                weatherDataIconColors(d, WeatherDataType.HOURLY, coords, d.rain, d.snowfall);

                return d;
            });
        }

        return r;
    }

    static readOwmApiKeySetting() {
        let key = ApplicationSettings.getString(API_KEY_SETTING);
        // DEV_LOG && console.log('readOwmApiKeySetting', key);
        if (!key || key?.length === 0) {
            ApplicationSettings.remove(API_KEY_SETTING);
            key = null;
        }
        return key?.trim();
    }

    public static async getCityName(pos: Coord) {
        const result = await OWMProvider.fetch<CityWeather>('2.5', 'weather', {
            lat: pos.lat,
            lon: pos.lon
        });
        return result;
    }

    static getUrl() {
        return 'https://openweathermap.org';
    }

    public static setApiKey(apiKey) {
        OWMProvider.owmApiKey = apiKey?.trim();
        if (OWMProvider.owmApiKey?.length) {
            ApplicationSettings.setString(API_KEY_SETTING, OWMProvider.owmApiKey);
        } else {
            ApplicationSettings.remove(API_KEY_SETTING);
        }
    }
    public requiresApiKey() {
        return true;
    }

    public static hasApiKey() {
        return OWMProvider.owmApiKey && OWMProvider.owmApiKey.length && OWMProvider.owmApiKey !== OWM_DEFAULT_KEY;
    }

    public static getApiKey() {
        return OWMProvider.owmApiKey;
    }
}
prefs.on(`key:${API_KEY_SETTING}`, (event) => {
    OWMProvider.owmApiKey = OWMProvider.readOwmApiKeySetting();
});

interface OWMParams extends Partial<Coord> {
    id?: number; // cityId
    q?: string; // search query
}
