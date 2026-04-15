import { ApplicationSettings } from '@nativescript/core';
import { FEELS_LIKE_TEMPERATURE, NB_DAYS_FORECAST, NB_HOURS_FORECAST, NB_MINUTES_FORECAST } from '~/helpers/constants';
import { WeatherDataType, aqiDataIconColors, weatherDataIconColors } from '~/helpers/formatter';
import { getStartOfDay, l, lc } from '~/helpers/locale';
import { Pollutants, prepareAirQualityData } from '../airQualityData';
import { WeatherLocation, request } from '../api';
import { WeatherProps, weatherDataService } from '../weatherData';
import { AirQualityProvider } from './airqualityprovider';
import { Forecast } from './openmeteo';
import { AirQualityCurrently, AirQualityData, CommonAirQualityData, Currently, DailyData, Hourly, MinutelyData, WeatherData } from './weather';
import { WeatherProvider } from './weatherprovider';
// import { Coord, Dailyforecast, Forecast, MFCurrent, MFForecastResult, MFMinutely, MFWarnings, Probabilityforecast } from './meteofrance';

// const mfApiKey = getString('mfApiKey', MF_DEFAULT_KEY);

export const SETTINGS_OM_PREFERED_MODEL = 'open_meteo_prefered_model';
export const SETTINGS_OM_AUGMENT_WITH_BEST_MATCH = 'open_meteo_angment_best_match';
export const DEFAULT_OM_PREFERED_MODEL = 'best_match';

const KEY_MAPPING = {
    european_aqi: 'aqi',
    ozone: Pollutants.O3,
    sulphur_dioxide: Pollutants.SO2,
    nitrogen_dioxide: Pollutants.NO2,
    carbon_monoxide: Pollutants.CO,
    ammonia: Pollutants.NH3
};

export enum OpenMeteoModels {
    best_match = 'Best match',
    ecmwf_ifs = 'ECMWF IFS HRES 9km',
    ecmwf_ifs04 = 'ECMWF IFS 0.4°',
    ecmwf_ifs025 = 'ECMWF IFS 0.25°',
    ecmwf_aifs025 = 'ECMWF AIFS 0.25°',
    ecmwf_aifs025_single = 'ECMWF AIFS 0.25° Single',
    cma_grapes_global = 'CMA GRAPES Global',
    bom_access_global = 'BOM Access Global',
    metno_nordic = 'MET Norway Nordic',
    metno_seamless = 'MET Norway Nordic Seamless (with ECMWF)',
    gfs_seamless = 'NCEP GFS Seamless',
    gfs_global = 'NCEP GFS Global 0.11°/0.25°',
    gfs_hrrr = 'NCEP HRRR U.S. Conus',
    gfs_graphcast025 = 'GFS GraphCast',
    icon_seamless = 'DWD Icon Seamless',
    icon_global = 'DWD Icon Global',
    icon_eu = 'DWD Icon EU',
    icon_d2 = 'DWD Icon D2',
    gem_seamless = 'GEM Seamless',
    gem_global = 'GEM Global',
    gem_regional = 'GEM Regional',
    gem_hrdps_continental = 'GEM HRDPS Continental',
    gem_hrdps_west = 'GEM HRDPS West',
    meteofrance_seamless = 'MeteoFrance Seamless',
    meteofrance_arpege_world = 'MeteoFrance Arpege World',
    meteofrance_arpege_europe = 'MeteoFrance Arpege Europe',
    meteofrance_arome_france = ' MeteoFrance Arome France',
    meteofrance_arome_france_hd = 'MeteoFrance Arome France HD',
    ukmo_seamless = 'UK Met Office Seamless',
    ukmo_global_deterministic_10km = 'UK Met Office Global 10km',
    ukmo_uk_deterministic_2km = 'UK Met Office UK 2km',
    ncep_nbm_conus = 'NCEP NBM U.S. Conus',
    ncep_nam_conus = 'NCEP NAM U.S. Conus',
    jma_seamless = 'JMA Seamless',
    jma_msm = 'JMA MSM',
    jma_gsm = 'JMA GSM',
    knmi_seamless = 'KNMI Seamless (with ECMWF)',
    knmi_harmonie_arome_europe = 'KNMI Harmonie Arome Europe',
    knmi_harmonie_arome_netherlands = 'KNMI Harmonie Arome Netherlands',
    dmi_seamless = 'DMI Seamless (with ECMWF)',
    dmi_harmonie_arome_europe = 'DMI Harmonie Arome Europe',
    meteoswiss_icon_seamless = 'MeteoSwiss ICON Seamless',
    meteoswiss_icon_ch1 = 'MeteoSwiss ICON CH1',
    meteoswiss_icon_ch2 = 'MeteoSwiss ICON CH2',
    italia_meteo_arpae_icon_2i = 'ItaliaMeteo ARPAE ICON 2I',
    kma_seamless = 'KMA Seamless',
    kma_ldps = 'KMA LDPS',
    kma_gdps = 'KMA GDPS'
}

