<script lang="ts">
    import toColor from '@mapbox/to-color';
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { CollectionViewWithSwipeMenu } from '@nativescript-community/ui-collectionview-swipemenu';
    import DrawerElement from '@nativescript-community/ui-drawer/svelte';
    import { showSnack } from '@nativescript-community/ui-material-snackbar';
    import { ApplicationSettings, NavigatedData, ObservableArray, Page, View } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { onMount } from 'svelte';
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeElementNode, NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import { CHARTS_LANDSCAPE } from '~/helpers/constants';
    import { FavoriteLocation } from '~/helpers/favorites';
    import { l, lc, slc } from '~/helpers/locale';
    import { isDarkTheme, onThemeChanged } from '~/helpers/theme';
    import { NetworkConnectionStateEvent, NetworkConnectionStateEventData, networkService } from '~/services/api';
    import type { ProviderType } from '~/services/providers/weather';
    import { getProviderForType, providers } from '~/services/providers/weatherproviderfactory';
    import { AVAILABLE_COMPARE_WEATHER_DATA, WeatherProps, getWeatherDataIcon, getWeatherDataTitle } from '~/services/weatherData';
    import { actionBarButtonHeight, windowInset } from '~/variables';
    import ListItemAutoSize from '../common/ListItemAutoSize.svelte';
    import CompareLineChart from './CompareLineChart.svelte';
    import CompareWeatherIcons from './CompareWeatherIcons.svelte';

    let dataToCompare: any = JSON.parse(ApplicationSettings.getString('compare_data_single', '{"id":"temperature","type":"linechart","forecast":"hourly"}'));
    const screenOrientation = ApplicationSettings.getBoolean('charts_landscape', CHARTS_LANDSCAPE) ? 'landscape' : undefined;

    const CHART_TYPE = {
        [WeatherProps.iconId]: 'weathericons',
        [WeatherProps.precipAccumulation]: 'barchart',
        [WeatherProps.precipProbability]: 'scatterchart',
        // [WeatherProps.windSpeed]: 'scatterchart',
        [WeatherProps.windGust]: 'scatterchart',
        [WeatherProps.snowDepth]: 'barchart',
        [WeatherProps.cloudCover]: 'scatterchart',
        [WeatherProps.uvIndex]: 'scatterchart',
        [WeatherProps.cloudCeiling]: 'scatterchart',
        [WeatherProps.windBearing]: 'scatterchart'
    };

    const possibleDatas = new ObservableArray(
        AVAILABLE_COMPARE_WEATHER_DATA.map((k) => ({
            id: k,
            type: CHART_TYPE[k] || 'linechart',
            title: getWeatherDataTitle(k),
            icon: getWeatherDataIcon(k),
            dailySelected: dataToCompare.id === k && dataToCompare.forecast === 'daily',
            hourlySelected: dataToCompare.id === k && dataToCompare.forecast === 'hourly'
        }))
    );

    export let weatherLocation: FavoriteLocation;
    let providerColors = {};

    interface Model {
        id: string;
        title: string;
        subtitle?: string;
        name: string;
        color: string;
        shortName: string;
    }

    function generateColor(provider: string) {
        // DEV_LOG && console.log('generateColor', provider, isDarkTheme());
        return new toColor(provider, { saturation: 3, brightness: isDarkTheme() ? 1.2 : 0.9 });
        // return new toColor(provider, { saturation: isDarkTheme() ? 3 : 3, brightness: isDarkTheme() ? 1.6 : 0.9 });
    }

    function updateColors() {
        providerColors = {};
        modelsList.forEach((model) => {
            const provider = model.id.split(':')[0];
            let colorGenerator = providerColors[provider];
            if (!colorGenerator) {
                colorGenerator = providerColors[provider] = generateColor(provider);
            }
            model.color = colorGenerator.getColor().hsl.formatted;
        });
        modelsCollectionView?.nativeElement.refreshVisibleItems();
    }
    const modelsList = new ObservableArray<Model>(
        providers.reduce((acc, val) => {
            const provider = getProviderForType(val);
            const models = provider.getModels();
            const keys = Object.keys(models);

            let colorGenerator = providerColors[val];
            if (!colorGenerator) {
                colorGenerator = providerColors[val] = generateColor(val);
            }
            if (keys.length) {
                for (let index = 0; index < keys.length; index++) {
                    const key = keys[index];
                    acc.push({
                        id: provider.id + ':' + key,
                        name: provider.getName(),
                        subtitle: provider.getModelName(key),
                        color: colorGenerator.getColor().hsl.formatted
                    } as Model);
                }
            } else {
                acc.push({
                    id: provider.id,
                    name: provider.getName(),
                    color: colorGenerator.getColor().hsl.formatted
                } as Model);
            }
            return acc;
        }, [])
    );
    DEV_LOG && console.log(modelsList.map((d) => d.color));
    const models: string[] = JSON.parse(ApplicationSettings.getString('compare_models', '["meteofrance", "openweathermap", "openmeteo:best_match"]')).filter(
        (d) => modelsList.findIndex((m) => m.id === d) !== -1
    );
    let page: NativeViewElementNode<Page>;
    // let pullRefresh: NativeViewElementNode<PullToRefresh>;
    let networkConnected = networkService.connected;
    let loading = true;
    let currentItem;

    onMount(async () => {
        networkService.on(NetworkConnectionStateEvent, (event: NetworkConnectionStateEventData) => {
            try {
                if (networkConnected !== event.data.connected) {
                    networkConnected = event.data.connected;
                }
            } catch (error) {
                showError(error);
            }
        });
        networkConnected = networkService.connected;
    });

    async function refreshData() {
        try {
            DEV_LOG && console.log('refreshData', networkConnected, JSON.stringify(weatherLocation));
            if (!weatherLocation) {
                showSnack({ message: l('no_location_set') });
                return;
            }
            if (!networkConnected) {
                showSnack({ message: l('no_network') });
                return;
            }
            loading = true;
            const now = Date.now();
            const errors = [];
            const weatherData = (
                await Promise.all(
                    models.map(async (modelId) => {
                        try {
                            const data = modelId.split(':');
                            const providerType = data[0] as ProviderType;
                            const provider = getProviderForType(providerType);
                            // TODO: for Open-Meteo make a single request for all models
                            const weatherData = await provider.getWeather(weatherLocation, { minutely: false, current: false, warnings: false, forceModel: true, model: data[1] });
                            const model = modelsList.find((m) => m.id === modelId);
                            return { weatherData, model };
                        } catch (error) {
                            errors.push(error);
                            DEV_LOG && console.error(modelId, error, error.stack);
                            return null;
                        }
                    })
                )
            ).filter((d) => !!d);
            if (weatherData.length === 0) {
                showError(errors[0]);
            }
            currentItem = {
                weatherData,
                chartType: dataToCompare.type,
                timestamp: now,
                hidden: [],
                ...dataToCompare
            };
        } catch (err) {
            showError(err, { reportError: err.statusCode === undefined, showAsSnack: PRODUCTION });
        } finally {
            loading = false;
        }
    }
    // async function onPullToRefresh() {
    //     try {
    //         if (pullRefresh) {
    //             pullRefresh.nativeView.refreshing = false;
    //         }
    //         loading = true;
    //         await refreshData();
    //     } catch (error) {
    //         showError(error);
    //     } finally {
    //         loading = false;
    //     }
    // }

    let drawer: DrawerElement;
    let modelsCollectionView: NativeElementNode<CollectionViewWithSwipeMenu>;
    let dataCollectionView: NativeElementNode<CollectionViewWithSwipeMenu>;
    function toggleLeftDrawer() {
        drawer?.toggle('left');
    }
    function toggleRightDrawer() {
        drawer?.toggle('right');
    }

    let drawerOpened = false;
    function onDrawerStart() {
        drawerOpened = true;
    }

    function onDrawerClose() {
        drawerOpened = false;
        modelsCollectionView.nativeElement?.closeCurrentMenu();
    }

    let checkboxTapTimer;
    async function onModelTap(item: Model, event) {
        try {
            const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
            checkboxTapTimer = setTimeout(() => {
                checkboxView.checked = !checkboxView.checked;
            }, 10);
        } catch (error) {
            showError(error);
        }
    }
    async function onModelCheckBox(item: Model, event) {
        // if (item.value === event.value) {
        //     return;
        // }
        const value = event.value;
        // item.value = value;
        if (checkboxTapTimer) {
            clearTimeout(checkboxTapTimer);
            checkboxTapTimer = null;
        }
        const index = models.indexOf(item.id);
        if (value && index === -1) {
            models.push(item.id);
        } else if (!value && index > -1) {
            models.splice(index, 1);
        }
        ApplicationSettings.setString('compare_models', JSON.stringify(models));
    }
    async function onDataCheckBox(forecast: string, item, event) {
        const value = event.value;
        if (value) {
            const currentlySelectedIndex = possibleDatas.findIndex((d) => d.id === dataToCompare.id);
            const index = possibleDatas.findIndex((d) => d.id === item.id);
            if (index !== currentlySelectedIndex && currentlySelectedIndex !== -1) {
                possibleDatas.setItem(currentlySelectedIndex, { ...possibleDatas.getItem(currentlySelectedIndex), dailySelected: false, hourlySelected: false });
            }
            dataToCompare = { ...item, forecast };
            if (forecast === 'hourly') {
                item.hourlySelected = true;
                item.dailySelected = false;
            } else {
                item.hourlySelected = false;
                item.dailySelected = true;
            }
            if (index !== -1) {
                possibleDatas.setItem(index, item);
            }

            DEV_LOG && console.log('onDataCheckBox', forecast, item.id, value, currentlySelectedIndex, JSON.stringify(dataToCompare));
            ApplicationSettings.setString('compare_data_single', JSON.stringify(dataToCompare));
            refreshData();
        } else {
            event.object.checked = true;
        }
    }

    function isModelSelected(item) {
        return models.indexOf(item.id) !== -1;
    }

    function selectModelsTemplate(item, index, items) {
        if (item.type) {
            return item.type;
        }
        return 'default';
    }

    function onNavigatedTo(args: NavigatedData): void {
        if (models.length && dataToCompare) {
            refreshData();
        }
    }
    onThemeChanged(() => {
        updateColors();
        refreshData();
    });
