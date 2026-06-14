import { lc, titlecase } from '@nativescript-community/l';
import { ApplicationSettings } from '@nativescript/core';
import { WeatherDataType, weatherDataIconColors } from '~/helpers/formatter';
import { getStartOfDay, lang } from '~/helpers/locale';
import { WeatherLocation, request } from '../api';
import { WeatherProvider } from './weatherprovider';
import { Currently, DailyData, Hourly, WeatherData } from './weather';
import { FEELS_LIKE_TEMPERATURE, NB_DAYS_FORECAST, NB_HOURS_FORECAST } from '~/helpers/constants';
import { prefs } from '../preferences';
import { AirQualityProvider } from './airqualityprovider';
import { AirQualityData, CommonAirQualityData } from './weather';
import { Pollutants } from '../airQualityData';

// Map AccuWeather icon codes to OpenWeatherMap-style icon codes for compatibility
// AccuWeather uses 1-44 icon codes, we need to map to OWM style (e.g., 200-800)
function mapAccuWeatherIcon(accuIcon: number, isDayTime: boolean): number {
    // Mapping AccuWeather icons to approximate OWM equivalents
    // https://developer.accuweather.com/weather-icons
    // Note: Some icon codes (9, 10, 27, 28) are not documented in AccuWeather API
    const iconMap: { [key: number]: number } = {
        1: 800, // Sunny -> Clear
        2: 800, // Mostly Sunny -> Clear
        3: 801, // Partly Sunny -> Few clouds
        4: 802, // Intermittent Clouds -> Scattered clouds
        5: 802, // Hazy Sunshine -> Scattered clouds
        6: 803, // Mostly Cloudy -> Broken clouds
        7: 804, // Cloudy -> Overcast
        8: 804, // Dreary (Overcast) -> Overcast
        11: 701, // Fog
        12: 500, // Showers
        13: 500, // Mostly Cloudy w/ Showers
        14: 500, // Partly Sunny w/ Showers
        15: 200, // T-Storms
        16: 200, // Mostly Cloudy w/ T-Storms
        17: 200, // Partly Sunny w/ T-Storms
        18: 501, // Rain
        19: 600, // Flurries
        20: 600, // Mostly Cloudy w/ Flurries
        21: 600, // Partly Sunny w/ Flurries
        22: 601, // Snow
        23: 601, // Mostly Cloudy w/ Snow
        24: 612, // Ice
        25: 611, // Sleet
        26: 511, // Freezing Rain
        29: 616, // Rain and Snow
        30: 503, // Hot
        31: 903, // Cold
        32: 905, // Windy
        33: 800, // Clear (night)
        34: 800, // Mostly Clear (night)
        35: 801, // Partly Cloudy (night)
        36: 802, // Intermittent Clouds (night)
        37: 701, // Hazy Moonlight
        38: 803, // Mostly Cloudy (night)
        39: 520, // Partly Cloudy w/ Showers (night)
        40: 520, // Mostly Cloudy w/ Showers (night)
        41: 211, // Partly Cloudy w/ T-Storms (night)
        42: 211, // Mostly Cloudy w/ T-Storms (night)
        43: 600, // Mostly Cloudy w/ Flurries (night)
        44: 601 // Mostly Cloudy w/ Snow (night)
    };

    return iconMap[accuIcon] || 800;
}

const API_KEY_SETTING = 'accuWeatherApiKey';

export class AccuWeatherProvider extends WeatherProvider {
    static id = 'accuweather';
    id = AccuWeatherProvider.id;
    static accuWeatherApiKey = AccuWeatherProvider.readAccuWeatherApiKeySetting();

    public static getSettings() {
        return [
            {
                type: 'prompt',
                valueType: 'string',
                id: 'setting',
                key: API_KEY_SETTING,
                default: () => AccuWeatherProvider.accuWeatherApiKey,
                description: lc('api_key_required'),
                title: lc('api_key')
            }
        ];
    }