export const API_KEY_VALUES = {
    forecast: ({ current, currentData, feelsLikeTemperatures, minutely }: { currentData: WeatherProps[]; feelsLikeTemperatures: boolean; current: boolean; minutely: boolean }) => ({
        hourly:
            'precipitation_probability,precipitation,rain,showers,snow_depth,snowfall,weathercode,is_day,uv_index' +
            (currentData.includes(WeatherProps.windSpeed) ? ',windspeed_10m,winddirection_10m' : '') +
            (currentData.includes(WeatherProps.windGust) ? ',windgusts_10m' : '') +
            (currentData.includes(WeatherProps.cloudCover) ? ',cloudcover' : '') +
            (currentData.includes(WeatherProps.snowDepth) ? ',snow_depth' : '') +
            (currentData.includes(WeatherProps.dewpoint) ? ',dew_point_2m' : '') +
            (currentData.includes(WeatherProps.iso) ? ',freezinglevel_height' : '') +
            (currentData.includes(WeatherProps.sealevelPressure) ? ',pressure_msl' : '') +
            (currentData.includes(WeatherProps.relativeHumidity) ? ',relative_humidity_2m' : '') +
            (currentData.includes(WeatherProps.apparentTemperature) && !feelsLikeTemperatures
                ? ',apparent_temperature,temperature_2m'
                : feelsLikeTemperatures
                  ? ',apparent_temperature'
                  : ',temperature_2m'),
        current:
            current !== false
                ? 'weathercode,is_day' +
                  (currentData.includes(WeatherProps.apparentTemperature) && !feelsLikeTemperatures
                      ? ',apparent_temperature,temperature_2m'
                      : feelsLikeTemperatures
                        ? ',apparent_temperature'
                        : ',temperature_2m') +
                  (currentData.includes(WeatherProps.windSpeed) ? ',windspeed_10m,winddirection_10m' : '') +
                  (currentData.includes(WeatherProps.windGust) ? ',windgusts_10m' : '') +
                  (currentData.includes(WeatherProps.cloudCover) ? ',cloudcover' : '') +
                  (currentData.includes(WeatherProps.sealevelPressure) ? ',pressure_msl' : '') +
                  (currentData.includes(WeatherProps.relativeHumidity) ? ',relative_humidity_2m' : '')
                : undefined,
        minutely_15: minutely !== false ? 'precipitation' : undefined,
        past_days: 1,
        daily:
            'weathercode,uv_index_max,precipitation_sum,precipitation_probability_max,rain_sum,snowfall_sum,showers_sum' +
            (currentData.includes(WeatherProps.apparentTemperature) && !feelsLikeTemperatures
                ? ',apparent_temperature_max,apparent_temperature_min,temperature_2m_max,temperature_2m_min'
                : feelsLikeTemperatures
                  ? ',apparent_temperature_max,apparent_temperature_min'
                  : ',temperature_2m_max,temperature_2m_min') +
            (currentData.includes(WeatherProps.windSpeed) ? ',windspeed_10m_max,winddirection_10m_dominant' : '') +
            (currentData.includes(WeatherProps.relativeHumidity) ? ',relative_humidity_2m_mean' : '') +
            (currentData.includes(WeatherProps.windGust) ? ',windgusts_10m_max' : '')
    }),
    'air-quality': ({ current }) => ({
        hourly: 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
        current: current !== false ? 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone' : undefined
        // daily: 'european_aqi'
    })
};
export const API_MAX_VALUES = {
    forecast: {
        forecast_days: 16,
        forecast_hours: 384
    },
    'air-quality': {
        forecast_days: 7,
        forecast_hours: 168
    }
};

