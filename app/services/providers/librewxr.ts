import { lc } from '@nativescript-community/l';
import { TextFieldProperties } from '@nativescript-community/ui-textfield';
import { ApplicationSettings } from '@nativescript/core';
import {
    RADAR_WIDGET_AUTOLOOP,
    RADAR_WIDGET_BACKGROUND,
    RADAR_WIDGET_BACKGROUNDS,
    RADAR_WIDGET_FADE,
    RADAR_WIDGET_FRAME_DURATION,
    RADAR_WIDGET_FUTURE,
    RADAR_WIDGET_GRID_COLOR,
    RADAR_WIDGET_LAYOUT,
    RADAR_WIDGET_OPACITY,
    RADAR_WIDGET_LAYOUTS,
    RADAR_WIDGET_PAST,
    RADAR_WIDGET_SHOW,
    RADAR_WIDGET_SHOWS,
    RADAR_WIDGET_SIZE,
    RADAR_WIDGET_SIZES,
    RADAR_WIDGET_SMOOTH,
    SETTINGS_RADAR_WIDGET_AUTOLOOP,
    SETTINGS_RADAR_WIDGET_BACKGROUND,
    SETTINGS_RADAR_WIDGET_BACKGROUND_COLOR,
    SETTINGS_RADAR_WIDGET_FADE,
    SETTINGS_RADAR_WIDGET_FRAME_DURATION,
    SETTINGS_RADAR_WIDGET_FUTURE,
    SETTINGS_RADAR_WIDGET_GRID_COLOR,
    SETTINGS_RADAR_WIDGET_LAYOUT,
    SETTINGS_RADAR_WIDGET_OPACITY,
    SETTINGS_RADAR_WIDGET_PAST,
    SETTINGS_RADAR_WIDGET_SHOW,
    SETTINGS_RADAR_WIDGET_SIZE,
    SETTINGS_RADAR_WIDGET_SMOOTH
} from '~/helpers/constants';
import { SETTINGS_WEATHER_MAP_SHOW_SNOW, WEATHER_MAP_SHOW_SNOW, getLayerTitle } from '~/services/providers/maptiler';

export const SETTINGS_WEATHER_MAP_SOURCE = 'weather_map_source';
export const SETTINGS_LIBREWXR_URL = 'weather_map_librewxr_url';
export const SETTINGS_LIBREWXR_COLORS = 'weather_map_librewxr_colors';
export const SETTINGS_LIBREWXR_LAYER = 'weather_map_librewxr_layer';

export const WEATHER_MAP_SOURCE = 'librewxr';
export const LIBREWXR_URL = 'https://api.librewxr.net';
export const LIBREWXR_COLORS = 7;
export const LIBREWXR_LAYER = 'radar';
export const LIBREWXR_LAYERS = ['radar', 'satellite', 'radar_satellite'];
export const LIBREWXR_COLOR_SCHEMES = [
    { value: 0, title: 'Black and White' },
    { value: 1, title: 'Rainviewer Original' },
    { value: 2, title: 'Universal Blue' },
    { value: 3, title: 'Titan' },
    { value: 4, title: 'The Weather Channel' },
    { value: 5, title: 'Meteored' },
    { value: 6, title: 'NEXRAD Level III' },
    { value: 7, title: 'Rainbow @ Selex SI' },
    { value: 8, title: 'Dark Sky' },
    { value: 9, title: 'Datameteo Valerio' },
    { value: 10, title: 'Viper HD' },
    { value: 11, title: 'MRMS CREF' },
    { value: 12, title: '33/40 Max Storm' },
    { value: 13, title: 'MetService NZ (Dark)' },
    { value: 14, title: 'Windy' }
];

export const WEATHER_MAP_SOURCES = [
    { value: 'librewxr', title: 'LibreWXR' },
    { value: 'maptiler', title: 'MapTiler' }
];

export function isLibreWXRSource() {
    return ApplicationSettings.getString(SETTINGS_WEATHER_MAP_SOURCE, WEATHER_MAP_SOURCE) !== 'maptiler';
}

export function getLibreWXRColorsTitle() {
    const colors = ApplicationSettings.getNumber(SETTINGS_LIBREWXR_COLORS, LIBREWXR_COLORS);
    return LIBREWXR_COLOR_SCHEMES.find((scheme) => scheme.value === colors)?.title;
}

