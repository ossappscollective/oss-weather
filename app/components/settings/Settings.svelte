<script context="module" lang="ts">
    import { share } from '@akylas/nativescript-app-utils/share';
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { openFilePicker, saveFile } from '@nativescript-community/ui-document-picker';
    import { Label } from '@nativescript-community/ui-label';
    import { showBottomSheet } from '@nativescript-community/ui-material-bottomsheet/svelte';
    import { confirm, prompt } from '@nativescript-community/ui-material-dialogs';
    import { showSnack } from '@nativescript-community/ui-material-snackbar';
    import { TextField, TextFieldProperties } from '@nativescript-community/ui-material-textfield';
    import { TextView } from '@nativescript-community/ui-material-textview';
    import { Application, ApplicationSettings, File, ObservableArray, Page, ScrollView, StackLayout, TouchGestureEventData, Utils, View } from '@nativescript/core';
    import { inappItems, presentInAppSponsorBottomsheet } from '@shared/utils/inapp-purchase';
    import { Sentry, startSentry, stopSentry } from '@shared/utils/sentry';
    import { showError } from '@shared/utils/showError';
    import { navigate } from '@shared/utils/svelte/ui';
    import dayjs from 'dayjs';
    import { onDestroy, onMount } from 'svelte';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import ListItemAutoSize from '~/components/common/ListItemAutoSize.svelte';
    import {
        ALWAYS_SHOW_PRECIP_PROB,
        ANIMATIONS_ENABLED,
        CHARTS_LANDSCAPE,
        CHARTS_PORTRAIT_FULLSCREEN,
        DAILY_PAGE_HOURLY_CHART,
        DEFAULT_DAILY_DATA_ALIGNMENT,
        DEFAULT_DAILY_DATE_FORMAT,
        DEFAULT_HOURLYMAIN_DATA,
        DEFAULT_HOURLY_ODD_COLORS,
        FEELS_LIKE_TEMPERATURE,
        MAIN_CHART_NB_HOURS,
        MAIN_PAGE_HOURLY_CHART,
        MAX_NB_DAYS_FORECAST,
        MIN_UV_INDEX,
        NB_DAYS_FORECAST,
        NB_HOURS_FORECAST,
        NB_MINUTES_FORECAST,
        SETTINGS_ALWAYS_SHOW_PRECIP_PROB,
        SETTINGS_DAILY_DATA_ALIGNMENT,
        SETTINGS_DAILY_DATE_FORMAT,
        SETTINGS_DAILY_PAGE_HOURLY_CHART,
        SETTINGS_ENABLE_CRASH_REPORT,
        SETTINGS_FEELS_LIKE_TEMPERATURES,
        SETTINGS_HOURLY_MAIN_DATA,
        SETTINGS_HOURLY_ODD_COLORS,
        SETTINGS_IMPERIAL,
        SETTINGS_LANGUAGE,
        SETTINGS_MAIN_CHART_NB_HOURS,
        SETTINGS_MAIN_PAGE_HOURLY_CHART,
        SETTINGS_METRIC_CM_TO_MM,
        SETTINGS_METRIC_TEMP_DECIMAL,
        SETTINGS_MIN_UV_INDEX,
        SETTINGS_PROVIDER,
        SETTINGS_PROVIDER_AQI,
        SETTINGS_SHOW_CURRENT_DAY_DAILY,
        SETTINGS_SHOW_DAILY_IN_CURRENTLY,
        SETTINGS_SWIPE_ACTION_BAR_PROVIDER,
        SETTINGS_UNITS,
        SETTINGS_WEATHER_DATA_LAYOUT,
        SHOW_CURRENT_DAY_DAILY,
        SHOW_DAILY_IN_CURRENTLY,
        SWIPE_ACTION_BAR_PROVIDER,
        WEATHER_DATA_LAYOUT
    } from '~/helpers/constants';
    import { clock_24, getLocaleDisplayName, l, lc, onLanguageChanged, selectLanguage, slc } from '~/helpers/locale';
    import { getColorThemeDisplayName, getThemeDisplayName, onThemeChanged, selectColorTheme, selectTheme } from '~/helpers/theme';
    import { AVAILABLE_UINTS, UNIT_FAMILIES } from '~/helpers/units';
    import { networkService } from '~/services/api';
    import { gadgetbridgeService } from '~/services/gadgetbridge';
    import { iconService } from '~/services/icon';
    import { MaptilerProvider } from '~/services/providers/maptiler';
    import { aqi_providers, getAqiProviderType, getProviderSettins, getProviderType, providers } from '~/services/providers/weatherproviderfactory';
    import { AVAILABLE_WEATHER_DATA, AVAILABLE_WEATHER_DATA_MAIN_HOURLY, getWeatherDataTitle, weatherDataService } from '~/services/weatherData';
    import { confirmRestartApp, createView, getDateFormatHTMLArgs, hideLoading, openLink, selectValue, showLoading, showSliderPopover } from '~/utils/ui';
    import { colors, fontScale, fonts, iconColor, imperial, metricDecimalTemp, onFontScaleChanged, onUnitsChanged, unitCMToMM, unitsSettings, windowInset } from '~/variables';
    import IconButton from '../common/IconButton.svelte';
    const version = __APP_VERSION__ + ' Build ' + __APP_BUILD_NUMBER__;
    const storeSettings = {};
</script>

