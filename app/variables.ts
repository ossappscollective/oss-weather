import { ApplicationSettings, Color } from '@nativescript/core';
import { createGlobalEventListener, globalObservable } from '@shared/utils/svelte/ui';
import { get, writable } from 'svelte/store';
import {
    ACCENT_FONT_WEIGHT,
    ALWAYS_SHOW_PRECIP_PROB,
    DATA_INTENSITY,
    DECIMAL_METRICS_TEMP,
    DEFAULT_DAILY_DATA_ALIGNMENT,
    DEFAULT_DAILY_DATE_FORMAT,
    DEFAULT_HOURLYMAIN_DATA,
    DEFAULT_METRIC_CM_TO_MM,
    DESIGN_STYLE,
    HOURLY_VIEW_MODE,
    SETTINGS_ACCENT_FONT_WEIGHT,
    SETTINGS_ALWAYS_SHOW_PRECIP_PROB,
    SETTINGS_DAILY_DATA_ALIGNMENT,
    SETTINGS_DAILY_DATE_FORMAT,
    SETTINGS_DATA_INTENSITY,
    SETTINGS_DESIGN_STYLE,
    SETTINGS_FEELS_LIKE_TEMPERATURES,
    SETTINGS_FONTSCALE,
    SETTINGS_HOURLY_MAIN_DATA,
    SETTINGS_HOURLY_VIEW_MODE,
    SETTINGS_IMPERIAL,
    SETTINGS_METRIC_CM_TO_MM,
    SETTINGS_METRIC_TEMP_DECIMAL,
    SETTINGS_SHOW_CURRENT_DAY_DAILY,
    SETTINGS_SHOW_EMPTY_DATA,
    SETTINGS_UNITS,
    SETTINGS_WEATHER_DATA_LAYOUT,
    SHOW_EMPTY_DATA,
    WEATHER_DATA_LAYOUT
} from '~/helpers/constants';
import { DEFAULT_IMPERIAL_UINTS, DEFAULT_METRIC_UINTS } from '~/helpers/units';
import { prefs } from '~/services/preferences';
import { WeatherProps } from '~/services/weatherData';
import type { DesignStyle } from '~/utils/designStyle';

export * from '@shared/variables';

import { initVariables } from '@shared/variables';

export const fonts = writable({
    mdi: '',
    wi: '',
    wd: '',
    wdThin: '',
    app: ''
});

initVariables({
    onInitRootView: (context, rootViewStyle) => {
        DEV_LOG &&
            console.log('onInitRootView', {
                mdi: rootViewStyle.getCssVariable('--mdiFontFamily'),
                app: rootViewStyle.getCssVariable('--appFontFamily'),
                wi: rootViewStyle.getCssVariable('--wiFontFamily')
            });
        fonts.set({
            mdi: rootViewStyle.getCssVariable('--mdiFontFamily'),
            app: rootViewStyle.getCssVariable('--appFontFamily'),
            wi: rootViewStyle.getCssVariable('--wiFontFamily'),
            wd: rootViewStyle.getCssVariable('--wdFontFamily'),
            wdThin: rootViewStyle.getCssVariable('--wdThinFontFamily')
        });
    },
    getTheme: (colorTheme) => require(`~/themes/${colorTheme}.json`),
    updateSystemFontScale: (value) => {
        value = value || 1; // forbid 0
        systemFontScale.set(value);
        // console.log('updateSystemFontScale', value, storedFontScale);
        if (storedFontScale === 1) {
            fontScale.set(value);
        }
        globalObservable.notify({ eventName: 'fontscale', data: get(fontScale) });
    }
});

export const systemFontScale = writable(1);

export const iconColor = new Color('#FFC82F');
export const sunnyColor = new Color('#FFC930');
export const nightColor = new Color('#845987');
export const scatteredCloudyColor = new Color('#aaa');
export const cloudyColor = new Color('#929292');
export const rainColor = new Color('#4681C3');
export const snowColor = new Color('#00CDE6');

    export let imperialUnits = ApplicationSettings.getBoolean(SETTINGS_IMPERIAL, false);