export function getOMPreferredModel() {
    return ApplicationSettings.getString(SETTINGS_OM_PREFERED_MODEL, DEFAULT_OM_PREFERED_MODEL) as OpenMeteoModels;
}

export class OMProvider extends WeatherProvider implements AirQualityProvider {
    static id = 'openmeteo';
    id = OMProvider.id;
    getModels() {
        return OpenMeteoModels;
    }

    getModelName(key) {
        return OpenMeteoModels[key];
    }

    static getUrl() {
        return 'https://open-meteo.com';
    }
    public static getSettings() {
        return [
            {
                key: SETTINGS_OM_PREFERED_MODEL,
                id: 'setting',
                valueType: 'string',
                description: () => OpenMeteoModels[getOMPreferredModel()],
                title: lc('open_meteo_prefered_model'),
                currentValue: getOMPreferredModel,
                values: Object.keys(OpenMeteoModels).map((t) => ({ value: t, title: OpenMeteoModels[t] }))
            },
            {
                type: 'switch',
                id: SETTINGS_OM_AUGMENT_WITH_BEST_MATCH,
                title: lc('open_meteo_augment_model'),
                description: lc('open_meteo_augment_model_desc'),
                value: ApplicationSettings.getBoolean(SETTINGS_OM_AUGMENT_WITH_BEST_MATCH, true)
            }
        ];
    }
    private static readonly weatherCodeDescription = {
        0: l('clear'),
        1: l('mostly_clear'),
        2: l('partly_cloudy'),
        3: l('cloudy'),
        45: l('fog'),
        48: l('freezing_fog'),
        51: l('light_drizzle'),
        53: l('drizzle'),
        55: l('heavy_drizzle'),
        56: l('light_freezing_drizzle'),
        57: l('freezing_drizzle'),
        61: l('light_rain'),
        63: l('rain'),
        65: l('heavy_rain'),
        66: l('light_freezing_rain'),
        67: l('freezing_rain'),
        71: l('light_snow'),
        73: l('snow'),
        75: l('heavy_snow'),
        77: l('snow_grains'),
        80: l('light_rain_shower'),
        81: l('rain_shower'),
        82: l('heavy_rain_shower'),
        85: l('snow_shower'),
        86: l('heavy_snow_shower'),
        95: l('thunderstorm'),
        96: l('hailstorm'),
        99: l('heavy_hailstorm')
    };

    private convertWeatherCodeToIcon(code: number) {
        // const actualCode = code % 100;
        switch (code) {
            case 0:
            case 1:
                return 800;
            case 2:
                return 802;
            case 3:
                return 804;
            case 45:
            case 48:
                return 741;
            case 51:
            case 56:
                return 300;
            case 53:
            case 57:
                return 310;
            case 55:
                return 321;
            case 61:
                return 500;
            case 63:
            case 66:
                return 502;
            case 65:
            case 67:
                return 504;
            case 80:
            case 81:
                return 520;
            case 82:
                return 530;

            case 71:
                return 600;
            case 73:
            case 85:
                return 601;
            case 75:
            case 86:
                return 602;
            case 77:
                return 611;
            case 95:
                return 200;
            case 96:
                return 210;
            case 97:
            case 99:
                return 202;
        }
    }

    // https://api.open-meteo.com/v1/forecast?latitude=45.18&longitude=5.71&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,weathercode,cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,windspeed_10m,winddirection_10m,windgusts_10m,uv_index,uv_index_clear_sky&models=best_match&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant&timeformat=unixtime&forecast_days=14&timezone=auto
    private async fetch<T = any>(
        apiName: string = 'forecast',
        queryParams: OMParams = {},
        { current, minutely, warnings, weatherProps }: { warnings?: boolean; minutely?: boolean; current?: boolean; weatherProps?: WeatherProps[] } = {},
        subdomain = 'api'
    ) {
        const feelsLikeTemperatures = ApplicationSettings.getBoolean('feels_like_temperatures', FEELS_LIKE_TEMPERATURE);
        const forecast_days = ApplicationSettings.getNumber('forecast_nb_days', NB_DAYS_FORECAST);
        const forecast_hours = ApplicationSettings.getNumber('forecast_nb_hours', NB_HOURS_FORECAST);
        const forecast_minutely_15 = Math.round(ApplicationSettings.getNumber('forecast_nb_minutes', NB_MINUTES_FORECAST) / 15);
        const currentData = weatherDataService.allWeatherData.concat(weatherProps || []);
        const apikeyValues = API_KEY_VALUES[apiName]({ feelsLikeTemperatures, current, minutely, currentData });
        return request<T>({
            url: `https://${subdomain}.open-meteo.com/v1/${apiName}`,
            method: 'GET',
            queryParams: {
                forecast_days: Math.min(API_MAX_VALUES[apiName].forecast_days, forecast_days),
                forecast_hours: Math.min(API_MAX_VALUES[apiName].forecast_hours, forecast_hours),
                forecast_minutely_15,
                ...apikeyValues,
                timeformat: 'unixtime',
                ...queryParams
            },
            headers: {
                'Cache-Control': `max-age=${60 * 5}`
            }
        });
    }

