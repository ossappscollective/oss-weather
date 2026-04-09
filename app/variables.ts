import { AppUtilsAndroid } from '@akylas/nativescript-app-utils';
import { themer } from '@nativescript-community/ui-material-core';
import { Application, ApplicationSettings, Color, Frame, Page, Screen, Utils } from '@nativescript/core';
import { getCurrentFontScale } from '@nativescript/core/accessibility/font-scale';
import { createGlobalEventListener, globalObservable } from '@shared/utils/svelte/ui';
import { get, writable } from 'svelte/store';
import {
    ALWAYS_SHOW_PRECIP_PROB,
    DECIMAL_METRICS_TEMP,
    DEFAULT_COLOR_THEME,
    DEFAULT_DAILY_DATA_ALIGNMENT,
    DEFAULT_DAILY_DATE_FORMAT,
    DEFAULT_METRIC_CM_TO_MM,
    SETTINGS_ALWAYS_SHOW_PRECIP_PROB,
    SETTINGS_COLOR_THEME,
    SETTINGS_DAILY_DATA_ALIGNMENT,
    SETTINGS_DAILY_DATE_FORMAT,
    SETTINGS_FEELS_LIKE_TEMPERATURES,
    SETTINGS_FONTSCALE,
    SETTINGS_IMPERIAL,
    SETTINGS_METRIC_CM_TO_MM,
    SETTINGS_METRIC_TEMP_DECIMAL,
    SETTINGS_SHOW_CURRENT_DAY_DAILY,
    SETTINGS_UNITS,
    SETTINGS_WEATHER_DATA_LAYOUT,
    WEATHER_DATA_LAYOUT
} from '~/helpers/constants';
import { ColorThemes, getRealTheme, useDynamicColors } from '~/helpers/theme';
import { DEFAULT_IMPERIAL_UINTS, DEFAULT_METRIC_UINTS } from '~/helpers/units';
import { prefs } from '~/services/preferences';

export const colors = writable({
    colorPrimary: '',
    colorOnPrimary: '',
    colorPrimaryContainer: '',
    colorOnPrimaryContainer: '',
    colorSecondary: '',
    colorOnSecondary: '',
    colorSecondaryContainer: '',
    colorOnSecondaryContainer: '',
    colorTertiary: '',
    colorOnTertiary: '',
    colorTertiaryContainer: '',
    colorOnTertiaryContainer: '',
    colorError: '',
    colorOnError: '',
    colorErrorContainer: '',
    colorOnErrorContainer: '',
    colorOutline: '',
    colorOutlineVariant: '',
    colorBackground: '',
    colorOnBackground: '',
    colorSurface: '',
    colorOnSurface: '',
    colorSurfaceVariant: '',
    colorOnSurfaceVariant: '',
    colorOnSurfaceVariant2: '',
    colorSurfaceInverse: '',
    colorOnSurfaceInverse: '',
    colorPrimaryInverse: '',
    colorSurfaceContainer: '',
    colorSurfaceBright: '',
    colorSurfaceDim: '',
    colorSurfaceContainerLow: '',
    colorSurfaceContainerLowest: '',
    colorSurfaceContainerHigh: '',
    colorSurfaceContainerHighest: '',
    colorWidgetBackground: '',
    colorOnSurfaceDisabled: '',
    popupMenuBackground: ''
});
export const fonts = writable({
    mdi: '',
    wi: '',
    app: ''
});
export const windowInset = writable({ top: 0, left: 0, right: 0, bottom: 0 });
export const actionBarButtonHeight = writable(0);
export const actionBarHeight = writable(0);
export const screenHeightDips = Screen.mainScreen.heightDIPs;
export const screenWidthDips = Screen.mainScreen.widthDIPs;

export const systemFontScale = writable(1);

export const iconColor = new Color('#FFC82F');
export const sunnyColor = new Color('#FFC930');
// export const nightColor = new Color('#845987');
export const scatteredCloudyColor = new Color('#aaa');
export const cloudyColor = new Color('#929292');
export const rainColor = new Color('#4681C3');
export const snowColor = new Color('#43b4e0');

