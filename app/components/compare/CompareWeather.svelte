<script lang="ts">
    import toColor from '@mapbox/to-color';
    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { CollectionViewWithSwipeMenu } from '@nativescript-community/ui-collectionview-swipemenu';
    import DrawerElement from '@nativescript-community/ui-drawer/svelte';
    import { showSnack } from '@nativescript-community/ui-material-snackbar';
    import { PullToRefresh } from '@nativescript-community/ui-pulltorefresh';
    import { ApplicationSettings, NavigatedData, Page, View } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { onMount } from 'svelte';
    import { Template } from '@nativescript-community/svelte-native/components';
    import { NativeElementNode, NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import ListItemAutoSize from '~/components/common/ListItemAutoSize.svelte';
    import { FavoriteLocation } from '~/helpers/favorites';
    import { l, lc, slc } from '~/helpers/locale';
    import { NetworkConnectionStateEvent, NetworkConnectionStateEventData, networkService } from '~/services/api';
    import type { ProviderType } from '~/services/providers/weather';
    import { getProviderForType, getWeather, providers } from '~/services/providers/weatherproviderfactory';
    import { AVAILABLE_COMPARE_WEATHER_DATA, WeatherProps, getWeatherDataIcon, getWeatherDataTitle } from '~/services/weatherData';
    import { actionBarButtonHeight, colors, windowInset } from '~/variables';
    import CompareLineChart from './CompareLineChart.svelte';
    import CompareWeatherIcons from './CompareWeatherIcons.svelte';

    $: ({ colorBackground, colorError, colorOnError, colorOnSurfaceVariant, colorPrimary, colorSurface } = $colors);

    const CHART_TYPE = {
        [WeatherProps.iconId]: 'weathericons',
        // [WeatherProps.windSpeed]: 'scatterchart',
        // [WeatherProps.windGust]: 'scatterchart',
        [WeatherProps.windBearing]: 'scatterchart'
    };

    const possibleDatas = AVAILABLE_COMPARE_WEATHER_DATA.map((k) => ({
        id: k,
        type: CHART_TYPE[k] || 'linechart',
        title: getWeatherDataTitle(k),
        ...getWeatherDataIcon(k)
    }));

    export let weatherLocation: FavoriteLocation;
    const providerColors = {};

    interface Model {
        id: string;
        title: string;
        subtitle?: string;
        name: string;
        color: string;
        shortName: string;
    }

    const modelsList: Model[] = providers.reduce((acc, val) => {
        const provider = getProviderForType(val);
        const models = provider.getModels();
        const keys = Object.keys(models);

        let colorGenerator = providerColors[val];
        if (!colorGenerator) {
            colorGenerator = providerColors[val] = new toColor(val, { saturation: 3, brightness: 0.8 });
        }
        if (keys.length) {
            // acc.push({
            //     type: 'sectionheader',
            //     id: provider.id,
            //     name: provider.getName(),
            //     // color: colorGenerator.getColor().hsl.formatted,
            //     shortName: provider.getName().replace(/[^A-Z]+/g, '')
            // });
            for (let index = 0; index < keys.length; index++) {
                const key = keys[index];
                acc.push({
                    id: provider.id + ':' + key,
                    title: provider.getName(),
                    subtitle: provider.getModelName(key),
                    name: provider.getName() + ': ' + key,
                    color: colorGenerator.getColor().hsl.formatted,
                    shortName: provider.getName().replace(/[^A-Z]+/g, '') + ': ' + key
                } as Model);
            }
        } else {
            acc.push({
                id: provider.id,
                name: provider.getName(),
                color: colorGenerator.getColor().hsl.formatted,
                shortName: provider.getName().replace(/[^A-Z]+/g, '')
            } as Model);
        }
        return acc;
    }, []);
    const models: string[] = JSON.parse(ApplicationSettings.getString('compare_models', '["meteofrance", "openweathermap", "openmeteo:best_match"]')).filter(
        (d) => modelsList.findIndex((m) => m.id === d) !== -1
    );
    const dataToCompare: any[] = JSON.parse(ApplicationSettings.getString('compare_data', '[{"id":"temperature","type":"linechart","forecast":"hourly"}]'));
    let page: NativeViewElementNode<Page>;
    let pullRefresh: NativeViewElementNode<PullToRefresh>;
    let networkConnected = networkService.connected;
    let loading = true;
    let data = [];

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

    function onNavigatedTo(args: NavigatedData): void {
        if (models.length && dataToCompare) {
            refreshData();
        }
    }

    async function refreshData() {
        try {
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
                            // TODO: for Open-Meteo make a single request for all models
                            const weatherData = await getWeather(weatherLocation, { minutely: false, current: false, warnings: false, forceModel: true, model: data[1] }, providerType);
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
            const newItems = [];
            for (let i = 0; i < dataToCompare.length; i++) {
                const d = dataToCompare[i];
                switch (d.type) {
                    default:
                    case 'line':
                    case 'scatter':
                        // DEV_LOG && console.log('d', d);
                        newItems.push({
                            weatherData,
                            chartType: d.type,
                            timestamp: now,
                            hidden: [],
                            ...d
                        });
                }
            }
            data = newItems;
        } catch (err) {
            showError(err, { reportError: err.statusCode === undefined, showAsSnack: PRODUCTION });
        } finally {
            loading = false;
        }
    }
    async function onPullToRefresh() {
        try {
            if (pullRefresh) {
                pullRefresh.nativeView.refreshing = false;
            }
            loading = true;
            await refreshData();
        } catch (error) {
            showError(error);
        } finally {
            loading = false;
        }
    }

    let drawer: DrawerElement;
    let modelsCollectionView: NativeElementNode<CollectionViewWithSwipeMenu>;
    let dataCollectionView: NativeElementNode<CollectionViewWithSwipeMenu>;
    let collectionView: NativeElementNode<CollectionViewWithSwipeMenu>;
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
    async function onModelTap(item, event) {
        try {
            if (item.type === 'checkbox' || item.type === 'switch') {
                // we dont want duplicate events so let s timeout and see if we clicking diretly on the checkbox
                const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
                checkboxTapTimer = setTimeout(() => {
                    checkboxView.checked = !checkboxView.checked;
                }, 10);
                return;
            }
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
        if (value) {
            models.push(item.id);
        } else {
            const index = models.indexOf(item.id);
            if (index >= 0) {
                models.splice(index, 1);
            }
        }
        ApplicationSettings.setString('compare_models', JSON.stringify(models));
    }
    async function onDataCheckBox(forecast: string, item, event) {
        const value = event.value;
        const index = dataToCompare.findIndex((d) => d.id === item.id && d.forecast === forecast);
        if (index === -1) {
            if (value) {
                dataToCompare.push({ ...item, forecast });
            }
        } else {
            if (!value) {
                dataToCompare.splice(index, 1);
            }
        }
        DEV_LOG && console.log('onDataCheckBox', forecast, item.id, value, index, JSON.stringify(dataToCompare));
        ApplicationSettings.setString('compare_data', JSON.stringify(dataToCompare));
    }

    function isModelSelected(item) {
        return models.indexOf(item.id) !== -1;
    }
    function isHourlyDataSelected(item) {
        return dataToCompare.findIndex((d) => d.id === item.id && d.forecast === 'hourly') !== -1;
    }
    function isDailyDataSelected(item) {
        return dataToCompare.findIndex((d) => d.id === item.id && d.forecast === 'daily') !== -1;
    }

    function selectModelsTemplate(item, index, items) {
        if (item.type) {
            return item.type;
        }
        return 'default';
    }
    function selectDataTemplate(item, index, items) {
        DEV_LOG && console.log('selectDataTemplate', item.type);
        switch (item.type) {
            case 'weathericons':
            case 'scatterchart':
                return item.type;
            default:
                return 'linechart';
        }
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
        leftClosedDrawerAllowDraging={false}
        rightClosedDrawerAllowDraging={false}
        android:paddingBottom={$windowInset.bottom}
        on:close={onDrawerClose}
        on:start={onDrawerStart}>
        <gridlayout rows="auto,*" prop:mainContent>
            {#if !networkConnected}
                <label horizontalAlignment="center" row={1} text={l('no_network').toUpperCase()} verticalAlignment="middle" />
            {:else}
                <pullrefresh bind:this={pullRefresh} row={1} on:refresh={onPullToRefresh}>
                    <collectionview bind:this={collectionView} id="data" itemTemplateSelector={selectDataTemplate} items={data}>
                        <Template key="linechart" let:item>
                            <CompareLineChart height={200} {item} {weatherLocation} />
                        </Template>
                        <Template key="scatterchart" let:item>
                            <CompareLineChart height={200} {item} {weatherLocation} />
                        </Template>
                        <Template key="weathericons" let:item>
                            <CompareWeatherIcons {item} {weatherLocation} />
                        </Template>
                    </collectionview>
                </pullrefresh>
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
                            col={2}
                            ios:margin={10}
                            color={item.color}
                            fillColor={item.color}
                            verticalAlignment="center"
                            on:checkedChange={(e) => onModelCheckBox(item, e)} />
                    </ListItemAutoSize>
                </Template>
            </collectionview>
            <mdbutton row={2} text={lc('refresh')} on:tap={refreshData} />
        </gridlayout>
        <gridlayout prop:rightDrawer class="drawer" rows="auto,*,auto" width="300">
            <label class="actionBarTitle" margin="20 20 20 20" text={$slc('data')} />
            <collectionview bind:this={dataCollectionView} id="data" items={possibleDatas} row={1}>
                <Template key="sectionheader" let:item>
                    <label class="sectionHeader" text={item.name} />
                </Template>
                <Template let:item>
                    <ListItemAutoSize
                        columns="*,auto,auto"
                        {item}
                        mainCol={0}
                        padding="0 0 0 10"
                        rows="50"
                        titleProps={{
                            paddingTop: 0,
                            paddingBottom: 0
                        }}>
                        <checkbox checked={isHourlyDataSelected(item)} col={1} ios:marginRight={10} verticalAlignment="center" on:checkedChange={(e) => onDataCheckBox('hourly', item, e)} />
                        <checkbox checked={isDailyDataSelected(item)} col={2} ios:marginRight={10} verticalAlignment="center" on:checkedChange={(e) => onDataCheckBox('daily', item, e)} />
                    </ListItemAutoSize>
                </Template>
            </collectionview>
            <mdbutton row={2} text={lc('refresh')} on:tap={refreshData} />
        </gridlayout>
    </drawer>
</page>