    private getDataArray(object: any, key: string, model: string = 'best_match') {
        if (model !== 'best_match') {
            return object[key + '_' + model] ?? object[key + '_best_match'] ?? object[key];
        } else {
            return object[key];
        }
    }
    private getDataArrayValue(object: any, key: string, model: string = 'best_match', index): number {
        if (model !== 'best_match') {
            return object[key + '_' + model]?.[index] ?? object[key + '_best_match']?.[index] ?? object[key]?.[index];
        } else {
            return object[key]?.[index];
        }
    }

    private getMixedDataArray(object: any, key: string, model: string = 'best_match') {
        const result = (object[key + '_best_match'] ?? object[key]).slice();
        const modelObj = object[key + '_' + model];
        if (modelObj) {
            for (let index = 0; index < Math.min(modelObj.length, result.length); index++) {
                const element = modelObj[index];
                if (element) {
                    result[index] = element;
                }
            }
        }
        return result;
    }

    public override async getWeather(
        weatherLocation: WeatherLocation,
        {
            current,
            forceModel = !ApplicationSettings.getBoolean(SETTINGS_OM_AUGMENT_WITH_BEST_MATCH, true),
            minutely,
            model = getOMPreferredModel(),
            warnings,
            weatherProps
        }: { warnings?: boolean; minutely?: boolean; current?: boolean; model?: string; forceModel?: boolean; weatherProps?: WeatherProps[] } = {}
    ) {
        DEV_LOG && console.log('getWeather', forceModel, ApplicationSettings.getBoolean(SETTINGS_OM_AUGMENT_WITH_BEST_MATCH, true));
        const feelsLikeTemperatures = ApplicationSettings.getBoolean('feels_like_temperatures', FEELS_LIKE_TEMPERATURE);
        const coords = weatherLocation.coord;
        let models = 'best_match';
        if (model !== 'best_match') {
            if (forceModel === true) {
                models = model;
            } else {
                models += ',' + model;
            }
        }
        const result = await this.fetch<Forecast>(
            'forecast',
            { latitude: coords.lat, longitude: coords.lon, timezone: weatherLocation.timezone, models },
            { current, warnings, minutely, weatherProps }
        );
        const forecast = result.content;
        // console.log('forecast', Object.keys(forecast));
        // console.log('rain', JSON.stringify(rain));
        // console.log('current', JSON.stringify(current));
        // console.log('warnings', JSON.stringify(warnings));
        const hourly = forecast.hourly;
        // console.log('hourly', JSON.stringify(hourly));
        const hourly_weathercodes = this.getMixedDataArray(hourly, 'weathercode', model);
        let hourlyLastIndex = hourly_weathercodes.findIndex((d) => d === null);
        // if (hourlyLastIndex === -1) {
        hourlyLastIndex = hourly_weathercodes.length - 1;
        // }
        const hourlyData = hourly.time.slice(0, hourlyLastIndex).map((time, index) => {
            const d = {} as Hourly;
            d.time = time * 1000;
            const code = hourly_weathercodes[index];
            d.isDay = !!this.getDataArrayValue(hourly, 'is_day', model, index);
            d.iconId = this.convertWeatherCodeToIcon(code);
            d.description = OMProvider.weatherCodeDescription[code];
            const apparentTemperature = this.getDataArrayValue(hourly, 'apparent_temperature', model, index);
            if (apparentTemperature !== undefined) {
                d.apparentTemperature = apparentTemperature;
            }
            d.temperature = this.getDataArrayValue(hourly, feelsLikeTemperatures ? 'apparent_temperature' : 'temperature_2m', model, index);
            d.uvIndex = this.getDataArrayValue(hourly, 'uv_index', model, index);

            d.usingFeelsLike = feelsLikeTemperatures;
            const windBearing = this.getDataArrayValue(hourly, 'winddirection_10m', model, index);
            if (windBearing !== undefined) {
                d.windBearing = windBearing;
            }
            const precipitation_probability = this.getDataArrayValue(hourly, 'precipitation_probability', model, index);
            d.precipProbability = precipitation_probability ?? -1;

            const snowfall = this.getDataArrayValue(hourly, 'snowfall', model, index);
            if (snowfall !== undefined) {
                //we want it in mm
                d.snowfall = snowfall * 10;
            }
            const rain = this.getDataArrayValue(hourly, 'rain', model, index);
            const showers = this.getDataArrayValue(hourly, 'showers', model, index);
            if (rain !== undefined || snowfall !== undefined) {
                d.rain = (rain ?? 0) + (showers ?? 0);
            }

            d.precipAccumulation = d.rain + d.snowfall;
            // const precipitation = this.getDataArray(hourly, 'precipitation', model);
            // if (hasNext && precipitation) {
            //     d.precipAccumulation = precipitation[index + 1] ?? 0;
            // }
            // }

            const cloudcover = this.getDataArrayValue(hourly, 'cloudcover', model, index);
            if (cloudcover !== undefined) {
                d.cloudCover = cloudcover;
            }
            const windspeed_10m = this.getDataArrayValue(hourly, 'windspeed_10m', model, index);
            if (windspeed_10m !== undefined) {
                d.windSpeed = windspeed_10m;
            }

            const windgusts_10m = this.getDataArrayValue(hourly, 'windgusts_10m', model, index);
            if (windgusts_10m !== undefined) {
                d.windGust = windgusts_10m;
            }
            const snow_depth = this.getDataArrayValue(hourly, 'snow_depth', model, index);
            if (snow_depth !== undefined) {
                d.snowDepth = snow_depth;
            }
            const freezinglevel_height = this.getDataArrayValue(hourly, 'freezinglevel_height', model, index);
            if (freezinglevel_height !== undefined) {
                d.iso = freezinglevel_height;
            }
            const dew_point_2m = this.getDataArrayValue(hourly, 'dew_point_2m', model, index);
            if (dew_point_2m !== undefined) {
                d.dewpoint = dew_point_2m;
            }
            const pressure_msl = this.getDataArrayValue(hourly, 'pressure_msl', model, index);
            if (pressure_msl !== undefined) {
                d.sealevelPressure = pressure_msl;
            }
            const relative_humidity_2m = this.getDataArrayValue(hourly, 'relative_humidity_2m', model, index);
            if (relative_humidity_2m !== undefined) {
                d.relativeHumidity = relative_humidity_2m;
            }
            // d.pressure = data.pressure;
            // DEV_LOG && console.log('test', dayjs(d.time), code, d.iconId, d.temperature, d.precipProbability, d.precipAccumulation, d.rain, d.snowfall);
            return weatherDataIconColors(d, WeatherDataType.HOURLY, weatherLocation.coord, d.rain, d.snowfall);
        });

        const minutely_15 = forecast.minutely_15;
        // minutely data starts at the start of the day!
        const minutelyPrecipitation = minutely_15 ? this.getDataArray(minutely_15, 'precipitation', model) : undefined;
        const minutelyData = minutelyPrecipitation
            ? minutely_15.time.map((time, index) => {
                  const hasNext = index < minutely_15.time.length;
                  const d = {} as MinutelyData;
                  d.time = time * 1000;
                  // for now we only handle precipitation
                  //   if (hasNext) {
                  const precipitation = minutelyPrecipitation[index] || -1;
                  d.intensity = precipitation >= 1.5 ? 3 : precipitation >= 0.7 ? 2 : precipitation > 0 ? 1 : 0;
                  //   }
                  return d;
              })
            : undefined;
        const currentData = forecast.current;
        const daily = forecast.daily;
        const daily_weathercodes = this.getMixedDataArray(daily, 'weathercode', model);
        const dailyLastIndex = daily_weathercodes.findIndex((d) => d === null);
        const r = {
            time: Date.now(), // we use phone local current time as reference
            // time: result.time,
            currently: currentData
                ? weatherDataIconColors(
                      {
                          time: currentData.time * 1000,
                          temperature: feelsLikeTemperatures ? currentData.apparent_temperature : currentData.temperature_2m,
                          apparentTemperature: currentData.apparent_temperature,
                          usingFeelsLike: feelsLikeTemperatures,
                          windSpeed: currentData.windspeed_10m,
                          relativeHumidity: currentData.relative_humidity_2m,
                          sealevelPressure: currentData.pressure_msl,
                          cloudCover: currentData.cloudcover,
                          isDay: !!currentData.is_day,
                          windBearing: currentData.winddirection_10m,
                          iconId: this.convertWeatherCodeToIcon(currentData.weathercode),
                          description: OMProvider.weatherCodeDescription[currentData.weathercode]
                      } as Currently,
                      WeatherDataType.CURRENT,
                      coords
                  )
                : {},
            daily: {
                data: daily.time.slice(0, dailyLastIndex).map((time, index) => {
                    const code = daily_weathercodes[index];
                    const d = {
                        time: time * 1000,
                        description: OMProvider.weatherCodeDescription[code],
                        isDay: true,
                        iconId: this.convertWeatherCodeToIcon(code),
                        apparentTemperatureMax: this.getDataArrayValue(daily, 'apparent_temperature_max', model, index),
                        apparentTemperatureMin: this.getDataArrayValue(daily, 'apparent_temperature_min', model, index),
                        temperatureMax: this.getDataArrayValue(daily, feelsLikeTemperatures ? 'apparent_temperature_max' : 'temperature_2m_max', model, index),
                        temperatureMin: this.getDataArrayValue(daily, feelsLikeTemperatures ? 'apparent_temperature_min' : 'temperature_2m_min', model, index),
                        usingFeelsLike: feelsLikeTemperatures,
                        relativeHumidity: this.getDataArrayValue(daily, 'relative_humidity_2m_mean', model, index),
                        uvIndex: Math.ceil(this.getDataArrayValue(daily, 'uv_index_max', model, index)),
                        windGust: Math.round(this.getDataArrayValue(daily, 'windgusts_10m_max', model, index)),
                        windSpeed: Math.round(this.getDataArrayValue(daily, 'windspeed_10m_max', model, index)),
                        windBearing: Math.round(this.getDataArrayValue(daily, 'winddirection_10m_dominant', model, index)),
                        precipProbability: this.getDataArrayValue(daily, 'precipitation_probability_max', model, index),
                        precipAccumulation: this.getDataArrayValue(daily, 'precipitation_sum', model, index)
                        // cloudCover: Math.round(daily.clou),
                        // sunriseTime: dailyForecast.sun.rise * 1000,
                        // sunsetTime: dailyForecast.sun.set * 1000
                    } as DailyData;
                    // if (precipProbability > 0) {
                    //     d.precipProbability = precipProbability;
                    // }
                    // const precipAccumulation = Math.max(precipitationTotal, dailyForecast.precipitation['24h']);
                    // if (precipAccumulation > 0) {
                    //     d.precipAccumulation = precipAccumulation;
                    // }
                    // if (rainSnowLimitTotal.count > 0) {
                    //     d.rainSnowLimit = Math.round(rainSnowLimitTotal.total / rainSnowLimitTotal.count);
                    // }
                    // if (isoTotal.count > 0) {
                    //     d.iso = Math.round(isoTotal.total / isoTotal.count);
                    // }
                    d.rain = (this.getDataArrayValue(daily, 'showers_sum', model, index) || 0) + (this.getDataArrayValue(daily, 'rain_sum', model, index) || 0);
                    d.snowfall = this.getDataArrayValue(daily, 'snowfall_sum', model, index) * 10;
                    d.precipAccumulation = d.rain + d.snowfall;
                    // const propRain = Math.round(probSnowPrecipitationTotal.total / (probSnowPrecipitationTotal.count || 1));
                    // const propSnow = Math.round(probSnowPrecipitationTotal.total / (probSnowPrecipitationTotal.count || 1));
                    weatherDataIconColors(d, WeatherDataType.DAILY, weatherLocation.coord, d.rain, d.snowfall);
                    return d;
                })
            },
            minutely: {
                data: minutelyData
            },
            alerts: []
        } as WeatherData;
        r.hourly = hourlyData;
        // DEV_LOG && console.log('om getWeather', JSON.stringify(r));
        return r;
    }