export let metricDecimalTemp = ApplicationSettings.getBoolean(SETTINGS_METRIC_TEMP_DECIMAL, DECIMAL_METRICS_TEMP);
export let unitCMToMM = ApplicationSettings.getBoolean(SETTINGS_METRIC_CM_TO_MM, DEFAULT_METRIC_CM_TO_MM);
export const alwaysShowPrecipProb = writable(ApplicationSettings.getBoolean(SETTINGS_ALWAYS_SHOW_PRECIP_PROB, ALWAYS_SHOW_PRECIP_PROB));
export const dailyDataAlignment = writable(ApplicationSettings.getString(SETTINGS_DAILY_DATA_ALIGNMENT, DEFAULT_DAILY_DATA_ALIGNMENT));
// the "line" layout was replaced by the aligned grid
if (ApplicationSettings.getString(SETTINGS_WEATHER_DATA_LAYOUT) === 'line') {
    ApplicationSettings.setString(SETTINGS_WEATHER_DATA_LAYOUT, 'grid');
}
export const weatherDataLayout = writable(ApplicationSettings.getString(SETTINGS_WEATHER_DATA_LAYOUT, WEATHER_DATA_LAYOUT));
function readDesignStyle(): DesignStyle {
    return ApplicationSettings.getString(SETTINGS_DESIGN_STYLE, DESIGN_STYLE) === 'modern' ? 'modern' : 'classic';
}
export const designStyle = writable(readDesignStyle());
// weight of values, titles and highlighted texts in the modern style
// a string: Android only applies bold for '600'/'700', a numeric 700 renders regular
export const accentFontWeight = writable(ApplicationSettings.getNumber(SETTINGS_ACCENT_FONT_WEIGHT, ACCENT_FONT_WEIGHT) + '');
// grid and chips: keep a faint placeholder for data with no value
export const showEmptyData = writable(ApplicationSettings.getBoolean(SETTINGS_SHOW_EMPTY_DATA, SHOW_EMPTY_DATA));
export const dataIntensity = writable(ApplicationSettings.getBoolean(SETTINGS_DATA_INTENSITY, DATA_INTENSITY));
export const imperial = writable(imperialUnits);
export let dailyDateFormat = ApplicationSettings.getString(SETTINGS_DAILY_DATE_FORMAT, DEFAULT_DAILY_DATE_FORMAT);
export const hourlyViewMode = writable(ApplicationSettings.getString(SETTINGS_HOURLY_VIEW_MODE, HOURLY_VIEW_MODE));
export const hourlyViewData = writable<WeatherProps[]>(JSON.parse(ApplicationSettings.getString(SETTINGS_HOURLY_MAIN_DATA, DEFAULT_HOURLYMAIN_DATA)));

let storedFontScale = ApplicationSettings.getNumber(SETTINGS_FONTSCALE, 1);
if (isNaN(storedFontScale)) {
    storedFontScale = 1;
}
export const fontScale = writable(storedFontScale);
export const topViewHeight = writable(220 * Math.max(1, storedFontScale / 1.2));

export const onUnitsChanged = createGlobalEventListener(SETTINGS_UNITS);
export function onSettingsChanged(key: string, callback) {
    return createGlobalEventListener(key)(callback);
}

function getUintSettingsData() {
    const defaultData = imperialUnits ? DEFAULT_IMPERIAL_UINTS : DEFAULT_METRIC_UINTS;
    const unitsSettingsStr = ApplicationSettings.getString(SETTINGS_UNITS);

    const newData = JSON.parse(unitsSettingsStr || JSON.stringify(defaultData));
    Object.keys(defaultData).forEach((k) => {
        if (!newData[k]) {
            newData[k] = defaultData[k];
        }
    });
    // ApplicationSettings.setString(SETTINGS_UNITS, JSON.stringify(newData));
    return newData;
}
export const unitsSettings = getUintSettingsData();
export const unitsSettingsStore = writable(unitsSettings);

function notifyUnits() {
    globalObservable.notify({ eventName: SETTINGS_UNITS, data: unitsSettings });
}

function updateUnits() {
    Object.assign(unitsSettings, getUintSettingsData());
    unitsSettingsStore.set(unitsSettings);
    DEV_LOG && console.log('updateUnits', unitsSettings);
    notifyUnits();
}