export let imperialUnits = ApplicationSettings.getBoolean(SETTINGS_IMPERIAL, false);
export let metricDecimalTemp = ApplicationSettings.getBoolean(SETTINGS_METRIC_TEMP_DECIMAL, DECIMAL_METRICS_TEMP);
export let unitCMToMM = ApplicationSettings.getBoolean(SETTINGS_METRIC_CM_TO_MM, DEFAULT_METRIC_CM_TO_MM);
export const alwaysShowPrecipProb = writable(ApplicationSettings.getBoolean(SETTINGS_ALWAYS_SHOW_PRECIP_PROB, ALWAYS_SHOW_PRECIP_PROB));
export const dailyDataAlignment = writable(ApplicationSettings.getString(SETTINGS_DAILY_DATA_ALIGNMENT, DEFAULT_DAILY_DATA_ALIGNMENT));
export const weatherDataLayout = writable(ApplicationSettings.getString(SETTINGS_WEATHER_DATA_LAYOUT, WEATHER_DATA_LAYOUT));
export const imperial = writable(imperialUnits);
export let dailyDateFormat = ApplicationSettings.getString(SETTINGS_DAILY_DATE_FORMAT, DEFAULT_DAILY_DATE_FORMAT);

let storedFontScale = ApplicationSettings.getNumber(SETTINGS_FONTSCALE, 1);
if (isNaN(storedFontScale)) {
    storedFontScale = 1;
}
export const fontScale = writable(storedFontScale);
export const isRTL = writable(false);

export const onUnitsChanged = createGlobalEventListener(SETTINGS_UNITS);
export const onFontScaleChanged = createGlobalEventListener(SETTINGS_FONTSCALE);
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
        case SETTINGS_ALWAYS_SHOW_PRECIP_PROB:
            alwaysShowPrecipProb.set(ApplicationSettings.getBoolean(SETTINGS_ALWAYS_SHOW_PRECIP_PROB, ALWAYS_SHOW_PRECIP_PROB));
            DEV_LOG && console.log(`key:${SETTINGS_ALWAYS_SHOW_PRECIP_PROB}`, get(alwaysShowPrecipProb));
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
            globalObservable.notify({ eventName: SETTINGS_FONTSCALE, data: get(fontScale) });
            break;
        default:
            break;
    }
});

function updateSystemFontScale(value) {
    value = value || 1; // forbid 0
    systemFontScale.set(value);
    // console.log('updateSystemFontScale', value, storedFontScale);
    if (storedFontScale === 1) {
        fontScale.set(value);
    }
    globalObservable.notify({ eventName: 'fontscale', data: get(fontScale) });
}
function updateRootCss() {
    let rootView = Application.getRootView();
    if (rootView?.parent) {
        rootView = rootView.parent as any;
    }
    rootView?._onCssStateChange();
    const rootModalViews = rootView?._getRootModalViews();
    rootModalViews?.forEach((rootModalView) => rootModalView._onCssStateChange());
}
function getRootViewStyle() {
    let rootView = Application.getRootView();
    if (rootView?.parent) {
        rootView = rootView.parent as any;
    }
    return rootView?.style;
}

