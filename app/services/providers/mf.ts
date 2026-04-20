import { titlecase } from '@nativescript-community/l';
import { getString } from '@nativescript/core/application-settings';
import dayjs from 'dayjs';
import { WeatherDataType, weatherDataIconColors } from '~/helpers/formatter';
import { getEndOfDay, getStartOfDay, lang, lc } from '~/helpers/locale';
import { RequestResult, WeatherLocation, request } from '../api';
import type { Coord, Dailyforecast, ForecastForecast, MFCurrent, MFForecastResult, MFMinutely, MFWarnings, Probabilityforecast } from './meteofrance';
import { WeatherProvider } from './weatherprovider';
import { Alert, Currently, DailyData, Hourly, MinutelyData, WeatherData } from './weather';
import { ApplicationSettings } from '@nativescript/core';
import { NB_DAYS_FORECAST, NB_HOURS_FORECAST, NB_MINUTES_FORECAST } from '~/helpers/constants';
import { prefs } from '~/services/preferences';
import { getFile } from '@nativescript-community/https';

const mfApiKey = getString('mfApiKey', MF_DEFAULT_KEY);

interface MFParams extends Partial<Coord> {
    domain?: string;
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
        DEV_LOG && console.log('getBRA', massifId, url, this.apiKey);
        return getFile({
            url,
            method: 'GET',
            headers: {
                apikey: this.apiKey
            }
        });
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
                token: mfApiKey,
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
        let warningsData: MFWarnings;
        if (warnings !== false && forecast.properties.french_department) {
            warningsData = (
                await this.fetch<MFWarnings>('v3/warning/full', {
                    ...coords,
                    domain: forecast.properties.french_department
                }).catch((err) => null as RequestResult<MFWarnings>)
            )?.content;
        }
        // }
        // DEV_LOG && console.log('forecast', JSON.stringify(forecast));
        // DEV_LOG && console.log('rain', JSON.stringify(rain));
        // DEV_LOG && console.log('current', JSON.stringify(current));
        // DEV_LOG && console.log('warningsData', JSON.stringify(warningsData));
        const now = Date.now();
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
            alerts: warningsData
                ? warningsData.timelaps.reduce((acc, timelaps) => {
                      timelaps.timelaps_items
                          .filter((it) => it.color_id > 1 && it.end_time * 1000 > now)
                          .forEach((w) => {
                              acc.push({
                                  start: w.begin_time * 1000,
                                  end: w.end_time * 1000,
                                  event: this.getWarningType(timelaps.phenomenon_id) + ' - ' + this.getWarningText(w.color_id),
                                  description: w.color_id >= 1 ? this.getWarningContent(timelaps.phenomenon_id, warningsData) : undefined
                              } as Alert);
                          });
                      return acc;
                  }, [])
                : []
        } as WeatherData;
        r.hourly = hourlyData || [];
        return r;
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

    private getWarningColor(colorId: number) {
        switch (colorId) {
            case 4:
                return 'rgb(204, 0, 0)';
            case 3:
                return 'rgb(255, 184, 43)';
            case 2:
                return 'rgb(255, 246, 0)';
            case 1:
                return 'rgb(49, 170, 53)';
            default:
                return null;
        }
    }

    private getWarningContent(phenomenonId: string, warningsResult: MFWarnings): string {
        const consequences = warningsResult.consequences?.some((it) => it.phenomenonId === phenomenonId)?.textConsequence?.replace('<br>', '\n');
        const advices = warningsResult.advices?.some((it) => it.phenomenonId === phenomenonId)?.textAdvice?.replace('<br>', '\n');
        let content = '';
        if (consequences) {
            content += lc('possible_consequences') + ':\n' + consequences;
        }
        if (advices) {
            if (content.length) {
                content += '\n';
            }
            content += lc('behavioral_tips') + ':\n' + advices;
        }
        // if (!content.length && warningsResult.comments?.text?.length) {
        //     content = warningsResult.comments?.text[0];
        // }
        // There are also text blocks with hour by hour evaluation, but it’s way too detailed
        return content.length ? content : null;
    }

    static apiKey = MFProvider.readApiKeySetting();

    static readApiKeySetting() {
        let key = ApplicationSettings.getString(API_KEY_SETTING, MF_API_KEY);
        if (!key || key?.length === 0) {
            ApplicationSettings.remove(API_KEY_SETTING);
            key = MF_API_KEY;
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

    public static hasApiKey() {
        return MFProvider.apiKey && MFProvider.apiKey.length && MFProvider.apiKey !== ACCUWEATHER_DEFAULT_KEY;
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