prefs.on('change', (event: EventData & { key: string }) => {
    const key = event.key;
    switch (key) {
        case SETTINGS_IMPERIAL:
            imperialUnits = ApplicationSettings.getBoolean(SETTINGS_IMPERIAL);
            imperial.set(imperialUnits);
            DEV_LOG && console.log(`key:${SETTINGS_IMPERIAL}`, imperialUnits);
            ApplicationSettings.remove(SETTINGS_UNITS);
            updateUnits();
            break;
        case SETTINGS_METRIC_TEMP_DECIMAL:
            metricDecimalTemp = ApplicationSettings.getBoolean(SETTINGS_METRIC_TEMP_DECIMAL, DECIMAL_METRICS_TEMP);
            DEV_LOG && console.log(`key:${SETTINGS_METRIC_TEMP_DECIMAL}`, imperialUnits, metricDecimalTemp);
            // we notify units to update ui
            notifyUnits();
            break;
        case SETTINGS_UNITS:
            DEV_LOG && console.warn(`key:${SETTINGS_UNITS}`, imperialUnits);
            updateUnits();
            break;
        case SETTINGS_METRIC_CM_TO_MM:
            unitCMToMM = ApplicationSettings.getBoolean(SETTINGS_METRIC_CM_TO_MM, DEFAULT_METRIC_CM_TO_MM);
            DEV_LOG && console.log(`key:${SETTINGS_METRIC_CM_TO_MM}`, imperialUnits, metricDecimalTemp);
            // we notify units to update ui
            notifyUnits();
            break;
        case SETTINGS_DAILY_DATE_FORMAT:
            dailyDateFormat = ApplicationSettings.getString(SETTINGS_DAILY_DATE_FORMAT, DEFAULT_DAILY_DATE_FORMAT);
            // we notify units to update ui
            notifyUnits();
            break;
        case SETTINGS_WEATHER_DATA_LAYOUT:
            weatherDataLayout.set(ApplicationSettings.getString(SETTINGS_WEATHER_DATA_LAYOUT, WEATHER_DATA_LAYOUT));
            DEV_LOG && console.log(`key:${SETTINGS_WEATHER_DATA_LAYOUT}`, weatherDataLayout);
            // we notify imperial to update ui
            globalObservable.notify({ eventName: SETTINGS_WEATHER_DATA_LAYOUT, data: weatherDataLayout });
            break;
        case SETTINGS_WEATHER_DATA_LAYOUT:
            weatherDataLayout.set(ApplicationSettings.getString(SETTINGS_WEATHER_DATA_LAYOUT, WEATHER_DATA_LAYOUT));
            DEV_LOG && console.log(`key:${SETTINGS_WEATHER_DATA_LAYOUT}`, weatherDataLayout);
            // we notify imperial to update ui
            globalObservable.notify({ eventName: SETTINGS_WEATHER_DATA_LAYOUT, data: weatherDataLayout });
            break;
        case SETTINGS_DESIGN_STYLE:
            designStyle.set(readDesignStyle());
            break;
        case SETTINGS_ACCENT_FONT_WEIGHT:
            accentFontWeight.set(ApplicationSettings.getNumber(SETTINGS_ACCENT_FONT_WEIGHT, ACCENT_FONT_WEIGHT) + '');
            break;
        case SETTINGS_SHOW_EMPTY_DATA:
            showEmptyData.set(ApplicationSettings.getBoolean(SETTINGS_SHOW_EMPTY_DATA, SHOW_EMPTY_DATA));
            break;
        case SETTINGS_DATA_INTENSITY:
            dataIntensity.set(ApplicationSettings.getBoolean(SETTINGS_DATA_INTENSITY, DATA_INTENSITY));
            break;
        case SETTINGS_HOURLY_VIEW_MODE:
            hourlyViewMode.set(ApplicationSettings.getString(SETTINGS_HOURLY_VIEW_MODE, HOURLY_VIEW_MODE));
            DEV_LOG && console.log(`key:${SETTINGS_HOURLY_VIEW_MODE}`, get(hourlyViewMode));
            break;
        case SETTINGS_HOURLY_MAIN_DATA:
            hourlyViewData.set(JSON.parse(ApplicationSettings.getString(SETTINGS_HOURLY_MAIN_DATA, DEFAULT_HOURLYMAIN_DATA)));
            DEV_LOG && console.log(`key:${SETTINGS_HOURLY_MAIN_DATA}`, get(hourlyViewData));
            break;
        case SETTINGS_DAILY_DATA_ALIGNMENT:
            dailyDataAlignment.set(ApplicationSettings.getString(SETTINGS_DAILY_DATA_ALIGNMENT, DEFAULT_DAILY_DATA_ALIGNMENT));
            DEV_LOG && console.log(`key:${SETTINGS_DAILY_DATA_ALIGNMENT}`, get(dailyDataAlignment));
            break;
        case SETTINGS_FEELS_LIKE_TEMPERATURES:
            globalObservable.notify({ eventName: SETTINGS_FEELS_LIKE_TEMPERATURES, data: ApplicationSettings.getBoolean(SETTINGS_FEELS_LIKE_TEMPERATURES) });
            break;
        case SETTINGS_SHOW_CURRENT_DAY_DAILY:
            globalObservable.notify({ eventName: SETTINGS_SHOW_CURRENT_DAY_DAILY, data: ApplicationSettings.getBoolean(SETTINGS_SHOW_CURRENT_DAY_DAILY) });
            break;
        case SETTINGS_FONTSCALE:
            storedFontScale = ApplicationSettings.getNumber(SETTINGS_FONTSCALE, 1);
            if (storedFontScale === 1) {
                fontScale.set(get(systemFontScale));
            } else {
                fontScale.set(storedFontScale);
            }
            topViewHeight.set(220 * Math.max(1, get(fontScale) / 1.2));
            globalObservable.notify({ eventName: SETTINGS_FONTSCALE, data: get(fontScale) });
            break;
        default:
            break;
    }
});
