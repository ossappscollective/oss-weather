import { ApplicationSettings, Screen } from '@nativescript/core';
import { prefs } from '~/services/preferences';

export const DATA_VERSION = 1;

export const ALERT_OPTION_MAX_HEIGHT = Screen.mainScreen.heightDIPs * 0.67;

export const SETTINGS_LANGUAGE = 'language';
export const SETTINGS_IMPERIAL = 'imperial';
export const SETTINGS_FONTSCALE = 'fontscale';
export const SETTINGS_COLOR_THEME = 'color_theme';
export const SETTINGS_DAILY_PAGE_HOURLY_CHART = 'daily_page_hourly_chart';
export const SETTINGS_MAIN_PAGE_HOURLY_CHART = 'main_page_hourly_chart';
export const SETTINGS_SWIPE_ACTION_BAR_PROVIDER = 'swipe_actionbar_provider';
export const SETTINGS_UNITS = 'units';
export const SETTINGS_METRIC_TEMP_DECIMAL = 'metric_temp_decimal';
export const SETTINGS_METRIC_CM_TO_MM = 'metric_cm_to_mm';
export const SETTINGS_ALWAYS_SHOW_PRECIP_PROB = 'always_show_precip_prob';
export const SETTINGS_FEELS_LIKE_TEMPERATURES = 'feels_like_temperatures';
export const SETTINGS_SHOW_DAILY_IN_CURRENTLY = 'show_daily_in_currently';
export const SETTINGS_SHOW_CURRENT_DAY_DAILY = 'show_current_day_daily';
export const SETTINGS_WEATHER_DATA_LAYOUT = 'weather_data_layout';
export const SETTINGS_MIN_UV_INDEX = 'min_uv_index';
export const SETTINGS_MAIN_CHART_NB_HOURS = 'main_chart_nb_hours';
export const SETTINGS_MAIN_CHART_SHOW_WIND = 'main_chart_show_wind';
export const SETTINGS_HOURLY_ODD_COLORS = 'hourly_odd_colors';
export const SETTINGS_PROVIDER = 'provider';
export const SETTINGS_PROVIDER_AQI = 'provider_aqi';
export const SETTINGS_PROVIDER_MARINE = 'provider_marine';
export const SETTINGS_WEATHER_LOCATION = 'weatherLocation';
export const SETTINGS_FAVORITES = 'favorites';
export const SETTINGS_DAILY_DATE_FORMAT = 'daily_date_format';
export const SETTINGS_DAILY_DATA_ALIGNMENT = 'daily_data_alignment';
export const SETTINGS_MAPTILER_DEFAULT_KEY = 'maptiler_api_key';

export const DEFAULT_COLOR_THEME = 'default';
export const DEFAULT_LOCALE = 'auto';

export const DAILY_PAGE_HOURLY_CHART = false;
export const MAIN_PAGE_HOURLY_CHART = false;
export const SWIPE_ACTION_BAR_PROVIDER = false;

export const ANIMATIONS_ENABLED = false;
export const CHARTS_LANDSCAPE = false;
export const CHARTS_PORTRAIT_FULLSCREEN = false;
export const DECIMAL_METRICS_TEMP = false;
export const SHOW_CURRENT_DAY_DAILY = false;
export const SHOW_DAILY_IN_CURRENTLY = false;
export const FEELS_LIKE_TEMPERATURE = false;
export const ALWAYS_SHOW_PRECIP_PROB = false;
export const DEFAULT_METRIC_CM_TO_MM = false;
export const DEFAULT_DAILY_DATE_FORMAT = 'DD/MM';
export const DEFAULT_DAILY_DATA_ALIGNMENT = 'center';

export const WEATHER_DATA_LAYOUT = 'default';

export const MAX_NB_DAYS_FORECAST = 16;
export const NB_DAYS_FORECAST = 7;
export const NB_HOURS_FORECAST = 72;
export const MAIN_CHART_NB_HOURS = 72;
export const NB_MINUTES_FORECAST = 60;
export const MAIN_CHART_SHOW_WIND = false;
export const DEFAULT_HOURLY_ODD_COLORS = true;

export const MIN_UV_INDEX = 0;

export const PROVIDER_PADDING = 4;
