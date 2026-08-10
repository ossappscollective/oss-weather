import { WeatherLocation } from '../api';
import { WeatherProps } from '../weatherData';
import { Provider } from './provider';
import { AirQualityData, Alert, WeatherData } from './weather';

export interface GetWeatherOptions {
    model?: string;
    warnings?: boolean;
    minutely?: boolean;
    hourly?: boolean;
    current?: boolean;
    forceModel?: boolean;
    weatherProps?: WeatherProps[];
}
export abstract class WeatherProvider extends Provider {
    abstract getWeather(weatherLocation: WeatherLocation, options?: GetWeatherOptions): Promise<WeatherData>;
    /**
     * Weather alerts for that location, called by `getWeather`. A provider owns both the request
     * and the mapping of its own payload; the ones without an alert API keep this default.
     *
     * A provider whose alerts come from a payload `getWeather` already fetched takes it as a third
     * argument, so calling `getAlerts` on its own stays possible without requesting it twice.
     */
    getAlerts(weatherLocation: WeatherLocation, options?: GetWeatherOptions): Promise<Alert[]> {
        return Promise.resolve([]);
    }
    getModels() {
        return {};
    }
}