<script lang="ts">
    // technique for only specific properties to get updated on store change
    let { colorOnBackground, colorOnSurfaceVariant, colorPrimary } = $colors;
    $: ({ colorOnBackground, colorOnSurfaceVariant, colorPrimary } = $colors);
    $: ({ bottom: windowInsetBottom } = $windowInset);

    let collectionView: NativeViewElementNode<CollectionView>;
    let page: NativeViewElementNode<Page>;

    let items: ObservableArray<any>;

    const inAppAvailable = PLAY_STORE_BUILD && inappItems?.length > 0;

    export let title = null;
    export let reorderEnabled = false;
    export let onReordered: (items) => void = null;
    export let actionBarButtons = [
        { icon: 'mdi-share-variant', id: 'share' },
        { icon: 'mdi-github', id: 'github' }
    ];
    export let subSettingsOptions: string = null;
    export let options: (page, updateItem) => Promise<any[]> = null;
    if (!options && subSettingsOptions) {
        options = getSubSettings(subSettingsOptions);
    }
    if (subSettingsOptions === 'widgets') {
        onMount(() => {
            Application.on('widgetAdded', refresh);
            Application.on('widgetRemoved', refresh);
        });
        onDestroy(() => {
            Application.off('widgetAdded', refresh);
            Application.off('widgetRemoved', refresh);
        });
    }

    function getTitle(item) {
        switch (item.id) {
            case 'token':
                return lc(item.token);
            default:
                return item.title;
        }
    }
    function getDescription(item) {
        return typeof item.description === 'function' ? item.description(item) : item.description;
    }

    function getStoreSetting(k: string, defaultValue) {
        if (!storeSettings[k]) {
            storeSettings[k] = JSON.parse(ApplicationSettings.getString(k, defaultValue));
        }
        return storeSettings[k];
    }
    function getSubSettings(id: string) {
        switch (id) {
            case 'appearance':
                return async () => [
                    {
                        id: 'theme',
                        description: () => getThemeDisplayName(),
                        title: lc('theme.title')
                    },
                    {
                        id: 'color_theme',
                        description: () => getColorThemeDisplayName(),
                        title: lc('color_theme.title')
                    },
                    {
                        type: 'switch',
                        id: 'auto_black',
                        title: lc('auto_black'),
                        value: ApplicationSettings.getBoolean('auto_black', false)
                    },
                    {
                        icon: 'mdi-format-size',
                        id: 'font_scale',
                        title: lc('font_scale')
                    },

                    {
                        type: 'sectionheader',
                        title: lc('daily')
                    },
                    {
                        id: 'setting',
                        valueType: 'string',
                        key: SETTINGS_WEATHER_DATA_LAYOUT,
                        title: lc('weather_data_layout'),
                        values: [
                            { value: 'default', title: lc('blocks') },
                            { value: 'line', title: lc('lines') }
                        ],
                        rightValue: () => ApplicationSettings.getString(SETTINGS_WEATHER_DATA_LAYOUT, WEATHER_DATA_LAYOUT)
                    },
                    {
                        key: SETTINGS_DAILY_DATA_ALIGNMENT,
                        id: 'setting',
                        valueType: 'string',
                        title: lc('daily_view_data_alignment'),
                        values: [
                            {
                                value: 'left',
                                title: lc('left')
                            },
                            {
                                value: 'center',
                                title: lc('center')
                            },
                            {
                                value: 'right',
                                title: lc('right')
                            }
                        ],
                        rightValue: () => lc(ApplicationSettings.getString(SETTINGS_DAILY_DATA_ALIGNMENT, DEFAULT_DAILY_DATA_ALIGNMENT))
                    }
                ];
            case 'debugging':
                return async () =>
                    PLAY_STORE_BUILD
                        ? [
                              {
                                  type: 'switch',
                                  id: SETTINGS_ENABLE_CRASH_REPORT,
                                  title: lc('crash_report'),
                                  description: lc('crash_report_desc'),
                                  value: ApplicationSettings.getBoolean(SETTINGS_ENABLE_CRASH_REPORT, PLAY_STORE_BUILD)
                              }
                          ]
                        : [];
            case 'locales':
                return async () => [
                    {
                        id: SETTINGS_LANGUAGE,
                        description: () => getLocaleDisplayName(),
                        title: lc('language')
                    },
                    {
                        type: 'switch',
                        id: 'clock_24',
                        title: lc('clock_24'),
                        value: clock_24
                    },
                    {
                        type: 'prompt',
                        valueType: 'string',
                        id: 'setting',
                        key: SETTINGS_DAILY_DATE_FORMAT,
                        default: () => ApplicationSettings.getString(SETTINGS_DAILY_DATE_FORMAT, DEFAULT_DAILY_DATE_FORMAT),
                        description: lc('daily_date_format_description'),
                        title: lc('daily_date_format'),
                        full_description: lc('daily_date_format_fulldesc', ...getDateFormatHTMLArgs()),
                        useHTML: true,
                        onLinkTap: ({ link }) => {
                            openLink(link);
                        },
                        textFieldProperties: {
                            autocapitalizationType: 'none',
                            autocorrect: false
                        } as TextFieldProperties
                    }
                ];
            case 'charts':
                return async () => [
                    {
                        type: 'switch',
                        id: 'charts_landscape',
                        title: lc('charts_landscape'),
                        value: ApplicationSettings.getBoolean('charts_landscape', CHARTS_LANDSCAPE)
                    },
                    {
                        type: 'switch',
                        id: 'charts_portrait_fullscreen',
                        title: lc('charts_portrait_fullscreen'),
                        value: ApplicationSettings.getBoolean('charts_portrait_fullscreen', CHARTS_PORTRAIT_FULLSCREEN)
                    }
                ];
            case 'units':
                return async () => [
                    {
                        type: 'switch',
                        id: SETTINGS_IMPERIAL,
                        title: lc('imperial_units'),
                        description: lc('imperial_units_desc'),
                        value: $imperial
                    },
                    {
                        type: 'switch',
                        id: SETTINGS_METRIC_TEMP_DECIMAL,
                        title: lc('metric_temp_decimal'),
                        value: metricDecimalTemp
                    },
                    {
                        type: 'switch',
                        id: SETTINGS_METRIC_CM_TO_MM,
                        title: lc('units_cm_to_mm'),
                        description: lc('units_cm_to_mm_desc'),
                        value: unitCMToMM
                    },
                    {
                        type: 'sectionheader',
                        title: lc('custom_units')
                    },
                    {
                        id: 'store_setting',
                        store: unitsSettings,
                        storeKey: SETTINGS_UNITS,
                        key: UNIT_FAMILIES.Temperature,
                        valueType: 'string',
                        title: lc('temperature'),
                        rightValue: () => unitsSettings[UNIT_FAMILIES.Temperature],
                        values: AVAILABLE_UINTS[UNIT_FAMILIES.Temperature].map((u) => ({ title: u, value: u }))
                    },
                    {
                        id: 'store_setting',
                        store: unitsSettings,
                        storeKey: SETTINGS_UNITS,
                        key: UNIT_FAMILIES.Distance,
                        valueType: 'string',
                        title: lc('distance'),
                        rightValue: () => unitsSettings[UNIT_FAMILIES.Distance],
                        values: AVAILABLE_UINTS[UNIT_FAMILIES.Distance].map((u) => ({ title: u, value: u }))
                    },
                    {
                        id: 'store_setting',
                        store: unitsSettings,
                        storeKey: SETTINGS_UNITS,
                        key: UNIT_FAMILIES.Precipitation,
                        valueType: 'string',
                        title: lc('precipitation'),
                        rightValue: () => unitsSettings[UNIT_FAMILIES.Precipitation],
                        values: AVAILABLE_UINTS[UNIT_FAMILIES.Precipitation].map((u) => ({ title: u, value: u }))
                    },
                    {
                        id: 'store_setting',
                        store: unitsSettings,
                        storeKey: SETTINGS_UNITS,
                        key: UNIT_FAMILIES.DistanceSmall,
                        valueType: 'string',
                        title: lc('snow'),
                        rightValue: () => unitsSettings[UNIT_FAMILIES.DistanceSmall],
                        values: AVAILABLE_UINTS[UNIT_FAMILIES.DistanceSmall].map((u) => ({ title: u, value: u }))
                    },
                    {
                        id: 'store_setting',
                        store: unitsSettings,
                        storeKey: SETTINGS_UNITS,
                        key: UNIT_FAMILIES.Speed,
                        valueType: 'string',
                        title: lc('speed'),
                        rightValue: () => unitsSettings[UNIT_FAMILIES.Speed],
                        values: AVAILABLE_UINTS[UNIT_FAMILIES.Speed].map((u) => ({ title: u, value: u }))
                    },
                    {
                        id: 'store_setting',
                        store: unitsSettings,
                        storeKey: SETTINGS_UNITS,
                        key: UNIT_FAMILIES.Pressure,
                        valueType: 'string',
                        title: lc('pressure'),
                        rightValue: () => unitsSettings[UNIT_FAMILIES.Pressure],
                        values: AVAILABLE_UINTS[UNIT_FAMILIES.Pressure].map((u) => ({ title: u, value: u }))
                    }
                ];
            case 'icons':
                return async (page, updateItem) => [
                    {
                        type: 'switch',
                        id: 'animations',
                        title: lc('animations'),
                        description: lc('animations_desc'),
                        value: ApplicationSettings.getBoolean('animations', ANIMATIONS_ENABLED)
                    },
                    {
                        type: 'image',
                        id: 'icon_pack',
                        title: lc('icon_pack'),
                        description: () => iconService.getPackName(),
                        image: () => iconService.getPackIcon(),
                        async onTap(item) {
                            const data = await selectValue<string>(
                                (await iconService.getAvailableThemes()).map((k) => ({
                                    title: k.name,
                                    subtitle: k.description,
                                    data: k.id,
                                    type: 'checkbox_image',
                                    image: k.icon,
                                    imageWidth: k.imageWidth,
                                    imageMargin: k.imageMargin
                                })),
                                iconService.iconSet,
                                {
                                    title: lc('icon_pack')
                                }
                            );
                            if (data) {
                                ApplicationSettings.setString('icon_set', data);
                                updateItem(item, 'id');
                            }
                        }
                    }
                ];
            case 'providers':
                return async () => {
                    const options = [
                        {
                            key: SETTINGS_PROVIDER,
                            id: 'setting',
                            valueType: 'string',
                            description: () => lc('provider.' + getProviderType()),
                            title: lc('provider.title'),
                            currentValue: getProviderType,
                            values: providers.map((t) => ({ value: t, title: lc('provider.' + t) }))
                        },
                        {
                            key: SETTINGS_PROVIDER_AQI,
                            id: 'setting',
                            valueType: 'string',
                            description: () => lc('provider_aqi.' + getAqiProviderType()),
                            title: lc('provider_aqi.title'),
                            currentValue: getAqiProviderType,
                            values: aqi_providers.map((t) => ({ value: t, title: lc('provider_aqi.' + t) }))
                        },
                        {
                            key: 'forecast_nb_days',
                            id: 'setting',
                            title: lc('forecast_nb_days'),
                            values: Array.from(Array(MAX_NB_DAYS_FORECAST), (_, index) => ({ value: index + 1, title: index + 1 })),
                            rightValue: () => ApplicationSettings.getNumber('forecast_nb_days', NB_DAYS_FORECAST)
                        },
                        {
                            key: 'forecast_nb_hours',
                            id: 'setting',
                            title: lc('forecast_nb_hours'),
                            values: Array.from(Array(MAX_NB_DAYS_FORECAST * 2), (_, index) => ({ value: (index + 1) * 12, title: (index + 1) * 12 })),
                            rightValue: () => ApplicationSettings.getNumber('forecast_nb_hours', NB_HOURS_FORECAST)
                        },
                        {
                            key: 'forecast_nb_minutes',
                            id: 'setting',
                            title: lc('forecast_nb_minutes'),
                            values: Array.from(Array(120), (_, index) => ({ value: index + 1, title: index + 1 })),
                            rightValue: () => ApplicationSettings.getNumber('forecast_nb_minutes', NB_MINUTES_FORECAST)
                        },
                        {
                            type: 'switch',
                            id: SETTINGS_SWIPE_ACTION_BAR_PROVIDER,
                            title: lc('swipe_actionbar_provider'),
                            description: lc('swipe_actionbar_provider_desc'),
                            value: ApplicationSettings.getBoolean(SETTINGS_SWIPE_ACTION_BAR_PROVIDER, SWIPE_ACTION_BAR_PROVIDER)
                        }
                    ] as any[];
                    providers.sort().forEach((provider) => {
                        const providerSettings = getProviderSettins(provider);
                        if (providerSettings?.length) {
                            options.push(
                                {
                                    type: 'sectionheader',
                                    title: lc(`provider.${provider}`)
                                },
                                ...providerSettings
                            );
                        }
                    });

                    return options;
                };
            case 'weather_data':
                return async () => {
                    const currentData = weatherDataService.currentWeatherData;
                    const currentSmallData = weatherDataService.currentSmallWeatherData;
                    const allData = currentData.concat(currentSmallData);
                    const disabledData = AVAILABLE_WEATHER_DATA.filter((d) => allData.indexOf(d) === -1);
                    return [
                        {
                            type: 'switch',
                            id: SETTINGS_SHOW_CURRENT_DAY_DAILY,
                            title: lc('show_current_day_daily'),
                            value: ApplicationSettings.getBoolean(SETTINGS_SHOW_CURRENT_DAY_DAILY, SHOW_CURRENT_DAY_DAILY)
                        },
                        {
                            type: 'switch',
                            id: SETTINGS_SHOW_DAILY_IN_CURRENTLY,
                            title: lc('show_daily_in_currently'),
                            value: ApplicationSettings.getBoolean(SETTINGS_SHOW_DAILY_IN_CURRENTLY, SHOW_DAILY_IN_CURRENTLY)
                        },
                        {
                            type: 'switch',
                            id: SETTINGS_FEELS_LIKE_TEMPERATURES,
                            title: lc('feels_like_temperatures'),
                            value: ApplicationSettings.getBoolean(SETTINGS_FEELS_LIKE_TEMPERATURES, FEELS_LIKE_TEMPERATURE)
                        },
                        {
                            type: 'switch',
                            id: SETTINGS_ALWAYS_SHOW_PRECIP_PROB,
                            title: lc('always_show_precip_prob'),
                            description: lc('always_show_precip_prob_desc'),
                            value: ApplicationSettings.getBoolean(SETTINGS_ALWAYS_SHOW_PRECIP_PROB, ALWAYS_SHOW_PRECIP_PROB)
                        },
                        {
                            key: SETTINGS_MIN_UV_INDEX,
                            id: 'setting',
                            title: lc('min_uv_index'),
                            values: Array.from(Array(10), (_, index) => ({ value: index + 1, title: index + 1 })),
                            rightValue: () => ApplicationSettings.getNumber(SETTINGS_MIN_UV_INDEX, MIN_UV_INDEX)
                        },
                        {
                            type: 'sectionheader',
                            id: 'enabled',
                            title: lc('enabled_weather_data')
                        }
                    ]
                        .concat(
                            currentData.map((k) => ({
                                id: k,
                                reorder: true,
                                type: 'reorder',
                                title: getWeatherDataTitle(k)
                            })) as any
                        )
                        .concat([
                            {
                                type: 'sectionheader',
                                id: 'enabled_small',
                                reorder: true,
                                title: lc('enabled_small_weather_data')
                            }
                        ] as any)
                        .concat(
                            currentSmallData.map((k) => ({
                                id: k,
                                reorder: true,
                                type: 'reorder',
                                title: getWeatherDataTitle(k)
                            })) as any
                        )
                        .concat([
                            {
                                type: 'sectionheader',
                                id: 'disabled',
                                reorder: true,
                                title: lc('disabled_weather_data')
                            }
                        ] as any)
                        .concat(
                            disabledData.map((k) => ({
                                id: k,
                                reorder: true,
                                type: 'reorder',
                                title: getWeatherDataTitle(k)
                            })) as any
                        );
                };
            case 'map':
                return async () => MaptilerProvider.getSettings();
            case 'geolocation':
                return async () => [
                    {
                        type: 'switch',
                        id: 'refresh_location_on_pull',
                        title: lc('refresh_location_on_pull'),
                        value: ApplicationSettings.getBoolean('refresh_location_on_pull', false)
                    }
                ];
            case 'integrations':
                if (!__ANDROID__) {
                    return async () => [];
                }
                return async () => [
                    {
                        type: 'switch',
                        id: 'gadgetbridge_enabled',
                        title: lc('gadgetbridge_enabled'),
                        description: lc('gadgetbridge_enabled_desc'),
                        value: ApplicationSettings.getBoolean('gadgetbridge_enabled', false)
                    }
                ];
            case 'hourly':
                return async () => {
                    const currentData = JSON.parse(ApplicationSettings.getString(SETTINGS_HOURLY_MAIN_DATA, DEFAULT_HOURLYMAIN_DATA));
                    const disabledData = AVAILABLE_WEATHER_DATA_MAIN_HOURLY.filter((d) => currentData.indexOf(d) === -1);
                    return [
                        {
                            type: 'switch',
                            id: SETTINGS_HOURLY_ODD_COLORS,
                            title: lc('use_odd_colors_in_hourly'),
                            value: ApplicationSettings.getBoolean(SETTINGS_HOURLY_ODD_COLORS, DEFAULT_HOURLY_ODD_COLORS)
                        },
                        {
                            type: 'switch',
                            id: SETTINGS_MAIN_PAGE_HOURLY_CHART,
                            title: lc('show_hourly_chart_on_main'),
                            value: ApplicationSettings.getBoolean(SETTINGS_MAIN_PAGE_HOURLY_CHART, MAIN_PAGE_HOURLY_CHART)
                        },
                        {
                            type: 'switch',
                            id: SETTINGS_DAILY_PAGE_HOURLY_CHART,
                            title: lc('show_hourly_chart_on_daily'),
                            value: ApplicationSettings.getBoolean(SETTINGS_DAILY_PAGE_HOURLY_CHART, DAILY_PAGE_HOURLY_CHART)
                        },
                        {
                            key: SETTINGS_MAIN_CHART_NB_HOURS,
                            id: 'setting',
                            title: lc('main_chart_nb_hours'),
                            values: Array.from(Array(MAX_NB_DAYS_FORECAST * 2), (_, index) => ({ value: (index + 1) * 12, title: (index + 1) * 12 })),
                            rightValue: () => ApplicationSettings.getNumber(SETTINGS_MAIN_CHART_NB_HOURS, MAIN_CHART_NB_HOURS)
                        },
                        {
                            type: 'sectionheader',
                            id: 'enabled',
                            title: lc('weather_data_to_show_on_main')
                        }
                    ]
                        .concat(
                            currentData.map((k) => ({
                                id: k,
                                reorder: true,
                                type: 'reorder',
                                title: getWeatherDataTitle(k)
                            }))
                        )
                        .concat([
                            {
                                type: 'sectionheader',
                                id: 'disabled',
                                reorder: true,
                                title: lc('available_weather_data')
                            }
                        ] as any)
                        .concat(
                            disabledData.map((k) => ({
                                id: k,
                                reorder: true,
                                type: 'reorder',
                                title: getWeatherDataTitle(k)
                            })) as any
                        );
                };
            case 'widgets':
                return async (page, updateItem) => {
                    if (WIDGETS) {
                        const { WIDGET_KINDS, WIDGET_NAMES, WidgetConfigManager } = await import('plugin-widgets');
                        const configs = WidgetConfigManager.getAllConfigs();
                        const items: any[] = [
                            {
                                id: 'widget_open_app_on_tap',
                                type: 'switch',
                                title: lc('widget_open_app_on_tap'),
                                value: WidgetConfigManager.getOpenAppOnWidgetTap()
                            },
                            {
                                id: 'widget_update_frequency',
                                title: lc('widget_update_frequency'),
                                description: lc('widget_update_frequency_description'),
                                rightValue: () => {
                                    const freq = WidgetConfigManager.getUpdateFrequency();
                                    DEV_LOG && console.log('widget_update_frequency right', freq);
                                    return freq < 60 ? `${freq} min` : freq === 60 ? '1 hour' : `${freq / 60} hours`;
                                }
                            },
                            {
                                id: 'update_all_widgets',
                                title: lc('update_all_widgets_now'),
                                description: ''
                            },
                            {
                                type: 'sectionheader',
                                title: lc('widget_kind_defaults')
                            }
                        ];

                        // Add per-kind default configurations
                        WIDGET_KINDS.forEach((widgetKind) => {
                            const displayName = WIDGET_NAMES[widgetKind] || widgetKind;
                            items.push({
                                id: 'configure_widget_kind',
                                widgetClass: widgetKind,
                                title: displayName,
                                description: lc('default_settings_for_kind')
                            });
                        });

                        // Add configured widget instances grouped by kind
                        WIDGET_KINDS.forEach((widgetKind) => {
                            const instanceIds = WidgetConfigManager.getInstancesOfKind(widgetKind);

                            if (instanceIds.length > 0) {
                                items.push({
                                    type: 'sectionheader',
                                    title: WIDGET_NAMES[widgetKind]
                                });

                                instanceIds.forEach((widgetId) => {
                                    const config = configs[widgetId];
                                    items.push({
                                        id: 'configure_widget',
                                        widgetId,
                                        widgetClass: widgetKind,
                                        title: `#${widgetId}`,
                                        description: config.locationName === 'current' ? lc('my_location') : config.locationName || ''
                                    });
                                });
                            }
                        });

                        if (Object.keys(configs).length === 0) {
                            items.push({
                                type: 'info',
                                title: lc('no_widgets_configured')
                            });
                        }

                        return items;
                    }
                    return [];
                };
            default:
                break;
        }
    }

    let nbDevModeTap = 0;
    let devModeClearTimer;
    function onTouch(item, event) {
        if (event.action !== 'down') {
            return;
        }
        nbDevModeTap += 1;
        if (devModeClearTimer) {
            clearTimeout(devModeClearTimer);
        }
        if (nbDevModeTap === 6) {
            const devMode = (networkService.devMode = !networkService.devMode);
            nbDevModeTap = 0;
            showSnack({ message: devMode ? 'devmode on' : 'devmode off' });
            refresh();
            return;
        }
        devModeClearTimer = setTimeout(() => {
            devModeClearTimer = null;
            nbDevModeTap = 0;
        }, 500);
    }

    async function refresh() {
        const newItems: any[] =
            (await options?.(page, updateItem)) ||
            [
                {
                    type: 'header',
                    title: lc('donate')
                },
                {
                    type: 'sectionheader',
                    title: lc('general')
                },
                {
                    id: 'sub_settings',
                    options: getSubSettings('appearance'),
                    icon: 'mdi-cards-outline',
                    description: () => lc('appearance_settings'),
                    title: lc('appearance')
                },
                {
                    id: 'sub_settings',
                    options: getSubSettings('locales'),
                    icon: 'mdi-translate',
                    description: () => lc('language_locale_settings'),
                    title: lc('language_locale')
                }
            ]
                .concat([
                    {
                        id: 'sub_settings',
                        title: lc('icons'),
                        description: lc('icons_settings'),
                        icon: 'mdi-weather-partly-cloudy',
                        options: getSubSettings('icons')
                    },
                    {
                        id: 'sub_settings',
                        title: lc('units'),
                        description: lc('units_settings'),
                        icon: 'mdi-temperature-celsius',
                        subSettingsOptions: 'units'
                    },
                    {
                        id: 'sub_settings',
                        title: lc('providers'),
                        description: lc('providers_settings'),
                        icon: 'mdi-cloud-circle',
                        options: getSubSettings('providers')
                    },
                    {
                        id: 'sub_settings',
                        title: lc('weather_data'),
                        description: lc('weather_data_settings'),
                        reorderEnabled: true,
                        onReordered: (items) => {
                            const disabledPosition = items.findIndex((d) => d.id === 'disabled');
                            const enabledSmallPosition = items.findIndex((d) => d.id === 'enabled_small');
                            const enabledPosition = items.findIndex((d) => d.id === 'enabled');
                            weatherDataService.updateCurrentWeatherData(
                                [...items.slice(enabledPosition + 1, enabledSmallPosition)].map((d) => d.id),
                                [...items.slice(enabledSmallPosition + 1, disabledPosition)].map((d) => d.id)
                            );
                        },
                        icon: 'mdi-gauge',
                        options: getSubSettings('weather_data')
                    },
                    {
                        id: 'sub_settings',
                        title: lc('charts'),
                        description: lc('charts_settings'),
                        icon: 'mdi-chart-bar',
                        options: getSubSettings('charts')
                    },
                    {
                        id: 'sub_settings',
                        title: lc('hourly'),
                        description: lc('hourly_settings'),
                        reorderEnabled: true,
                        onReordered: (items) => {
                            const disabledPosition = items.findIndex((d) => d.id === 'disabled');
                            const enabledPosition = items.findIndex((d) => d.id === 'enabled');
                            DEV_LOG && console.log('onReordered', disabledPosition, enabledPosition);
                            const newHourlyData = [...items.slice(enabledPosition + 1, disabledPosition)].map((d) => d.id);
                            ApplicationSettings.setString(SETTINGS_HOURLY_MAIN_DATA, JSON.stringify(newHourlyData));
                        },
                        icon: 'mdi-clock-outline',
                        options: getSubSettings('hourly')
                    },
                    {
                        id: 'sub_settings',
                        title: lc('map'),
                        description: lc('map_settings'),
                        icon: 'mdi-map',
                        options: getSubSettings('map')
                    },
                    {
                        id: 'sub_settings',
                        title: lc('geolocation'),
                        description: lc('geolocation_settings'),
                        icon: 'mdi-map-marker-circle',
                        options: getSubSettings('geolocation')
                    }
                ] as any)
                .concat(
                    WIDGETS
                        ? [
                              {
                                  id: 'sub_settings',
                                  title: lc('widget_settings'),
                                  description: lc('widget_settings_desc'),
                                  icon: 'mdi-widgets',
                                  subSettingsOptions: 'widgets',
                                  options: getSubSettings('widgets')
                              }
                          ]
                        : ([] as any)
                )
                .concat(
                    __ANDROID__
                        ? [
                              {
                                  id: 'sub_settings',
                                  title: lc('integrations'),
                                  description: lc('integrations_settings'),
                                  icon: 'mdi-link-variant',
                                  options: getSubSettings('integrations')
                              }
                          ]
                        : ([] as any)
                )
                .concat(
                    PLAY_STORE_BUILD
                        ? ([
                              {
                                  id: 'sub_settings',
                                  icon: 'mdi-bug-outline',
                                  title: lc('debugging'),
                                  description: lc('debugging_settings_desc'),
                                  options: () => getSubSettings('debugging')
                              }
                          ] as any[])
                        : []
                )
                .concat([
                    {
                        id: 'third_party',
                        // rightBtnIcon: 'mdi-chevron-right',
                        title: lc('third_parties'),
                        description: lc('list_used_third_parties')
                    }
                ] as any)
                .concat(
                    SENTRY_ENABLED || !PRODUCTION
                        ? [
                              {
                                  id: 'feedback',
                                  icon: 'mdi-bullhorn',
                                  title: lc('send_feedback')
                              }
                          ]
                        : ([] as any)
                )
                .concat(
                    PLAY_STORE_BUILD
                        ? [
                              //   {
                              //       id: 'share',
                              //       rightBtnIcon: 'mdi-chevron-right',
                              //       title: lc('share_application')
                              //   },
                              {
                                  type: 'rightIcon',
                                  id: 'review',
                                  rightBtnIcon: 'mdi-chevron-right',
                                  title: lc('review_application')
                              }
                          ]
                        : ([] as any)
                )

                .concat([
                    {
                        type: 'sectionheader',
                        title: lc('backup_restore')
                    },
                    {
                        id: 'export_settings',
                        title: lc('export_settings'),
                        description: lc('export_settings_desc')
                        // rightBtnIcon: 'mdi-chevron-right'
                    },
                    {
                        id: 'import_settings',
                        title: lc('import_settings'),
                        description: lc('import_settings_desc')
                        // rightBtnIcon: 'mdi-chevron-right'
                    }
                ] as any);

        items = new ObservableArray(newItems);
    }
    refresh();

    async function onLongPress(id, event) {
        try {
            switch (id) {
                case 'version':
                    if (SENTRY_ENABLED) {
                        throw new Error('test error');
                    }
            }
        } catch (error) {
            showError(error);
        }
    }
    function updateItem(item, key = 'key') {
        const index = items.findIndex((it) => it[key] === item[key]);
        if (index !== -1) {
            items.setItem(index, item);
        }
    }
    let checkboxTapTimer;
    function clearCheckboxTimer() {
        if (checkboxTapTimer) {
            clearTimeout(checkboxTapTimer);
            checkboxTapTimer = null;
        }
    }
    async function onRightIconTap(item, event) {
        try {
            const needsUpdate = await item.onRightIconTap?.(item, event);
            if (needsUpdate) {
                updateItem(item);
            }
        } catch (error) {
            showError(error);
        }
    }
    async function onTap(item, event) {
        try {
            if (item.type === 'checkbox' || item.type === 'switch') {
                // we dont want duplicate events so let s timeout and see if we clicking diretly on the checkbox
                const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
                clearCheckboxTimer();
                checkboxTapTimer = setTimeout(() => {
                    checkboxView.checked = !checkboxView.checked;
                }, 10);
                return;
            } else if (item.type === 'reorder') {
                if (ignoreNextReorderTap) {
                    ignoreNextReorderTap = false;
                    return;
                }
                const position = items.indexOf(item);
                const disabledPosition = items.findIndex((d) => d.id === 'disabled');
                const enabledSmallPosition = items.findIndex((d) => d.id === 'enabled_small');
                const enabledPosition = items.findIndex((d) => d.id === 'enabled');
                DEV_LOG && console.log('click', position, disabledPosition, enabledSmallPosition, enabledPosition);
                if (position > disabledPosition) {
                    items.splice(position, 1);
                    if (enabledSmallPosition > -1) {
                        items.splice(enabledSmallPosition, 0, item);
                    } else {
                        items.splice(disabledPosition, 0, item);
                    }
                } else if (position > enabledPosition) {
                    items.splice(position, 1);
                    items.splice(disabledPosition, 0, item);
                }
                onReordered(items);
                return;
            }
            DEV_LOG && console.log('onTap', item.id);
            switch (item.id) {
                case 'sub_settings': {
                    const component = (await import('~/components/settings/Settings.svelte')).default;
                    navigate({
                        page: component,
                        props: {
                            title: item.title,
                            onReordered: item.onReordered,
                            reorderEnabled: item.reorderEnabled,
                            options: item.options,
                            subSettingsOptions: item.subSettingsOptions,
                            actionBarButtons: item.actionBarButtons?.() || []
                        }
                    });

                    break;
                }
                case 'font_scale':
                    const FontSizeSettingScreen = (await import('~/components/settings/FontSizeSettingScreen.svelte')).default;
                    navigate({ page: FontSizeSettingScreen });
                    break;
                case 'github':
                    openLink(GIT_URL);
                    break;
                case SETTINGS_LANGUAGE:
                    await selectLanguage();
                    break;
                case 'theme':
                    await selectTheme();
                    break;
                case 'color_theme':
                    await selectColorTheme();
                    break;
                case 'share':
                    await share({
                        message: GIT_URL
                    });
                    break;
                case 'review':
                    openLink(STORE_REVIEW_LINK);
                    break;
                case 'sponsor':
                    switch (item.type) {
                        case 'librepay':
                            openLink('https://liberapay.com/farfromrefuge');
                            break;
                        case 'patreon':
                            openLink('https://patreon.com/farfromrefuge');
                            break;

                        default:
                            if (__IOS__ && PLAY_STORE_BUILD) {
                                presentInAppSponsorBottomsheet();
                            } else {
                                // Apple wants us to use in-app purchase for donations => taking 30% ...
                                // so lets just open github and ask for love...
                                openLink(__IOS__ ? GIT_URL : SPONSOR_URL);
                            }
                            break;
                    }
                    break;
                case 'third_party':
                    const ThirdPartySoftwareBottomSheet = (await import('~/components/settings/ThirdPartySoftwareBottomSheet.svelte')).default;
                    showBottomSheet({
                        parent: this,
                        peekHeight: 400,
                        // skipCollapsedState: isLandscape(),
                        view: ThirdPartySoftwareBottomSheet
                    });
                    break;
                case 'configure_widget_kind': {
                    if (WIDGETS) {
                        const ConfigWidget = (await import('~/components/settings/ConfigWidget.svelte')).default;
                        navigate({
                            page: ConfigWidget,
                            props: {
                                widgetClass: item.widgetClass,
                                widgetId: null,
                                modalMode: false,
                                isKindConfig: true
                            }
                        });
                    }
                    break;
                }
                case 'configure_widget': {
                    if (WIDGETS) {
                        const ConfigWidget = (await import('~/components/settings/ConfigWidget.svelte')).default;
                        navigate({
                            page: ConfigWidget,
                            props: {
                                widgetClass: item.widgetClass,
                                widgetId: item.widgetId,
                                modalMode: false,
                                isKindConfig: false
                            }
                        });
                    }
                    break;
                }
                case 'widget_update_frequency': {
                    if (WIDGETS) {
                        const { WidgetConfigManager } = await import('plugin-widgets');
                        const frequencyOptions = [15, 30, 60, 120, 240, 360, 720, 1440].map((mins) => ({
                            title: mins < 60 ? `${mins} min` : mins === 60 ? '1 hour' : `${mins / 60} hours`,
                            data: mins
                        }));
                        const currentFreq = WidgetConfigManager.getUpdateFrequency();
                        const result = await selectValue(frequencyOptions, currentFreq, {
                            title: lc('widget_update_frequency')
                        });
                        DEV_LOG && console.log('widget_update_frequency', result);
                        if (result !== undefined) {
                            WidgetConfigManager.setUpdateFrequency(result);
                            showSnack({ message: lc('widget_update_frequency_saved') });
                            updateItem(item, 'id');
                        }
                    }
                    break;
                }
                case 'widget_open_app_on_tap': {
                    if (WIDGETS) {
                        // import { WIDGET_KINDS, WIDGET_NAMES, WidgetConfigManager } from 'plugin-widgets';
                        const { WidgetConfigManager } = await import('plugin-widgets');

                        const frequencyOptions = [15, 30, 60, 120, 240, 360, 720, 1440].map((mins) => ({
                            title: mins < 60 ? `${mins} min` : mins === 60 ? '1 hour' : `${mins / 60} hours`,
                            data: mins
                        }));
                        const currentFreq = WidgetConfigManager.getUpdateFrequency();
                        const result = await selectValue(frequencyOptions, currentFreq, {
                            title: lc('widget_update_frequency')
                        });
                        DEV_LOG && console.log('widget_update_frequency', result);
                        if (result !== undefined) {
                            WidgetConfigManager.setUpdateFrequency(result);
                            showSnack({ message: lc('widget_update_frequency_saved') });
                            updateItem(item, 'id');
                        }
                    }
                    break;
                }
                case 'update_all_widgets': {
                    if (WIDGETS) {
                        try {
                            showSnack({ message: lc('updating_all_widgets') });
                            const { widgetService } = await import('plugin-widgets');
                            await widgetService.updateAllWidgets();
                        } catch (error) {
                            showError(error);
                        }
                    }
                    break;
                }
                case 'feedback': {
                    if (SENTRY_ENABLED || !PRODUCTION) {
                        const view = createView(ScrollView);
                        const stackLayout = createView(StackLayout, {});
                        const commentsTF = createView(TextView, {
                            hint: lc('comments'),
                            variant: 'outline',
                            margin: 10,
                            height: 150,
                            returnKeyType: 'done'
                        });
                        const emailTF = createView(TextField, {
                            hint: lc('email'),
                            variant: 'outline',
                            autocapitalizationType: 'none',
                            margin: 10,
                            autocorrect: false,
                            keyboardType: 'email',
                            returnKeyType: 'next'
                        });
                        const nameTF = createView(TextField, {
                            hint: lc('name'),
                            margin: 10,
                            variant: 'outline',
                            returnKeyType: 'next'
                        });
                        stackLayout.addChild(nameTF);
                        stackLayout.addChild(emailTF);
                        stackLayout.addChild(commentsTF);
                        view.content = stackLayout;
                        const result = await confirm({
                            title: lc('send_feedback'),
                            okButtonText: l('send'),
                            cancelButtonText: l('cancel'),
                            view
                        });
                        if (result && nameTF.text?.length && commentsTF.text?.length) {
                            const eventId = Sentry.captureMessage('User Feedback');

                            Sentry.captureUserFeedback({
                                event_id: eventId,
                                name: nameTF.text,
                                email: emailTF.text,
                                comments: commentsTF.text
                            });
                            Sentry.flush();
                            showSnack({ message: l('feedback_sent') });
                        }
                    } else {
                        openLink(GIT_URL + '/issues');
                    }
                    break;
                }
                case 'export_settings':
                    // if (__ANDROID__ && SDK_VERSION < 29) {
                    //     const permRes = await request('storage');
                    //     if (!isPermResultAuthorized(permRes)) {
                    //         throw new Error(lc('missing_storage_perm_settings'));
                    //     }
                    // }
                    const jsonStr = ApplicationSettings.getAllJSON();
                    if (jsonStr) {
                        try {
                            const data = JSON.parse(jsonStr);
                        } catch (error) {
                            throw new Error(lc('failed_to_export_settings'));
                        }
                        const result = await saveFile({
                            name: `${__APP_ID__}_settings_${dayjs().format('YYYY-MM-DD')}.json`,
                            data: jsonStr,
                            forceSAF: true
                        });
                        // if (!result) {
                        //     throw new Error(lc('failed_to_export_settings'));
                        // }
                        DEV_LOG && console.log('export_settings done', result, jsonStr);
                    }
                    break;
                case 'import_settings':
                    const result = await openFilePicker({
                        extensions: ['json'],

                        multipleSelection: false,
                        pickerMode: 0,
                        forceSAF: true
                    });
                    const filePath = result.files[0];
                    DEV_LOG && console.log('import_settings from file picker', filePath, filePath && File.exists(filePath));
                    if (filePath && File.exists(filePath)) {
                        showLoading();
                        const text = await File.fromPath(filePath).readText();
                        DEV_LOG && console.log('import_settings', text);
                        const json = JSON.parse(text);
                        const nativePref = ApplicationSettings.getNative();
                        if (__ANDROID__) {
                            const editor = (nativePref as android.content.SharedPreferences).edit();
                            editor.clear();
                            Object.keys(json).forEach((k) => {
                                if (k.startsWith('_')) {
                                    return;
                                }
                                const value = json[k];
                                const type = typeof value;
                                switch (type) {
                                    case 'boolean':
                                        editor.putBoolean(k, value);
                                        break;
                                    case 'number':
                                        editor.putLong(k, java.lang.Double.doubleToRawLongBits(double(value)));
                                        break;
                                    case 'string':
                                        editor.putString(k, value);
                                        break;
                                }
                            });
                            editor.apply();
                        } else {
                            const userDefaults = nativePref as NSUserDefaults;
                            const domain = NSBundle.mainBundle.bundleIdentifier;
                            userDefaults.removePersistentDomainForName(domain);
                            Object.keys(json).forEach((k) => {
                                if (k.startsWith('_')) {
                                    return;
                                }
                                const value = json[k];
                                const type = typeof value;
                                switch (type) {
                                    case 'boolean':
                                        userDefaults.setBoolForKey(value, k);
                                        break;
                                    case 'number':
                                        userDefaults.setDoubleForKey(value, k);
                                        break;
                                    case 'string':
                                        userDefaults.setObjectForKey(value, k);
                                        break;
                                }
                            });
                        }
                        await hideLoading();
                        confirmRestartApp();
                    }
                    break;
                case 'store_setting':
                case 'setting': {
                    if (item.type === 'prompt') {
                        const result = await prompt({
                            title: getTitle(item),
                            message: item.useHTML ? item.description : item.full_description || item.description,
                            okButtonText: l('save'),
                            cancelButtonText: l('cancel'),
                            textFieldProperties: item.textFieldProperties,
                            autoFocus: true,
                            defaultText: typeof item.rightValue === 'function' ? item.rightValue() : typeof item.default === 'function' ? item.default() : item.default,
                            view: item.useHTML
                                ? createView(
                                      Label,
                                      {
                                          padding: '10 20 0 20',
                                          textWrap: true,
                                          color: colorOnSurfaceVariant as any,
                                          html: item.full_description || item.description
                                      },
                                      item.onLinkTap
                                          ? {
                                                linkTap: item.onLinkTap
                                            }
                                          : undefined
                                  )
                                : undefined
                        });
                        Utils.dismissSoftInput();
                        if (result && !!result.result && result.text.length > 0) {
                            if (item.id === 'store_setting') {
                                const store = item.store || getStoreSetting(item.storeKey, item.storeDefault);
                                if (item.valueType === 'string') {
                                    store[item.key] = result.text;
                                } else {
                                    store[item.key] = parseInt(result.text, 10);
                                }
                                ApplicationSettings.setString(item.storeKey, JSON.stringify(store));
                            } else {
                                if (item.valueType === 'string') {
                                    ApplicationSettings.setString(item.key, result.text);
                                } else {
                                    ApplicationSettings.setNumber(item.key, parseInt(result.text, 10));
                                }
                            }
                            updateItem(item);
                        }
                    } else if (item.type === 'slider') {
                        await showSliderPopover({
                            anchor: event.object,
                            value: (item.currentValue || item.rightValue)?.(),
                            ...item,
                            onChange(value) {
                                if (item.transformValue) {
                                    value = item.transformValue(value, item);
                                } else {
                                    value = Math.round(value / item.step) * item.step;
                                }
                                if (item.id === 'store_setting') {
                                    const store = getStoreSetting(item.storeKey, item.storeDefault);
                                    if (item.valueType === 'string') {
                                        store[item.key] = value + '';
                                    } else {
                                        store[item.key] = value;
                                    }
                                    ApplicationSettings.setString(item.storeKey, JSON.stringify(store));
                                } else {
                                    if (item.valueType === 'string') {
                                        ApplicationSettings.setString(item.key, value + '');
                                    } else {
                                        ApplicationSettings.setNumber(item.key, value);
                                    }
                                }
                                updateItem(item);
                            }
                        });
                    } else {
                        const result = await selectValue(
                            item.values.map((k) => ({
                                name: k.title || k.name,
                                data: k.value
                            })),
                            (item.currentValue || item.rightValue)?.(),
                            {
                                title: item.title,
                                message: item.full_description
                            }
                        );
                        if (result !== undefined) {
                            if (item.onResult) {
                                item.onResult(result.data);
                            } else {
                                if (item.id === 'store_setting') {
                                    const store = item.store || getStoreSetting(item.storeKey, item.storeDefault);
                                    if (item.valueType === 'string') {
                                        store[item.key] = result;
                                    } else {
                                        store[item.key] = parseInt(result, 10);
                                    }
                                    ApplicationSettings.setString(item.storeKey, JSON.stringify(store));
                                } else {
                                    if (item.valueType === 'string') {
                                        ApplicationSettings.setString(item.key, result);
                                    } else {
                                        ApplicationSettings.setNumber(item.key, parseInt(result, 10));
                                    }
                                }
                                updateItem(item);
                            }
                        }
                    }

                    break;
                }
                default: {
                    const needsUpdate = await item.onTap?.(item, event);
                    if (needsUpdate) {
                        updateItem(item);
                    }
                    break;
                }
            }
        } catch (err) {
            showError(err);
        } finally {
            hideLoading();
        }
    }
    onLanguageChanged(refresh);

    function selectTemplate(item, index, items) {
        if (item.type) {
            if (item.type === 'prompt' || item.type === 'slider') {
                return 'default';
            }
            return item.type;
        }
        if (item.icon) {
            return 'leftIcon';
        }
        return 'default';
    }

    let ignoreNextOnCheckBoxChange = false;
    async function onCheckBox(item, event) {
        if (ignoreNextOnCheckBoxChange || item.value === event.value) {
            return;
        }
        const value = event.value;
        item.value = value;
        clearCheckboxTimer();
        try {
            ignoreNextOnCheckBoxChange = true;
            switch (item.id) {
                case SETTINGS_ENABLE_CRASH_REPORT: {
                    ApplicationSettings.setBoolean(item.key || item.id, value);
                    if (value) {
                        startSentry();
                    } else {
                        stopSentry();
                    }
                    break;
                }
                case 'gadgetbridge_enabled':
                    ApplicationSettings.setBoolean(item.id, value);
                    if (__ANDROID__) {
                        gadgetbridgeService.setEnabled(value);
                        showSnack({ message: value ? lc('gadgetbridge_enabled_msg') : lc('gadgetbridge_disabled_msg') });
                    }
                    break;
                case 'widget_open_app_on_tap':
                    if (WIDGETS && __ANDROID__) {
                        const { WidgetConfigManager } = await import('plugin-widgets');
                        WidgetConfigManager.setOpenAppOnWidgetTap(value);
                    }
                    break;
                default:
                    ApplicationSettings.setBoolean(item.key || item.id, value);
                    break;
            }
        } catch (error) {
            showError(error);
        } finally {
            ignoreNextOnCheckBoxChange = false;
        }
    }
    function refreshCollectionView() {
        collectionView?.nativeView?.refresh();
    }
    function refreshCollectionViewVisibleItems() {
        collectionView?.nativeView?.refreshVisibleItems();
    }
    onFontScaleChanged(refreshCollectionViewVisibleItems);
    onThemeChanged(refreshCollectionView);
    onUnitsChanged(() => {
        if (subSettingsOptions === 'units') {
            refreshCollectionView();
        }
    });
    let ignoreNextReorderTap = false;

    async function onItemReordered(e) {
        try {
            if (__IOS__) {
                ignoreNextReorderTap = true;
            }
            onReordered(items);
        } catch (error) {
            showError(error);
        }
    }
    function onItemReorderStarting(e) {
        e.returnValue = e.item.reorder === true && e.item.id !== 'disabled';
    }
    function onItemReorderCheck(e) {
        e.returnValue = e.item.reorder;
    }

    function startReordering(item, event: TouchGestureEventData) {
        if (event.action === 'down') {
            ignoreNextReorderTap = false;
            const index = items.indexOf(item);
            collectionView.nativeView.startDragging(index, event.getActivePointers()[0]);
        }
    }