export function getWeatherMapSourceSetting() {
    return {
        key: SETTINGS_WEATHER_MAP_SOURCE,
        id: 'setting',
        valueType: 'string',
        icon: 'mdi-radar',
        title: lc('weather_map_source'),
        currentValue: () => ApplicationSettings.getString(SETTINGS_WEATHER_MAP_SOURCE, WEATHER_MAP_SOURCE),
        values: WEATHER_MAP_SOURCES,
        rightValue: () => WEATHER_MAP_SOURCES.find((source) => source.value === ApplicationSettings.getString(SETTINGS_WEATHER_MAP_SOURCE, WEATHER_MAP_SOURCE))?.title
    };
}

export function getLibreWXRSettings() {
    return [
        {
            type: 'prompt',
            icon: 'mdi-server',
            valueType: 'string',
            id: 'setting',
            key: SETTINGS_LIBREWXR_URL,
            default: () => ApplicationSettings.getString(SETTINGS_LIBREWXR_URL, LIBREWXR_URL),
            description: () => ApplicationSettings.getString(SETTINGS_LIBREWXR_URL, LIBREWXR_URL),
            title: lc('librewxr_server'),
            textFieldProperties: {
                keyboardType: 'url',
                autocapitalizationType: 'none',
                autocorrect: false
            } as TextFieldProperties
        },
        {
            key: SETTINGS_LIBREWXR_COLORS,
            id: 'setting',
            icon: 'mdi-palette',
            title: lc('weather_map_colors'),
            currentValue: () => ApplicationSettings.getNumber(SETTINGS_LIBREWXR_COLORS, LIBREWXR_COLORS),
            values: LIBREWXR_COLOR_SCHEMES,
            rightValue: getLibreWXRColorsTitle
        },
        {
            key: SETTINGS_LIBREWXR_LAYER,
            id: 'setting',
            valueType: 'string',
            icon: 'mdi-layers',
            title: lc('weather_map_layer'),
            currentValue: () => ApplicationSettings.getString(SETTINGS_LIBREWXR_LAYER, LIBREWXR_LAYER),
            values: LIBREWXR_LAYERS.map((value) => ({
                value,
                title: getLayerTitle(value)
            })),
            rightValue: () => getLayerTitle(ApplicationSettings.getString(SETTINGS_LIBREWXR_LAYER, LIBREWXR_LAYER))
        },
        {
            type: 'switch',
            icon: 'mdi-snowflake',
            id: SETTINGS_WEATHER_MAP_SHOW_SNOW,
            title: lc('show_snow'),
            value: ApplicationSettings.getBoolean(SETTINGS_WEATHER_MAP_SHOW_SNOW, WEATHER_MAP_SHOW_SNOW)
        }
    ];
}

function getRadarWidgetChoice(key: string, defaultValue: string, values: string[], titleKey: string, valueTitlePrefix: string, icon: string) {
    const options = values.map((value) => ({ value, title: lc(`${valueTitlePrefix}_${value}`) }));
    return {
        key,
        icon,
        id: 'setting',
        valueType: 'string',
        title: lc(titleKey),
        currentValue: () => ApplicationSettings.getString(key, defaultValue),
        values: options,
        rightValue: () => options.find((option) => option.value === ApplicationSettings.getString(key, defaultValue))?.title
    };
}

function getRadarWidgetSlider(key: string, defaultValue: number, min: number, max: number, step: number, titleKey: string, icon: string, unit: string) {
    return {
        key,
        icon,
        min,
        max,
        step,
        id: 'setting',
        type: 'slider',
        title: lc(titleKey),
        valueFormatter: (value: number) => `${Math.round(value)} ${unit}`,
        currentValue: () => ApplicationSettings.getNumber(key, defaultValue),
        rightValue: () => `${ApplicationSettings.getNumber(key, defaultValue)} ${unit}`
    };
}