    private static async fetch<T = any>(endpoint: string, queryParams: any = {}) {
        return request<T>({
            url: `https://dataservice.accuweather.com/${endpoint}`,
            method: 'GET',
            queryParams: {
                apikey: AccuWeatherProvider.accuWeatherApiKey,
                language: lang,
                details: true,
                metric: true,
                ...queryParams
            },
            headers: {
                'Cache-Control': `max-age=${60 * 5}`
            }
        });
    }

    private static async getLocationKey(lat: number, lon: number): Promise<string> {
        const result = await AccuWeatherProvider.fetch<any>(`locations/v1/cities/geoposition/search`, {
            q: `${lat},${lon}`
        });
        return result.content.Key;
    }

    public override async getWeather(weatherLocation: WeatherLocation, { current, minutely, warnings }: { warnings?: boolean; minutely?: boolean; current?: boolean } = {}) {
        const coords = weatherLocation.coord;
        const feelsLikeTemperatures = ApplicationSettings.getBoolean('feels_like_temperatures', FEELS_LIKE_TEMPERATURE);
        const forecast_days = ApplicationSettings.getNumber('forecast_nb_days', NB_DAYS_FORECAST);
        const forecast_hours = ApplicationSettings.getNumber('forecast_nb_hours', NB_HOURS_FORECAST);

        // Get location key for AccuWeather
        const locationKey = await AccuWeatherProvider.getLocationKey(coords.lat, coords.lon);

        // Fetch current conditions
        const currentResult = await AccuWeatherProvider.fetch<any[]>(`currentconditions/v1/${locationKey}`);
        const currentConditions = currentResult.content[0];

        // Fetch hourly forecast (12 hours)
        const hourlyResult = await AccuWeatherProvider.fetch<any[]>(`forecasts/v1/hourly/12hour/${locationKey}`);

        // Fetch daily forecast (5 days)
        const dailyResult = await AccuWeatherProvider.fetch<any>(`forecasts/v1/daily/5day/${locationKey}`);

        const r = {
            time: Date.now(),
            currently: weatherDataIconColors(
                {
                    time: currentConditions.EpochTime * 1000,
                    temperature: feelsLikeTemperatures ? currentConditions.RealFeelTemperature.Metric.Value : currentConditions.Temperature.Metric.Value,
                    apparentTemperature: currentConditions.RealFeelTemperature.Metric.Value,
                    usingFeelsLike: feelsLikeTemperatures,
                    sealevelPressure: currentConditions.Pressure.Metric.Value,
                    relativeHumidity: currentConditions.RelativeHumidity,
                    dewpoint: currentConditions.DewPoint.Metric.Value,
                    cloudCover: currentConditions.CloudCover,
                    // AccuWeather returns wind speeds in km/h when metric=true, no conversion needed
                    windSpeed: currentConditions.Wind.Speed.Metric.Value,
                    windGust: currentConditions.WindGust?.Speed.Metric.Value || 0,
                    windBearing: currentConditions.Wind.Direction.Degrees,
                    uvIndex: currentConditions.UVIndex,
                    isDay: currentConditions.IsDayTime,
                    iconId: mapAccuWeatherIcon(currentConditions.WeatherIcon, currentConditions.IsDayTime),
                    description: titlecase(currentConditions.WeatherText)
                } as Currently,
                WeatherDataType.CURRENT,
                coords
            ),
            daily: {
                data: dailyResult.content.DailyForecasts.slice(0, forecast_days).map((data) => {
                    const d = {} as DailyData;
                    d.time = getStartOfDay(data.EpochDate * 1000, weatherLocation.timezoneOffset).valueOf();
                    d.isDay = true;
                    d.iconId = mapAccuWeatherIcon(data.Day.Icon, true);
                    d.description = titlecase(data.Day.IconPhrase);
                    // AccuWeather returns wind speeds in km/h when metric=true, no conversion needed
                    d.windSpeed = Math.round(data.Day.Wind.Speed.Value);
                    d.windGust = Math.round(data.Day.WindGust?.Speed.Value || 0);
                    d.temperatureMin = data.Temperature.Minimum.Value;
                    d.temperatureMax = data.Temperature.Maximum.Value;
                    d.apparentTemperature = data.RealFeelTemperature.Maximum.Value;

                    d.precipProbability = data.Day.PrecipitationProbability;
                    d.cloudCover = data.Day.CloudCover || 0;
                    d.windBearing = data.Day.Wind.Direction.Degrees;

                    const rainAmount = data.Day.Rain?.Value || 0;
                    const snowAmount = data.Day.Snow?.Value || 0;
                    d.precipAccumulation = rainAmount + snowAmount;
                    d.rain = rainAmount;
                    d.snowfall = snowAmount;

                    if (data.Sun) {
                        d.sunriseTime = data.Sun.EpochRise * 1000;
                        d.sunsetTime = data.Sun.EpochSet * 1000;
                    }

                    // Get AQI if available
                    if (data.AirAndPollen) {
                        const aqiData = data.AirAndPollen.find((item) => item.Name === 'AirQuality');
                        if (aqiData) {
                            d.aqi = aqiData.Value;
                        }
                    }

                    weatherDataIconColors(d, WeatherDataType.DAILY, coords, rainAmount, snowAmount);

                    return d;
                })
            },
            minutely: {
                data: []
            },
            alerts: []
        } as WeatherData;

        if (hourlyResult.content) {
            const hourlyLastIndex = Math.min(hourlyResult.content.length, forecast_hours) - 1;
            r.hourly = hourlyResult.content.slice(0, hourlyLastIndex + 1).map((data, index) => {
                const d = {} as Hourly;
                d.time = data.EpochDateTime * 1000;
                d.isDay = data.IsDaylight;
                d.iconId = mapAccuWeatherIcon(data.WeatherIcon, data.IsDaylight);
                d.description = titlecase(data.IconPhrase);
                // AccuWeather returns wind speeds in km/h when metric=true, no conversion needed
                d.windSpeed = Math.round(data.Wind.Speed.Value);
                d.windGust = Math.round(data.WindGust?.Speed.Value || 0);
                d.temperature = feelsLikeTemperatures ? data.RealFeelTemperature.Value : data.Temperature.Value;
                d.apparentTemperature = data.RealFeelTemperature.Value;
                d.usingFeelsLike = feelsLikeTemperatures;
                d.uvIndex = data.UVIndex;

                d.windBearing = data.Wind.Direction.Degrees;

                const rainAmount = data.Rain?.Value || 0;
                const snowAmount = data.Snow?.Value || 0;
                d.rain = rainAmount;
                d.snowfall = snowAmount;
                d.precipAccumulation = rainAmount + snowAmount;
                d.precipProbability = data.PrecipitationProbability;

                if (data.RainProbability || data.SnowProbability || data.IceProbability) {
                    d.precipProbabilities = {
                        rain: data.RainProbability || 0,
                        snow: data.SnowProbability || 0,
                        ice: data.IceProbability || 0
                    };
                }

                d.cloudCover = data.CloudCover;
                d.relativeHumidity = data.RelativeHumidity;
                d.dewpoint = data.DewPoint.Value;

                weatherDataIconColors(d, WeatherDataType.HOURLY, coords, rainAmount, snowAmount);

                return d;
            });
        }

        return r;
    }