if (__ANDROID__) {
    Application.android.on(Application.android.activityCreateEvent, (event) => {
        AppUtilsAndroid.prepareActivity(event.activity, useDynamicColors);
    });
    Page.on('shownModally', function (event) {
        AppUtilsAndroid.prepareWindow(event.object['_dialogFragment'].getDialog().getWindow());
    });
    Frame.on('shownModally', function (event) {
        AppUtilsAndroid.prepareWindow(event.object['_dialogFragment'].getDialog().getWindow());
    });
}
let initRootViewCalled = false;
export function onInitRootViewFromEvent() {
    onInitRootView();
}
export function onInitRootView(force = false) {
    // DEV_LOG && console.log('onInitRootView', force, initRootViewCalled);
    if (!force && initRootViewCalled) {
        return;
    }
    // we need a timeout to read rootView css variable. not 100% sure why yet
    if (__ANDROID__) {
        // setTimeout(() => {
        const rootViewStyle = getRootViewStyle();
        const rootView = Application.getRootView();
        // DEV_LOG && console.log('onInitRootView', rootView);
        if (rootView) {
            AppUtilsAndroid.listenForWindowInsets((inset) => {
                setWindowInset({
                    top: Utils.layout.toDeviceIndependentPixels(inset[0]),
                    bottom: Utils.layout.toDeviceIndependentPixels(Math.max(inset[1], inset[4])),
                    left: Utils.layout.toDeviceIndependentPixels(inset[2]),
                    right: Utils.layout.toDeviceIndependentPixels(inset[3])
                });
            });
        }
        if (!rootViewStyle) {
            return;
        }
        fonts.set({ mdi: rootViewStyle.getCssVariable('--mdiFontFamily'), app: rootViewStyle.getCssVariable('--appFontFamily'), wi: rootViewStyle.getCssVariable('--wiFontFamily') });
        actionBarHeight.set(parseFloat(rootViewStyle.getCssVariable('--actionBarHeight')));
        actionBarButtonHeight.set(parseFloat(rootViewStyle.getCssVariable('--actionBarButtonHeight')));
        const context = Utils.android.getApplicationContext();

        const resources = context.getResources();
        updateSystemFontScale(resources.getConfiguration().fontScale);
        isRTL.set(resources.getConfiguration().getLayoutDirection() === 1);

        let nActionBarHeight = Utils.layout.toDeviceIndependentPixels(AppUtilsAndroid.getDimensionFromInt(context, 16843499 /* actionBarSize */));
        if (nActionBarHeight > 0) {
            actionBarHeight.set(nActionBarHeight);
            rootViewStyle?.setUnscopedCssVariable('--actionBarHeight', nActionBarHeight + '');
        } else {
            nActionBarHeight = parseFloat(rootViewStyle.getCssVariable('--actionBarHeight'));
            actionBarHeight.set(nActionBarHeight);
        }
        const nActionBarButtonHeight = nActionBarHeight - 10;
        actionBarButtonHeight.set(nActionBarButtonHeight);
        rootViewStyle?.setUnscopedCssVariable('--actionBarButtonHeight', nActionBarButtonHeight + '');
    }

    if (__IOS__) {
        const rootView = Application.getRootView();
        const rootViewStyle = rootView?.style;
        if (!rootViewStyle) {
            return;
        }
        initRootViewCalled = !!rootView;
        DEV_LOG && console.log('initRootView', rootView);
        fonts.set({ mdi: rootViewStyle.getCssVariable('--mdiFontFamily'), app: rootViewStyle.getCssVariable('--appFontFamily'), wi: rootViewStyle.getCssVariable('--wiFontFamily') });
        const currentColors = get(colors);
        Object.keys(currentColors).forEach((c) => {
            currentColors[c] = rootViewStyle.getCssVariable('--' + c);
        });
        colors.set(currentColors);
        updateSystemFontScale(getCurrentFontScale());
        actionBarHeight.set(parseFloat(rootViewStyle.getCssVariable('--actionBarHeight')));
        actionBarButtonHeight.set(parseFloat(rootViewStyle.getCssVariable('--actionBarButtonHeight')));
        updateIOSWindowInset();
    }
    updateThemeColors(getRealTheme());
    // DEV_LOG && console.log('initRootView', get(navigationBarHeight), get(statusBarHeight), get(actionBarHeight), get(actionBarButtonHeight), get(fonts));
    Application.on(Application.fontScaleChangedEvent, (event) => updateSystemFontScale(event.newValue));
    Application.off(Application.initRootViewEvent, onInitRootViewFromEvent);
    // getRealThemeAndUpdateColors();
}
function setWindowInset(newInset) {
    windowInset.set(newInset);
    const rootViewStyle = getRootViewStyle();
    rootViewStyle?.setUnscopedCssVariable('--windowInsetLeft', newInset.left + '');
    rootViewStyle?.setUnscopedCssVariable('--windowInsetRight', newInset.right + '');
    updateRootCss();
}
function updateIOSWindowInset() {
    if (__IOS__) {
        setTimeout(() => {
            const safeAreaInsets = UIApplication.sharedApplication.keyWindow?.safeAreaInsets;
            // DEV_LOG && console.log('safeAreaInsets', safeAreaInsets.top, safeAreaInsets.right, safeAreaInsets.bottom, safeAreaInsets.left);
            if (safeAreaInsets) {
                windowInset.set({
                    left: Math.round(safeAreaInsets.left),
                    top: 0,
                    right: Math.round(safeAreaInsets.right),
                    bottom: 0
                });
            }
        }, 0);
    }
}
function onOrientationChanged() {
    if (__ANDROID__) {
        const rootViewStyle = getRootViewStyle();
        const context = Utils.android.getApplicationContext();

        const nActionBarHeight = Utils.layout.toDeviceIndependentPixels(AppUtilsAndroid.getDimensionFromInt(context, 16843499 /* actionBarSize */));
        if (nActionBarHeight > 0) {
            actionBarHeight.set(nActionBarHeight);
            rootViewStyle?.setUnscopedCssVariable('--actionBarHeight', nActionBarHeight + '');
        }
        const nActionBarButtonHeight = nActionBarHeight - 10;
        actionBarButtonHeight.set(nActionBarButtonHeight);
        rootViewStyle?.setUnscopedCssVariable('--actionBarButtonHeight', nActionBarButtonHeight + '');
        updateRootCss();
    } else {
        updateIOSWindowInset();
    }
}
Application.on(Application.initRootViewEvent, onInitRootViewFromEvent);
Application.on(Application.orientationChangedEvent, onOrientationChanged);
if (__ANDROID__) {
    Application.android.on(Application.android.activityStartedEvent, () => {
        const resources = Utils.android.getApplicationContext().getResources();
        isRTL.set(resources.getConfiguration().getLayoutDirection() === 1);
    });
}

