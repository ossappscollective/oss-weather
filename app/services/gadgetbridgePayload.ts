import { getMoonTimes, getTimes } from 'suncalc';
import { getMoonPhaseDegrees } from '~/helpers/moon';
import type { WeatherLocation } from '~/services/api';
import type { CommonWeatherData, DailyData, Hourly, WeatherData } from '~/services/providers/weather';

/**
 * Gadgetbridge weather payload builders.
 *
 * The shape follows Gadgetbridge's `WeatherSpec` (see
 * https://gadgetbridge.org/internals/development/weather-support/): temperatures in Kelvin,
 * timestamps in seconds, wind speed in km/h, condition codes are OpenWeatherMap codes.
 * The native side only gzips the JSON produced here and broadcasts it.
 */

const MAX_DAILY_FORECASTS = 8;
const MAX_HOURLY_FORECASTS = 48;

export interface GadgetbridgeAirQuality {
    aqi: number;
    co?: number;
    no2?: number;
    o3?: number;
    pm10?: number;
    pm25?: number;
    so2?: number;
}

export interface GadgetbridgeDaily {
    conditionCode: number;
    maxTemp: number;
    minTemp: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    uvIndex: number;
    precipProbability: number;
    sunRise?: number;
    sunSet?: number;
    moonRise?: number;
    moonSet?: number;
    moonPhase?: number;
    airQuality?: GadgetbridgeAirQuality;
}

export interface GadgetbridgeHourly {
    timestamp: number;
    temp: number;
    conditionCode: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    uvIndex: number;
    precipProbability: number;
}

export interface GadgetbridgeWeatherSpec {
    timestamp: number;
    location: string;
    latitude: number;
    longitude: number;
    /** 0 false, 1 true, -1 unknown. */
    isCurrentLocation: number;
    currentTemp?: number;
    currentConditionCode?: number;
    currentCondition?: string;
    currentHumidity?: number;
    windSpeed?: number;
    windDirection?: number;
    uvIndex?: number;
    feelsLikeTemp?: number;
    dewPoint?: number;
    pressure?: number;
    cloudCover?: number;
    todayMaxTemp?: number;
    todayMinTemp?: number;
    precipProbability?: number;
    sunRise?: number;
    sunSet?: number;
    moonRise?: number;
    moonSet?: number;
    moonPhase?: number;
    airQuality?: GadgetbridgeAirQuality;
    forecasts?: GadgetbridgeDaily[];
    hourly?: GadgetbridgeHourly[];
}

interface SunMoonTimes {
    sunRise?: number;
    sunSet?: number;
    moonRise?: number;
    moonSet?: number;
    moonPhase: number;
}