    async getAirQuality(weatherLocation: WeatherLocation, { current, minutely }: { minutely?: boolean; current?: boolean } = {}): Promise<AirQualityData> {
        const coords = weatherLocation.coord;
        const result = await this.fetch<Forecast>('air-quality', { latitude: coords.lat, longitude: coords.lon, timezone: weatherLocation.timezone }, { current, minutely }, 'air-quality-api');
        const hourly = result.content.hourly;
        const daily: { tempDatas: { [k: string]: { sum: number; count: number; unit: string; path: string } }; [k: string]: any }[] = [];
        let lastDay: { tempDatas: { [k: string]: { sum: number; count: number; unit: string; path: string } }; [k: string]: any };
        const units = result.content.hourly_units;
        const keys = new Set(Object.keys(units).filter((s) => !!s));
        keys.delete('time');
        keys.delete('interval');

        const hourlyData = hourly.time.map((time, index) => {
            const d = {} as Hourly;
            d.time = time * 1000;
            const currentDay = getStartOfDay(d.time + 60000, weatherLocation.timezoneOffset).valueOf();
            if (!lastDay || currentDay !== lastDay.time) {
                lastDay = {
                    time: currentDay,
                    tempDatas: {}
                };
                daily.push(lastDay);
            }

            keys.forEach((k) => {
                let value = this.getDataArray(hourly, k)[index];
                let actualKey: string = KEY_MAPPING[k] || k;
                let path;
                // if (actualKey === 'aqi') {
                //     d.aqi = value;
                // } else
                let unit = units[k];
                if (actualKey.endsWith('_pollen')) {
                    actualKey = actualKey.slice(0, -7);
                    path = 'pollens';
                    d.pollens = d.pollens || {};
                    d.pollens[actualKey] = { value, unit: units[k] };
                } else {
                    path = 'pollutants';
                    d.pollutants = d.pollutants || {};
                    if (k === 'carbon_monoxide') {
                        unit = 'mg/m³';
                        value /= 1000;
                    }
                    d.pollutants[actualKey] = { value, unit };
                }

                lastDay.tempDatas[actualKey] = lastDay.tempDatas[actualKey] || { sum: 0, count: 0, unit, path };
                lastDay.tempDatas[actualKey].sum += value;
                lastDay.tempDatas[actualKey].count += 1;
            });
            return prepareAirQualityData(d, lastDay);
        });

        const currentData = result.content.current;
        // const daily = result.daily;
        const lastDailyIndex = daily.findIndex((d) => d.tempDatas.aqi.count < 3);
        const r = {
            time: result.time,
            currently: currentData
                ? prepareAirQualityData(
                      Object.keys(currentData).reduce(
                          (d, k) => {
                              if (k && k !== 'time') {
                                  const actualKey: string = KEY_MAPPING[k] || k;
                                  d.pollutants = d.pollutants || {};
                                  if (k === 'carbon_monoxide') {
                                      d.pollutants[actualKey] = { value: currentData[k] / 1000, unit: units[k].slice(1) };
                                  } else {
                                      d.pollutants[actualKey] = { value: currentData[k], unit: units[k] };
                                  }
                              }
                              return d;
                          },
                          { time: currentData.time * 1000 } as Partial<Currently>
                      ) as AirQualityCurrently
                  )
                : {},
            daily: {
                data: daily.slice(0, lastDailyIndex >= 0 ? lastDailyIndex : daily.length).map((d) =>
                    aqiDataIconColors({
                        time: d.time,
                        ...Object.keys(d.tempDatas).reduce((acc, val) => {
                            const tempData = d.tempDatas[val];
                            let data = acc;
                            if (tempData.path) {
                                data = acc[tempData.path] = acc[tempData.path] || {};
                                data[val] = { value: Math.round(tempData.sum / tempData.count), unit: tempData.unit };
                            } else {
                                data[val] = Math.round(tempData.sum / tempData.count);
                            }
                            return acc;
                        }, {})
                    } as CommonAirQualityData)
                )
            },
            hourly: hourlyData
        } as AirQualityData;
        r.hourly = hourlyData;
        return r;
    }

    // private isDay(time: number, lat: number, lon: number) {
    //     const times = getTimes(new Date(time), lat, lon);
    //     return time > times.sunrise.valueOf() && time < times.sunsetStart.valueOf();
    // }
}

interface OMParams {
    latitude?: number;
    longitude?: number;
    [k: string]: any;
}