export function updateThemeColors(theme: string, colorTheme: ColorThemes = ApplicationSettings.getString(SETTINGS_COLOR_THEME, DEFAULT_COLOR_THEME) as ColorThemes) {
    try {
        DEV_LOG && console.log('updateThemeColors', theme, colorTheme);
        let rootView = Application.getRootView();
        if (rootView?.parent) {
            rootView = rootView.parent as any;
        }
        const rootViewStyle = rootView?.style;
        if (!rootViewStyle || !theme) {
            return;
        }
        // if (!force && lastThemeColor === theme) {
        //     return;
        // }
        // lastThemeColor = theme;
        const currentColors = get(colors);
        // rootViewStyle?.setUnscopedCssVariable('--systemFontScale', systemFontScale + '');
        if (__ANDROID__) {
            const activity = Application.android.startActivity;
            // we also update system font scale so that our UI updates correcly
            updateSystemFontScale(Utils.android.getApplicationContext().getResources().getConfiguration().fontScale);
            Object.keys(currentColors).forEach((c) => {
                if (c.endsWith('Disabled')) {
                    return;
                }
                if (c === 'colorBackground') {
                    currentColors.colorBackground = new Color(AppUtilsAndroid.getColorFromInt(activity, 16842801)).hex;
                } else if (c === 'popupMenuBackground') {
                    currentColors.popupMenuBackground = new Color(AppUtilsAndroid.getColorFromInt(activity, 16843126)).hex;
                } else {
                    currentColors[c] = new Color(AppUtilsAndroid.getColorFromName(activity, c)).hex;
                }
            });
        } else {
            const themeColors = require(`~/themes/${colorTheme}.json`);
            Object.assign(currentColors, theme === 'dark' || theme === 'black' ? themeColors.dark : themeColors.light);

            themer.setPrimaryColor(currentColors.colorPrimary);
            themer.setOnPrimaryColor(currentColors.colorOnPrimary);
            themer.setAccentColor(currentColors.colorPrimary);
            themer.setSecondaryColor(currentColors.colorSecondary);
            themer.setSurfaceColor(currentColors.colorSurface);
            themer.setOnSurfaceColor(currentColors.colorOnSurface);
        }

        if (theme === 'black') {
            currentColors.colorBackground = '#000000';
            currentColors.colorSurfaceContainer = '#000000';
        }

        currentColors.colorWidgetBackground = new Color(currentColors.colorSurfaceContainer).setAlpha(230).hex;
        currentColors.colorOnSurfaceDisabled = new Color(currentColors.colorOnSurface).setAlpha(50).hex;

        if (theme === 'dark') {
            currentColors.colorSurfaceContainerHigh = new Color(currentColors.colorSurfaceContainer).lighten(3).hex;
            currentColors.colorSurfaceContainerHighest = new Color(currentColors.colorSurfaceContainer).lighten(6).hex;
        } else {
            currentColors.colorSurfaceContainerHigh = new Color(currentColors.colorSurfaceContainer).darken(3).hex;
            currentColors.colorSurfaceContainerHighest = new Color(currentColors.colorSurfaceContainer).darken(6).hex;
        }
        currentColors.colorOnSurfaceVariant2 = new Color(currentColors.colorOnSurfaceVariant).setAlpha(170).hex;
        Object.keys(currentColors).forEach((c) => {
            rootViewStyle?.setUnscopedCssVariable('--' + c, currentColors[c]);
        });
        colors.set(currentColors);

        Application.notify({ eventName: 'colorsChange', colors: currentColors });
        // DEV_LOG && console.log('changed colors', rootView, JSON.stringify(currentColors));
        rootView?._onCssStateChange();
        const rootModalViews = rootView?._getRootModalViews();
        rootModalViews.forEach((rootModalView) => rootModalView._onCssStateChange());
    } catch (error) {
        console.error(error, error.stack);
    }
}
