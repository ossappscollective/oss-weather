<script lang="ts">
    import { Template } from '@nativescript-community/svelte-native/components';
    import type { NativeViewElementNode } from '@nativescript-community/svelte-native/dom';
    import { CollectionView } from '@nativescript-community/ui-collectionview';
    import { Application } from '@nativescript/core';
    import { createEventDispatcher } from '@shared/utils/svelte/ui';
    import DailyView from '~/components/DailyView.svelte';
    import TopWeatherView from '~/components/TopWeatherView.svelte';
    import { computeWindyViewMinHeight } from '~/components/WindyView.svelte';
    import { onThemeChanged } from '~/helpers/theme';
    import { WeatherLocation } from '~/services/api';
    import { iconService, onIconAnimationsChanged } from '~/services/icon';
    import { notifyChartScrolled } from '~/utils/charts/chartEvents';
    import { actionBarHeight, fontScale, hourlyViewData, hourlyViewMode, isMacCatalyst, onFontScaleChanged, onUnitsChanged, topViewHeight, windowInset, windowSize } from '~/variables';

    const MIN_TOP_VIEW_HEIGHT = 370;

    interface TopViewHeightParams {
        windowWidth: number;
        windowHeight: number;
        actionBarHeight: number;
        insetTop: number;
        insetBottom: number;
        fontScale: number;
        resizableWindow: boolean;
    }

    function computeTopViewHeight({ actionBarHeight, fontScale, insetBottom, insetTop, resizableWindow, windowHeight, windowWidth }: TopViewHeightParams) {
        // on phones use the longest side so rotating does not change the height
        const availableHeight = resizableWindow ? windowHeight : Math.max(windowWidth, windowHeight);
        return Math.max((availableHeight - actionBarHeight - insetBottom - insetTop - 100) * 0.6 * Math.sqrt(fontScale), MIN_TOP_VIEW_HEIGHT);
    }

    export let items: any[];
    export let weatherLocation: WeatherLocation;
    export let fakeNow = null;

    $: ({ bottom: windowInsetBottom, top: windowInsetTop } = $windowInset);
    const dispatch = createEventDispatcher();
    let collectionView: NativeViewElementNode<CollectionView>;
    let topHeight = 0;
    $: {
        topHeight = computeTopViewHeight({
            windowWidth: $windowSize.width,
            windowHeight: $windowSize.height,
            actionBarHeight: $actionBarHeight,
            insetTop: windowInsetTop,
            insetBottom: windowInsetBottom,
            fontScale: $fontScale,
            resizableWindow: isMacCatalyst
        });
        if ($hourlyViewMode === 'windy') {
            topHeight = Math.max(topHeight, $topViewHeight + computeWindyViewMinHeight($hourlyViewData, $fontScale));
        }
        collectionView?.nativeView?.refresh();
    }

    let isLayedout = false;
    function onCollectionViewLayoutCompleted() {
        if (!isLayedout) {
            isLayedout = true;
            try {
                (Application.android.foregroundActivity as android.app.Activity).reportFullyDrawn();
            } catch (err) {}
        }
    }
    export let fullRefresh = false;
    function refreshVisibleItems() {
        if (fullRefresh) {
            collectionView?.nativeView?.refresh();
        } else {
            collectionView?.nativeView?.refreshVisibleItems();
        }
    }

    onThemeChanged(refreshVisibleItems);
    onUnitsChanged(refreshVisibleItems);
    onIconAnimationsChanged(refreshVisibleItems);
    onFontScaleChanged(refreshVisibleItems);

    function onTap(item) {
        dispatch('tap', item);
    }
    function selectTemplate(item, index, items) {
        if (iconService.animated) {
            // if (iconService.usingLottie) {
            //     return index === 0 ? 'topView_lottie_animated' : 'lottie_animated';
            // }
            return index === 0 ? 'topView_animated' : 'animated';
        }
        return index === 0 ? 'topView' : 'default';
    }
</script>

<collectionview
    bind:this={collectionView}
    id="main"
    {...$$restProps}
    itemIdGenerator={(_item, index) => index}
    itemTemplateSelector={selectTemplate}
    {items}
    paddingBottom={(__ANDROID__ ? $windowInset.bottom : 0) + 16}
    on:layoutCompleted={onCollectionViewLayoutCompleted}
    on:scroll={notifyChartScrolled}>
    <Template key="topView" let:item>
        <TopWeatherView {fakeNow} height={topHeight} {item} {weatherLocation} on:tap={() => onTap(item)} />
    </Template>
    <Template key="topView_animated" let:item>
        <TopWeatherView animated={true} {fakeNow} height={topHeight} {item} {weatherLocation} on:tap={() => onTap(item)} />
    </Template>
    <Template key="animated" let:item>
        <DailyView animated={true} {item} on:tap={() => onTap(item)} />
    </Template>
    <Template let:item>
        <DailyView {item} on:tap={() => onTap(item)} />
    </Template>
</collectionview>
