import { GetWeatherOptions, WeatherProvider } from '~/services/providers/weatherprovider';
import { WeatherLocation } from '../api';
import { WeatherData } from './weather';
import { Provider } from '~/services/providers/provider';

export abstract class MarineWeatherProvider extends Provider {
    abstract getMarineWeather(weatherLocation: WeatherLocation, options?: GetWeatherOptions): Promise<Partial<WeatherData>>;
    getModels() {
        return {};
    }
}
