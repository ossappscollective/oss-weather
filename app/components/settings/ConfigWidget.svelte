<script context="module" lang="ts">
    import { showSnack } from '@nativescript-community/ui-material-snackbar';
    import { ObservableArray, Page, Screen, View, path } from '@nativescript/core';
    import { showError } from '@shared/utils/showError';
    import { showModal } from '@shared/utils/svelte/ui';
    import { WIDGET_NAMES, WeatherWidgetData, WidgetConfig, WidgetConfigManager, isDefaultLocation, widgetService } from 'plugin-widgets';
    import { onMount } from 'svelte';
    import CActionBar from '~/components/common/CActionBar.svelte';
    import ListItemAutoSize from '~/components/common/ListItemAutoSize.svelte';
    import { lc } from '~/helpers/locale';
    import { WeatherLocation, geocodeAddress } from '~/services/api';
    import { OpenMeteoModels } from '~/services/providers/om';
    import { getProviderType, providers } from '~/services/providers/weatherproviderfactory';
    import { hideLoading, selectValue, showPopoverMenu } from '~/utils/ui';
    import { actionBarHeight, colors, fontScale, fonts, onFontScaleChanged, windowInset } from '~/variables';

    import { CheckBox } from '@nativescript-community/ui-checkbox';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { pickColor } from '@nativescript-community/ui-color';
    import { confirm } from '@nativescript-community/ui-material-dialogs';
    import { VerticalPosition } from '@nativescript-community/ui-popover';
    import { closePopover } from '@nativescript-community/ui-popover/svelte';
    import IconButton from '@shared/components/IconButton.svelte';
    import { Template } from 'svelte-native/components';
    import { NativeViewElementNode } from 'svelte-native/dom';
    import { queryTimezone } from '~/helpers/favorites';
    import { onThemeChanged } from '~/helpers/theme';
    import { iconService, iconThemesFolder } from '~/services/icon';

    // Load sample data helper
    async function loadWidgetData(widgetClass: string): Promise<any> {
        const data = (await import(`plugin-widgets/widgets/${widgetClass}.json`)).default;
        return data;
    }
</script>