</script>

<page bind:this={page} id={title || $slc('settings.title')} actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,*">
        <collectionview
            bind:this={collectionView}
            accessibilityValue="settingsCV"
            itemTemplateSelector={selectTemplate}
            {items}
            {reorderEnabled}
            row={1}
            android:paddingBottom={windowInsetBottom}
            on:itemReordered={onItemReordered}
            on:itemReorderCheck={onItemReorderCheck}
            on:itemReorderStarting={onItemReorderStarting}>
            <Template key="header" let:item>
                <gridlayout rows="auto,auto">
                    <gridlayout columns="*,auto,auto" margin="10 16 0 16">
                        <stacklayout
                            backgroundColor="#ea4bae"
                            borderRadius={10}
                            orientation="horizontal"
                            padding={10}
                            rippleColor="white"
                            verticalAlignment="center"
                            on:tap={(event) => onTap({ id: 'sponsor' }, event)}>
                            <label color="white" fontFamily={$fonts.mdi} fontSize={26} marginRight={10} text="mdi-heart" verticalAlignment="center" />
                            <label color="white" fontSize={12 * $fontScale} text={item.title} textWrap={true} verticalAlignment="center" />
                        </stacklayout>
                        {#if __ANDROID__}
                            <image
                                borderRadius={6}
                                col={1}
                                height={40}
                                margin="0 10 0 10"
                                rippleColor="white"
                                src="~/assets/images/librepay.png"
                                verticalAlignment="center"
                                on:tap={(event) => onTap({ id: 'sponsor', type: 'librepay' }, event)} />
                            <image borderRadius={6} col={2} height={40} rippleColor="#f96754" src="~/assets/images/patreon.png" on:tap={(event) => onTap({ id: 'sponsor', type: 'patreon' }, event)} />
                        {/if}
                    </gridlayout>

                    <stacklayout horizontalAlignment="center" marginBottom={0} marginTop={20} row={1} verticalAlignment="center">
                        <absolutelayout backgroundColor={iconColor} borderRadius="50%" height={50} horizontalAlignment="center" width={50} />
                        <label fontSize={13 * $fontScale} marginTop={4} text={version} on:longPress={(event) => onLongPress('version', event)} on:touch={(e) => onTouch(item, e)} />
                    </stacklayout>
                </gridlayout>
            </Template>
            <Template key="sectionheader" let:item>
                <label class="sectionHeader" {...item.additionalProps || {}} text={item.title} />
            </Template>
            <Template key="switch" let:item>
                <ListItemAutoSize item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} on:tap={(event) => onTap(item, event)}>
                    <switch id="checkbox" checked={item.value} col={1} marginLeft={10} verticalAlignment="center" on:checkedChange={(e) => onCheckBox(item, e)} />
                </ListItemAutoSize>
            </Template>
            <Template key="checkbox" let:item>
                <ListItemAutoSize item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} on:tap={(event) => onTap(item, event)}>
                    <checkbox id="checkbox" checked={item.value} col={1} on:checkedChange={(e) => onCheckBox(item, e)} />
                </ListItemAutoSize>
            </Template>
            <Template key="rightIcon" let:item>
                <ListItemAutoSize item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} showBottomLine={false} on:tap={(event) => onTap(item, event)}>
                    <IconButton col={1} text={item.rightBtnIcon} on:tap={(event) => onRightIconTap(item, event)} />
                </ListItemAutoSize>
            </Template>
            <Template key="reorder" let:item>
                <ListItemAutoSize item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} showBottomLine={false} on:tap={(event) => onTap(item, event)}>
                    <label col={1} fontFamily={$fonts.mdi} fontSize={24} padding={4} text="mdi-dots-grid" verticalAlignment="center" on:touch={(event) => startReordering(item, event)} />
                </ListItemAutoSize>
            </Template>
            <Template key="leftIcon" let:item>
                <ListItemAutoSize
                    columns="auto,*,auto"
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }}
                    mainCol={1}
                    showBottomLine={false}
                    on:tap={(event) => onTap(item, event)}>
                    <label col={0} color={colorOnBackground} fontFamily={$fonts.mdi} fontSize={24} padding="0 10 0 0" text={item.icon} verticalAlignment="center" />
                </ListItemAutoSize>
            </Template>
            <Template key="image" let:item>
                <ListItemAutoSize item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} showBottomLine={false} on:tap={(event) => onTap(item, event)}>
                    <image col={1} height={45} src={item.image()} />
                </ListItemAutoSize>
            </Template>
            <Template key="info" let:item>
                <label color={colorOnSurfaceVariant} fontSize={14} margin="16" text={item.title} textWrap={true} />
            </Template>
            <Template let:item>
                <ListItemAutoSize item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} showBottomLine={false} on:tap={(event) => onTap(item, event)}></ListItemAutoSize>
            </Template>
        </collectionview>
        <CActionBar canGoBack title={title || $slc('settings.title')}>
            {#each actionBarButtons as button (button.id)}
                <mdbutton class="actionBarButton" text={button.icon} variant="text" on:tap={(event) => onTap({ id: button.id }, event)} />
            {/each}
        </CActionBar>
    </gridlayout>
</page>
