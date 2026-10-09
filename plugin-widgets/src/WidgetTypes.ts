// app/services/widgets/shared/WidgetTypes.ts
// Shared types and interfaces for both Android and iOS widgets

import { ProviderType } from '~/services/providers/weather';
import type { WidgetChip } from '~/utils/widgetChips';
export type { WidgetChip } from '~/utils/widgetChips';

export interface WidgetConfig {
    locationName: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    timezoneOffset?: number;
    model?: string;
    provider?: ProviderType;
    widgetKind?: string;
    iconSet?: string;
    settings?: Record<string, any>;
}

export interface WeatherWidgetData {
    temperature: string;
    // today's range, and the shown weather data as chips (app settings: data, order, intensity)
    temperatureHigh?: string;
    temperatureLow?: string;
    chips?: WidgetChip[];
    iconPath: string;
    description: string;
    locationName: string;
    date: string;
    hourlyData: HourlyData[];
    dailyData: DailyData[];
    forecastData: ForecastData[];
    lastUpdate: number;
}

export interface HourlyData {
    time: string;
    temperature: string;
    iconPath: string;
    precipitation: string;
    precipAccumulation: string;
    windSpeed: string;
    // short hour label ("Now", "18")
    hour?: string;
    // temperature curve height (0 lowest - 1 highest of the shown hours)
    curve?: number;
    // precipitation bar height (0-1, intensity) and color
    precipFraction?: number;
    precipColor?: string;
    wind?: WidgetChip;
}

export interface DailyData {
    day: string;
    date?: string;
    description?: string;
    chips?: WidgetChip[];
    // the precipitation chip alone (daily columns)
    precipChips?: WidgetChip[];
    // min / max on the range of the shown days (0-1), for the range bar
    rangeStart?: number;
    rangeEnd?: number;
    temperatureHigh: string;
    temperatureLow: string;
    iconPath: string;
    precipitation: string;
    precipAccumulation: string;
}

export interface ForecastData {
    dateTime: string;
    temperature: string;
    iconPath: string;
    description: string;
    precipitation: string;
    precipAccumulation: string;
}

export enum WidgetType {
    SIMPLE = 'simple',
    SIMPLE_DATE = 'simple_date',
    SIMPLE_CLOCK = 'simple_clock',
    HOURLY = 'hourly',
    DAILY = 'daily',
    FORECAST = 'forecast'
}

export interface WidgetUpdateRequest {
    widgetId: string;
    widgetType: WidgetType;
}

export const DEFAULT_UPDATE_FREQUENCY = 30; // minutes
export const MIN_UPDATE_FREQUENCY = 15; // minutes
export const MAX_UPDATE_FREQUENCY = 1440; // minutes (24 hours)
