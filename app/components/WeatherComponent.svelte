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
    import { actionBarHeight, fontScale, hourlyViewData, hourlyViewMode, onFontScaleChanged, onUnitsChanged, screenHeightDips, screenWidthDips, topViewHeight, windowInset } from '~/variables';

    export let items: any[];
    export let weatherLocation: WeatherLocation;
    export let fakeNow = null;

    $: ({ bottom: windowInsetBottom, top: windowInsetTop } = $windowInset);
    const dispatch = createEventDispatcher();
    let collectionView: NativeViewElementNode<CollectionView>;
    let topHeight = 0;
    $: {
        topHeight = Math.max((Math.max(screenWidthDips, screenHeightDips) - $actionBarHeight - windowInsetBottom - windowInsetTop - 100) * 0.6 * Math.sqrt($fontScale), 370);
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
    on:layoutCompleted={onCollectionViewLayoutCompleted}>
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