export function getRadarWidgetSettings() {
    return [
        getRadarWidgetChoice(SETTINGS_RADAR_WIDGET_LAYOUT, RADAR_WIDGET_LAYOUT, RADAR_WIDGET_LAYOUTS, 'radar_widget_layout', 'radar_widget', 'mdi-radar'),
        getRadarWidgetChoice(SETTINGS_RADAR_WIDGET_SHOW, RADAR_WIDGET_SHOW, RADAR_WIDGET_SHOWS, 'radar_widget_show', 'radar_widget_show', 'mdi-eye'),
        getRadarWidgetChoice(SETTINGS_RADAR_WIDGET_SIZE, RADAR_WIDGET_SIZE, RADAR_WIDGET_SIZES, 'radar_widget_size', 'radar_widget_size', 'mdi-resize'),
        getRadarWidgetChoice(SETTINGS_RADAR_WIDGET_BACKGROUND, RADAR_WIDGET_BACKGROUND, RADAR_WIDGET_BACKGROUNDS, 'radar_widget_background', 'radar_widget_background', 'mdi-map'),
        {
            type: 'switch',
            icon: 'mdi-repeat',
            id: SETTINGS_RADAR_WIDGET_AUTOLOOP,
            title: lc('radar_widget_autoloop'),
            description: lc('radar_widget_autoloop_desc'),
            value: ApplicationSettings.getBoolean(SETTINGS_RADAR_WIDGET_AUTOLOOP, RADAR_WIDGET_AUTOLOOP)
        },
        {
            type: 'color',
            id: 'setting',
            key: SETTINGS_RADAR_WIDGET_BACKGROUND_COLOR,
            icon: 'mdi-palette',
            title: lc('radar_widget_background_color'),
            description: lc('radar_widget_color_desc'),
            // not stored: the app section color, which the widget view resolves (ListItem uses item.color for the title)
            currentColor: () => ApplicationSettings.getString(SETTINGS_RADAR_WIDGET_BACKGROUND_COLOR, '') || undefined
        },
        {
            type: 'color',
            id: 'setting',
            key: SETTINGS_RADAR_WIDGET_GRID_COLOR,
            icon: 'mdi-crosshairs-gps',
            alpha: false,
            title: lc('radar_widget_grid_color'),
            description: lc('radar_widget_color_desc'),
            currentColor: () => ApplicationSettings.getString(SETTINGS_RADAR_WIDGET_GRID_COLOR, RADAR_WIDGET_GRID_COLOR)
        },
        {
            key: SETTINGS_RADAR_WIDGET_OPACITY,
            id: 'setting',
            type: 'slider',
            icon: 'mdi-circle-opacity',
            min: 0.1,
            max: 1,
            step: null,
            title: lc('radar_widget_opacity'),
            valueFormatter: (value: number) => `${Math.round(value * 100)} %`,
            transformValue: (value: number) => Math.round(value * 20) / 20,
            currentValue: () => ApplicationSettings.getNumber(SETTINGS_RADAR_WIDGET_OPACITY, RADAR_WIDGET_OPACITY),
            rightValue: () => `${Math.round(ApplicationSettings.getNumber(SETTINGS_RADAR_WIDGET_OPACITY, RADAR_WIDGET_OPACITY) * 100)} %`
        },
        getRadarWidgetSlider(SETTINGS_RADAR_WIDGET_PAST, RADAR_WIDGET_PAST, 0, 120, 10, 'radar_widget_past', 'mdi-history', 'min'),
        getRadarWidgetSlider(SETTINGS_RADAR_WIDGET_FUTURE, RADAR_WIDGET_FUTURE, 0, 60, 10, 'radar_widget_future', 'mdi-clock-fast', 'min'),
        getRadarWidgetSlider(SETTINGS_RADAR_WIDGET_FRAME_DURATION, RADAR_WIDGET_FRAME_DURATION, 200, 2000, 100, 'radar_widget_frame_duration', 'mdi-timer-outline', 'ms'),
        {
            type: 'switch',
            icon: 'mdi-gradient-horizontal',
            id: SETTINGS_RADAR_WIDGET_FADE,
            title: lc('radar_widget_fade'),
            value: ApplicationSettings.getBoolean(SETTINGS_RADAR_WIDGET_FADE, RADAR_WIDGET_FADE)
        },
        {
            type: 'switch',
            icon: 'mdi-blur',
            id: SETTINGS_RADAR_WIDGET_SMOOTH,
            title: lc('radar_widget_smooth'),
            value: ApplicationSettings.getBoolean(SETTINGS_RADAR_WIDGET_SMOOTH, RADAR_WIDGET_SMOOTH)
        }
    ];
}