    static readAccuWeatherApiKeySetting() {
        let key = ApplicationSettings.getString(API_KEY_SETTING);
        if (!key || key?.length === 0) {
            ApplicationSettings.remove(API_KEY_SETTING);
            key = null;
        }
        return key?.trim();
    }

    public static setApiKey(apiKey: string) {
        AccuWeatherProvider.accuWeatherApiKey = apiKey?.trim();
        if (AccuWeatherProvider.accuWeatherApiKey?.length) {
            ApplicationSettings.setString(API_KEY_SETTING, AccuWeatherProvider.accuWeatherApiKey);
        } else {
            ApplicationSettings.remove(API_KEY_SETTING);
        }
    }

    public static requiresApiKey() {
        return true;
    }
    public static hasApiKey() {
        return !!AccuWeatherProvider.accuWeatherApiKey && AccuWeatherProvider.accuWeatherApiKey.length && AccuWeatherProvider.accuWeatherApiKey !== ACCUWEATHER_DEFAULT_KEY;
    }

    public static getApiKey() {
        return AccuWeatherProvider.accuWeatherApiKey;
    }
}

prefs.on(`key:${API_KEY_SETTING}`, (event) => {
    AccuWeatherProvider.accuWeatherApiKey = AccuWeatherProvider.readAccuWeatherApiKeySetting();
});

