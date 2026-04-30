<script context="module" lang="ts">
    import { GPS } from '@nativescript-community/gps';
    import { isPermResultAuthorized, request } from '@nativescript-community/perms';
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionViewWithSwipeMenu } from '@nativescript-community/ui-collectionview-swipemenu';
    import DrawerElement from '@nativescript-community/ui-drawer/svelte';
    import { showBottomSheet } from '@nativescript-community/ui-material-bottomsheet/svelte';
    import { confirm, prompt } from '@nativescript-community/ui-material-dialogs';
    import { showSnack } from '@nativescript-community/ui-material-snackbar';
    import { VerticalPosition } from '@nativescript-community/ui-popover';
    import { closePopover } from '@nativescript-community/ui-popover/svelte';
    import { PullToRefresh } from '@nativescript-community/ui-pulltorefresh';
    import { getUniversalLink, getUniversalLinkIntent, registerUniversalLinkCallback } from '@nativescript-community/universal-links/index';
    import { Application, ApplicationSettings, Color, ContentView, CoreTypes, EventData, File, Page, Screen, knownFolders, path } from '@nativescript/core';
    import { openFile, throttle } from '@nativescript/core/utils';
    import { alert, showError } from '@shared/utils/showError';
    import { globalObservable, navigate, showModal } from '@shared/utils/svelte/ui';
    import dayjs from 'dayjs';
    import type { FeatureCollection, MultiPolygon } from 'geojson';
    import PolygonLookup from 'polygon-lookup';
    import { onDestroy, onMount } from 'svelte';
    import WeatherComponent from '~/components/WeatherComponent.svelte';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import {
        DATA_VERSION,
        SETTINGS_FEELS_LIKE_TEMPERATURES,
        SETTINGS_SHOW_CURRENT_DAY_DAILY,
        SETTINGS_SHOW_DAILY_IN_CURRENTLY,
        SETTINGS_SWIPE_ACTION_BAR_PROVIDER,
        SETTINGS_WEATHER_LOCATION,
        SHOW_CURRENT_DAY_DAILY,
        SWIPE_ACTION_BAR_PROVIDER
    } from '~/helpers/constants';
    import {
        EVENT_FAVORITE,
        FavoriteLocation,
        duplicateFavorite,
        favoriteIcon,
        favoriteIconColor,
        favorites,
        getFavoriteKey,
        isFavorite,
        queryTimezone,
        renameFavorite,
        setFavoriteAqiProvider,
        setFavoriteMarineProvider,
        setFavoriteOMProviderModel,
        setFavoriteProvider,
        toggleFavorite
    } from '~/helpers/favorites';
    import { getLocationName } from '~/helpers/formatter';
    import { formatTime, getEndOfDay, getStartOfDay, l, lc, lu, onLanguageChanged, sl, slc } from '~/helpers/locale';
    import { onThemeChanged } from '~/helpers/theme';
    import { NetworkConnectionStateEvent, NetworkConnectionStateEventData, WeatherLocation, geocodeAddress, networkService, prepareItems } from '~/services/api';
    import { gadgetbridgeService } from '~/services/gadgetbridge';
    import { onIconPackChanged } from '~/services/icon';
    import { MFProvider } from '~/services/providers/mf';
    import { OpenMeteoModels, getOMPreferredModel } from '~/services/providers/om';
    import type { AqiProviderType, DailyData, Hourly, MarineProviderType, ProviderType, WeatherData } from '~/services/providers/weather';
    import {
        Providers,
        ProvidersClasses,
        aqi_providers,
        getAqiProvider,
        getAqiProviderType,
        getCachedWeather,
        getProviderClass,
        getProviderType,
        getWeatherProvider,
        onProviderChanged,
        providerRequiresApiKey,
        providers
    } from '~/services/providers/weatherproviderfactory';
    import { getMarineWeather, searchMarineLocation } from '~/services/providers/meteoconsult';
    import { WeatherProps, mergeWeatherData, onWeatherDataChanged, weatherDataService } from '~/services/weatherData';
    import { parseUrlQueryParameters } from '~/utils/http';
    import { hideLoading, selectValue, showLoading, showPopoverMenu, showToast, tryCatchFunction } from '~/utils/ui';
    import { isBRABounds } from '~/utils/utils.common';
    import { actionBarHeight, colors, fontScale, fonts, onFontScaleChanged, onSettingsChanged, windowInset } from '~/variables';
    import IconButton from './common/IconButton.svelte';
    import { WeatherProvider } from '~/services/providers/weatherprovider';
    import { MaptilerProvider } from '~/services/providers/maptiler';

    const gps: GPS = new GPS();
    const gpsAvailable = gps.hasGPS();
</script>