<script lang="ts">
    let { colorOnBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorPrimary, colorSurfaceContainer, colorWidgetBackground } = $colors;
    $: ({ colorOnBackground, colorOnSurface, colorOnSurfaceVariant, colorOutline, colorPrimary, colorSurfaceContainer, colorWidgetBackground } = $colors);

    // Props
    export let widgetClass: string = '';
    export let widgetId: string = '';
    export let modalMode: boolean = false;
    export let isKindConfig: boolean = false; // true for per-kind config, false for per-instance
    export let onMenuIcon = null;

    let collectionView: NativeViewElementNode<CollectionView>;
    let page: NativeViewElementNode<Page>;

    // State
    let config: WidgetConfig = null;
    let previewData: WeatherWidgetData = null;
    let actualPreviewData: WeatherWidgetData = null;
    let previewConfig: {
        name: string;
        displayName: string;
        description: string;
        supportedSizes: { width: number; height: number; family: string }[];
        preview: { sizes: { width: number; height: number }[]; fakeData: WeatherWidgetData };
        settings?: Record<string, any>;
    } = null;
    // const previewSet: string = 'default';
    let previewSize: { width: number; height: number } = null;
    loadConfig();

    $: {
        if (previewData) {
            actualPreviewData = Object.assign({}, previewData, { locationName: config?.locationName });
        } else {
            actualPreviewData = null;
        }
    }
    function getWidgetTitle(): string {
        if (widgetClass && WIDGET_NAMES[widgetClass]) {
            const baseName = WIDGET_NAMES[widgetClass];
            if (isKindConfig) {
                return `${baseName} - ${lc('default_settings')}`;
            } else if (widgetId) {
                return `${baseName} #${widgetId}`;
            }
            return baseName;
        }
        if (widgetId) {
            return `${lc('widget')} #${widgetId}`;
        }
        return lc('widget_settings');
    }

    onMount(async () => {
        // updateFrequency = WidgetConfigManager.getUpdateFrequency();
        // Load initial preview data
        if (widgetClass) {
            previewConfig = await loadWidgetData(widgetClass);
            previewData = previewConfig.preview.fakeData;
            previewSize = previewConfig.preview.sizes[0];
            DEV_LOG && console.log('onMount', widgetClass, typeof previewConfig.settings, JSON.stringify(previewConfig.settings));
            refresh();
        }
    });

    function loadConfig() {
        DEV_LOG && console.log('loadConfig', isKindConfig, widgetId);
        if (isKindConfig) {
            // Load per-kind default config
            config = WidgetConfigManager.getKindConfig(widgetClass);
        } else if (widgetId) {
            // Load per-instance config
            config = WidgetConfigManager.getConfig(widgetId);
        }
        config.settings = config.settings || {};
    }

    function saveConfig(updateData = false) {
        DEV_LOG && console.log('saveConfig', isKindConfig, config);
        if (isKindConfig) {
            // Save per-kind default config
            WidgetConfigManager.saveKindConfig(widgetClass, config);
            showSnack({ message: lc('widget_kind_config_saved') });
        } else if (widgetId) {
            // Save per-instance config
            WidgetConfigManager.saveConfig(widgetId, config, widgetClass);
            showSnack({ message: lc('widget_config_saved') });

            // Trigger widget update
            if (updateData) {
                widgetService.updateWidget(widgetId);
            }
        }
    }

    async function selectLocation(item) {
        const SelectCity = (await import('~/components/SelectCity.svelte')).default;
        const result: WeatherLocation = await showModal({
            target: page,
            page: SelectCity,
            fullscreen: true,
            props: {}
        });
        if (result) {
            const timezoneData = await queryTimezone(result);

            config.locationName = result.name || result.sys?.name || 'Selected';
            config.latitude = result.coord.lat;
            config.longitude = result.coord.lon;
            Object.assign(config, timezoneData);
            updateItem(item);
            saveConfig(true);
        }
    }

    async function clearLocation(item) {
        DEV_LOG && console.log('clearLocation', item);
        config.locationName = 'current';
        config.latitude = 0;
        config.longitude = 0;
        updateItem(item);
        saveConfig(true);
    }

    async function selectLocationOnMap(item) {
        const SelectPositionOnMap = (await import('~/components/SelectPositionOnMap.svelte')).default;
        const location: {
            lat: number;
            lon: number;
        } = await showModal({
            target: page,
            page: SelectPositionOnMap,
            animated: true,
            fullscreen: true,
            props: {
                focusPos: config.latitude && config.longitude ? { lat: config.latitude, lon: config.longitude } : undefined
            }
        });
        if (location) {
            const result = await geocodeAddress(location);
            DEV_LOG && console.log('selectLocationOnMap', result);
            config.locationName = result.name;
            config.latitude = result.coord.lat;
            config.longitude = result.coord.lon;
            const timezoneData = await queryTimezone(result);
            Object.assign(config, timezoneData);
            updateItem(item);
            saveConfig(true);
        }
    }

    function useCurrentLocation() {
        config.locationName = 'current';
        config.latitude = 0;
        config.longitude = 0;
        saveConfig(true);
    }

    async function selectProvider(item) {
        try {
            const result = await selectValue(
                [{ title: lc('auto'), data: null }].concat(
                    providers.map((p) => ({
                        title: lc('provider.' + p),
                        data: p
                    }))
                ),
                config.provider,
                { title: lc('provider.title') }
            );
            if (result !== undefined) {
                config.provider = result;
                saveConfig(true);
                updateItem(item);
            }
        } catch (error) {
            showError(error);
        }
    }

    async function selectModel(item) {
        try {
            const modelOptions = [{ title: lc('auto'), data: null }].concat(
                Object.keys(OpenMeteoModels).map((k) => ({
                    title: OpenMeteoModels[k],
                    data: k
                }))
            );

            const result = await selectValue(modelOptions, config.model, {
                title: lc('model')
            });
            if (result !== undefined) {
                config.model = result;
                saveConfig(true);
                updateItem(item);
            }
        } catch (error) {
            showError(error);
        }
    }

    // async function selectUpdateFrequency() {
    //     try {
    //         const frequencyOptions = [15, 30, 60, 120, 240, 360, 720, 1440].map((mins) => ({
    //             title: mins < 60 ? `${mins} min` : mins === 60 ? '1 hour' : `${mins / 60} hours`,
    //             data: mins
    //         }));

    //         const result = await selectValue(frequencyOptions, config.updateFrequency, {
    //             title: lc('widget_update_frequency')
    //         });
    //         if (result !== undefined) {
    //             config.updateFrequency = result;
    //             WidgetConfigManager.setUpdateFrequency(config.updateFrequency);
    //             showSnack({ message: lc('widget_update_frequency_saved') });
    //         }
    //     } catch (error) {
    //         showError(error);
    //     }
    // }

    // async function selectPreviewSet(event) {
    //     try {
    //         const options = ['default', 'hot', 'storm'].map((set) => ({
    //             title: lc(`widget.preview_set.${set}`) || set,
    //             type: 'checkbox',
    //             boxType: 'circle',
    //             value: set === previewSet,
    //             data: set
    //         }));
    //         await showPopoverMenu({
    //             options,
    //             anchor: event.object,
    //             vertPos: VerticalPosition.BELOW,
    //             props: {
    //                 width: 220 * $fontScale,
    //                 maxHeight: Screen.mainScreen.heightDIPs - $actionBarHeight
    //                 // autoSizeListItem: true
    //             },

    //             onCheckBox: async (item) => {
    //                 closePopover();
    //                 if (item?.data) {
    //                     previewSet = item?.data;
    //                     previewData = await loadWidgetSample(widgetClass, previewSet);
    //                 }
    //             }
    //         });
    //     } catch (error) {
    //         showError(error);
    //     }
    // }
    async function selectPreviewSize(event) {
        try {
            const options = previewConfig.preview.sizes.map((set) => ({
                title: `${set.width}x${set.height}`,
                type: 'checkbox',
                boxType: 'circle',
                value: set.width === previewSize.width && set.height === previewSize.height,
                data: set
            }));
            await showPopoverMenu({
                options,
                anchor: event.object,
                vertPos: VerticalPosition.BELOW,
                props: {
                    width: 220 * $fontScale,
                    maxHeight: Screen.mainScreen.heightDIPs - $actionBarHeight
                    // autoSizeListItem: true
                },

                onCheckBox: async (item) => {
                    closePopover();
                    if (item?.data) {
                        previewSize = item?.data;
                    }
                }
            });
        } catch (error) {
            showError(error);
        }
    }

    function getLocationDescription(): string {
        if (isDefaultLocation(config.locationName)) {
            return lc('my_location');
        }
        if (config.latitude != null && config.longitude != null) {
            return `${config.locationName} (${config.latitude.toFixed(2)}, ${config.longitude.toFixed(2)})`;
        }
        return config.locationName;
    }

    function getProviderDescription(): string {
        if (!config.provider) {
            return lc('auto') + ' (' + lc('provider.' + getProviderType()) + ')';
        }
        return lc('provider.' + config.provider);
    }

    function getModelDescription(): string {
        if (!config.model) {
            return lc('auto');
        }
        return OpenMeteoModels[config.model] || config.model;
    }

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
    function refreshCollectionView() {
        collectionView?.nativeView?.refresh();
    }
    function refreshCollectionViewVisibleItems() {
        collectionView?.nativeView?.refreshVisibleItems();
    }
    onFontScaleChanged(refreshCollectionViewVisibleItems);
    onThemeChanged(refreshCollectionView);

    let widgetComponent = null;
    if (widgetClass) {
        import(`plugin-widgets/svelte/generated/${widgetClass}View.generated.svelte`).then((component) => {
            DEV_LOG && console.log('widgetComponent', component);
            widgetComponent = component.default;
        });
    }
    $: widgetSize = previewSize ?? { width: 160, height: 160 };

    DEV_LOG && console.log('widgetComponent', !!widgetComponent);
    $: DEV_LOG && console.log('previewData', JSON.stringify(previewData));
    $: DEV_LOG && console.log('widgetSize', widgetSize);

    async function changeColor(item, event) {
        try {
            const newColor = await pickColor(item.color, { anchor: event.object });
            if (newColor) {
                item.color = newColor.hex;
                config.settings[item.id] = item.color;
                config = config;
                DEV_LOG && console.log('changeColor', newColor.hex, config);
                saveConfig();
                updateItem(item);
            }
        } catch (error) {
            showError(error);
        }
    }
    async function clearColor(item, event) {
        item.color = item.id === 'color' ? colorOnSurface : colorWidgetBackground;
        delete config.settings[item.id];
        config = config;
        saveConfig();
        updateItem(item);
    }

    async function refresh() {
        const newItems = (
            [
                // {
                //     id: 'preview_set',
                //     title: lc('widget.preview_set'),
                //     description: () => lc(`widget.preview_set.${previewSet}`) || previewSet
                // },
                // {
                //     id: 'preview_size',
                //     title: lc('widget.preview_size'),
                //     description: () => lc(previewSize['family'] || `${previewSize.width}x${previewSize.height}`)
                // }
            ] as any[]
        )
            .concat(isKindConfig ? [{ description: lc('default_widget_settings_note') }] : [])
            .concat([
                {
                    type: 'rightIcon',
                    id: 'location',
                    rightBtnIcon: 'mdi-map',
                    title: lc('location_name'),
                    description: getLocationDescription,
                    onRightIconTap: selectLocationOnMap
                },
                {
                    type: 'sectionheader',
                    title: lc('providers')
                },
                {
                    id: 'provider',
                    title: lc('provider.title'),
                    description: getProviderDescription
                },
                {
                    id: 'model',
                    title: lc('model'),
                    description: getModelDescription
                }
            ]);

        newItems.push(
            {
                id: 'sectionheader',
                title: lc('settings')
            },
            {
                type: 'switch',
                id: 'transparent',
                title: lc('widget_transparent_background'),
                value: config.settings?.['transparent'] ?? false
            },
            {
                type: 'color',
                id: 'backgroundColor',
                title: lc('background_color'),
                color: config.settings?.['backgroundColor'] ?? colorWidgetBackground
            },
            {
                type: 'color',
                id: 'color',
                title: lc('text_color'),
                color: config.settings?.['color'] ?? colorOnSurface
            },
            {
                type: 'image',
                id: 'icon_pack',
                title: lc('icon_pack'),
                description: () => iconService.getPackName(),
                image: () => iconService.getPackIcon(path.join(iconThemesFolder, config.iconSet ?? iconService.iconSet)),
                async onTap(item) {
                    const data = await selectValue<string>(
                        (await iconService.getAvailableThemes()).map((k) => ({
                            title: k.name,
                            subtitle: k.description,
                            data: k.id,
                            type: 'checkbox_image',
                            image: k.icon
                        })),
                        config.iconSet ?? iconService.iconSet,
                        {
                            title: lc('icon_pack')
                        }
                    );
                    if (data) {
                        config.iconSet = data;
                        config = config;
                        saveConfig(true);
                        updateItem(item, 'id');
                    }
                }
            }
        );
        if (previewConfig.settings) {
            Object.keys(previewConfig.settings).forEach((key) => {
                const item = previewConfig.settings[key];
                switch (item.type) {
                    case 'boolean':
                        newItems.push({
                            type: 'switch',
                            id: key,
                            title: lc(item.title),
                            value: config.settings?.[key] ?? item.default
                        });
                        break;
                    default:
                        break;
                }
            });
        }
        newItems.push({
            description: isKindConfig ? lc('widget_kind_configuration_note') : lc('widget_configuration_note')
        });
        // items = new ObservableArray(newItems)
        items.splice(0, items.length, ...newItems);
    }

    const items = new ObservableArray([]);

    refresh();

    function updateItem(item, key = 'id') {
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
                default:
                    // TODO: implement
                    // ApplicationSettings.setBoolean(item.key || item.id, value);
                    DEV_LOG && console.log('onCheckBox', config.settings, typeof config.settings);
                    config.settings = config.settings || {};
                    config.settings[item.id] = value;

                    // config.settings = { [item.id]: value };

                    config = config;
                    saveConfig();
                    break;
            }
        } catch (error) {
            showError(error);
        } finally {
            ignoreNextOnCheckBoxChange = false;
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
            if (item.onTap) {
                await item.onTap(item, event);
            } else {
                if (item.type === 'checkbox' || item.type === 'switch') {
                    // we dont want duplicate events so let s timeout and see if we clicking diretly on the checkbox
                    const checkboxView: CheckBox = ((event.object as View).parent as View).getViewById('checkbox');
                    clearCheckboxTimer();
                    checkboxTapTimer = setTimeout(() => {
                        checkboxView.checked = !checkboxView.checked;
                    }, 10);
                    return;
                }
                DEV_LOG && console.log('onTap', item.id);
                switch (item.id) {
                    case 'location':
                        await selectLocation(item);
                        break;
                    // case 'preview_set':
                    //     await selectPreviewSet(event);
                    //     break;
                    case 'preview_size':
                        await selectPreviewSize(event);
                        break;
                    case 'provider':
                        await selectProvider(event);
                        break;
                    case 'model':
                        await selectModel(event);
                        break;
                }
            }
        } catch (err) {
            showError(err);
        } finally {
            hideLoading();
        }
    }
    async function onLongPress(item, event) {
        try {
            DEV_LOG && console.log('onLongPress', item.id);
            switch (item.id) {
                case 'location':
                    const result = await confirm({
                        title: lc('reset_location'),
                        okButtonText: lc('ok'),
                        cancelButtonText: lc('cancel')
                    });
                    if (result) {
                        await clearLocation(item);
                    }
                    break;
            }
        } catch (err) {
            showError(err);
        } finally {
            hideLoading();
        }
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
</script>

<page bind:this={page} actionBarHidden={true}>
    <gridlayout class="pageContent" rows="auto,auto,*">
        <!-- Preview Section -->
        {#if widgetComponent && previewData && previewSize}
            <svelte:component
                this={widgetComponent}
                backgroundColor={config?.settings?.transparent ? '#ffffff00' : (config?.settings?.backgroundColor ?? colorWidgetBackground)}
                {config}
                data={actualPreviewData}
                horizontalAlignment="center"
                row={1}
                size={widgetSize} />
        {/if}
        <collectionview bind:this={collectionView} itemTemplateSelector={selectTemplate} {items} row={2} android:paddingBottom={$windowInset.bottom}>
            <Template key="sectionheader" let:item>
                <label class="sectionHeader" {...item.additionalProps || {}} text={item.title} />
            </Template>
            <Template key="switch" let:item>
                <ListItemAutoSize fontSize={20} item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} leftIcon={item.icon} on:tap={(event) => onTap(item, event)}>
                    <switch id="checkbox" checked={item.value} col={1} marginLeft={10} verticalAlignment="center" on:checkedChange={(e) => onCheckBox(item, e)} />
                </ListItemAutoSize>
            </Template>
            <Template key="checkbox" let:item>
                <ListItemAutoSize fontSize={20} item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} leftIcon={item.icon} on:tap={(event) => onTap(item, event)}>
                    <checkbox id="checkbox" checked={item.value} col={1} on:checkedChange={(e) => onCheckBox(item, e)} />
                </ListItemAutoSize>
            </Template>
            <Template key="rightIcon" let:item>
                <ListItemAutoSize
                    fontSize={20}
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }}
                    onLongPress={(event) => onLongPress(item, event)}
                    showBottomLine={false}
                    on:tap={(event) => onTap(item, event)}>
                    <IconButton col={1} text={item.rightBtnIcon} on:tap={(event) => onRightIconTap(item, event)} />
                </ListItemAutoSize>
            </Template>
            <Template key="leftIcon" let:item>
                <ListItemAutoSize
                    columns="auto,*,auto"
                    fontSize={20}
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }}
                    mainCol={1}
                    showBottomLine={false}
                    on:tap={(event) => onTap(item, event)}>
                    <label col={0} color={colorOnBackground} fontFamily={$fonts.mdi} fontSize={24} padding="0 10 0 0" text={item.icon} verticalAlignment="center" />
                </ListItemAutoSize>
            </Template>
            <Template key="color" let:item>
                <ListItemAutoSize
                    fontSize={20}
                    item={{ ...item, title: getTitle(item), subtitle: getDescription(item), color: null }}
                    onLongPress={(event) => clearColor(item, event)}
                    on:tap={(e) => changeColor(item, e)}>
                    <absolutelayout backgroundColor={item.color} borderColor={colorOutline} borderRadius="50%" borderWidth={2} col={1} height={40} marginLeft={10} width={40} />
                </ListItemAutoSize>
            </Template>
            <Template key="image" let:item>
                <ListItemAutoSize fontSize={20} item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} showBottomLine={false} on:tap={(event) => onTap(item, event)}>
                    <image col={1} height={45} src={item.image()} />
                </ListItemAutoSize>
            </Template>
            <Template key="info" let:item>
                <label color={colorOnSurfaceVariant} fontSize={14} margin="16" text={item.title} textWrap={true} />
            </Template>
            <Template let:item>
                <ListItemAutoSize fontSize={20} item={{ ...item, title: getTitle(item), subtitle: getDescription(item) }} showBottomLine={false} on:tap={(event) => onTap(item, event)}>
                </ListItemAutoSize>
            </Template>
        </collectionview>
        <CActionBar modalWindow={modalMode} {onMenuIcon} title={getWidgetTitle()} />
    </gridlayout>
</page>