// Air Quality Provider implementation
export class AccuWeatherAQIProvider extends AirQualityProvider {
    static id = 'accuweather_aqi';
    id = AccuWeatherAQIProvider.id;

    constructor() {
        super();
    }

    static getUrl() {
        return 'https://accuweather.com';
    }

    private static async fetch<T = any>(endpoint: string, queryParams: any = {}) {
        return request<T>({
            url: `https://dataservice.accuweather.com/${endpoint}`,
            method: 'GET',
            queryParams: {
                apikey: AccuWeatherProvider.accuWeatherApiKey,
                details: true,
                ...queryParams
            },
            headers: {
                'Cache-Control': `max-age=${60 * 5}`
            }
        });
    }

    private static async getLocationKey(lat: number, lon: number): Promise<string> {
        const result = await AccuWeatherAQIProvider.fetch<any>(`locations/v1/cities/geoposition/search`, {
            q: `${lat},${lon}`
        });
        return result.content.Key;
    }

    public override async getAirQuality(
        weatherLocation: WeatherLocation,
        options?: { model?: string; warnings?: boolean; minutely?: boolean; hourly?: boolean; current?: boolean; forceModel?: boolean }
    ): Promise<AirQualityData> {
        const coords = weatherLocation.coord;
        const locationKey = await AccuWeatherAQIProvider.getLocationKey(coords.lat, coords.lon);

        // Fetch air quality observations
        const aqResult = await AccuWeatherAQIProvider.fetch<any[]>(`airquality/v2/observations/${locationKey}`);

        const currentAQ = aqResult.content[0];

        const r = {
            time: Date.now(),
            hourly: []
        } as AirQualityData;

        if (currentAQ) {
            r.currently = {
                time: currentAQ.EpochDateTime * 1000,
                aqi: currentAQ.Index,
                pollutants: {}
            } as CommonAirQualityData;

            // Map pollutants if available
            if (currentAQ.ParticulateMatter2_5 !== undefined) {
                r.currently.pollutants[Pollutants.PM25] = {
                    unit: 'μg/m³',
                    value: currentAQ.ParticulateMatter2_5
                };
            }
            if (currentAQ.ParticulateMatter10 !== undefined) {
                r.currently.pollutants[Pollutants.PM10] = {
                    unit: 'μg/m³',
                    value: currentAQ.ParticulateMatter10
                };
            }
            if (currentAQ.Ozone !== undefined) {
                r.currently.pollutants[Pollutants.O3] = {
                    unit: 'μg/m³',
                    value: currentAQ.Ozone
                };
            }
            if (currentAQ.CarbonMonoxide !== undefined) {
                r.currently.pollutants[Pollutants.CO] = {
                    unit: 'μg/m³',
                    value: currentAQ.CarbonMonoxide
                };
            }
            if (currentAQ.NitrogenDioxide !== undefined) {
                r.currently.pollutants[Pollutants.NO2] = {
                    unit: 'μg/m³',
                    value: currentAQ.NitrogenDioxide
                };
            }
            if (currentAQ.SulfurDioxide !== undefined) {
                r.currently.pollutants[Pollutants.SO2] = {
                    unit: 'μg/m³',
                    value: currentAQ.SulfurDioxide
                };
            }
        }

        return r;
    }
}