<script lang="ts">
    let { colorBackground, colorError, colorOnBackground, colorOnError, colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurface } = $colors;
    $: ({ colorBackground, colorError, colorOnBackground, colorOnError, colorOnSurface, colorOnSurfaceVariant, colorOutlineVariant, colorPrimary, colorSurface } = $colors);

    let loading = false;
    let provider: ProviderType;
    let weatherLocation: FavoriteLocation = JSON.parse(ApplicationSettings.getString(SETTINGS_WEATHER_LOCATION, DEFAULT_LOCATION || 'null'));
    let weatherData: WeatherData = getCachedWeather(provider, weatherLocation, { model: weatherLocation?.omModel, ignoreCache: false }, 0);
    DEV_LOG && console.log('weatherData', !!weatherData);
    const data_version = ApplicationSettings.getNumber('data_version', -1);
    if (data_version !== DATA_VERSION) {
        ApplicationSettings.setNumber('data_version', DATA_VERSION);
        weatherData = null;
    }
    updateProvider();

    let items = [];

    const desiredAccuracy = __ANDROID__ ? CoreTypes.Accuracy.high : kCLLocationAccuracyBestForNavigation;
    const timeout = 20000;
    const minimumUpdateTime = 1000; // Should update every 1 second according ;
    let pullRefresh: NativeViewElementNode<PullToRefresh>;
    let networkConnected = networkService.connected;
    let page: NativeViewElementNode<Page>;
    async function showOptions(event) {
        try {
            const options = (
                [
                    {
                        icon: 'mdi-cogs',
                        id: 'preferences',
                        name: lc('preferences')
                    },
                    {
                        icon: 'mdi-map-plus',
                        id: 'select_map',
                        name: lc('select_location_map')
                    }
                ] as any
            ).concat(
                gpsAvailable
                    ? [
                          {
                              icon: 'mdi-crosshairs-gps',
                              id: 'gps_location',
                              name: lc('gps_location')
                          }
                      ]
                    : []
            );
            if (weatherLocation) {
                options.push(
                    ...([
                        {
                            icon: 'mdi-refresh',
                            id: 'refresh',
                            name: lc('refresh')
                        },
                        {
                            icon: 'mdi-chart-bar',
                            id: 'compare',
                            name: lc('compare_models')
                        },
                        {
                            icon: 'mdi-chart-areaspline',
                            id: 'chart',
                            name: lc('chart')
                        },
                        {
                            icon: 'mdi-map',
                            id: 'map',
                            name: lc('map')
                        },
                        {
                            icon: 'mb',
                            iconFontSize: 15,
                            id: 'meteo_blue',
                            name: lc('meteoblue')
                        },
                        {
                            icon: 'mdi-waves',
                            id: 'provider_marine',
                            subtitle: lc('provider_marine.' + (weatherLocation?.providerMarine ?? 'none')),
                            name: lc('provider_marine.title')
                        }
                    ] as any)
                );
                if (weatherLocation.timezone === 'Europe/Paris' && isBRABounds(weatherLocation)) {
                    options.push({
                        icon: 'mdi-snowflake-alert',
                        id: 'bra',
                        name: lu('bra'),
                        onLongPress: tryCatchFunction(selectAndOpenBRA)
                    });
                }
            }
            await showPopoverMenu({
                options,
                anchor: event.object,
                vertPos: VerticalPosition.BELOW,
                props: {
                    width: 220 * $fontScale,
                    maxHeight: Screen.mainScreen.heightDIPs - $actionBarHeight
                    // autoSizeListItem: true
                },

                onClose: async (item) => {
                    try {
                        if (item) {
                            switch (item.id) {
                                case 'preferences':
                                    const Settings = (await import('~/components/settings/Settings.svelte')).default;
                                    navigate({ page: Settings });
                                    break;
                                case 'map':
                                    await goToWeatherMap();
                                    break;
                                case 'compare':
                                    const CompareWeather = (await import('~/components/compare/CompareWeatherSingle.svelte')).default;
                                    navigate({ page: CompareWeather, props: { weatherLocation } });
                                    break;
                                case 'chart':
                                    const HourlyChart = (await import('~/components/HourlyChartPage.svelte')).default;
                                    navigate({ page: HourlyChart, props: { weatherLocation, weatherData } });
                                    break;
                                case 'refresh':
                                    await manualRefreshWeather();
                                    break;
                                case 'gps_location':
                                    await getLocationAndWeather();
                                    break;
                                case 'select_map':
                                    await selectLocationOnMap();
                                    break;
                                case 'meteo_blue':
                                    const MeteoBlue = (await import('~/components/MeteoBlue.svelte')).default;
                                    navigate({ page: MeteoBlue, props: { weatherLocation } });
                                    break;
                                case 'provider_marine':
                                    await selectMarineProvider(weatherLocation);
                                    break;
                                case 'bra':
                                    DEV_LOG && console.log('finding bra');
                                    const lookup = await getFranceGeoJSONLookup();
                                    const result = lookup.search(weatherLocation.coord.lon, weatherLocation.coord.lat);
                                    DEV_LOG && console.log('bra lookup', weatherLocation.coord, result);
                                    const massifId = result?.properties.code ?? -1;
                                    if (massifId !== -1) {
                                        const pdfFile = await MFProvider.getBRA(massifId);
                                        DEV_LOG && console.log('massifId', massifId, typeof massifId, pdfFile.path);
                                        openFile(pdfFile.path);
                                    } else {
                                        showToast(lc('failed_to_find_bra'));
                                    }
                                    break;
                            }
                        }
                    } catch (error) {
                        showError(error);
                    } finally {
                        hideLoading();
                    }
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    async function refreshWeather() {
        if (!weatherLocation) {
            showSnack({ message: l('no_location_set') });
            return;
        }
        if (!networkConnected) {
            showSnack({ message: l('no_network') });
            return;
        }
        loading = true;

        try {
            const usedWeatherData = weatherDataService.allWeatherData;
            const needsSaving = !weatherLocation.timezone;
            const timezoneData = await queryTimezone(weatherLocation);
            if (needsSaving) {
                Object.assign(weatherLocation, timezoneData);
                saveWeatherLocation();
            }
            weatherData = await getWeatherProvider(provider).getWeather(weatherLocation, { model: weatherLocation.omModel });
            DEV_LOG && console.log('refreshWeather', timezoneData, weatherLocation.timezone);

            if (weatherData) {
                await updateView();
                if (usedWeatherData.indexOf(WeatherProps.aqi) !== -1) {
                    const aqiData = await getAqiProvider(weatherLocation.providerAqi).getAirQuality(weatherLocation);
                    if (aqiData) {
                        mergeWeatherData(weatherData, aqiData);
                        await updateView();
                    }
                }

                if (weatherLocation.providerMarine === 'meteoconsult') {
                    try {
                        const marineLocation = await searchMarineLocation(weatherLocation);
                        if (marineLocation) {
                            await getMarineWeather(weatherData, marineLocation, weatherLocation);
                            await updateView();
                        }
                    } catch (error) {
                        DEV_LOG && console.error('marine weather fetch failed', error, error.stack);
                    }
                }

                if (WIDGETS) {
                    const { isCurrentLocation: isCurrentLocationWidget, notifyWidgetsWeatherUpdated, notifyWidgetsWeatherUpdatedForLocation } = await import('plugin-widgets');
                    // Notify widgets that weather data has been updated
                    try {
                        if (isCurrentLocationWidget(weatherLocation)) {
                            // This is the current/default location - update default widgets
                            await notifyWidgetsWeatherUpdated();
                        } else {
                            // This is a specific location - update widgets for this location
                            await notifyWidgetsWeatherUpdatedForLocation(weatherLocation);
                        }
                    } catch (widgetError) {
                        // Don't fail the whole refresh if widget update fails
                        console.error('Failed to update widgets:', widgetError);
                    }
                }
                // Broadcast weather data to Gadgetbridge if enabled (Android only)
                if (__ANDROID__) {
                    gadgetbridgeService.broadcastWeather(weatherLocation, weatherData);
                }
            }
        } catch (err) {
            if (err.statusCode === 403 && providerRequiresApiKey(provider)) {
                const providerClass = getProviderClass(provider);
                providerClass.setApiKey(null);
                askForApiKey(provider);
            } else {
                showError(err, { reportError: err.statusCode === undefined, showAsSnack: PRODUCTION });
            }
        } finally {
            loading = false;
        }
    }

    async function updateView() {
        if (weatherLocation && weatherData) {
            items = prepareItems(weatherLocation, weatherData);
            // ApplicationSettings.setString('lastWeatherData', JSON.stringify(weatherData));
        }
    }

    function isCurrentLocation(location: WeatherLocation, currentLocation: WeatherLocation = weatherLocation) {
        return currentLocation && location.coord.lat === currentLocation.coord.lat && location.coord.lon === currentLocation.coord.lon;
    }

    async function saveLocation(result: WeatherLocation) {
        const cityChanged = !isCurrentLocation(result);
        if (cityChanged) {
            setWeatherLocation(result);
        }
        favoriteCollectionView?.nativeView?.refreshVisibleItems();
        drawer?.close();
        if (cityChanged) {
            return refreshWeather();
        }
    }

    async function searchCity(query?: string) {
        try {
            const SelectCity = (await import('~/components/SelectCity.svelte')).default;
            // TODO: for now we dont lazy load SelectCity
            // it would crash in production because imported toggleFavorite would be undefined ...
            const result: WeatherLocation = await showModal({ page: SelectCity, animated: true, fullscreen: true, props: { startQuery: query } });
            if (result) {
                saveLocation(result);
            }
        } catch (err) {
            showError(err);
        }
    }
    async function selectLocationOnMap() {
        try {
            const SelectPositionOnMap = (await import('~/components/SelectPositionOnMap.svelte')).default;
            // TODO: for now we dont lazy load SelectCity
            // it would crash in production because imported toggleFavorite would be undefined ...

            const location: {
                lat: number;
                lon: number;
            } = await showModal({
                page: SelectPositionOnMap,
                animated: true,
                fullscreen: true,
                props: {
                    focusPos: gps.getLastKnownLocation<LatLonKeys>() || weatherLocation?.coord
                }
            });
            if (location) {
                const result = await geocodeAddress(location);
                saveLocation(result);
            }
        } catch (err) {
            showError(err);
        }
    }
    async function getLocationAndWeather() {
        try {
            const result = await request('location');
            if (!isPermResultAuthorized(result)) {
                return alert(l('missing_location_perm'));
            }
            if (!gps.isEnabled()) {
                if (__IOS__) {
                    throw new Error(lc('gps_off'));
                } else {
                    const r = await confirm({
                        title: lc('gps_off'),
                        okButtonText: lc('settings'),
                        cancelButtonText: lc('close')
                    });
                    if (r) {
                        await gps.openGPSSettings();
                    }
                }
            }
            if (gps.isEnabled()) {
                loading = true;
                const location = await gps.getCurrentLocation<LatLonKeys>({ desiredAccuracy, minimumUpdateTime, timeout });
                if (location) {
                    const result = await geocodeAddress(location);
                    await saveLocation(result);
                }
            }
        } catch (error) {
            showError(error);
        } finally {
            loading = false;
        }
    }

    async function manualRefreshWeather() {
        const providerClass = getProviderClass(provider);
        if (providerClass.requiresApiKey() && !providerClass.hasApiKey()) {
            return askForApiKey(provider);
        }
        const refreshLocationOnPull = ApplicationSettings.getBoolean('refresh_location_on_pull', false);
        if (gpsAvailable && refreshLocationOnPull) {
            return getLocationAndWeather();
        } else {
            return refreshWeather();
        }
    }
    async function onPullToRefresh() {
        if (pullRefresh) {
            pullRefresh.nativeView.refreshing = false;
        }

        return manualRefreshWeather();
    }

    async function askForApiKey(provider: Providers | 'maptiler', shouldRefreshWeather = true) {
        try {
            const ApiKeysBottomSheet = (await import('~/components/APIKeysBottomSheet.svelte')).default;
            const result: boolean = await showBottomSheet({
                parent: page,
                peekHeight: 400,
                // skipCollapsedState: isLandscape(),
                view: ApiKeysBottomSheet,
                dismissOnBackgroundTap: true,
                dismissOnDraggingDownSheet: true,
                props: {
                    provider
                }
            });
            if (result && shouldRefreshWeather) {
                refreshWeather();
            }
            return result;
        } catch (error) {
            showError(error);
            return;
        }
    }
    function onOrientationChanged(event) {
        page.nativeElement.checkStatusBarVisibility();
    }

    const onAppUrl = tryCatchFunction(
        async (link: string, intent?) => {
            if (link.startsWith('geo')) {
                const latlong = link.split(':')[1].split(',').map(parseFloat) as [number, number];
                if (latlong[0] !== 0 || latlong[1] !== 0) {
                    const result = await geocodeAddress({ lat: latlong[0], lon: latlong[1] });
                    saveLocation(result);
                }
            } else if (link.startsWith('ossweather')) {
                const params = parseUrlQueryParameters(link);
                const result = await geocodeAddress({ lat: parseFloat(params.lat), lon: parseFloat(params.lon) });
                delete params.lat;
                delete params.lon;
                Object.keys(params).forEach((k) => {
                    if (!result[k]) {
                        result[k] = params[k];
                    }
                });
                saveLocation(result);
            } else if (link.startsWith('glance-action:/')) {
                const params = parseUrlQueryParameters(link);
                if (WIDGETS) {
                    if (params.appWidgetId !== undefined) {
                        const openSettings = intent?.getStringExtra('openSettings');
                        if (openSettings !== 'false') {
                            DEV_LOG && console.log('glance-action', params, intent, openSettings);
                            const { WidgetConfigManager } = await import('plugin-widgets/WidgetConfigManager');
                            const config = WidgetConfigManager.getConfig(params.appWidgetId);
                            const ConfigWidget = (await import('~/components/settings/ConfigWidget.svelte')).default;
                            navigate({
                                page: ConfigWidget,
                                props: {
                                    widgetClass: config.widgetKind,
                                    widgetId: params.appWidgetId,
                                    modalMode: false,
                                    isKindConfig: false
                                }
                            });
                        }
                    }
                }
            } else {
                searchCity(link);
            }
        },
        undefined,
        hideLoading
    );
    onMount(async () => {
        if (__IOS__) {
            Application.on(Application.orientationChangedEvent, onOrientationChanged);
        }
        if (weatherLocation && providerRequiresApiKey(provider)) {
            const providerClass = getProviderClass(provider);
            if (!providerClass.hasApiKey()) {
                setTimeout(() => askForApiKey(provider), 1000);
            }
        }

        networkService.on(NetworkConnectionStateEvent, (event: NetworkConnectionStateEventData) => {
            try {
                if (networkConnected !== event.data.connected) {
                    networkConnected = event.data.connected;
                    if ((event.data.connected && !weatherData) || (weatherData && Date.now() - weatherData.time > 10 * 60 * 1000)) {
                        refreshWeather();
                    }
                } else {
                    updateView();
                }
            } catch (error) {
                showError(error);
            }
        });

        registerUniversalLinkCallback(onAppUrl);
        const current = getUniversalLink();
        if (current) {
            onAppUrl(current, getUniversalLinkIntent());
        } else if (weatherData) {
            items = prepareItems(weatherLocation, weatherData);
        } else if (weatherLocation) {
            refreshWeather();
        }
    });
    onDestroy(() => {
        if (__IOS__) {
            Application.off(Application.orientationChangedEvent, onOrientationChanged);
        }
    });

    onLanguageChanged((lang) => {
        DEV_LOG && console.log('refresh triggered by lang change');
        try {
            refreshWeather();
        } catch (error) {
            showError(error);
        }
    });

    onWeatherDataChanged(updateView);
    onIconPackChanged(updateView);
    onSettingsChanged(SETTINGS_FEELS_LIKE_TEMPERATURES, refreshWeather);
    onSettingsChanged(SETTINGS_SHOW_CURRENT_DAY_DAILY, updateView);
    onSettingsChanged(SETTINGS_SHOW_DAILY_IN_CURRENTLY, updateView);
    onFontScaleChanged(() => {
        updateView();
        favoriteCollectionView.nativeView?.refreshVisibleItems();
    });

    async function showAlerts() {
        if (!weatherData.alerts) {
            return;
        }
        DEV_LOG && console.log('showAlerts', weatherData.alerts);
        try {
            const AlertView = (await import('~/components/common/AlertView.svelte')).default;
            await showBottomSheet({
                parent: page,
                view: AlertView,
                peekHeight: 400,
                // skipCollapsedState: isLandscape(),
                trackingScrollView: 'scrollView',
                props: {
                    alerts: weatherData.alerts
                }
            });
        } catch (err) {
            showError(err);
        }
    }
    onProviderChanged((event) => {
        try {
            const changed = updateProvider();
            DEV_LOG && console.log('provider changed', provider, changed);
            if (changed) {
                refreshWeather();
            }
        } catch (error) {
            showError(error);
        }
    });

    function getDailyPageProps(item: DailyData) {
        //we need to offset back the startOf/endOf to correctly get local utc values
        const startOfDay = getStartOfDay(item.time + 60000, item.timezoneOffset)
            .add(1, 'h')
            .valueOf();
        const endOfDay = getEndOfDay(item.time + 60000, item.timezoneOffset)
            .add(1, 'm')
            .valueOf();
        const hourly = items[0].hourly as Hourly[];
        const startIndex = hourly.findIndex((h) => h.time >= startOfDay);
        let endIndex = hourly.findIndex((h) => h.time > endOfDay);
        // DEV_LOG &&
        //     console.log(
        //         'getDailyPageProps',
        //         item.time,
        //         item.timezoneOffset,
        //         dayjs(item.time),
        //         dayjs(startOfDay),
        //         dayjs(endOfDay),
        //         endIndex,
        //         hourly.map((d) => dayjs(d.time))
        //     );
        if (endIndex === -1) {
            endIndex = hourly.length;
        }
        return {
            getDailyPageProps,
            itemIndex: items.indexOf(item),
            items,
            item: { ...item, hourly: startIndex >= 0 && endIndex - startIndex >= 2 ? hourly.slice(startIndex, endIndex) : [] },
            location: weatherLocation,
            startTime: dayjs(item.time),
            weatherLocation,
            timezoneOffset: item.timezoneOffset
        };
    }

    const onTap = throttle(async function (event) {
        try {
            let item = event as DailyData;
            const component = (await import('~/components/DailyPage.svelte')).default;
            const showDayDataInCurrent = ApplicationSettings.getBoolean(SETTINGS_SHOW_CURRENT_DAY_DAILY, SHOW_CURRENT_DAY_DAILY);
            if (showDayDataInCurrent && items.indexOf(item) === 0) {
                item = items[1];
            }
            navigate({
                page: component,
                props: getDailyPageProps(item)
            });
        } catch (err) {
            showError(err);
        }
    });

    let drawer: DrawerElement;
    let favoriteCollectionView: NativeViewElementNode<CollectionViewWithSwipeMenu>;
    function toggleDrawer() {
        drawer?.toggle();
    }

    function updateProvider() {
        const oldProvider = provider;
        provider = weatherLocation?.provider || getProviderType();
        return provider !== oldProvider;
    }

    function saveWeatherLocation() {
        ApplicationSettings.setString(SETTINGS_WEATHER_LOCATION, JSON.stringify(weatherLocation));
    }
    function setWeatherLocation(location: FavoriteLocation, save = true) {
        // DEV_LOG && console.log('setWeatherLocation', JSON.stringify(location));
        weatherLocation = location;
        const changed = updateProvider();
        if (save) {
            saveWeatherLocation();
        }
        return changed;
    }
    globalObservable.on(EVENT_FAVORITE, (item: EventData & { data: FavoriteLocation; needsWeatherRefresh?: boolean }) => {
        if (weatherLocation && getFavoriteKey(item.data) === getFavoriteKey(weatherLocation)) {
            setWeatherLocation(item.data);
            if (item.needsWeatherRefresh !== false) {
                updateProvider();
                refreshWeather();
            }
        }
    });

    async function selectProvider(location: WeatherLocation) {
        const value = await selectValue<ProviderType>(
            providers.map((t) => ({ data: t, title: lc('provider.' + t) })),
            location.provider || getProviderType(),
            { title: lc('provider.title') }
        );
        if (value) {
            setWeatherLocationProvider(value, location);
        }
    }
    async function selectOMProviderModel(location: WeatherLocation) {
        const value = await selectValue<OpenMeteoModels>(
            Object.keys(OpenMeteoModels).map((t) => ({ data: t as OpenMeteoModels, title: OpenMeteoModels[t] })),
            location.omModel || getOMPreferredModel(),
            { title: lc('open_meteo_model') }
        );
        if (value) {
            setWeatherLocationOMProviderModel(value, location);
        }
    }

    async function selectProviderAQI(location: WeatherLocation) {
        const value = await selectValue<AqiProviderType>(
            aqi_providers.map((t) => ({ data: t, title: lc('provider_aqi.' + t) })),
            location.providerAqi || getAqiProviderType(),
            { title: lc('provider_aqi.title') }
        );
        if (value) {
            setWeatherLocationAQIProvider(value, location);
        }
    }

    async function selectMarineProvider(location: WeatherLocation) {
        const marineProviders: { data: MarineProviderType; title: string }[] = [
            { data: null, title: lc('provider_marine.none') },
            { data: 'meteoconsult', title: lc('provider_marine.meteoconsult') }
        ];
        const current: MarineProviderType = location.providerMarine ?? null;
        const value = await selectValue<MarineProviderType>(marineProviders, current, { title: lc('provider_marine.title') });
        if (value !== undefined) {
            setWeatherLocationMarineProvider(value, location);
        }
    }

    // function swipeMenuTranslationFunction(side, width, value, delta, progress) {
    //     const result = {
    //         mainContent: {
    //             translateX: side === 'right' ? -delta : delta
    //         },
    //         backDrop: {
    //             translateX: side === 'right' ? -delta : delta,
    //             opacity: progress * 0.1
    //         },
    //         deleteBtn: {
    //             backgroundColor: progress >= 0.6 ? colorError : colorSurface,
    //             color: progress >= 0.6 ? colorOnError : colorError
    //         }
    //     } as any;

    //     return result;
    // }
    let drawerOpened = false;
    function onDrawerStart() {
        drawerOpened = true;
    }

    function onDrawerClose() {
        drawerOpened = false;
        favoriteCollectionView.nativeElement?.closeCurrentMenu();
    }

    function setWeatherLocationProvider(provider: ProviderType, location: WeatherLocation = weatherLocation) {
        DEV_LOG && console.log('setWeatherLocationProvider', JSON.stringify(location), provider, isFavorite(location));
        location.provider = provider;
        saveWeatherLocation();
        if (isFavorite(location)) {
            setFavoriteProvider(location, provider);
        } else if (isCurrentLocation(location)) {
            updateProvider();
            refreshWeather();
        }
    }
    function setWeatherLocationOMProviderModel(model: OpenMeteoModels, location: WeatherLocation = weatherLocation) {
        DEV_LOG && console.log('setWeatherLocationOMProviderModel', JSON.stringify(location), provider, isFavorite(location));
        location.omModel = model;
        saveWeatherLocation();
        if (isFavorite(location)) {
            setFavoriteOMProviderModel(location, model);
        } else if (isCurrentLocation(location)) {
            updateProvider();
            refreshWeather();
        }
    }
    function setWeatherLocationAQIProvider(provider: AqiProviderType, location: WeatherLocation = weatherLocation) {
        location.providerAqi = provider;
        saveWeatherLocation();
        if (isFavorite(location)) {
            setFavoriteAqiProvider(location, provider);
        } else if (isCurrentLocation(location)) {
            saveWeatherLocation();
            refreshWeather();
        }
    }
    function setWeatherLocationMarineProvider(provider: MarineProviderType, location: WeatherLocation = weatherLocation) {
        location.providerMarine = provider;
        saveWeatherLocation();
        if (isFavorite(location)) {
            setFavoriteMarineProvider(location, provider);
        } else if (isCurrentLocation(location)) {
            refreshWeather();
        }
    }

    const onSwipe = (e) => {
        const enabled = ApplicationSettings.getBoolean(SETTINGS_SWIPE_ACTION_BAR_PROVIDER, SWIPE_ACTION_BAR_PROVIDER);
        if (enabled && weatherLocation) {
            const currentProviderIndex = providers.indexOf(provider);
            const delta = e.direction === 1 ? -1 : 1;
            let nextProviderIndex = currentProviderIndex;
            let newProvider;
            let providerClass: ProvidersClasses;
            function updateNextProvider() {
                nextProviderIndex = nextProviderIndex + delta;
                if (nextProviderIndex < 0) {
                    nextProviderIndex += providers.length;
                }
                newProvider = providers[nextProviderIndex % providers.length];
                providerClass = getProviderClass(newProvider);
                DEV_LOG &&
                    console.log(
                        'updateNextProvider',
                        currentProviderIndex,
                        nextProviderIndex,
                        newProvider,
                        providerClass.id,
                        providerClass.requiresApiKey(),
                        typeof providerClass.hasApiKey(),
                        providerClass.hasApiKey()
                    );
            }
            updateNextProvider();
            while (nextProviderIndex !== currentProviderIndex && providerClass.requiresApiKey() && !providerClass.hasApiKey()) {
                updateNextProvider();
            }
            if (newProvider !== provider) {
                // dont "store" the new provider, only for current view
                provider = newProvider;
                refreshWeather();
            }
        }
    };

    function refreshFavoritesVisibleItems() {
        favoriteCollectionView?.nativeView?.refreshVisibleItems();
    }

    onThemeChanged(refreshFavoritesVisibleItems);

    // function getFavoriteHTML(item: FavoriteLocation) {
    //     const name = item.name || item.sys.name;
    //     let startIndex = 0;
    //     if (name === weatherLocation.sys.city) {
    //         startIndex++;
    //     }
    //     const title = item.name || item.sys.name;
    //     let data = formatAddress(item.sys, title ? startIndex : 0);
    //     const trueTitle = title || data.join(' ');
    //     data.shift();
    //     if (data.length > 2) {
    //         data = data.slice(data.length - 3);
    //     }

    //     const spans = [
    //         {
    //             text: trueTitle
    //         },
    //         {
    //             text: '\n' + data.filter((s) => !!s).join('\n'),
    //             fontSize: 14 * $fontScale,
    //             color: colorOnSurfaceVariant
    //         },
    //         {
    //             text: '\n' + `${item.coord.lat.toFixed(3)},${item.coord.lon.toFixed(3)}`,
    //             fontSize: 14 * $fontScale,
    //             color: colorOnSurfaceVariant
    //         }
    //     ];
    //     if (item.timezone) {
    //         spans.push(
    //             {
    //                 text: ' | ',
    //                 fontSize: 14 * $fontScale,
    //                 color: colorOnSurface
    //             },
    //             {
    //                 text: getLocalTime(undefined, item.timezoneOffset).format('LT'),
    //                 fontSize: 14 * $fontScale,
    //                 color: colorOnSurfaceVariant
    //             }
    //         );
    //     }
    //     // DEV_LOG && console.log('getFavoriteHTML', JSON.stringify(item));
    //     return createNativeAttributedString({
    //         spans
    //     });
    // }
    let franceGeoJSON: FeatureCollection<MultiPolygon>;
    let franceGeoJSONLookup: PolygonLookup;

    async function getFranceGeoJSON() {
        if (!franceGeoJSON) {
            franceGeoJSON = JSON.parse(await File.fromPath(path.join(knownFolders.currentApp().path, 'assets/meteofrance/massifs.geojson')).readText());
        }
        return franceGeoJSON;
    }
    async function getFranceGeoJSONLookup() {
        if (!franceGeoJSONLookup) {
            franceGeoJSONLookup = new PolygonLookup(await getFranceGeoJSON());
        }
        return franceGeoJSONLookup;
    }
    async function selectAndOpenBRA() {
        const geoJSON = await getFranceGeoJSON();
        const options = geoJSON.features
            .map((feature) => ({
                name: feature.properties.title as string,
                subtitle: `${feature.properties.Departemen} (${feature.properties.mountain})`,
                id: feature.properties.code
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const OptionSelect = (await import('~/components/common/OptionSelect.svelte')).default;
        DEV_LOG && console.log('options', options);
        closePopover();
        const result = await showBottomSheet({
            parent: null,
            view: OptionSelect,
            peekHeight: 400,
            // skipCollapsedState: isLandscape(),
            ignoreTopSafeArea: true,
            props: {
                options,
                rowHeight: 58,
                height: 400
            }
        });
        if (result) {
            try {
                showLoading();
                const pdfFile = await MFProvider.getBRA(result.id);

                DEV_LOG && console.log('massifId', result.id, pdfFile.path);
                openFile(pdfFile.path);
            } finally {
                hideLoading();
            }
        }
    }

    async function goToWeatherMap(props = { focusPos: weatherLocation ? weatherLocation.coord : undefined }) {
        if (!MaptilerProvider.hasApiKey()) {
            if (!(await askForApiKey('maptiler', false))) {
                return;
            }
        }

        const WeatherMapPage = (await import('~/components/WeatherMapPage.svelte')).default;
        navigate({ page: WeatherMapPage, props });
    }
    async function showFavMenu(favItem: FavoriteLocation, event) {
        try {
            const options = [
                {
                    icon: 'mdi-rename',
                    id: 'rename',
                    name: lc('rename')
                },
                {
                    icon: 'mdi-cloud-circle',
                    id: 'provider',
                    name: lc('provider.title'),
                    subtitle: lc('provider.' + (favItem?.provider || getProviderType()))
                },
                {
                    icon: 'mdi-database',
                    id: 'om_model',
                    subtitle: OpenMeteoModels[favItem?.omModel || getOMPreferredModel()],
                    title: lc('open_meteo_model')
                },
                {
                    icon: 'mdi-leaf',
                    id: 'provider_aqi',
                    subtitle: lc('provider_aqi.' + (favItem?.providerAqi || getAqiProviderType())),
                    name: lc('provider_aqi.title')
                },
                {
                    icon: 'mdi-waves',
                    id: 'provider_marine',
                    subtitle: lc('provider_marine.' + (favItem?.providerMarine ?? 'none')),
                    name: lc('provider_marine.title')
                },
                {
                    icon: 'mdi-chart-bar',
                    id: 'compare',
                    name: lc('compare_models')
                },
                {
                    icon: 'mdi-chart-areaspline',
                    id: 'chart',
                    name: lc('chart')
                },
                {
                    icon: 'mdi-map',
                    id: 'map',
                    name: lc('map')
                },
                {
                    icon: 'mb',
                    iconFontSize: 16,
                    id: 'meteo_blue',
                    name: lc('meteoblue')
                },
                {
                    icon: 'mdi-trash-can',
                    id: 'delete',
                    color: colorError,
                    name: lc('remove')
                },
                {
                    icon: 'mdi-content-copy',
                    id: 'duplicate',
                    name: lc('duplicate')
                }
            ];
            if (favItem.timezone === 'Europe/Paris' && isBRABounds(favItem)) {
                options.splice(options.length - 2, 0, {
                    icon: 'mdi-snowflake-alert',
                    id: 'bra',
                    name: l('bra')
                } as any);
            }

            await showPopoverMenu({
                options,
                anchor: event.object,
                vertPos: VerticalPosition.BELOW,
                props: {
                    width: 220 * $fontScale,
                    maxHeight: Screen.mainScreen.heightDIPs - $actionBarHeight
                    // autoSizeListItem: true
                },
                onClose: async (item) => {
                    try {
                        if (item) {
                            let result;
                            switch (item.id) {
                                case 'delete':
                                    toggleFavorite(favItem);
                                    break;
                                case 'map':
                                    await goToWeatherMap({ focusPos: favItem.coord });
                                    break;
                                case 'compare':
                                    const CompareWeather = (await import('~/components/compare/CompareWeatherSingle.svelte')).default;
                                    navigate({ page: CompareWeather, props: { weatherLocation: favItem } });
                                    break;
                                case 'chart':
                                    const HourlyChart = (await import('~/components/HourlyChartPage.svelte')).default;
                                    navigate({ page: HourlyChart, props: { weatherLocation: favItem, weatherData } });
                                    break;
                                case 'meteo_blue':
                                    const MeteoBlue = (await import('~/components/MeteoBlue.svelte')).default;
                                    navigate({ page: MeteoBlue, props: { weatherLocation: favItem } });
                                    break;
                                case 'bra':
                                    const lookup = await getFranceGeoJSONLookup();
                                    result = lookup.search(favItem.coord.lon, favItem.coord.lat);
                                    const massifId = result?.properties.code ?? -1;
                                    if (massifId !== -1) {
                                        showLoading();
                                        const result = await MFProvider.getBRA(massifId);
                                        DEV_LOG && console.log('massifId', massifId, result.path);
                                        openFile(result.path);
                                    }
                                    break;

                                case 'provider':
                                    await selectProvider(favItem);
                                    break;
                                case 'provider_aqi':
                                    await selectProviderAQI(favItem);
                                    break;
                                case 'provider_marine':
                                    await selectMarineProvider(favItem);
                                    break;
                                case 'om_model':
                                    await selectOMProviderModel(favItem);
                                    break;
                                case 'duplicate':
                                    await duplicateFavorite(favItem);
                                    break;
                                case 'rename':
                                    result = await prompt({
                                        title: lc('rename'),
                                        defaultText: favItem.name
                                    });
                                    if (result.result && result.text?.length) {
                                        await renameFavorite(favItem, result.text);
                                    }
                                    break;
                            }
                        }
                    } catch (error) {
                        showError(error);
                    } finally {
                        hideLoading();
                    }
                }
            });
        } catch (error) {
            showError(error);
        }
    }
    function getFavoriteSubtitle(item: FavoriteLocation) {
        const data = [];
        if (item.sys.state) {
            data.push(item.sys.state);
        }
        if (item.sys.country) {
            data.push(item.sys.country);
        }
        return data.join(', ') + '\n' + `${item.coord.lat.toFixed(3)},${item.coord.lon.toFixed(3)}`;
    }

    function onItemReordered(e) {
        (e.view as ContentView).content.opacity = 1;
    }
    function onItemReorderStarting(e) {
        (e.view as ContentView).content.opacity = 0.7;
    }
</script>

<page bind:this={page} actionBarHidden={true}>
    <drawer
        bind:this={drawer}
        class="pageContent"
        gestureHandlerOptions={{
            minDist: 50,
            failOffsetYStart: -40,
            failOffsetYEnd: 40
        }}
        leftSwipeDistance={50}
        on:close={onDrawerClose}
        on:start={onDrawerStart}>
        <gridlayout rows="auto,*" prop:mainContent>
            {#if !networkConnected && !weatherData}
                <label horizontalAlignment="center" row={1} text={l('no_network').toUpperCase()} verticalAlignment="middle" />
            {:else if weatherLocation}
                <pullrefresh bind:this={pullRefresh} row={1} on:refresh={onPullToRefresh}>
                    <WeatherComponent {items} {weatherLocation} on:tap={onTap} />
                </pullrefresh>
                <label
                    backgroundColor={new Color(colorBackground).setAlpha(100).hex}
                    fontSize={10}
                    horizontalAlignment="right"
                    android:marginBottom={$windowInset.bottom}
                    marginRight={6}
                    row="1"
                    text={$slc('powered_by', l(`provider.${provider}`))}
                    verticalAlignment="bottom" />
            {:else}
                <stackLayout id="hodler" horizontalAlignment="center" paddingLeft={20} paddingRight={20} row={1} verticalAlignment="middle">
                    <label id="test" ios:iosAccessibilityAdjustsFontSize={false} fontSize={16 * $fontScale} marginBottom={20} text={$sl('no_location_desc')} textAlignment="center" textWrap={true} />
                    {#if gpsAvailable}
                        <mdbutton id="location" margin="4 0 4 0" textAlignment="center" variant="outline" verticalTextAlignment="center" on:tap={getLocationAndWeather}>
                            <cspan fontFamily={$fonts.mdi} fontSize={20 * $fontScale} text="mdi-crosshairs-gps" verticalAlignment="middle" />
                            <cspan ios:fontSize={16 * $fontScale} text={' ' + $sl('my_location').toUpperCase()} verticalAlignment="middle" />
                        </mdbutton>
                    {/if}
                    <mdbutton id="search" margin="4 0 4 0" textAlignment="center" variant="outline" verticalTextAlignment="center" on:tap={() => searchCity()}>
                        <cspan fontFamily={$fonts.mdi} fontSize={20 * $fontScale} text="mdi-magnify" verticalAlignment="middle" />
                        <cspan ios:fontSize={16 * $fontScale} text={' ' + $sl('search_location').toUpperCase()} verticalAlignment="middle" />
                    </mdbutton>
                    <mdbutton id="search" margin="4 0 4 0" textAlignment="center" variant="outline" verticalTextAlignment="center" on:tap={selectLocationOnMap}>
                        <cspan fontFamily={$fonts.mdi} fontSize={20 * $fontScale} text="mdi-map-plus" verticalAlignment="middle" />
                        <cspan ios:fontSize={16 * $fontScale} text={' ' + $sl('select_location_map').toUpperCase()} verticalAlignment="middle" />
                    </mdbutton>
                </stackLayout>
            {/if}
            <CActionBar onMenuIcon={toggleDrawer} showMenuIcon title={getLocationName(weatherLocation)} on:swipe={onSwipe}>
                <mdbutton
                    slot="left"
                    class="actionBarButton"
                    col={1}
                    color={favoriteIconColor(weatherLocation)}
                    rippleColor="#EFB644"
                    text={favoriteIcon(weatherLocation)}
                    variant="text"
                    verticalAlignment="middle"
                    visibility={weatherLocation ? 'visible' : 'collapse'}
                    on:tap={() => toggleFavorite(weatherLocation, true)} />
                <mdbutton
                    class="actionBarButton"
                    color="#EFB644"
                    rippleColor="#EFB644"
                    text="mdi-alert"
                    variant="text"
                    verticalAlignment="middle"
                    visibility={!loading && weatherData?.alerts?.length > 0 ? 'visible' : 'collapse'}
                    on:tap={() => showAlerts()} />
                <mdbutton class="actionBarButton" text="mdi-magnify" variant="text" verticalAlignment="middle" on:tap={() => searchCity()} />

                <mdbutton id="menu_button" class="actionBarButton" text="mdi-dots-vertical" variant="text" verticalAlignment="middle" on:tap={showOptions} />
            </CActionBar>
            <progress backgroundColor="transparent" busy={loading} indeterminate={true} row={1} verticalAlignment="top" />
        </gridlayout>
        <gridlayout prop:leftDrawer class="drawer" rows="auto,*" width="300" android:marginTop={$windowInset.top}>
            <label class="actionBarTitle" margin="20 20 20 20" text={$slc('favorites')} />
            <collectionview
                bind:this={favoriteCollectionView}
                id="favorite"
                items={favorites}
                reorderEnabled={true}
                reorderLongPressEnabled={true}
                android:paddingBottom={$windowInset.bottom}
                row={1}
                on:itemReorderStarting={onItemReorderStarting}
                on:itemReordered={onItemReordered}>
                <Template let:item>
                    <gridlayout
                        borderBottomColor={colorOutlineVariant}
                        borderBottomWidth={1}
                        borderRightColor={colorPrimary}
                        borderRightWidth={isCurrentLocation(item, weatherLocation) ? 6 : 0}
                        columns="*,auto"
                        padding={10}
                        rippleColor={colorOnSurface}
                        on:tap={() => saveLocation(item)}>
                        <stacklayout marginRight={30}>
                            <label color={colorOnSurface} disableCss={true} fontSize={17 * $fontScale} fontWeight="bold" lineBreak="end" maxLines={2} text={getLocationName(item)} textWrap={true} />
                            <label color={colorOnSurfaceVariant} disableCss={true} fontSize={14 * $fontScale} text={getFavoriteSubtitle(item)} textWrap={true} />
                        </stacklayout>
                        <label
                            col={1}
                            color={colorOnSurfaceVariant}
                            disableCss={true}
                            fontSize={14 * $fontScale}
                            paddingTop={3 * $fontScale}
                            text={formatTime(Date.now(), 'LT', item.timezoneOffset)}
                            textWrap={true}
                            verticalAlignment="top"
                            visibility={item.timezone ? 'visible' : 'hidden'} />
                        <IconButton col={1} gray={true} horizontalAlignment="right" size={40} text="mdi-dots-vertical" verticalAlignment="bottom" on:tap={(event) => showFavMenu(item, event)} />
                    </gridlayout>
                </Template>
            </collectionview>
        </gridlayout>
    </drawer>
</page>