</script>

<page bind:this={page} id="comparesingle" actionBarHidden={true} {screenOrientation} on:navigatedTo={onNavigatedTo}>
    <drawer
        bind:this={drawer}
        class="pageContent"
        gestureHandlerOptions={{
            minDist: 50,
            failOffsetYStart: -40,
            failOffsetYEnd: 40
        }}
        leftClosedDrawerAllowDraging={false}
        rightClosedDrawerAllowDraging={false}
        android:paddingBottom={$windowInset.bottom}
        on:close={onDrawerClose}
        on:start={onDrawerStart}>
        <gridlayout rows="auto,*" prop:mainContent>
            {#if !networkConnected}
                <label horizontalAlignment="center" row={1} text={l('no_network').toUpperCase()} verticalAlignment="middle" />
            {:else if currentItem}
                <CompareLineChart item={currentItem} row={1} {screenOrientation} visibility={currentItem?.chartType === 'weathericons' ? 'hidden' : 'visible'} {weatherLocation} />
                <CompareWeatherIcons item={currentItem} row={1} {screenOrientation} visibility={currentItem?.chartType === 'weathericons' ? 'visible' : 'hidden'} {weatherLocation} />
            {:else}
                <mdbutton horizontalAlignment="center" row={1} text={lc('select_data')} variant="text" verticalAlignment="middle" on:tap={toggleRightDrawer} />
            {/if}
            <CActionBar showMenuIcon title={weatherLocation && weatherLocation.name}>
                <activityIndicator busy={loading} height={$actionBarButtonHeight} verticalAlignment="middle" visibility={loading ? 'visible' : 'collapse'} width={$actionBarButtonHeight} />
                <mdbutton class="actionBarButton" text="mdi-layers-triple" variant="text" verticalAlignment="middle" on:tap={toggleLeftDrawer} />
                <mdbutton class="actionBarButton" text="mdi-sun-thermometer-outline" variant="text" verticalAlignment="middle" on:tap={toggleRightDrawer} />
            </CActionBar>
        </gridlayout>
        <gridlayout prop:leftDrawer class="drawer" rows="auto,*,auto" width="300">
            <label class="actionBarTitle" margin="20 20 20 20" text={$slc('models')} />
            <collectionview bind:this={modelsCollectionView} id="models" itemTemplateSelector={selectModelsTemplate} items={modelsList} row={1}>
                <Template key="sectionheader" let:item>
                    <label class="sectionHeader" text={item.name} />
                </Template>
                <Template let:item>
                    <ListItemAutoSize
                        borderLeftColor={item.color}
                        borderLeftWidth={6}
                        columns="*,auto"
                        fontWeight="normal"
                        item={{ ...item, subtitleColor: item.color }}
                        padding="0 0 0 10"
                        titleProps={{
                            paddingTop: 10,
                            paddingBottom: 10
                        }}
                        on:tap={(event) => onModelTap(item, event)}>
                        <checkbox
                            id="checkbox"
                            checked={isModelSelected(item)}
                            col={1}
                            ios:marginRight={10}
                            fillColor={item.color}
                            verticalAlignment="center"
                            on:checkedChange={(e) => onModelCheckBox(item, e)} />
                    </ListItemAutoSize>
                </Template>
            </collectionview>
            <mdbutton row={2} text={lc('refresh')} on:tap={refreshData} />
        </gridlayout>
        <gridlayout prop:rightDrawer class="drawer" rows="auto,*,auto" width="300">
            <gridlayout columns="*,auto,auto" paddingBottom={10} paddingRight={10} android:paddingTop={$windowInset.top}>
                <label class="actionBarTitle" margin={20} text={$slc('data')} />
                <label class="actionBarSubtitle" col={1} margin={10} text={$slc('hourly')} verticalAlignment="center" />
                <label class="actionBarSubtitle" col={2} margin={10} text={$slc('daily')} verticalAlignment="center" />
            </gridlayout>
            <collectionview bind:this={dataCollectionView} id="data" items={possibleDatas} row={1}>
                <Template key="sectionheader" let:item>
                    <label class="sectionHeader" text={item.name} />
                </Template>
                <Template let:item>
                    <ListItemAutoSize
                        columns="*,auto,auto"
                        fontWeight="normal"
                        {item}
                        mainCol={0}
                        padding="0 0 0 16"
                        titleProps={{
                            paddingTop: 0,
                            paddingBottom: 0
                        }}>
                        <checkbox checked={item.hourlySelected} col={1} ios:marginRight={10} verticalAlignment="center" on:checkedChange={(e) => onDataCheckBox('hourly', item, e)} />
                        <checkbox checked={item.dailySelected} col={2} ios:marginRight={10} verticalAlignment="center" on:checkedChange={(e) => onDataCheckBox('daily', item, e)} />
                    </ListItemAutoSize>
                </Template>
            </collectionview>
        </gridlayout>
    </drawer>
</page>
