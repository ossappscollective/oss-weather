<script lang="ts">
    import { closeBottomSheet } from '@nativescript-community/ui-material-bottomsheet/svelte';
    import { ApplicationSettings, Color, Utils } from '@nativescript/core';
    import { onMount } from 'svelte';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import WeatherComponent from '~/components/WeatherComponent.svelte';
    import { SETTINGS_WEATHER_LOCATION } from '~/helpers/constants';
    import { FavoriteLocation, favoriteIcon, favoriteIconColor, toggleFavorite } from '~/helpers/favorites';
    import { l, lc } from '~/helpers/locale';
    import { WeatherLocation, getTimezone, networkService, prepareItems } from '~/services/api';
    import { getAqiProvider, getMarineProvider, getProviderType, getWeatherProvider, onProviderChanged, providers } from '~/services/providers/weatherproviderfactory';
    import { WeatherProps, mergeWeatherData, weatherDataService } from '~/services/weatherData';
    import { actionBarButtonHeight, colors } from '~/variables';

    let { colorBackground } = $colors;
    $: ({ colorBackground } = $colors);

    let items = [];
    let loading = false;
    export let weatherLocation: WeatherLocation;
    export let name;
    networkService.start(); // ensure it is started
    DEV_LOG && console.log('BottomSheetWeatherPage');

    async function updateView(weatherData) {
        if (weatherLocation && weatherData) {
            items = prepareItems(weatherLocation, weatherData, Date.now());
        }
    }

    async function refresh(location: WeatherLocation = weatherLocation) {
        if (loading) {
            return;
        }
        loading = true;
        try {
            // weatherData = await getWeatherProvider(provider).getWeather(weatherLocation, { model: weatherLocation.omModel });
            let applyNewWeatherDataTimeout;
            const usedWeatherData = weatherDataService.allWeatherData;
            const [weatherData, timezoneData, ...others] = await Promise.all(
                (
                    [
                        await Promise.all([
                            getWeatherProvider().getWeather(weatherLocation, { model: weatherLocation.omModel }),
                            !!weatherLocation.timezone ? Promise.resolve(undefined) : getTimezone(weatherLocation).catch((err) => console.error(err))
                        ]).then(([weatherData, timezoneData]) => {
                            // we update as soon as possible in case other requests are slow
                            if (timezoneData) {
                                Object.assign(weatherLocation, timezoneData);
                                ApplicationSettings.setString(SETTINGS_WEATHER_LOCATION, JSON.stringify(weatherLocation));
                            }
                            if (weatherData) {
                                applyNewWeatherDataTimeout = setTimeout(() => updateView(weatherData), 100);
                            }
                            return weatherData;
                        })
                    ] as any
                )
                    .concat(usedWeatherData.indexOf(WeatherProps.aqi) !== -1 ? [getAqiProvider(weatherLocation.providerAqi).getAirQuality(weatherLocation)] : [])
                    .concat(weatherLocation.providerMarine ? [getMarineProvider(weatherLocation.providerMarine).getMarineWeather(weatherLocation)] : [])
            );

            if (weatherData) {
                const dataToMerge = others.filter((r) => !!r);
                if (dataToMerge.length) {
                    if (applyNewWeatherDataTimeout) {
                        clearTimeout(applyNewWeatherDataTimeout);
                    }
                    dataToMerge.forEach((r) => mergeWeatherData(weatherData, r));
                    await updateView(weatherData);
                }
            }

            if (!name) {
                name = location.coord.lat.toFixed(2) + ',' + location.coord.lon.toFixed(2);
            }
        } catch (err) {
            android.widget.Toast.makeText(Utils.android.getApplicationContext(), err.toString(), android.widget.Toast.LENGTH_LONG);
            closeBottomSheet();
        } finally {
            loading = false;
        }
    }
    let provider = getProviderType();

    onMount(() => {
        DEV_LOG && console.log('BottomSheet', 'onMount`');
        refresh(weatherLocation);
    });

    onProviderChanged((event) => {
        DEV_LOG && console.log('BottomSheet', 'onProviderChanged');
        provider = getProviderType();
        refresh();
    });

    function onSwipe(e) {
        const currentProviderIndex = providers.indexOf(provider);
        let newIndex = currentProviderIndex + (e.direction === 1 ? -1 : 1);
        if (newIndex < 0) {
            newIndex += providers.length;
        }
        const newProvider = providers[newIndex % providers.length];
        ApplicationSettings.setString('provider', newProvider);
    }
    async function toggleItemFavorite(item: FavoriteLocation, confirmRemoval?: boolean) {
        weatherLocation = await toggleFavorite(item, confirmRemoval);
    }
</script>

<gesturerootview class="weatherpage" backgroundColor="transparent" height="100%" rows="auto,*">
    <CActionBar backgroundColor="transparent" disableBackButton={true} marginTop={0} title={name} on:swipe={onSwipe}>
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
            on:tap={() => toggleItemFavorite(weatherLocation, true)} />
    </CActionBar>
    <label
        backgroundColor={new Color(colorBackground).setAlpha(100).hex}
        fontSize={10}
        horizontalAlignment="right"
        marginRight={12}
        row={0}
        text={lc('powered_by', l(`provider.${provider}`))}
        verticalAlignment="top" />
    <WeatherComponent {items} row={1} {weatherLocation} />
    <progress backgroundColor="transparent" busy={loading} indeterminate={true} row={1} verticalAlignment="top" />
</gesturerootview>
