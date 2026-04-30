import { GetWeatherOptions, WeatherProvider } from '~/services/providers/weatherprovider';
import { WeatherLocation } from '../api';
import { WeatherData } from './weather';

export abstract class MarineWeatherProvider extends WeatherProvider {
    abstract getMarineWeather(weatherLocation: WeatherLocation, options?: GetWeatherOptions): Promise<WeatherData>;
    getModels() {
        return {};
    }
}
