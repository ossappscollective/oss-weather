// app/services/widgets/shared/WidgetDataManager.ts
// Shared logic for fetching and formatting widget data (used by both Android and iOS)

import { ApplicationSettings, path } from '@nativescript/core';
import { SETTINGS_WEATHER_LOCATION } from '~/helpers/constants';
import { formatDate, formatTime } from '~/helpers/locale';
import { WeatherLocation } from '~/services/api';
import { iconService, iconThemesFolder } from '~/services/icon';
import { WeatherData } from '~/services/providers/weather';
import { getWeather } from '~/services/providers/weatherproviderfactory';
import { WeatherProps, formatWeatherValue } from '~/services/weatherData';
import { ForecastData, WeatherWidgetData, WidgetConfig } from './WidgetTypes';
import { queryTimezone } from '~/helpers/favorites';

export function isDefaultLocation(locationName: string) {
    return !locationName || locationName === 'current' || locationName === 'default';
}

export class WidgetDataManager {
    constructor() {}

    /**
     * Fetch and format weather data for a widget
     */
    async getWidgetWeatherData(config: WidgetConfig): Promise<WeatherWidgetData> {
        // DEV_LOG && console.log('getWidgetWeatherData', JSON.stringify(config));
        // Get location data
        const locationName = config.locationName;
        const latitude = config.latitude;
        const longitude = config.longitude;
        const model = config.model;

        // Create location object
        let location: WeatherLocation = {
            name: locationName,
            timezone: config.timezone,
            timezoneOffset: config.timezoneOffset,
            coord: {
                lat: latitude,
                lon: longitude
            }
        };
        // Handle "current" location - use app's current selected location
        if (isDefaultLocation(locationName)) {
            location = JSON.parse(ApplicationSettings.getString(SETTINGS_WEATHER_LOCATION, DEFAULT_LOCATION || 'null'));
            // const timezoneData = await queryTimezone(location);
            // Object.assign(location, timezoneData)
        }

        // Fetch weather data using WeatherProvider.getWeather
        const weatherData = location
            ? await getWeather(
                  location,
                  {
                      model
                  },
                  config.provider
              )
            : null;

        // Format data for widget
        return this.formatWeatherDataForWidget(weatherData, location, config);
    }

    /**
     * Format weather data for widget consumption using formatWeatherValue
     */
    private formatWeatherDataForWidget(weatherData: WeatherData, location: WeatherLocation, config: WidgetConfig): WeatherWidgetData {
        if (!weatherData) {
            return;
        }
        // Format current weather
        const formattedData: WeatherWidgetData = {
            temperature: formatWeatherValue(weatherData.currently, WeatherProps.temperature),
            iconPath: this.getIconPath(weatherData.currently.iconId, weatherData.currently.isDay, config.iconSet),
            description: weatherData.currently?.description || '',
            locationName: location.name || '',
            date: this.formatDate(weatherData.currently?.time || Date.now()),
            hourlyData: [],
            dailyData: [],
            forecastData: [],
            lastUpdate: Date.now()
        };

        // Format hourly data (next 24 hours)
        if (weatherData.hourly?.length > 0) {
            formattedData.hourlyData = weatherData.hourly.slice(0, 24).map((hour) => ({
                time: this.formatTime(hour.time),
                temperature: formatWeatherValue(hour, WeatherProps.temperature),
                iconPath: this.getIconPath(hour.iconId, hour.isDay, config.iconSet),
                precipitation: formatWeatherValue(hour, WeatherProps.precipProbability),
                precipAccumulation: formatWeatherValue(hour, WeatherProps.precipAccumulation),
                windSpeed: formatWeatherValue(hour, WeatherProps.windSpeed)
            }));
        }

        // Format daily data (next 7 days)
        if (weatherData.daily?.data && weatherData.daily.data.length > 0) {
            formattedData.dailyData = weatherData.daily.data.slice(0, 7).map((day) => ({
                day: this.formatDayName(day.time),
                temperatureHigh: formatWeatherValue(day, WeatherProps.temperatureMax),
                temperatureLow: formatWeatherValue(day, WeatherProps.temperatureMin),
                iconPath: this.getIconPath(day.iconId, day.isDay, config.iconSet),
                precipAccumulation: formatWeatherValue(day, WeatherProps.precipAccumulation),
                precipitation: formatWeatherValue(day, WeatherProps.precipProbability)
            }));
        }

        // Format forecast data (combination of hourly and daily)
        const forecastData: ForecastData[] = [];

        // Add next 6 hours from hourly
        if (weatherData.hourly?.length) {
            weatherData.hourly.slice(0, 6).forEach((hour) => {
                forecastData.push({
                    dateTime: this.formatDateTime(hour.time),
                    temperature: formatWeatherValue(hour, WeatherProps.temperature),
                    iconPath: this.getIconPath(hour.iconId, hour.isDay, config.iconSet),
                    description: hour.description || '',
                    precipitation: formatWeatherValue(hour, WeatherProps.precipProbability),
                    precipAccumulation: formatWeatherValue(hour, WeatherProps.precipAccumulation)
                });
            });
        }

        // Add next 4 days from daily
        if (weatherData.daily?.data) {
            weatherData.daily.data.slice(1, 5).forEach((day) => {
                forecastData.push({
                    dateTime: this.formatDateTime(day.time),
                    temperature: formatWeatherValue(day, WeatherProps.temperature),
                    iconPath: this.getIconPath(day.iconId, day.isDay, config.iconSet),
                    description: day.description || '',
                    precipAccumulation: formatWeatherValue(day, WeatherProps.precipAccumulation),
                    precipitation: formatWeatherValue(day, WeatherProps.precipProbability)
                });
            });
        }

        formattedData.forecastData = forecastData;
        // DEV_LOG && console.log('formatWeatherDataForWidget', JSON.stringify(forecastData));
        return formattedData;
    }

    private getIconPath(iconId: number, isDay: boolean, iconSet: string): string {
        return iconService.getIconPath(iconId, isDay, false, iconSet || iconService.iconSet);
        // const iconSetFolderPath = path.join(iconThemesFolder, iconSet || iconService.iconSet);
        // return `${iconSetFolderPath}/images/${icon}.png`;
    }

    /**
     * Helper methods for formatting dates/times
     */
    private formatDate(timestamp: number): string {
        return formatDate(timestamp, 'll');
    }

    private formatTime(timestamp: number): string {
        return formatTime(timestamp, 'LT');
    }

    private formatDateTime(timestamp: number): string {
        return formatDate(timestamp, 'MMM D h');
    }

    private formatDayName(timestamp: number): string {
        return formatDate(timestamp, 'ddd');
    }
}