function toInt(value: number, fallback = 0) {
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function toSeconds(milliseconds: number) {
    return Math.trunc(milliseconds / 1000);
}

function kelvinFromCelsius(celsius: number, fallback = 0) {
    return Math.trunc((Number.isFinite(celsius) ? celsius : fallback) + 273.15);
}

/**
 * suncalc omits `rise`/`set` when the event does not happen that day (the moon skips a rise about
 * once per lunar month, and there is no sunrise at all during a polar night, where `getTimes`
 * returns an `Invalid Date`). Every value is therefore optional: an omitted field lets Gadgetbridge
 * fall back to its own default instead of receiving a bogus timestamp — and reading `.valueOf()` on
 * a missing one used to throw and kill the whole broadcast.
 */
function toEventSeconds(date?: Date) {
    const time = date?.valueOf();
    return time !== undefined && Number.isFinite(time) ? toSeconds(time) : undefined;
}

function computeSunMoonTimes(day: DailyData, location: WeatherLocation): SunMoonTimes {
    const date = new Date(day.time);
    const times = getTimes(date, location.coord.lat, location.coord.lon);
    const moonTimes = getMoonTimes(date, location.coord.lat, location.coord.lon, true);
    return {
        sunRise: toEventSeconds(times.sunriseEnd),
        sunSet: toEventSeconds(times.sunsetStart),
        moonRise: toEventSeconds(moonTimes.rise),
        moonSet: toEventSeconds(moonTimes.set),
        moonPhase: getMoonPhaseDegrees(date)
    };
}

function assignSunMoonTimes(target: GadgetbridgeDaily | GadgetbridgeWeatherSpec, sunMoon: SunMoonTimes) {
    target.moonPhase = sunMoon.moonPhase;
    if (sunMoon.sunRise !== undefined) {
        target.sunRise = sunMoon.sunRise;
    }
    if (sunMoon.sunSet !== undefined) {
        target.sunSet = sunMoon.sunSet;
    }
    if (sunMoon.moonRise !== undefined) {
        target.moonRise = sunMoon.moonRise;
    }
    if (sunMoon.moonSet !== undefined) {
        target.moonSet = sunMoon.moonSet;
    }
}

function buildAirQuality(data: CommonWeatherData): GadgetbridgeAirQuality | undefined {
    const aqi = toInt(data.aqi, -1);
    if (aqi <= 0) {
        return undefined;
    }
    const pollutants = data.pollutants;
    const airQuality: GadgetbridgeAirQuality = { aqi };
    if (pollutants) {
        if (pollutants.co) {
            airQuality.co = pollutants.co.value;
        }
        if (pollutants.no2) {
            airQuality.no2 = pollutants.no2.value;
        }
        if (pollutants.o3) {
            airQuality.o3 = pollutants.o3.value;
        }
        if (pollutants.pm10) {
            airQuality.pm10 = pollutants.pm10.value;
        }
        if (pollutants.pm2_5) {
            airQuality.pm25 = pollutants.pm2_5.value;
        }
        if (pollutants.so2) {
            airQuality.so2 = pollutants.so2.value;
        }
    }
    return airQuality;
}

function buildDailyForecast(day: DailyData, location: WeatherLocation): GadgetbridgeDaily {
    const forecast: GadgetbridgeDaily = {
        conditionCode: toInt(day.iconId, 3200),
        maxTemp: kelvinFromCelsius(day.temperatureMax),
        minTemp: kelvinFromCelsius(day.temperatureMin),
        humidity: toInt(day.relativeHumidity),
        windSpeed: day.windSpeed ?? 0,
        windDirection: toInt(day.windBearing),
        uvIndex: day.uvIndex ?? 0,
        precipProbability: toInt(day.precipProbability)
    };
    assignSunMoonTimes(forecast, computeSunMoonTimes(day, location));
    const airQuality = buildAirQuality(day);
    if (airQuality) {
        forecast.airQuality = airQuality;
    }
    return forecast;
}

function buildHourlyForecast(hour: Hourly): GadgetbridgeHourly {
    return {
        timestamp: toSeconds(hour.time),
        temp: kelvinFromCelsius(hour.temperature),
        conditionCode: toInt(hour.iconId, 3200),
        humidity: toInt(hour.relativeHumidity),
        windSpeed: hour.windSpeed ?? 0,
        windDirection: toInt(hour.windBearing),
        uvIndex: hour.uvIndex ?? 0,
        precipProbability: toInt(hour.precipProbability)
    };
}

/**
 * Build the array of `WeatherSpec` objects Gadgetbridge expects in its `WeatherGz` extra.
 */
export function buildGadgetbridgePayload(location: WeatherLocation, weatherData: WeatherData): GadgetbridgeWeatherSpec[] {
    const spec: GadgetbridgeWeatherSpec = {
        timestamp: toSeconds(weatherData.time),
        location: location.name ?? '',
        latitude: location.coord.lat,
        longitude: location.coord.lon,
        // a GPS fix is geocoded and stored like any manually added city, so we cannot tell them apart
        isCurrentLocation: -1
    };

    const currently = weatherData.currently;
    if (currently) {
        spec.currentTemp = kelvinFromCelsius(currently.temperature);
        spec.currentConditionCode = toInt(currently.iconId, 3200);
        spec.currentCondition = currently.description ?? '';
        spec.currentHumidity = toInt(currently.relativeHumidity);
        spec.windSpeed = currently.windSpeed ?? 0;
        spec.windDirection = toInt(currently.windBearing);
        spec.uvIndex = currently.uvIndex ?? 0;
        spec.feelsLikeTemp = kelvinFromCelsius(currently.apparentTemperature);
        spec.dewPoint = kelvinFromCelsius(currently.dewpoint);
        spec.pressure = currently.sealevelPressure ?? 0;
        spec.cloudCover = toInt(currently.cloudCover);
        const airQuality = buildAirQuality(currently);
        if (airQuality) {
            spec.airQuality = airQuality;
        }
    }

    const daily = weatherData.daily?.data;
    if (daily?.length) {
        const today = daily[0];
        spec.todayMaxTemp = kelvinFromCelsius(today.temperatureMax);
        spec.todayMinTemp = kelvinFromCelsius(today.temperatureMin);
        spec.precipProbability = toInt(today.precipProbability);
        assignSunMoonTimes(spec, computeSunMoonTimes(today, location));

        if (daily.length > 1) {
            spec.forecasts = daily.slice(1, MAX_DAILY_FORECASTS).map((day) => buildDailyForecast(day, location));
        }
    }

    const hourly = weatherData.hourly;
    if (hourly?.length) {
        spec.hourly = hourly.slice(0, MAX_HOURLY_FORECASTS).map(buildHourlyForecast);
    }

    return [spec];
}
